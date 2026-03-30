const SPREADSHEET_ID = 'REEMPLAZAR_CON_TU_SPREADSHEET_ID';
const SHEET_NAME = 'Juntas';
const DEFAULT_PAGE_SIZE = 2000;
const MAX_PAGE_SIZE = 5000;

function doGet(e) {
  return withJsonOutput_(function () {
    const params = e && e.parameter ? e.parameter : {};
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.limit || DEFAULT_PAGE_SIZE)));

    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow === 0 || lastColumn === 0) {
      return {
        ok: true,
        mode: 'paged',
        data: [],
        page: page,
        pageSize: limit,
        hasMore: false,
        nextPage: null,
        total: 0,
      };
    }

    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(normalizeHeader_);
    const totalRows = Math.max(0, lastRow - 1);
    const start = (page - 1) * limit;
    const startRow = start + 2;

    if (start >= totalRows) {
      return {
        ok: true,
        mode: 'paged',
        data: [],
        page: page,
        pageSize: limit,
        hasMore: false,
        nextPage: null,
        total: totalRows,
      };
    }

    const rowsToRead = Math.min(limit, totalRows - start);
    const pageValues = sheet.getRange(startRow, 1, rowsToRead, lastColumn).getValues();
    const data = pageValues.map(function (row) {
      const item = {};
      headers.forEach(function (header, index) {
        item[header] = row[index];
      });
      return item;
    }).filter(function (item) {
      return String(item.id || '').trim() !== '';
    });

    const hasMore = start + rowsToRead < totalRows;

    return {
      ok: true,
      mode: 'paged',
      data: data,
      page: page,
      pageSize: limit,
      hasMore: hasMore,
      nextPage: hasMore ? page + 1 : null,
      total: totalRows,
    };
  });
}

function doPost(e) {
  return withJsonOutput_(function () {
    const payload = parsePayload_(e);
    const action = String(payload.action || '').toLowerCase();

    if (action === 'batch') {
      const batch = Array.isArray(payload.batch) ? payload.batch : [];
      const result = processBatch_(batch);
      return {
        ok: true,
        mode: 'batch',
        processed: result.processed,
        inserted: result.inserted,
        updated: result.updated,
        deleted: result.deleted,
      };
    }

    const result = processEvent_({
      action: payload.action,
      data: payload.data || payload,
      ts: payload.ts || new Date().toISOString(),
    });

    return {
      ok: true,
      mode: 'single',
      result: result,
    };
  });
}

function processBatch_(events) {
  const summary = { processed: 0, inserted: 0, updated: 0, deleted: 0 };
  if (!events.length) return summary;

  const sheet = getSheet_();
  const context = buildSheetContext_(sheet);
  const pendingUpdates = new Map();
  const pendingInserts = new Map();
  const pendingDeletes = new Set();

  events.forEach(function (event) {
    const action = String(event && event.action || '').toLowerCase();
    const data = sanitizeRecord_(event && event.data ? event.data : {});
    const id = String(data.id || '').trim();
    if (!id) throw new Error('Falta el campo id');

    summary.processed++;

    if (action === 'delete') {
      if (pendingInserts.has(id)) {
        pendingInserts.delete(id);
        summary.inserted = Math.max(0, summary.inserted - 1);
        return;
      }

      const rowIndex = context.idToRow[id];
      if (rowIndex > 0) {
        pendingUpdates.delete(rowIndex);
        pendingDeletes.add(rowIndex);
        delete context.idToRow[id];
        summary.deleted++;
      }
      return;
    }

    const rowValues = context.headers.map(function (header) {
      return header in data ? data[header] : '';
    });
    const rowIndex = context.idToRow[id];

    if (rowIndex > 0 && !pendingDeletes.has(rowIndex)) {
      if (!pendingUpdates.has(rowIndex)) summary.updated++;
      pendingUpdates.set(rowIndex, rowValues);
      return;
    }

    if (!pendingInserts.has(id)) summary.inserted++;
    pendingInserts.set(id, rowValues);
  });

  writeUpdates_(sheet, pendingUpdates, context.headers.length);
  appendRows_(sheet, Array.from(pendingInserts.values()), context.headers.length);
  deleteRowsDescending_(sheet, Array.from(pendingDeletes));

  return summary;
}

function processEvent_(event) {
  const action = String(event && event.action || '').toLowerCase();
  const data = sanitizeRecord_(event && event.data ? event.data : {});
  const id = String(data.id || '').trim();
  if (!id) throw new Error('Falta el campo id');

  const sheet = getSheet_();
  const headers = getHeaders_(sheet);
  const rowIndex = findRowById_(sheet, headers, id);

  if (action === 'delete') {
    if (rowIndex > 0) {
      sheet.deleteRow(rowIndex);
      return 'deleted';
    }
    return 'not_found';
  }

  const rowValues = headers.map(function (header) {
    return header in data ? data[header] : '';
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
    return 'updated';
  }

  sheet.appendRow(rowValues);
  return 'inserted';
}

function sanitizeRecord_(data) {
  const record = {};
  Object.keys(data || {}).forEach(function (key) {
    record[normalizeHeader_(key)] = data[key];
  });
  return record;
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('No existe la hoja: ' + SHEET_NAME);
  return sheet;
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) throw new Error('La hoja no tiene encabezados');
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(normalizeHeader_);
}

function buildSheetContext_(sheet) {
  const headers = getHeaders_(sheet);
  const idColumnIndex = headers.indexOf('id');
  if (idColumnIndex === -1) throw new Error('Falta la columna id en la hoja');

  const lastRow = sheet.getLastRow();
  const idToRow = {};
  if (lastRow >= 2) {
    const values = sheet.getRange(2, idColumnIndex + 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      const id = String(values[i][0] || '').trim();
      if (id) idToRow[id] = i + 2;
    }
  }

  return { headers: headers, idColumnIndex: idColumnIndex, idToRow: idToRow };
}

function writeUpdates_(sheet, updatesMap, columnCount) {
  const rows = Array.from(updatesMap.entries()).sort(function (a, b) { return a[0] - b[0]; });
  if (!rows.length) return;

  var groupStart = rows[0][0];
  var groupValues = [rows[0][1]];
  var previousRow = rows[0][0];

  for (var i = 1; i < rows.length; i++) {
    var rowIndex = rows[i][0];
    var values = rows[i][1];
    if (rowIndex === previousRow + 1) {
      groupValues.push(values);
    } else {
      sheet.getRange(groupStart, 1, groupValues.length, columnCount).setValues(groupValues);
      groupStart = rowIndex;
      groupValues = [values];
    }
    previousRow = rowIndex;
  }

  sheet.getRange(groupStart, 1, groupValues.length, columnCount).setValues(groupValues);
}

function appendRows_(sheet, rows, columnCount) {
  if (!rows.length) return;

  const currentLastRow = Math.max(sheet.getLastRow(), 1);
  const requiredLastRow = currentLastRow + rows.length;
  const missingRows = requiredLastRow - sheet.getMaxRows();
  if (missingRows > 0) {
    sheet.insertRowsAfter(sheet.getMaxRows(), missingRows);
  }

  sheet.getRange(currentLastRow + 1, 1, rows.length, columnCount).setValues(rows);
}

function deleteRowsDescending_(sheet, rowIndexes) {
  if (!rowIndexes.length) return;

  const sorted = rowIndexes.slice().sort(function (a, b) { return b - a; });
  var start = sorted[0];
  var count = 1;

  for (var i = 1; i < sorted.length; i++) {
    if (sorted[i] === start - count) {
      count++;
    } else {
      sheet.deleteRows(start - count + 1, count);
      start = sorted[i];
      count = 1;
    }
  }

  sheet.deleteRows(start - count + 1, count);
}

function findRowById_(sheet, headers, id) {
  const idColumnIndex = headers.indexOf('id');
  if (idColumnIndex === -1) throw new Error('Falta la columna id en la hoja');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const values = sheet.getRange(2, idColumnIndex + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === id) return i + 2;
  }
  return -1;
}

function normalizeHeader_(value) {
  return String(value || '').trim();
}

function parsePayload_(e) {
  if (!e) return {};

  if (e.postData && e.postData.contents) {
    var raw = String(e.postData.contents || '').trim();
    if (raw) {
      if (raw.charAt(0) === '{') return JSON.parse(raw);
      if (raw.indexOf('payload=') === 0) return JSON.parse(decodeURIComponent(raw.slice(8)));
    }
  }

  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  return {};
}

function withJsonOutput_(fn) {
  try {
    var payload = fn();
    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: String(err && err.message ? err.message : err),
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
