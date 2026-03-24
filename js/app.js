    // --- PWA SERVICE WORKER REGISTRATION ---

    if ('serviceWorker' in navigator) {

      window.addEventListener('load', () => {

        navigator.serviceWorker.register('./sw.js?v=1.3.12')

          .then(reg => console.log('SW registrado', reg))

          .catch(err => console.error('Error SW', err));

      });

    }



    
    function toggleDebug() {
      const ce = document.getElementById('debugConsole');
      if (!ce) return;
      ce.style.display = (ce.style.display === 'none' || !ce.style.display) ? 'block' : 'none';
    }

// Global Error Handler for mobile debugging

    let tapCount = 0;

    function debugLog(msg, isError = false) {

      console.log(msg);

      const dbg = document.getElementById('debugContent');

      const consoleEl = document.getElementById('debugConsole');

      if (dbg) {

        const line = document.createElement('div');

        line.style.color = isError ? '#ff4444' : '#00ff00';

        line.style.borderBottom = '1px solid rgba(0,255,0,0.1)';

        line.style.padding = '4px 0';

        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;

        dbg.appendChild(line);

        if (isError && consoleEl) consoleEl.style.display = 'block';

      }

    }



    // Diagnostics & Force Update

    window.checkDiagnostics = function() {

      debugLog("🔍 Diagnosticando...");

      debugLog(`Library jsQR: ${window.jsQR ? '✅ OK' : '❌ MISSING'}`);

      if (window.jsQRError) debugLog("❌ Error detectado en descarga de jsQR", true);

      debugLog(`User Agent: ${navigator.userAgent.substring(0, 50)}...`);

    };



    window.forceAppUpdate = async function() {

      debugLog("Forzando actualizacion...");

      if ('serviceWorker' in navigator) {

        const regs = await navigator.serviceWorker.getRegistrations();

        for (let r of regs) await r.unregister();

        debugLog("Service Worker eliminado");

      }

      if ('caches' in window) {

        const keys = await caches.keys();

        await Promise.all(keys.map(k => caches.delete(k)));

        debugLog("Cache del navegador limpiada");

      }

      localStorage.removeItem('juntasData');

      debugLog("Datos locales limpiados. Recargando...");

      setTimeout(() => window.location.reload(true), 500);

    };



    window.onerror = function(msg, url, lineNo, columnNo, error) {

      debugLog(`ERR: ${msg} (L:${lineNo})`, true);

      return false;

    };



    // Secret trigger: Tap title 5 times to show console

    window.handleDebugTap = function() {

      tapCount++;

      if (tapCount >= 5) {

        const ce = document.getElementById('debugConsole');

        if (ce) ce.style.display = (ce.style.display === 'none' ? 'block' : 'none');

        tapCount = 0;

      }

    };

    window.inspectCurrentJunta = function() {
      try {
        const dbg = document.getElementById('debugConsole');
        if (dbg) dbg.style.display = 'block';

        if (!currentQRData || !currentQRData.id) {
          debugLog('INSPECT: no hay junta seleccionada', true);
          return;
        }

        const current = JUNTAS.find(j => j.id === currentQRData.id) || null;
        const storedRaw = localStorage.getItem('juntasData');
        let storedItem = null;

        if (storedRaw) {
          try {
            const parsed = JSON.parse(storedRaw);
            if (Array.isArray(parsed)) {
              storedItem = parsed.find(j => String(j.id) === String(currentQRData.id)) || null;
            }
          } catch (err) {
            debugLog(`INSPECT localStorage parse error: ${err.message}`, true);
          }
        }

        debugLog(`INSPECT ID: ${currentQRData.id}`);
        debugLog(`MEM current.status=${current?.status} current.STATUS=${current?.STATUS} current.spoolCompleto=${current?.spoolCompleto} current["Spool Completo"]=${current?.['Spool Completo']}`);
        debugLog(`LOCAL raw.status=${storedItem?.status} raw.STATUS=${storedItem?.STATUS} raw.spoolCompleto=${storedItem?.spoolCompleto} raw["Spool Completo"]=${storedItem?.['Spool Completo']}`);
        debugLog(`MEM current.rechazada=${current?.rechazada} LOCAL raw.rechazada=${storedItem?.rechazada}`);
        debugLog(`MEM full=${JSON.stringify(current)}`);
        debugLog(`LOCAL full=${JSON.stringify(storedItem)}`);
      } catch (err) {
        debugLog(`INSPECT error: ${err.message}`, true);
      }
    };

    window.inspectRemoteJunta = async function() {
      try {
        const dbg = document.getElementById('debugConsole');
        if (dbg) dbg.style.display = 'block';

        if (!currentQRData || !currentQRData.id) {
          debugLog('REMOTE INSPECT: no hay junta seleccionada', true);
          return;
        }

        debugLog(`REMOTE INSPECT start id=${currentQRData.id}`);
        const res = await fetch(API_URL, { method: 'GET', cache: 'no-store' });
        const text = await res.text();
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          debugLog(`REMOTE INSPECT JSON parse error: ${err.message}`, true);
          debugLog(`REMOTE raw text=${text.slice(0, 500)}`, true);
          return;
        }

        if (!Array.isArray(parsed)) {
          debugLog(`REMOTE INSPECT respuesta no array: ${JSON.stringify(parsed).slice(0, 500)}`, true);
          return;
        }

        const rawItem = parsed.find(j => String(j.id || j.ID || '') === String(currentQRData.id)) || null;
        debugLog(`REMOTE raw.status=${rawItem?.status} raw.STATUS=${rawItem?.STATUS} raw.spoolCompleto=${rawItem?.spoolCompleto} raw["Spool Completo"]=${rawItem?.['Spool Completo']} raw["Spool clompleto"]=${rawItem?.['Spool clompleto']}`);
        debugLog(`REMOTE raw.rechazada=${rawItem?.rechazada} raw.Rechazada=${rawItem?.Rechazada}`);
        debugLog(`REMOTE full=${JSON.stringify(rawItem)}`);
      } catch (err) {
        debugLog(`REMOTE INSPECT error: ${err.message}`, true);
      }
    };



    if (window.jsQR) debugLog("📚 jsQR library detected");

    else debugLog("⚠️ jsQR library NOT detected yet", true);



    debugLog("Script v1.3.12 ready");

    checkDiagnostics();



    // --- DATA ---

    const API_URL = "https://script.google.com/macros/s/AKfycbzTJv7PtUMErp2ixO7BnwgXFyxwsLHwi4Y5Iv-5PdQeF0RBfMMx6w0zl8BFZ1V_q5YB/exec";

    // --- OFFLINE QUEUE (IndexedDB) ---
    const DB_NAME = 'trazabilidadDB';
    const DB_VERSION = 2;
    const STORE_QUEUE = 'queue';
    const STORE_HISTORY = 'history';

    function openEventsDB() {
      return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) return resolve(null);
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_QUEUE)) {
            db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
          }
          if (!db.objectStoreNames.contains(STORE_HISTORY)) {
            db.createObjectStore(STORE_HISTORY, { keyPath: 'id', autoIncrement: true });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    async function addToStore(storeName, payload) {
      const db = await openEventsDB();
      if (!db) return;
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).add(payload);
    }

    async function getAllFromStore(storeName) {
      const db = await openEventsDB();
      if (!db) return [];
      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }

    async function deleteFromStore(storeName, key) {
      const db = await openEventsDB();
      if (!db) return;
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
    }

    async function recordHistory(action, item) {
      const payload = { action, data: item, ts: new Date().toISOString() };
      await addToStore(STORE_HISTORY, payload);
    }

    async function enqueueSync(action, item) {
      const payload = { action, data: item, ts: new Date().toISOString() };
      await addToStore(STORE_QUEUE, payload);
    }

    
    async function hasPendingQueue() {
      const items = await getAllFromStore(STORE_QUEUE);
      return items.length > 0;
    }

async function syncQueue() {
      if (!navigator.onLine) return;
      const items = await getAllFromStore(STORE_QUEUE);
      if (!items.length) return;
      setSyncStatus('Sincronizando cola...', 'warn');
      let failed = false;
      for (const ev of items) {
        try {
          await postToSheets(ev.action, ev.data, ev.ts);
          await deleteFromStore(STORE_QUEUE, ev.id);
        } catch (err) {
          console.error('Error sync queue:', err);
          setSyncStatus('Error al sincronizar cola', 'err');
          failed = true;
          break;
        }
      }
      if (!failed) setSyncStatus('Sincronizado...', 'ok');
    }


    

    const INITIAL_JUNTAS = [

      // ÁREA 103

      { id:'J-103-01', area:'103', linea:'103-001', spool:'1', junta:'1', diam:'4.00',  fecha:'05/01/25', raiz:'W07',  rellterm:'W07',  colada:'L7',  colada16:'sin identificacion', doc:'AH92-00-P-IS-1001', rev:'0', hoja:'1', piping:'CA11', status:'ok'      },

      { id:'J-103-02', area:'103', linea:'103-001', spool:'1', junta:'2', diam:'4.00',  fecha:'—',        raiz:'W07',  rellterm:'W07',  colada:'L7',  colada16:'sin identificacion', doc:'AH92-00-P-IS-1001', rev:'0', hoja:'1', piping:'CA11', status:'pending' },

      { id:'J-103-03', area:'103', linea:'103-002', spool:'2', junta:'1', diam:'6.00',  fecha:'07/01/25', raiz:'GTAW', rellterm:'GTAW', colada:'M4',  colada16:'CE-2001',            doc:'AH92-00-P-IS-1002', rev:'1', hoja:'2', piping:'CB22', status:'ok'      },

      { id:'J-103-04', area:'103', linea:'103-002', spool:'2', junta:'2', diam:'6.00',  fecha:'08/01/25', raiz:'GTAW', rellterm:'GTAW', colada:'M4',  colada16:'CE-2001',            doc:'AH92-00-P-IS-1002', rev:'1', hoja:'2', piping:'CB22', status:'nok'     },

      // ÁREA 300

      { id:'J-300-01', area:'300', linea:'300-001', spool:'1', junta:'1', diam:'1.00',  fecha:'12/03/25', raiz:'W07',  rellterm:'W07',  colada:'L7',  colada16:'sin identificacion', doc:'AH92-00-P-IS-1003', rev:'0', hoja:'2', piping:'CA11', status:'ok'      },

      { id:'J-300-02', area:'300', linea:'300-002', spool:'1', junta:'2', diam:'6.00',  fecha:'—',        raiz:'W07',  rellterm:'W07',  colada:'L7',  colada16:'sin identificacion', doc:'AH92-00-P-IS-1003', rev:'0', hoja:'2', piping:'CA11', status:'pending' },

      { id:'J-300-03', area:'300', linea:'300-001', spool:'2', junta:'3', diam:'3.00',  fecha:'14/03/25', raiz:'GTAW', rellterm:'GTAW', colada:'M4',  colada16:'CE-2847',            doc:'AH92-00-P-IS-1005', rev:'1', hoja:'3', piping:'CB22', status:'ok'      },

      { id:'J-300-04', area:'300', linea:'300-003', spool:'2', junta:'4', diam:'10.00', fecha:'10/03/25', raiz:'SMAW', rellterm:'SMAW', colada:'K9',  colada16:'sin identificacion', doc:'AH92-00-P-IS-1010', rev:'2', hoja:'5', piping:'CA11', status:'nok'     },

      { id:'J-300-05', area:'300', linea:'300-002', spool:'3', junta:'5', diam:'4.00',  fecha:'15/03/25', raiz:'TIG',  rellterm:'TIG',  colada:'P2',  colada16:'CE-9912',            doc:'AH92-00-P-IS-1003', rev:'0', hoja:'4', piping:'CD33', status:'ok'      },

      { id:'J-300-06', area:'300', linea:'300-004', spool:'3', junta:'6', diam:'3.00',  fecha:'—',        raiz:'SMAW', rellterm:'SMAW', colada:'L7',  colada16:'sin identificacion', doc:'AH92-00-P-IS-1008', rev:'0', hoja:'2', piping:'CA11', status:'pending' },

      { id:'J-300-07', area:'300', linea:'300-004', spool:'4', junta:'7', diam:'2.00',  fecha:'16/03/25', raiz:'TIG',  rellterm:'TIG',  colada:'P2',  colada16:'CE-1100',            doc:'AH92-00-P-IS-1008', rev:'0', hoja:'2', piping:'CA11', status:'ok'      },

      // ÁREA 305

      { id:'J-305-01', area:'305', linea:'305-001', spool:'1', junta:'1', diam:'8.00',  fecha:'02/02/25', raiz:'TIG',  rellterm:'TIG',  colada:'R3',  colada16:'CE-3301',            doc:'AH92-00-P-IS-2001', rev:'0', hoja:'1', piping:'CA11', status:'ok'      },

      { id:'J-305-02', area:'305', linea:'305-001', spool:'1', junta:'2', diam:'8.00',  fecha:'—',        raiz:'TIG',  rellterm:'TIG',  colada:'R3',  colada16:'sin identificacion', doc:'AH92-00-P-IS-2001', rev:'0', hoja:'1', piping:'CA11', status:'pending' },

      { id:'J-305-03', area:'305', linea:'305-002', spool:'2', junta:'1', diam:'12.00', fecha:'05/02/25', raiz:'SMAW', rellterm:'SMAW', colada:'K9',  colada16:'sin identificacion', doc:'AH92-00-P-IS-2002', rev:'1', hoja:'2', piping:'CB22', status:'ok'      },

      // ÁREA OFF SKID

      { id:'J-OS-01',  area:'OFF SKID', linea:'OS-001', spool:'1', junta:'1', diam:'6.00',  fecha:'20/02/25', raiz:'GTAW', rellterm:'GTAW', colada:'M4',  colada16:'CE-5501',     doc:'AH92-00-P-IS-3001', rev:'0', hoja:'1', piping:'CD33', status:'ok'      },

      { id:'J-OS-02',  area:'OFF SKID', linea:'OS-001', spool:'1', junta:'2', diam:'6.00',  fecha:'21/02/25', raiz:'GTAW', rellterm:'GTAW', colada:'M4',  colada16:'CE-5501',     doc:'AH92-00-P-IS-3001', rev:'0', hoja:'1', piping:'CD33', status:'nok'     },

      { id:'J-OS-03',  area:'OFF SKID', linea:'OS-002', spool:'2', junta:'1', diam:'4.00',  fecha:'—',        raiz:'W07',  rellterm:'W07',  colada:'L7',  colada16:'sin identificacion', doc:'AH92-00-P-IS-3002', rev:'0', hoja:'2', piping:'CA11', status:'pending' },

    ];



    let JUNTAS = [];



    // Cargar datos (Sheets -> LocalStorage -> UI)

    async function initData() {

      debugLog("Iniciando initData...");

      showToast('Sincronizando...');

      setSyncStatus('Sincronizando...', 'warn');



      try {

        debugLog("Fetching API...");

        const controller = new AbortController();

        const timeoutId = setTimeout(() => controller.abort(), 12000);



        const response = await fetch(API_URL, {

          signal: controller.signal,

          mode: 'cors',

          cache: 'no-store'

        });

        clearTimeout(timeoutId);



        debugLog(`Status: ${response.status}`);



        if (!response.ok) {

          throw new Error(`Error en servidor: ${response.status} ${response.statusText}`);

        }



        const data = await response.json();

        const payload = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

        console.log("Datos recibidos:", payload ? payload.length : 0, "registros");



        if (payload && payload.length > 0) {
          const pending = await hasPendingQueue();
          const remoteList = sanitizeJuntasNormalized(payload);
          JUNTAS = remoteList;
          saveToLocalStorage();

          if (pending) {
            showToast('Datos actualizados desde Sheets. Hay pendientes locales en cola');
            setSyncStatus('Pendientes por sincronizar', 'warn');
          } else {
            showToast('Datos sincronizados desde Sheets');
            setSyncStatus('Sincronizado...', 'ok');
          }

        } else if (data && data.error === 'network_error') {

          throw new Error("Error de red detectado por Service Worker");

        } else {

          console.warn("API retorno datos vacios o no validos");

          loadFromLocalStorage();

          showToast('No hay datos en la nube');

          setSyncStatus('Sin datos en la nube', 'warn');

        }

      } catch (err) {

        console.error("Error fatal en initData:", err);

        let msg = 'Modo Local (Sin conexion)';



        if (err.name === 'AbortError') msg = 'Tiempo de espera agotado';

        else if (err.message.includes('Failed to fetch')) msg = 'Error de conexion (HTTPS/CORS?)';

        else if (err.message.includes('NetworkError')) msg = 'Error de red movil';



        loadFromLocalStorage();

        showToast(msg);

        setSyncStatus(msg, 'err');

      }



      renderMainList();

      initFilterChips();

    }



    function loadFromLocalStorage() {

      const stored = localStorage.getItem('juntasData');

      if (stored) {

        JUNTAS = sanitizeJuntasNormalized(JSON.parse(stored));

      } else {

        JUNTAS = sanitizeJuntasNormalized(INITIAL_JUNTAS);

        saveToLocalStorage();

      }

    }



    function saveToLocalStorage() {

      localStorage.setItem('juntasData', JSON.stringify(JUNTAS));

    }

    async function postToSheets(action, item, ts = new Date().toISOString()) {
      const sheetAliases = item ? {
        STATUS: item.status ?? '',
        Status: item.status ?? '',
        status: item.status ?? '',
        Estado: item.status ?? '',
        estado: item.status ?? '',
        Fecha: item.fecha ?? '',
        Spool: item.spool ?? '',
        'Fecha Spool': item.spoolFecha ?? '',
        'Spool Fecha': item.spoolFecha ?? '',
        spoolFecha: item.spoolFecha ?? '',
        Canista: item.canista ?? '',
        canista: item.canista ?? '',
        'Cañista': item.canista ?? '',
        'Spool Completo': item.spoolCompleto ?? '',
        'Spool clompleto': item.spoolCompleto ?? '',
        'Spool Clompleto': item.spoolCompleto ?? '',
        'Spool completo': item.spoolCompleto ?? '',
        'SPOOL COMPLETO': item.spoolCompleto ?? '',
        spoolCompleto: item.spoolCompleto ?? '',
        Rechazada: item.rechazada ?? false,
        rechazada: item.rechazada ?? false,
        Sch: item.sch ?? '',
        Tipo: item.tipo ?? '',
        Clase: item.clase ?? '',
        Factor: item.factor ?? ''
      } : {};
      const payload = { action, data: { ...(item || {}), ...sheetAliases }, ts, ...(item || {}), ...sheetAliases };
      const json = JSON.stringify(payload);

      const trySend = async (contentType, body) => {
        const res = await fetch(API_URL, {
          method: 'POST',
          mode: 'cors',
          cache: 'no-store',
          redirect: 'follow',
          headers: { 'Content-Type': contentType },
          body
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentTypeResp = (res.headers.get('content-type') || '').toLowerCase();
        const raw = await res.text();
        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch (_) {}
        if (parsed && (parsed.ok === false || parsed.success === false || parsed.error)) {
          throw new Error(`API rechazo guardado: ${JSON.stringify(parsed)}`);
        }
        if (!parsed && contentTypeResp.includes('text/html')) {
          throw new Error('API devolvio HTML en vez de JSON (revisar deploy/permisos)');
        }
        return { parsed, raw };
      };

      try {
        // Preferred for Apps Script from browser: avoids CORS preflight.
        return await trySend('text/plain;charset=utf-8', json);
      } catch (errPlain) {
        // Fallback for scripts reading e.parameter.payload
        try {
          return await trySend('application/x-www-form-urlencoded;charset=UTF-8', `payload=${encodeURIComponent(json)}`);
        } catch (errForm) {
          throw new Error(`No se pudo sincronizar (plain: ${errPlain.message}; form: ${errForm.message})`);
        }
      }
    }



    async function syncWithSheets(action, item) {

      try {

        if (!navigator.onLine) {
          await enqueueSync(action, item);
          setSyncStatus('Sin conexion. En cola para sincronizar', 'warn');
          return;
        }

        await postToSheets(action, item);
        setSyncStatus('Sincronizado...', 'ok');

      } catch (err) {

        console.error("Error syncing:", err);

        await enqueueSync(action, item);
        setSyncStatus('Guardado local. En cola para sincronizar', 'warn');
        showToast('Guardado local. Se sincroniza cuando haya conexion');

      }

    }

    // --- HELPERS ---

    function statusClass(s)  { return s === 'ok' ? 'status-ok' : s === 'pending' ? 'status-pending' : 'status-nok'; }

    function statusBadge(s)  { return s === 'ok' ? '<span class="status-badge sb-ok">OK</span>' : s === 'pending' ? '<span class="status-badge sb-pending">PEND.</span>' : '<span class="status-badge sb-nok">RECH.</span>'; }

  

    function normalizeDate(fecha) {

      if (!fecha || fecha === '—' || fecha === '-') return '—';

      if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) return fecha;

      try {

        let d;

        if (typeof fecha === 'string' && fecha.includes('T')) d = new Date(fecha);

        else if (typeof fecha === 'string' && fecha.includes('/')) {

          const parts = fecha.split(' ')[0].split('/');

          if (parts.length === 3) {

            const day = parts[0].padStart(2, '0');

            const month = parts[1].padStart(2, '0');

            let year = parts[2];

            if (year.length === 2) year = '20' + year;

            return `${day}/${month}/${year}`;

          }

        }

        if (d && !isNaN(d.getTime())) {

          return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

        }

      } catch (e) {}

      return String(fecha).split(' ')[0];

    }



    function formatNum(n) {

      if (isNaN(n)) return '0,00';

      return parseFloat(n).toFixed(2).replace('.', ',');

    }



    function normalizeFieldKey(value) {
      return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function getField(obj, ...keys) {
      if (!obj || typeof obj !== 'object') return undefined;
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
      }
      const entries = Object.keys(obj);
      for (const key of keys) {
        const match = entries.find(entry => normalizeFieldKey(entry) === normalizeFieldKey(key));
        if (match && obj[match] !== undefined && obj[match] !== null && obj[match] !== '') return obj[match];
      }
      return undefined;
    }

    function normalizeStoredText(value, fallback = '—') {
      const raw = String(value ?? '').trim();
      return raw ? raw : fallback;
    }

    function normalizeStoredTextOrBlank(value) {
      return String(value ?? '').trim();
    }

    function isTruthyValue(value) {
      return ['si', 'yes', 'true', '1', 'x', 'checked', 'ok'].includes(normalizeFieldKey(value));
    }

    function normalizeSpoolCompleto(value) {
      return isTruthyValue(value) ? 'Si' : 'No';
    }

    function isMissingDateValue(value) {
      const raw = String(value ?? '').trim();
      const normalized = normalizeFieldKey(raw);
      if (!raw || raw === '?' || raw === '-') return true;
      if (['sinfecha', 'null', 'undefined'].includes(normalized)) return true;
      if (!/\d/.test(raw) && raw.length <= 10) return true;
      return !raw || raw === '?' || raw === '-' || raw === 'â€”' || ['sinfecha', 'null', 'undefined'].includes(normalized);
    }

    function deriveStatus(fecha, rechazada, currentStatus) {
      const normalizedStatus = normalizeFieldKey(currentStatus);
      if (rechazada === true || ['nok', 'rech', 'rechazado', 'rejected'].includes(normalizedStatus)) return 'nok';
      if (isMissingDateValue(fecha) || ['pending', 'pend', 'pendiente'].includes(normalizedStatus)) return 'pending';
      return 'ok';
    }

    function sanitizeJuntas(data) {

      if (!Array.isArray(data)) return [];

      return data.map(j => ({

        ...j,

        area:     String(j.area || ''),

        linea:    String(j.linea || ''),

        spool:    String(j.spool || ''),

        junta:    String(j.junta || ''),

        diam:     parseFloat(j.diam || 0).toFixed(2),

        fecha:    normalizeDate(j.fecha),

        raiz:     String(j.raiz || '—'),

        rellterm: String(j.rellterm || '—'),

        colada:   String(j.colada || '—'),

        colada16: String(j.colada16 || 'sin identificacion'),

        doc:      String(j.doc || '—'),

        rev:      String(j.rev || '0'),

        hoja:     String(j.hoja || '1'),

        piping:   String(j.piping || '—'),

        rechazada: Boolean(j.rechazada || String(j.status).toLowerCase() === 'nok'),

        status:   deriveStatus(normalizeDate(j.fecha), Boolean(j.rechazada || String(j.status).toLowerCase() === 'nok'), j.status)

      }));

    }



    function renderDetailListContent(areaCode, f = {}, searchVal = '') {

      let juntas = areaCode === 'TODO' ? JUNTAS : JUNTAS.filter(j => j.area === areaCode);

      if (Object.keys(f).length) juntas = applyFiltersToData(juntas, f);

      

      const v = searchVal.trim().toLowerCase();

      if (v) juntas = juntas.filter(j => j.spool.toLowerCase().includes(v));



      const totalDiam = juntas.reduce((s,j) => s + parseFloat(j.diam), 0);

      const pendingAreaSum = juntas.filter(j => j.fecha === '—').reduce((s,j) => s + parseFloat(j.diam), 0);

      

      const pendingDisplaySum = juntas.filter(j => j.status === 'pending').reduce((s,j) => s + parseFloat(j.diam), 0);
      const dsJuntas = document.getElementById('ds-juntas');

      const dsPulg   = document.getElementById('ds-pulgadas');

      const dsSold   = document.getElementById('ds-soldadas');

      

      if (dsJuntas) dsJuntas.textContent = juntas.length;

      if (dsPulg)   dsPulg.textContent   = totalDiam.toLocaleString('es-AR',{minimumFractionDigits:2});

      if (dsSold)   dsSold.textContent   = pendingDisplaySum.toLocaleString('es-AR',{minimumFractionDigits:2});



      if (!juntas.length) {

        const msg = searchVal ? `Sin resultados para "${searchVal}"` : "Sin resultados para los filtros aplicados";

        return `<div style="text-align:center;padding:40px 20px;color:var(--text-sub);font-family:'IBM Plex Mono',monospace;font-size:13px">${msg}</div>`;

      }

  

      const byLinea = {};

      juntas.forEach(j => { if (!byLinea[j.linea]) byLinea[j.linea]=[]; byLinea[j.linea].push(j); });

  

      let html = '';

      Object.keys(byLinea).sort().forEach(linea => {

        html += `<div class="list-group-label">Linea ${linea}</div>`;

        byLinea[linea].forEach((j, idx) => {

          const delay = (idx * 0.04).toFixed(2);

          html += `

          <div class="flat-row" style="animation-delay:${delay}s" onclick="openEdit('${j.id}')">

            <div class="flat-accent"></div>

            <div class="flat-body">

              <div class="flat-status ${statusClass(j.status)}"></div>

              <div class="flat-col flat-col-linea"><span class="flat-label">Spool</span><span class="flat-value">${j.spool}</span></div>

              <div class="flat-divider"></div>

              <div class="flat-col flat-col-junta"><span class="flat-label">Junta</span><span class="flat-value">${j.junta}</span></div>

              <div class="flat-divider"></div>

              <div class="flat-col flat-col-diam"><span class="flat-label">Diámetro</span><span class="flat-diam-val">Ø ${j.diam}"</span></div>

              <svg class="flat-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>

            </div>

          </div>`;

        });

      });

      return html;

    }

  

    // --- FILTER STATE ---

    let activeFilters = {};

    let currentDetailArea = null;

  

    function initFilterChips() {

      // Área chips

      const areas = [...new Set(JUNTAS.map(j => j.area))].sort();

      document.getElementById('fc-area').innerHTML = areas.map(a =>

        `<label class="fi-chip" data-field="area" data-value="${a}"><input type="checkbox" value="${a}" name="area"><span>${a}</span></label>`

      ).join('');

  

      // Soldador chips

      const raices = [...new Set(JUNTAS.map(j => j.raiz))].sort();

      document.getElementById('fc-raiz').innerHTML = raices.map(r =>

        `<label class="fi-chip" data-field="raiz" data-value="${r}"><input type="checkbox" value="${r}" name="raiz"><span>${r}</span></label>`

      ).join('');

  

      // Inicializar cascada

      updateCascadingFilters();

      updateSoldadaDateRangeVisibility();



      // Delegación de eventos para chips (ya que son dinámicos)

      const filterPanel = document.getElementById('filterPanel');

      filterPanel.onclick = (e) => {

        const chip = e.target.closest('.fi-chip');

        if (chip) {

          setTimeout(() => {

            const input = chip.querySelector('input');

            if (input) {

              chip.classList.toggle('selected', input.checked);

              updateCascadingFilters(chip.dataset.field);

            }

          }, 0);

        }

      };



      // Escuchar cambios en el toggle de SOLDADA?

      document.querySelectorAll('input[name="soldada_toggle"]').forEach(input => {

        input.addEventListener('change', () => {

          updateCascadingFilters('soldada');

          updateSoldadaDateRangeVisibility();

        });

      });

    }



    function updateSoldadaDateRangeVisibility() {

      const group = document.getElementById('soldadaDateRangeGroup');

      if (!group) return;

      const soldadaToggle = document.querySelector('input[name="soldada_toggle"]:checked')?.value || '0';

      const show = soldadaToggle === 'SI';

      group.style.display = show ? 'block' : 'none';

      if (!show) {

        const from = document.getElementById('fv-fecha-desde');

        const to = document.getElementById('fv-fecha-hasta');

        if (from) from.value = '';

        if (to) to.value = '';

      }

    }



    function updateCascadingFilters(triggerField) {

      const esc = (s) => String(s).replace(/"/g, '&quot;');

      

      const soldadaVal = document.querySelector('input[name="soldada_toggle"]:checked')?.value || '0';

      const selectedAreas = [...document.querySelectorAll('input[name="area"]:checked')].map(i => i.value);

      const selectedLines = [...document.querySelectorAll('input[name="linea"]:checked')].map(i => i.value);

      const selectedSpools = [...document.querySelectorAll('input[name="spool"]:checked')].map(i => i.value);

      const selectedRaices = [...document.querySelectorAll('input[name="raiz"]:checked')].map(i => i.value);



      const filterBySoldada = (list) => {

        if (soldadaVal === '0') return list;

        return list.filter(j => {

          const tieneFecha = hasWeldDate(j.fecha);

          return soldadaVal === 'SI' ? tieneFecha : !tieneFecha;

        });

      };



      // 1. Áreas (siempre filtradas por soldada status)

      const filteredForAreas = filterBySoldada(JUNTAS);

      const areas = [...new Set(filteredForAreas.map(j => j.area))].sort();

      const areaContainer = document.getElementById('fc-area');

      areaContainer.innerHTML = areas.map(a => {

        const isSelected = selectedAreas.includes(a);

        return `<label class="fi-chip ${isSelected ? 'selected' : ''}" data-field="area" data-value="${a}"><input type="checkbox" value="${a}" name="area" ${isSelected ? 'checked' : ''}><span>${a}</span></label>`;

      }).join('');



      // 2. Líneas (filtradas por soldada + áreas)

      let filteredForLines = filterBySoldada(JUNTAS);

      const currentAreas = [...document.querySelectorAll('input[name="area"]:checked')].map(i => i.value);

      if (currentAreas.length) filteredForLines = filteredForLines.filter(j => currentAreas.includes(j.area));

      

      const lines = [...new Set(filteredForLines.map(j => j.linea))].sort();

      const lineContainer = document.getElementById('fc-linea');

      lineContainer.innerHTML = lines.map(l => {

        const isSelected = selectedLines.includes(l);

        return `<label class="fi-chip ${isSelected ? 'selected' : ''}" data-field="linea" data-value="${esc(l)}"><input type="checkbox" value="${esc(l)}" name="linea" ${isSelected ? 'checked' : ''}><span>${l}</span></label>`;

      }).join('');



      // 3. Spools (filtradas por soldada + áreas + líneas)

      let filteredForSpools = filteredForLines;

      const currentLines = [...document.querySelectorAll('input[name="linea"]:checked')].map(i => i.value);

      if (currentLines.length) filteredForSpools = filteredForSpools.filter(j => currentLines.includes(j.linea));



      const spools = [...new Set(filteredForSpools.map(j => j.spool))].sort((a,b) => {

        const na = parseInt(a), nb = parseInt(b);

        if (!isNaN(na) && !isNaN(nb)) return na - nb;

        return String(a).localeCompare(String(b), undefined, {numeric: true});

      });

      const spoolContainer = document.getElementById('fc-spool');

      spoolContainer.innerHTML = spools.map(s => {

        const isSelected = selectedSpools.includes(s);

        return `<label class="fi-chip ${isSelected ? 'selected' : ''}" data-field="spool" data-value="${esc(s)}"><input type="checkbox" value="${esc(s)}" name="spool" ${isSelected ? 'checked' : ''}><span>${s}</span></label>`;

      }).join('');



      // 4. Juntas

      let filteredForJuntas = filteredForSpools;

      const currentSpools = [...document.querySelectorAll('input[name="spool"]:checked')].map(i => i.value);

      if (currentSpools.length) filteredForJuntas = filteredForJuntas.filter(j => currentSpools.includes(j.spool));



      const juntas = [...new Set(filteredForJuntas.map(j => j.junta))].sort((a,b) => {

        const na = parseInt(a), nb = parseInt(b);

        if (!isNaN(na) && !isNaN(nb)) return na - nb;

        return String(a).localeCompare(String(b), undefined, {numeric: true});

      });

      const juntaContainer = document.getElementById('fc-junta');

      const currentJuntasChecked = [...document.querySelectorAll('input[name="junta"]:checked')].map(i => i.value);

      juntaContainer.innerHTML = juntas.map(j => {

        const isSelected = currentJuntasChecked.includes(j);

        return `<label class="fi-chip ${isSelected ? 'selected' : ''}" data-field="junta" data-value="${esc(j)}"><input type="checkbox" value="${esc(j)}" name="junta" ${isSelected ? 'checked' : ''}><span>${j}</span></label>`;

      }).join('');



      // 5. Soldador (filtrado por todo lo anterior)

      const raices = [...new Set(filteredForJuntas.map(j => j.raiz))].sort();

      const raizContainer = document.getElementById('fc-raiz');

      raizContainer.innerHTML = raices.map(r => {

        const isSelected = selectedRaices.includes(r);

        return `<label class="fi-chip ${isSelected ? 'selected' : ''}" data-field="raiz" data-value="${esc(r)}"><input type="checkbox" value="${esc(r)}" name="raiz" ${isSelected ? 'checked' : ''}><span>${r}</span></label>`;

      }).join('');

    }

  

    function getFilterValues() {

      const f = {};

      ['area','raiz','linea','spool','junta'].forEach(name => {

        const checked = [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);

        if (checked.length) f[name] = checked;

      });



      const soldadaToggle = document.querySelector('input[name="soldada_toggle"]:checked')?.value;

      if (soldadaToggle && soldadaToggle !== '0') f.soldada = soldadaToggle;

      if (soldadaToggle === 'SI') {

        const fechaDesde = document.getElementById('fv-fecha-desde')?.value || '';

        const fechaHasta = document.getElementById('fv-fecha-hasta')?.value || '';

        if (fechaDesde) f.fechaDesde = fechaDesde;

        if (fechaHasta) f.fechaHasta = fechaHasta;

      }



      const dMin = document.getElementById('fv-diam-min')?.value || '';

      const dMax = document.getElementById('fv-diam-max')?.value || '';

      if (dMin !== '') f.diamMin = parseFloat(dMin);

      if (dMax !== '') f.diamMax = parseFloat(dMax);

      return f;

    }

    function sanitizeJuntasNormalized(data) {

      if (!Array.isArray(data)) return [];

      return data.map(j => {
        const fecha = normalizeDate(getField(j, 'fecha', 'Fecha', 'FECHA'));
        const statusRaw = getField(j, 'status', 'STATUS', 'estado', 'Estado') || '';
        const rechazada = isTruthyValue(getField(j, 'rechazada', 'Rechazada')) || ['nok', 'rech', 'rechazado'].includes(normalizeFieldKey(statusRaw));

        return {
          ...j,
          id: String(getField(j, 'id', 'ID') || ''),
          area: String(getField(j, 'area', 'Area', 'AREA') || ''),
          linea: String(getField(j, 'linea', 'Linea', 'LINEA', 'Linea N°', 'Línea N°') || ''),
          spool: String(getField(j, 'spool', 'Spool', 'SPOOL') || ''),
          junta: String(getField(j, 'junta', 'Junta', 'JUNTA', 'Junta N°') || ''),
          diam: parseFloat(getField(j, 'diam', 'Diam', 'DIAM', 'diametro', 'Diametro', 'DIAMETRO') || 0).toFixed(2),
          fecha,
          raiz: normalizeStoredText(getField(j, 'raiz', 'Raiz', 'RAIZ')),
          rellterm: normalizeStoredText(getField(j, 'rellterm', 'RellTerm', 'Rell-Term', 'RELLTERM')),
          colada: normalizeStoredText(getField(j, 'colada', 'Colada', 'COLADA')),
          colada16: normalizeStoredText(getField(j, 'colada16', 'Colada16', 'COLADA16', 'Colada_16'), 'sin identificacion'),
          doc: normalizeStoredText(getField(j, 'doc', 'Doc', 'DOC')),
          rev: String(getField(j, 'rev', 'Rev', 'REV') || '0'),
          hoja: String(getField(j, 'hoja', 'Hoja', 'HOJA') || '1'),
          piping: normalizeStoredText(getField(j, 'piping', 'Piping', 'Piping Class', 'PIPING')),
          sch: normalizeStoredTextOrBlank(getField(j, 'sch', 'Sch', 'SCH')),
          tipo: normalizeStoredTextOrBlank(getField(j, 'tipo', 'Tipo', 'TIPO')),
          clase: normalizeStoredTextOrBlank(getField(j, 'clase', 'Clase', 'CLASE')),
          factor: normalizeStoredTextOrBlank(getField(j, 'factor', 'Factor', 'FACTOR')),
          spoolFecha: normalizeDate(getField(j, 'spoolFecha', 'Fecha Spool', 'Spool Fecha', 'FechaSpool')),
          canista: normalizeStoredTextOrBlank(getField(j, 'canista', 'Canista', 'Cañista')),
          spoolCompleto: normalizeSpoolCompleto(getField(j, 'spoolCompleto', 'Spool Completo', 'SpoolCompleto', 'Spool clompleto', 'Spool Clompleto')),
          rechazada,
          status: deriveStatus(fecha, rechazada, statusRaw)
        };
      });

    }

    function validateSoldadaDateRange() {
      const soldadaToggle = document.querySelector('input[name="soldada_toggle"]:checked')?.value || '0';
      const fromEl = document.getElementById('fv-fecha-desde');
      const toEl = document.getElementById('fv-fecha-hasta');
      if (!fromEl || !toEl) return { ok: true };

      fromEl.style.borderColor = '';
      toEl.style.borderColor = '';

      if (soldadaToggle !== 'SI') return { ok: true };

      const from = (fromEl.value || '').trim();
      const to = (toEl.value || '').trim();
      if (!from || !to) return { ok: true };

      if (from > to) {
        fromEl.style.borderColor = '#E53935';
        toEl.style.borderColor = '#E53935';
        return { ok: false, message: 'Rango de fecha invalido: "Desde" no puede ser mayor que "Hasta"' };
      }

      return { ok: true };
    }

  

    function hasWeldDate(fecha) {
      if (!fecha) return false;
      const val = String(fecha).trim();
      if (!val) return false;
      const normalized = val.toLowerCase();
      if (normalized === '-' || normalized === '--') return false;
      if (normalized.includes('sin fecha')) return false;
      if (/^[^0-9a-z]+$/i.test(normalized) && !normalized.includes('/')) return false;
      return true;
    }

    function applyFiltersToData(juntas, f) {

      return juntas.filter(j => {

        if (f.area   && !f.area.includes(j.area))   return false;

        if (f.raiz   && !f.raiz.includes(j.raiz))   return false;

        if (f.linea  && !f.linea.includes(j.linea)) return false;

        if (f.spool  && !f.spool.includes(j.spool)) return false;

        if (f.junta  && !f.junta.includes(j.junta)) return false;

        if (f.diamMin !== undefined && parseFloat(j.diam) < f.diamMin) return false;

        if (f.diamMax !== undefined && parseFloat(j.diam) > f.diamMax) return false;

        if (f.soldada) {

          const tieneFecha = hasWeldDate(j.fecha);

          if (f.soldada === 'SI' && !tieneFecha) return false;

          if (f.soldada === 'NO' && tieneFecha) return false;

        }

        if (f.fechaDesde || f.fechaHasta) {

          const fechaJ = parseFechaToDate(j.fecha);

          if (!fechaJ) return false;

          if (f.fechaDesde) {

            const dFrom = new Date(`${f.fechaDesde}T00:00:00`);

            if (fechaJ < dFrom) return false;

          }

          if (f.fechaHasta) {

            const dTo = new Date(`${f.fechaHasta}T23:59:59`);

            if (fechaJ > dTo) return false;

          }

        }

        return true;

      });

    }

  

  

    // --- NAVIGATION ---

    let filterOrigin = 'main'; // 'main' | 'detail'

  

    function toggleFilter(origin) {

      if (origin) filterOrigin = origin;

      document.getElementById('filterPanel').classList.toggle('open');

      document.getElementById('overlay').classList.toggle('open');

    }

  

    function applyFilters() {
      const dateValidation = validateSoldadaDateRange();
      if (!dateValidation.ok) {
        showToast(dateValidation.message || 'Rango de fecha invalido');
        return;
      }

      activeFilters = getFilterValues();

      const hasFilters = Object.keys(activeFilters).length > 0;

  

      document.querySelectorAll('.filter-btn').forEach(btn => {

        btn.classList.toggle('has-filters', hasFilters);

        btn.innerHTML = hasFilters

          ? `<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filtrado`

          : `<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filtrar`;

      });

  

      document.getElementById('filterPanel').classList.remove('open');

      document.getElementById('overlay').classList.remove('open');

  

      if (filterOrigin === 'detail' && currentDetailArea !== null) {

        const base = currentDetailArea === 'TODO' ? JUNTAS : JUNTAS.filter(j => j.area === currentDetailArea);

        const filtered = hasFilters ? applyFiltersToData(base, activeFilters) : base;

        const totalDiam = filtered.reduce((s,j)=>s+parseFloat(j.diam),0);

        document.getElementById('ds-juntas').textContent   = filtered.length;

        document.getElementById('ds-pulgadas').textContent = totalDiam.toLocaleString('es-AR',{minimumFractionDigits:2});

        document.getElementById('ds-soldadas').textContent = filtered.filter(j=>j.status==='ok').length;

        document.getElementById('detailList').innerHTML    = renderDetailListContent(currentDetailArea, activeFilters);

        document.getElementById('detailScreen').classList.add('active');

      } else {

        document.querySelectorAll('.area-row').forEach(row => {

          const code = row.querySelector('.area-code').textContent;

          if (!hasFilters) { row.style.display = ''; row.style.opacity = '1'; return; }

          const match = applyFiltersToData(JUNTAS.filter(j => j.area === code), activeFilters);

          row.style.display = match.length ? '' : 'none';

          if (match.length) {

            const total = match.reduce((s,j)=>s+parseFloat(j.diam),0).toFixed(2);

            const valEl = row.querySelector('.diam-value');

            if (valEl) valEl.textContent = parseFloat(total).toLocaleString('es-AR',{minimumFractionDigits:2});

          }

        });

        document.getElementById('detailScreen').classList.remove('active');

      }

      updateDashboard();

    }

  

    function clearFilters() {

      activeFilters = {};

      document.querySelectorAll('.fi-chip').forEach(c => c.classList.remove('selected'));

      document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);

      

      const toggle0 = document.getElementById('soldada-0');

      if (toggle0) toggle0.checked = true;

      updateSoldadaDateRangeVisibility();



      const dmin = document.getElementById('fv-diam-min'); if (dmin) dmin.value = '';

      const dmax = document.getElementById('fv-diam-max'); if (dmax) dmax.value = '';

      const fDesde = document.getElementById('fv-fecha-desde'); if (fDesde) fDesde.value = '';

      const fHasta = document.getElementById('fv-fecha-hasta'); if (fHasta) fHasta.value = '';

      const jt = document.getElementById('fv-junta'); if (jt) jt.value = '';

      

      // Resetear cascada

      updateCascadingFilters();



      document.querySelectorAll('.filter-btn').forEach(btn => {

        btn.classList.remove('has-filters');

        btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filtrar`;

      });

      document.querySelectorAll('.area-row').forEach(row => {

        row.style.display = '';

        row.style.opacity = '1';

      });
      renderMainList();

      if (currentDetailArea !== null) {

        const juntas = currentDetailArea === 'TODO' ? JUNTAS : JUNTAS.filter(j => j.area === currentDetailArea);

        const totalDiam = juntas.reduce((s,j)=>s+parseFloat(j.diam),0);

        document.getElementById('ds-juntas').textContent   = juntas.length;

        document.getElementById('ds-pulgadas').textContent = totalDiam.toLocaleString('es-AR',{minimumFractionDigits:2});

        document.getElementById('ds-soldadas').textContent = juntas.filter(j=>j.status==='pending').reduce((s,j)=>s + parseFloat(j.diam), 0).toLocaleString('es-AR',{minimumFractionDigits:2});

        document.getElementById('detailList').innerHTML    = renderDetailListContent(currentDetailArea);

      }

      updateDashboard();

    }

  

    function openDetail(code) {

      currentDetailArea = code;

      const juntas    = code === 'TODO' ? JUNTAS : JUNTAS.filter(j => j.area === code);

      const filtered  = Object.keys(activeFilters).length ? applyFiltersToData(juntas, activeFilters) : juntas;

      const totalDiam = filtered.reduce((s, j) => s + parseFloat(j.diam), 0).toFixed(2);

      const pendientes = filtered.filter(j => j.status === 'pending').reduce((s, j) => s + parseFloat(j.diam), 0);

      const lineas    = [...new Set(filtered.map(j => j.linea))].length;

  

      document.getElementById('detailAreaCode').textContent = code;
      const dsSold = document.getElementById('ds-soldadas');
      if (dsSold) dsSold.textContent = pendientes.toLocaleString('es-AR',{minimumFractionDigits:2});

      document.getElementById('detailAreaSub').textContent  = `${filtered.length} juntas · ${lineas} líneas · ${parseFloat(totalDiam).toLocaleString('es-AR',{minimumFractionDigits:2})}"`;

  

      document.getElementById('detailList').innerHTML = renderDetailListContent(code, activeFilters);
      document.getElementById('detailAreaSub').textContent  = `${filtered.length} juntas · ${lineas} lineas · ${parseFloat(totalDiam).toLocaleString('es-AR',{minimumFractionDigits:2})}"`;

      document.getElementById('detailScreen').classList.add('active');

    }

  

    function closeDetail() {

      currentDetailArea = null;

      document.getElementById('detailScreen').classList.remove('active');

      const bar = document.getElementById('detailSearchBar');

      if (bar) bar.style.display = 'none';

      const btn = document.getElementById('detailSearchBtn');

      if (btn) btn.style.background = 'rgba(255,255,255,0.10)';

      const inp = document.getElementById('detailSearchInput');

      if (inp) inp.value = '';

    }

  

    function openEdit(id) {

      const j = JUNTAS.find(item => item.id === id);

      if (!j) {

        showToast('❌ Error: No se encontró la junta ' + id);

        return;

      }



      showToast('📍 Abriendo ' + id);



      document.getElementById('editJuntaId').textContent  = `Junta ${j.junta} · Spool ${j.spool}`;

      document.getElementById('editJuntaSub').textContent = `ÁREA ${j.area} · LÍNEA ${j.linea}`;

      document.getElementById('ef-area').textContent    = j.area;

      document.getElementById('ef-linea').textContent   = j.linea;

      document.getElementById('ef-spool').textContent   = j.spool;

      document.getElementById('ef-junta').textContent   = j.junta;

      document.getElementById('ef-diam').textContent    = j.diam;
      const efSch = document.getElementById('ef-sch'); if (efSch) efSch.textContent = j.sch || '-';
      const efTipo = document.getElementById('ef-tipo'); if (efTipo) efTipo.textContent = j.tipo || '-';
      const efClase = document.getElementById('ef-clase'); if (efClase) efClase.textContent = j.clase || '-';
      const efFactor = document.getElementById('ef-factor'); if (efFactor) efFactor.textContent = j.factor || '-';
      const efSpoolFecha = document.getElementById('ef-spool-fecha'); if (efSpoolFecha) efSpoolFecha.textContent = isMissingDateValue(j.spoolFecha) ? 'Sin fecha' : j.spoolFecha;
      const efCanista = document.getElementById('ef-canista'); if (efCanista) efCanista.textContent = j.canista || '-';
      const efSpoolCompleto = document.getElementById('ef-spool-completo'); if (efSpoolCompleto) efSpoolCompleto.textContent = normalizeSpoolCompleto(j.spoolCompleto);

      document.getElementById('ef-fecha').textContent   = j.fecha === '—' ? 'Sin fecha' : j.fecha;

      document.getElementById('ef-raiz').textContent    = j.raiz;

      document.getElementById('ef-rellterm').textContent = j.rellterm;

      document.getElementById('ef-colada').textContent  = j.colada;

      document.getElementById('ef-colada16').textContent = j.colada16;

      document.getElementById('ef-doc').textContent     = j.doc;

      document.getElementById('ef-rev').textContent     = j.rev;

      document.getElementById('ef-hoja').textContent    = j.hoja;

      document.getElementById('ef-piping').textContent  = j.piping;
      document.getElementById('editJuntaId').textContent  = `Junta ${j.junta} · Spool ${j.spool}`;
      document.getElementById('editJuntaSub').textContent = `AREA ${j.area} · LINEA ${j.linea}`;

  

      ['ef-colada16','ef-fecha'].forEach(eid => {

        const el = document.getElementById(eid);

        el.classList.toggle('empty', el.textContent === 'Sin fecha' || el.textContent === 'sin identificacion');

      });

  

      document.getElementById('editScreen').classList.add('active');

      document.getElementById('editScreen').querySelectorAll('.fields-card').forEach(c => { c.style.animation='none'; c.offsetHeight; c.style.animation=''; });

  

      currentQRData = j;
      debugLog(`OPEN_EDIT ${j.id} status=${j.status} STATUS=${j.STATUS} spoolCompleto=${j.spoolCompleto} spoolCompletoRaw=${j['Spool Completo']}`);

      const qrText = `JUNTA:${j.id}|AREA:${j.area}|LINEA:${j.linea}|SPOOL:${j.spool}|N:${j.junta}|DIAM:${j.diam}`;

      setTimeout(() => drawQR(document.getElementById('qrPreview'), qrText, 3), 50);

    }

  

    function closeEdit() {

      document.getElementById('editScreen').classList.remove('active');

    }

  

    // --- QR ---

    let currentQRData = null;

  

    function drawQR(canvas, text, cellSize=9) {

      if (!window.QRious) {

        console.error("QRious not found");

        return;

      }

      new QRious({

        element: canvas,

        value: text,

        size: 250,

        level: 'M'

      });

    }

  

    function openQR() {

      if (!currentQRData) return;

      const j = currentQRData;

      const qrText = `JUNTA:${j.id}|AREA:${j.area}|LINEA:${j.linea}|SPOOL:${j.spool}|N:${j.junta}|DIAM:${j.diam}`;

      document.getElementById('qrJuntaLabel').textContent = `${j.area} · ${j.linea} · Spool ${j.spool} · Junta ${j.junta}`;

      document.getElementById('qrIdTag').textContent = j.id;

      drawQR(document.getElementById('qrCanvas'), qrText, 9);

      document.getElementById('qrModal').classList.add('open');

    }

  

    function closeQR() {

      document.getElementById('qrModal').classList.remove('open');

    }

  

    function openQRScanner() {

      document.getElementById('qrManualInput').value = '';

      const resultEl = document.getElementById('qrScanResult');

      resultEl.style.display = 'none';

      resultEl.style.background = 'var(--blue-light)';

      resultEl.style.borderColor = '#BBDEFB';

      resultEl.style.color = 'var(--blue-main)';

      document.getElementById('cameraError').style.display = 'none';

      document.getElementById('scannerWrap').style.display = '';

      document.getElementById('scanStatus').style.display = '';

      document.getElementById('scanStatus').textContent = 'Solicitando permiso de cámara...';

      document.getElementById('scanStatus').style.color = '#FFB300';

      document.getElementById('qrScannerModal').classList.add('open');

      setTimeout(startCamera, 400);

    }

  

    function closeQRScanner() {

      stopCamera();

      document.getElementById('qrScannerModal').classList.remove('open');

    }

  

    let cameraStream = null;

    let scanInterval = null;

  

    async function startCamera() {

      const video  = document.getElementById('qrVideo');

      const status = document.getElementById('scanStatus');

      const errBox = document.getElementById('cameraError');

  

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

        errBox.innerHTML = '⚠️ Tu navegador no soporta acceso a cámara.<br><small>Probá con Chrome o Safari actualizado.</small>';

        errBox.style.display = 'block';

        document.getElementById('scannerWrap').style.display = 'none';

        return;

      }

  

      try {

        status.textContent = 'Activando cámara trasera...';

        status.style.color = '#FFB300';

        let stream;

        try {

          stream = await navigator.mediaDevices.getUserMedia({

            video: { 

              facingMode: { exact: 'environment' }, 

              width: { ideal: 1280 }, 

              height: { ideal: 720 },

              focusMode: 'continuous' // Attempt continuous focus

            }

          });

        } catch {

          stream = await navigator.mediaDevices.getUserMedia({

            video: { 

              facingMode: 'environment', 

              width: { ideal: 640 }, 

              height: { ideal: 480 } 

            }

          });

        }

        cameraStream = stream;

        video.srcObject = stream;

        video.setAttribute('playsinline', true);

        video.setAttribute('autoplay', true);

        video.muted = true;

        const playPromise = video.play();

        if (playPromise !== undefined) {

          playPromise

            .then(() => {

              status.textContent = 'Buscando código QR...';

              status.style.color = '#42A5F5';

              startScanLoop();

            })

            .catch(err => {

              status.textContent = 'Tocá la pantalla para activar';

              status.style.color = '#FFB300';

              video.addEventListener('click', () => video.play().then(startScanLoop), { once: true });

            });

        }

      } catch (err) {

        let msg = '⚠️ No se pudo acceder a la cámara.';

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {

          msg = '⚠️ Permiso de cámara denegado.<br><small>Andá a Configuración → Permisos del sitio y habilitá la cámara.</small>';

        } else if (err.name === 'NotFoundError') {

          msg = '⚠️ No se encontró ninguna cámara en este dispositivo.';

        } else if (err.name === 'NotReadableError') {

          msg = '⚠️ La cámara está siendo usada por otra aplicación.';

        }

        errBox.innerHTML = msg;

        errBox.style.display = 'block';

        document.getElementById('scannerWrap').style.display = 'none';

        console.warn('Camera error:', err.name, err.message);

      }

    }

  

    function stopCamera() {

      if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }

      if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }

      const video = document.getElementById('qrVideo');

      video.srcObject = null;

      document.getElementById('scannerWrap').style.display = '';

    }

  

    function startScanLoop() {

      if (!window.jsQR) {

        console.error("❌ jsQR not found in window");

        document.getElementById('scanStatus').textContent = '⚠️ Error: No se pudo cargar el lector'; 

        showToast('❌ El lector QR no está listo');

        return;

      }

      

      console.log("✅ jsQR available. Starting loop.");

      if (scanInterval) clearInterval(scanInterval);

      scanInterval = setInterval(scanFrame, 300);

    }

  

    function scanFrame() {

      const video  = document.getElementById('qrVideo');

      const canvas = document.getElementById('qrScanCanvas');

      const status = document.getElementById('scanStatus');

      

      if (!video.readyState || video.readyState < 2) return;

      if (!window.jsQR) return;



      // Pulse 'Searching' text to show activity

      const dots = (Math.floor(Date.now() / 500) % 4);

      status.textContent = 'Buscando código QR' + '.'.repeat(dots);



      // Scale down image for significantly faster processing

      const maxDim = 512;

      let w = video.videoWidth;

      let h = video.videoHeight;

      if (w > maxDim || h > maxDim) {

        const ratio = Math.min(maxDim / w, maxDim / h);

        w = Math.floor(w * ratio);

        h = Math.floor(h * ratio);

      }



      canvas.width  = w;

      canvas.height = h;

      const ctx = canvas.getContext('2d', { alpha: false });

      ctx.imageSmoothingEnabled = false; // Sharper edges for QR

      ctx.drawImage(video, 0, 0, w, h);

      

      const imageData = ctx.getImageData(0, 0, w, h);

      // 'attemptBoth' is more robust for different lighting/contrast

      const code = window.jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });

      

      if (code && code.data) {

        status.textContent = '✅ QR detectado!';

        status.style.color = '#66BB6A';

        clearInterval(scanInterval);

        scanInterval = null;

        handleScannedCode(code.data);

      }

    }

  

    function handleScannedCode(data) {

      console.log("🔍 Escaneado:", data);

      const idMatch   = data.match(/JUNTA:([^|]+)/);

      const areaMatch = data.match(/AREA:([^|]+)/);

      const idStr = idMatch ? idMatch[1].trim().toLowerCase() : data.trim().toLowerCase();

      

      // Try to find by ID, or fallback to matching components if the full QR format is present

      const found = JUNTAS.find(j => 

        j.id.toLowerCase() === idStr || 

        (areaMatch && j.area === areaMatch[1] && data.includes(`SPOOL:${j.spool}`) && data.includes(`N:${j.junta}`)) ||

        // Extreme fallback: check if any ID is contained in the string

        data.toLowerCase().includes(j.id.toLowerCase())

      );



      const resultEl = document.getElementById('qrScanResult');

      resultEl.style.display = 'block';



      if (found) {

        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        console.log("🎯 QR Match:", found.id);

        

        resultEl.style.background = '#E8F5E9';

        resultEl.style.borderColor = '#A5D6A7';

        resultEl.style.color = '#2E7D32';

        resultEl.innerHTML = `✅ Junta encontrada: <b>${found.id}</b><br>

          Área ${found.area} · L° ${found.linea}<br>

          <small>Redirigiendo...</small>`;

        

        // Auto-open after a small delay to show success

        setTimeout(() => {

          resultEl.style.display = 'none';

          resultEl.innerHTML = '';

          openJuntaFromQR(found.id);

        }, 800);

      } else {

        if (navigator.vibrate) navigator.vibrate(200);

        resultEl.style.background = '#FFF3E0';

        resultEl.style.borderColor = '#FFE0B2';

        resultEl.style.color = '#E65100';

        resultEl.innerHTML = `⚠️ Código detectado pero no coincide:<br>

          <small style="opacity:.7; word-break: break-all;">${data.substring(0,80)}${data.length > 80 ? '...' : ''}</small><br><br>

          <span onclick="if(scanInterval===null){startScanLoop();this.closest('#qrScanResult').style.display='none'}"

            style="display:inline-block;background:var(--blue-main);color:#fff;padding:5px 14px;border-radius:6px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;font-size:12px">

            Reintentar

          </span>`;

      }

    }

  

    function searchByQRId() {

      const input = document.getElementById('qrManualInput').value.trim();

      const resultEl = document.getElementById('qrScanResult');

      if (!input) return;

      const found = JUNTAS.find(j => j.id.toLowerCase() === input.toLowerCase() || (`${j.area}-${j.spool}-${j.junta}`).toLowerCase() === input.toLowerCase());

      resultEl.style.display = 'block';

      if (found) {

        resultEl.style.background = '#E8F5E9';

        resultEl.style.borderColor = '#A5D6A7';

        resultEl.style.color = '#2E7D32';

        resultEl.innerHTML = `✅ Encontrada: <b>${found.id}</b><br>

          Área ${found.area} · L° ${found.linea} · Spool ${found.spool} · Junta ${found.junta}<br><br>

          <span onclick="openJuntaFromQR('${found.id}')"

            style="display:inline-block;margin-top:4px;background:#2E7D32;color:#fff;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-family:'IBM Plex Sans',sans-serif;">

            → Abrir junta

          </span>`;

      } else {

        resultEl.style.background = '#FFEBEE';

        resultEl.style.borderColor = '#FFCDD2';

        resultEl.style.color = '#C62828';

        resultEl.textContent = `❌ No se encontró ninguna junta con ID "${input}"`;

      }

    }

  

    function downloadQR() {

      const canvas = document.getElementById('qrCanvas');

      const link = document.createElement('a');

      link.download = `QR_${currentQRData ? currentQRData.id : 'junta'}.png`;

      link.href = canvas.toDataURL('image/png');

      link.click();

    }

  

    function shareQR() {

      if (!currentQRData) return;

      const text = `Junta ${currentQRData.id} — Área ${currentQRData.area} · Línea ${currentQRData.linea} · Spool ${currentQRData.spool} · Junta ${currentQRData.junta}`;

      if (navigator.share) { navigator.share({ title: 'QR Junta', text }); } else { navigator.clipboard.writeText(text).then(() => alert('Datos copiados al portapapeles')); }

    }



    // --- DELETE ---

    function confirmDelete() {

      if (!currentQRData) return;

      document.getElementById('confirmJuntaId').textContent = currentQRData.id + ' · Área ' + currentQRData.area + ' · L° ' + currentQRData.linea;

      document.getElementById('confirmModal').classList.add('open');

    }

  

    function closeConfirm() { document.getElementById('confirmModal').classList.remove('open'); }

  

    function executeDelete() {

      if (!currentQRData) return;

      const id = currentQRData.id;

      const idx = JUNTAS.findIndex(function(j) { return j.id === id; });

      if (idx !== -1) {

        const itemToRemove = JUNTAS[idx];

        JUNTAS.splice(idx, 1);

        saveToLocalStorage();

        syncWithSheets("delete", itemToRemove);
        recordHistory('delete', itemToRemove);
        updateDashboard();

      }

      closeConfirm();

      closeEdit();

      renderMainList();

      if (currentDetailArea !== null) openDetail(currentDetailArea);

      showToast('🗑️ Junta ' + id + ' eliminada');

    }

  

    // --- FORM MODAL (NUEVO / EDITAR) ---

    let formMode = 'new';

    let editingJuntaId = null;

    function isSpoolCompletoEnabled(value) {
      return normalizeSpoolCompleto(value) === 'Si';
    }

    function injectAfter(referenceNode, html) {
      if (!referenceNode || referenceNode.dataset.injectedAfter) return null;
      referenceNode.insertAdjacentHTML('afterend', html);
      referenceNode.dataset.injectedAfter = 'true';
      return referenceNode.nextElementSibling;
    }

    function ensureExtendedFormFields() {
      const formSections = Array.from(document.querySelectorAll('.form-section-title'));
      const identTitle = formSections.find(el => el.textContent.toLowerCase().includes('ident'));
      const soldTitle = formSections.find(el => el.textContent.toLowerCase().includes('sold'));
      const diamInput = document.getElementById('fi-diam');

      if (diamInput && !document.getElementById('fi-sch')) {
        const diamGroup = diamInput.closest('.form-group');
        injectAfter(diamGroup, `
          <div class="form-row-2 form-extra-ident">
            <div class="form-group">
              <label class="form-label">Sch</label>
              <input class="form-input" id="fi-sch" placeholder="Ej: 100">
            </div>
            <div class="form-group">
              <label class="form-label">Tipo</label>
              <input class="form-input" id="fi-tipo" placeholder="Ej: CS">
            </div>
          </div>
          <div class="form-row-2 form-extra-ident">
            <div class="form-group">
              <label class="form-label">Clase</label>
              <input class="form-input" id="fi-clase" placeholder="Ej: A">
            </div>
            <div class="form-group">
              <label class="form-label">Factor</label>
              <input class="form-input" id="fi-factor" placeholder="Ej: 1.0">
            </div>
          </div>
        `);
      }

      if (soldTitle && !document.getElementById('fi-spool-fecha')) {
        soldTitle.insertAdjacentHTML('beforebegin', `
          <div class="form-section-title form-section-spool">Construccion de Spool</div>
          <div class="form-group">
            <label class="form-label">Fecha Spool</label>
            <input class="form-input" id="fi-spool-fecha" type="date" title="Fecha Spool">
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Canista</label>
              <input class="form-input" id="fi-canista" placeholder="Ej: C01">
            </div>
            <div class="form-group form-check-row">
              <label class="form-check-label" for="fi-spool-completo">Spool Completo</label>
              <label class="form-check-inline">
                <input class="form-checkbox" id="fi-spool-completo" type="checkbox">
                <span>Si</span>
              </label>
            </div>
          </div>
        `);
      }

      if (soldTitle && !document.getElementById('fi-rechazada')) {
        const fechaInput = document.getElementById('fi-fecha');
        const fechaGroup = fechaInput ? fechaInput.closest('.form-group') : null;
        injectAfter(fechaGroup, `
          <div class="form-group form-check-row">
            <label class="form-check-label" for="fi-rechazada">Status Rechazada</label>
            <label class="form-check-inline">
              <input class="form-checkbox" id="fi-rechazada" type="checkbox">
              <span>Si</span>
            </label>
          </div>
        `);
      }

      if (identTitle) identTitle.textContent = 'Identificacion';
      if (soldTitle) soldTitle.textContent = 'Soldadura';
    }

    function ensureExtendedDetailFields() {
      const editScroll = document.querySelector('#editScreen .edit-scroll');
      const identCard = document.querySelector('#editScreen .fields-card');
      if (!editScroll || !identCard) return;

      if (!document.getElementById('ef-sch')) {
        identCard.insertAdjacentHTML('beforeend', `
          <div class="field-row editable"><span class="field-label">SCH</span><span class="field-value" id="ef-sch">-</span><svg class="field-edit-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
          <div class="field-row editable"><span class="field-label">TIPO</span><span class="field-value" id="ef-tipo">-</span><svg class="field-edit-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
          <div class="field-row editable"><span class="field-label">CLASE</span><span class="field-value" id="ef-clase">-</span><svg class="field-edit-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
          <div class="field-row editable"><span class="field-label">FACTOR</span><span class="field-value" id="ef-factor">-</span><svg class="field-edit-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
        `);
      }

      if (!document.getElementById('ef-spool-fecha')) {
        const spoolCard = document.createElement('div');
        spoolCard.className = 'fields-card';
        spoolCard.style.animationDelay = '.045s';
        spoolCard.innerHTML = `
          <div class="fields-card-title">Construccion de Spool</div>
          <div class="field-row editable"><span class="field-label">FECHA SPOOL</span><span class="field-value" id="ef-spool-fecha">Sin fecha</span><svg class="field-edit-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
          <div class="field-row editable"><span class="field-label">CANISTA</span><span class="field-value" id="ef-canista">-</span><svg class="field-edit-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
          <div class="field-row editable"><span class="field-label">SPOOL COMPLETO</span><span class="field-value" id="ef-spool-completo">No</span><svg class="field-edit-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
        `;
        editScroll.insertBefore(spoolCard, editScroll.children[1] || null);
      }
    }

    function ensureStatsScreen() {
      const dashboardPanel = document.querySelector('.dashboard-panel');
      const mainBottomNav = document.querySelector('.phone > .bottom-nav');
      if (!dashboardPanel || !mainBottomNav) return;

      if (!document.getElementById('statsScreen')) {
        const screen = document.createElement('div');
        screen.className = 'screen';
        screen.id = 'statsScreen';
        screen.innerHTML = `
          <div class="detail-header">
            <div class="detail-topbar">
              <button class="back-btn" onclick="closeStats()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Volver</button>
            </div>
            <div class="detail-area-hero">
              <div class="detail-area-label">ESTADISTICAS</div>
              <div class="detail-area-code">Resumen General</div>
              <div class="detail-area-sub">Pulgadas, estados y produccion</div>
            </div>
          </div>
          <div class="stats-screen-scroll"></div>
          <div class="bottom-nav">
            <div class="nav-item" onclick="closeStats()"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><span class="nav-label">Menu</span></div>
            <div class="nav-item active"><svg viewBox="0 0 24 24"><line x1="4" y1="19" x2="4" y2="10"/><line x1="12" y1="19" x2="12" y2="5"/><line x1="20" y1="19" x2="20" y2="13"/></svg><span class="nav-label">Estadisticas</span></div>
            <div class="nav-item" onclick="openQRScanner()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span class="nav-label">QR</span></div>
          </div>
        `;
        document.body.appendChild(screen);
        screen.querySelector('.stats-screen-scroll').appendChild(dashboardPanel);
      }

      if (!document.getElementById('mainStatsNavItem')) {
        const statsNav = document.createElement('div');
        statsNav.className = 'nav-item';
        statsNav.id = 'mainStatsNavItem';
        statsNav.setAttribute('onclick', 'openStats()');
        statsNav.innerHTML = `<svg viewBox="0 0 24 24"><line x1="4" y1="19" x2="4" y2="10"/><line x1="12" y1="19" x2="12" y2="5"/><line x1="20" y1="19" x2="20" y2="13"/></svg><span class="nav-label">Estadisticas</span>`;
        const qrItem = Array.from(mainBottomNav.querySelectorAll('.nav-item')).find(item => item.textContent.toLowerCase().includes('qr'));
        mainBottomNav.insertBefore(statsNav, qrItem || null);
      }
    }

    function normalizeStaticTexts() {
      document.title = 'MENU - Gestion de Juntas';
      const subtitle = document.querySelector('.app-subtitle');
      if (subtitle) subtitle.innerHTML = `SEGUIMIENTO DE SOLDADURA <span style="font-size:8px;opacity:0.5;margin-left:5px">v1.3.12</span>`;
      const mainSearch = document.getElementById('mainSearchInput');
      if (mainSearch) mainSearch.placeholder = 'Buscar por linea...';
      const detailSearch = document.getElementById('detailSearchInput');
      if (detailSearch) detailSearch.placeholder = 'Buscar por spool...';
      const syncNowBtn = document.getElementById('syncNowBtn');
      if (syncNowBtn) syncNowBtn.title = 'Sincronizar ahora';
      const chartTitles = document.querySelectorAll('.chart-title');
      if (chartTitles[0]) chartTitles[0].textContent = 'Pulgadas Soldadas vs Pendientes';
      if (chartTitles[1]) chartTitles[1].textContent = 'Pulgadas Soldadas por Fecha';
      const kpiLabels = document.querySelectorAll('.dashboard-kpi .kpi-label');
      if (kpiLabels[0]) kpiLabels[0].textContent = 'Total Pulgadas';
      if (kpiLabels[1]) kpiLabels[1].textContent = 'Pulgadas Soldadas';
      if (kpiLabels[2]) kpiLabels[2].textContent = 'Juntas';
      if (kpiLabels[3]) kpiLabels[3].textContent = 'Pulgadas Pendientes';
      const dashboardTitle = document.querySelector('.dashboard-title');
      if (dashboardTitle) dashboardTitle.textContent = 'Estadisticas';
      const statLabels = document.querySelectorAll('.stat-card .stat-label');
      if (statLabels[0]) statLabels[0].textContent = 'Areas';
      if (statLabels[1]) statLabels[1].textContent = 'Total Pulgadas';
      if (statLabels[2]) statLabels[2].textContent = 'Pulg. por Soldar';
      const sectionTitle = document.querySelector('.section-title');
      if (sectionTitle) sectionTitle.textContent = 'RESUMEN DE AREAS';
      const detailTitles = document.querySelectorAll('#editScreen .fields-card-title');
      if (detailTitles[0]) detailTitles[0].textContent = 'Identificacion';
      if (detailTitles[1]) detailTitles[1].textContent = 'Construccion de Spool';
      if (detailTitles[2]) detailTitles[2].textContent = 'Soldadura';
      if (detailTitles[3]) detailTitles[3].textContent = 'Material / Colada';
      if (detailTitles[4]) detailTitles[4].textContent = 'Documentacion';
      if (detailTitles[5]) detailTitles[5].textContent = 'Codigo QR';
      const detailLabels = document.querySelectorAll('#editScreen .field-label');
      const detailLabelTexts = ['AREA', 'LINEA N°', 'SPOOL', 'JUNTA N°', 'DIAMETRO', 'SCH', 'TIPO', 'CLASE', 'FACTOR', 'FECHA SPOOL', 'CANISTA', 'SPOOL COMPLETO', 'FECHA DE SOLDADURA', 'RAIZ', 'RELL-TERM-', 'CODIGO / COLADA', 'CODIGO / COLADA_16', 'N° de Documento', 'Rev.', 'Hoja N°', 'Piping Class'];
      detailLabelTexts.forEach((text, index) => { if (detailLabels[index]) detailLabels[index].textContent = text; });
      const formLabels = document.querySelectorAll('#formModal .form-label');
      const formLabelTexts = ['Area *', 'Linea N° *', 'Spool *', 'Junta N° *', 'Pulgadas *', 'Sch', 'Tipo', 'Clase', 'Factor', 'Fecha Spool', 'Canista', 'Fecha de Soldadura', 'Raiz', 'Rell-Term-', 'Codigo / Colada', 'Codigo / Colada_16', 'N° de Documento', 'Rev.', 'Hoja N°', 'Piping Class'];
      formLabelTexts.forEach((text, index) => { if (formLabels[index]) formLabels[index].textContent = text; });
      const navLabels = Array.from(document.querySelectorAll('.bottom-nav .nav-label'));
      navLabels.forEach((label) => {
        if (label.textContent.toLowerCase().includes('men')) label.textContent = 'Menu';
        if (label.textContent.toLowerCase().includes('fil')) label.textContent = 'Filtrar';
        if (label.textContent.toLowerCase().includes('vol')) label.textContent = 'Volver';
      });
    }

    function openStats() {
      const screen = document.getElementById('statsScreen');
      if (screen) screen.classList.add('active');
    }

    function closeStats() {
      const screen = document.getElementById('statsScreen');
      if (screen) screen.classList.remove('active');
    }

    function openJuntaFromQR(id) {
      const found = JUNTAS.find(j => j.id === id);
      if (!found) return;
      closeQRScanner();
      openDetail(found.area);
      setTimeout(() => openEdit(found.id), 400);
    }

  

    function openFormNew() {

      formMode = 'new';

      editingJuntaId = null;

      document.getElementById('formTitle').textContent = 'NUEVA JUNTA';

      document.getElementById('formSaveBtn').textContent = 'Guardar Junta';

      document.getElementById('formError').style.display = 'none';

      document.getElementById('fi-area').value    = currentDetailArea && currentDetailArea !== 'TODO' ? currentDetailArea : '';

      document.getElementById('fi-linea').value   = '';

      document.getElementById('fi-spool').value   = '';

      document.getElementById('fi-junta').value   = '';

      document.getElementById('fi-diam').value    = '';
      const fiSch = document.getElementById('fi-sch'); if (fiSch) fiSch.value = '';
      const fiTipo = document.getElementById('fi-tipo'); if (fiTipo) fiTipo.value = '';
      const fiClase = document.getElementById('fi-clase'); if (fiClase) fiClase.value = '';
      const fiFactor = document.getElementById('fi-factor'); if (fiFactor) fiFactor.value = '';
      const fiSpoolFecha = document.getElementById('fi-spool-fecha'); if (fiSpoolFecha) fiSpoolFecha.value = '';
      const fiCanista = document.getElementById('fi-canista'); if (fiCanista) fiCanista.value = '';
      const fiSpoolCompleto = document.getElementById('fi-spool-completo'); if (fiSpoolCompleto) fiSpoolCompleto.checked = false;

      document.getElementById('fi-fecha').value   = '';
      const rech = document.getElementById('fi-rechazada');
      if (rech) rech.checked = false;

      document.getElementById('fi-raiz').value    = '';

      document.getElementById('fi-rellterm').value= '';

      document.getElementById('fi-colada').value  = '';

      document.getElementById('fi-colada16').value= '';

      document.getElementById('fi-doc').value     = '';

      document.getElementById('fi-rev').value     = '';

      document.getElementById('fi-hoja').value    = '';

      document.getElementById('fi-piping').value  = '';

      document.getElementById('formModal').classList.add('open');

      setTimeout(() => document.getElementById('fi-area').focus(), 400);

    }

  

    function openFormEdit() {

      if (!currentQRData) return;

      const j = currentQRData;

      formMode = 'edit';

      editingJuntaId = j.id;

      document.getElementById('formTitle').textContent = 'EDITAR JUNTA';

      document.getElementById('formSaveBtn').textContent = 'Guardar Cambios';

      document.getElementById('formError').style.display = 'none';

      document.getElementById('fi-area').value    = j.area;

      document.getElementById('fi-linea').value   = j.linea;

      document.getElementById('fi-spool').value   = j.spool;

      document.getElementById('fi-junta').value   = j.junta;

      document.getElementById('fi-diam').value    = j.diam;
      const fiSch = document.getElementById('fi-sch'); if (fiSch) fiSch.value = j.sch || '';
      const fiTipo = document.getElementById('fi-tipo'); if (fiTipo) fiTipo.value = j.tipo || '';
      const fiClase = document.getElementById('fi-clase'); if (fiClase) fiClase.value = j.clase || '';
      const fiFactor = document.getElementById('fi-factor'); if (fiFactor) fiFactor.value = j.factor || '';
      const fiCanista = document.getElementById('fi-canista'); if (fiCanista) fiCanista.value = j.canista || '';
      const fiSpoolCompleto = document.getElementById('fi-spool-completo'); if (fiSpoolCompleto) fiSpoolCompleto.checked = isSpoolCompletoEnabled(j.spoolCompleto);

      if (j.fecha && j.fecha !== '—') {

        const parts = j.fecha.split('/');

        if (parts.length === 3) {

          const yr = parts[2].length === 2 ? '20'+parts[2] : parts[2];

          document.getElementById('fi-fecha').value = `${yr}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
          const rech = document.getElementById('fi-rechazada');
          if (rech) rech.checked = (j.rechazada === true || j.status === 'nok');

        }

      } else { document.getElementById('fi-fecha').value = '';
      const rech = document.getElementById('fi-rechazada');
      if (rech) rech.checked = (j.rechazada === true || j.status === 'nok'); }

      if (!isMissingDateValue(j.spoolFecha)) {
        const partsSpool = j.spoolFecha.split('/');
        if (partsSpool.length === 3 && document.getElementById('fi-spool-fecha')) {
          const yrSpool = partsSpool[2].length === 2 ? '20' + partsSpool[2] : partsSpool[2];
          document.getElementById('fi-spool-fecha').value = `${yrSpool}-${partsSpool[1].padStart(2,'0')}-${partsSpool[0].padStart(2,'0')}`;
        }
      } else if (document.getElementById('fi-spool-fecha')) {
        document.getElementById('fi-spool-fecha').value = '';
      }

      document.getElementById('fi-raiz').value    = j.raiz === '—' ? '' : j.raiz;

      document.getElementById('fi-rellterm').value= j.rellterm === '—' ? '' : j.rellterm;

      document.getElementById('fi-colada').value  = j.colada === '—' ? '' : j.colada;

      document.getElementById('fi-colada16').value= j.colada16 === 'sin identificacion' ? '' : j.colada16;

      document.getElementById('fi-doc').value     = j.doc === '—' ? '' : j.doc;

      document.getElementById('fi-rev').value     = j.rev;

      document.getElementById('fi-hoja').value    = j.hoja;

      document.getElementById('fi-piping').value  = j.piping === '—' ? '' : j.piping;

      document.getElementById('formModal').classList.add('open');

    }

  

    function closeForm() { document.getElementById('formModal').classList.remove('open'); }

  

    function saveForm() {

      const errEl = document.getElementById('formError');

      const area  = document.getElementById('fi-area').value.trim();

      const linea = document.getElementById('fi-linea').value.trim();

      const spool = document.getElementById('fi-spool').value.trim();

      const junta = document.getElementById('fi-junta').value.trim();

      const diam  = document.getElementById('fi-diam').value.trim();

  

      if (!area || !linea || !spool || !junta || !diam) {

        errEl.textContent = '⚠️ Completá los campos obligatorios: Área, Línea N°, Spool, Junta N° y Diámetro.';

        errEl.style.display = 'block';

        errEl.scrollIntoView({ behavior:'smooth', block:'center' });

        return;

      }



      const diamVal = parseFloat(diam);

      if (isNaN(diamVal) || diamVal <= 0) {

        errEl.textContent = 'Ingres? un di?metro v?lido (mayor a 0).';

        errEl.style.display = 'block';

        errEl.scrollIntoView({ behavior:'smooth', block:'center' });

        return;

      }

  

      const fechaRaw = document.getElementById('fi-fecha').value;
      const rechazada = document.getElementById('fi-rechazada') ? document.getElementById('fi-rechazada').checked : false;
      const spoolFechaRaw = document.getElementById('fi-spool-fecha') ? document.getElementById('fi-spool-fecha').value : '';

      let fecha = '—';

      if (fechaRaw && fechaRaw.includes('-')) {

        const p = fechaRaw.split('-');

        fecha = `${p[2].padStart(2,'0')}/${p[1].padStart(2,'0')}/${p[0]}`;

      }
      let spoolFecha = '';
      if (spoolFechaRaw && spoolFechaRaw.includes('-')) {
        const pSpool = spoolFechaRaw.split('-');
        spoolFecha = `${pSpool[2].padStart(2,'0')}/${pSpool[1].padStart(2,'0')}/${pSpool[0]}`;
      }

  

      const proposedId = `J-${area}-${spool}-${junta}`;
      const previousId = editingJuntaId;

      let finalId = formMode === 'edit' ? editingJuntaId : proposedId;

      if (formMode === 'edit' && proposedId !== editingJuntaId) {

        const exists = JUNTAS.some(j => j.id === proposedId);

        if (exists) {

          errEl.textContent = `Ya existe una junta con ID ${proposedId}.`;

          errEl.style.display = 'block';

          errEl.scrollIntoView({ behavior:'smooth', block:'center' });

          return;

        }

        finalId = proposedId;

      }



      const record = {

        id:       finalId,

        area, linea, spool, junta,

        diam:     diamVal.toFixed(2),

        fecha, 

        sch:      document.getElementById('fi-sch') ? document.getElementById('fi-sch').value.trim() : '',

        tipo:     document.getElementById('fi-tipo') ? document.getElementById('fi-tipo').value.trim() : '',

        clase:    document.getElementById('fi-clase') ? document.getElementById('fi-clase').value.trim() : '',

        factor:   document.getElementById('fi-factor') ? document.getElementById('fi-factor').value.trim() : '',

        spoolFecha,

        canista:  document.getElementById('fi-canista') ? document.getElementById('fi-canista').value.trim() : '',

        spoolCompleto: document.getElementById('fi-spool-completo') && document.getElementById('fi-spool-completo').checked ? 'Si' : 'No',
        'Spool Completo': document.getElementById('fi-spool-completo') && document.getElementById('fi-spool-completo').checked ? 'Si' : 'No',

        raiz: document.getElementById('fi-raiz').value.trim() || '-',

        rellterm: document.getElementById('fi-rellterm').value.trim() || '-',

        colada:   document.getElementById('fi-colada').value.trim()   || '-',

        colada16: document.getElementById('fi-colada16').value.trim() || 'sin identificacion',

        doc:      document.getElementById('fi-doc').value.trim()      || '-',

        rev:      document.getElementById('fi-rev').value.trim()      || '0',

        hoja:     document.getElementById('fi-hoja').value.trim()     || '1',

        piping:   document.getElementById('fi-piping').value.trim()   || '-',

        rechazada: rechazada,
        status:   deriveStatus(fecha, rechazada, ''),
        STATUS:   deriveStatus(fecha, rechazada, '')

      };

  

      if (formMode === 'edit') {

        const idx = JUNTAS.findIndex(j => j.id === editingJuntaId);

        if (idx !== -1) JUNTAS[idx] = { ...JUNTAS[idx], ...record };

        editingJuntaId = record.id;

      } else {

        JUNTAS.push(record);

      }

      saveToLocalStorage();

      if (formMode === 'edit' && proposedId !== previousId && currentQRData) {
        syncWithSheets("delete", { ...currentQRData, id: previousId });
      }
      syncWithSheets("save", record);
      recordHistory('save', record);
      updateDashboard();

  

      closeForm();

      renderMainList();

      if (currentDetailArea !== null) openDetail(currentDetailArea);

      if (formMode === 'edit' && currentQRData) {

        const updated = JUNTAS.find(j => j.id === editingJuntaId);

        if (updated) currentQRData = updated;

      }

      showToast(formMode === 'edit' ? `✅ Junta ${record.id} actualizada` : `✅ Junta ${record.id} agregada`);

    }

  

    // --- DETAIL SCREEN SEARCH ---

    function toggleDetailSearch() {

      const bar = document.getElementById('detailSearchBar');

      const btn = document.getElementById('detailSearchBtn');

      const isVisible = bar.style.display !== 'none';

      if (isVisible) {

        bar.style.display = 'none';

        btn.style.background = 'rgba(255,255,255,0.10)';

        clearDetailSearch();

      } else {

        bar.style.display = 'block';

        btn.style.background = 'rgba(255,255,255,0.25)';

        setTimeout(() => document.getElementById('detailSearchInput').focus(), 100);

      }

    }

  

    function clearDetailSearch() {

      const input = document.getElementById('detailSearchInput');

      if (input) input.value = '';

      if (currentDetailArea !== null) {

        document.getElementById('detailList').innerHTML = renderDetailListContent(currentDetailArea, activeFilters);

      }

    }

  

    function onDetailSearch(val) {

      if (!currentDetailArea) return;

      document.getElementById('detailList').innerHTML = renderDetailListContent(currentDetailArea, activeFilters, val);

    }

  

    // --- MAIN LIST RENDER ---

    function renderMainList() {

      debugLog("🎨 Renderizando lista principal...");

      const areas = [...new Set(JUNTAS.map(j => j.area))].sort();

      const totalAll = JUNTAS.reduce((s,j) => s + (parseFloat(j.diam) || 0), 0);
      const pendingDisplaySum = JUNTAS.filter(j => j.status === 'pending').reduce((s,j) => s + (parseFloat(j.diam) || 0), 0);

      const pendingSum = JUNTAS.filter(j => j.fecha === '—' || !j.fecha).reduce((s,j) => s + (parseFloat(j.diam) || 0), 0);

      

      const stat1 = document.querySelector('.stat-card:nth-child(1) .stat-value');

      const stat2 = document.querySelector('.stat-card:nth-child(2) .stat-value');

      const stat3 = document.querySelector('.stat-card:nth-child(3) .stat-value');



      if (stat1) stat1.textContent = areas.length;

      if (stat2) stat2.textContent = totalAll >= 1000 ? (totalAll/1000).toFixed(1)+'K' : formatNum(totalAll);

      if (stat3) stat3.textContent = pendingDisplaySum >= 1000 ? (pendingDisplaySum/1000).toFixed(1)+'K' : formatNum(pendingDisplaySum);

      let html = `

        <div class="todo-row" onclick="openDetail('TODO')">

          <div>

            <div class="todo-label">Todo</div>

            <div class="todo-count">${areas.length} áreas · Total Pulgadas: ${formatNum(totalAll)}</div>

          </div>

          <div class="todo-right">

            <div class="todo-total">${formatNum(totalAll)}</div>

            <svg style="width:16px;height:16px;stroke:rgba(255,255,255,0.4);fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>

          </div>

        </div>`;

      areas.forEach((area, i) => {

        const juntas = JUNTAS.filter(j => j.area === area);

        const lineasArea = [...new Set(juntas.map(j => String(j.linea || '').trim()).filter(Boolean))];

        const lineasSearch = lineasArea.join(' ').toLowerCase();

        const total  = juntas.reduce((s,j) => s + (parseFloat(j.diam) || 0), 0);
        const safeLineasSearch = lineasSearch.replace(/"/g, '&quot;');

        const delay  = (i * 0.04).toFixed(2);

        html += `

        <div class="area-row" data-lineas="${safeLineasSearch}" style="animation-delay:${delay}s" onclick="openDetail('${area}')">

          <div class="area-accent"></div>

          <div class="area-body">

            <div class="area-left">

              <span class="area-code">${area}</span>

            </div>

            <div class="area-right">

              <div class="diam-badge">

                <span class="diam-value">${formatNum(total)}</span>

                <span class="diam-unit">pulgadas</span>

              </div>

              <svg class="chevron-icon" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>

            </div>

          </div>

        </div>`;

      });

      debugLog(`✅ HTML generado (${areas.length} filas). Aplicando al DOM...`);

      const mainList = document.getElementById('mainList');

      if (mainList) {

        mainList.innerHTML = html;

        debugLog("✨ DOM actualizado con éxito.");

      } else {

        debugLog("❌ Error: No se encontró el elemento 'mainList'", true);

      }

    }

  

    function refreshMain() {

      const btn = document.getElementById('refreshBtn');

      if (btn) {

        const svg = btn.querySelector('svg');

        if (svg) {

          svg.style.transition = 'transform .6s ease';

          svg.style.transform  = 'rotate(360deg)';

          setTimeout(() => { svg.style.transition='none'; svg.style.transform='rotate(0deg)'; }, 650);

        }

      }

      const search = document.querySelector('.search-input');

      if (search) search.value = '';

      clearFilters();

      initData();

    }

    async function syncNow() {
      const btn = document.getElementById('syncNowBtn');
      const icon = btn ? btn.querySelector('svg') : null;
      if (icon) {
        icon.style.transition = 'transform .8s ease';
        icon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
          icon.style.transition = 'none';
          icon.style.transform = 'rotate(0deg)';
        }, 820);
      }

      if (location.protocol === 'file:') {
        showToast('Abri con http://localhost para sincronizar');
        setSyncStatus('Abri con http://localhost para sincronizar', 'err');
        return;
      }

      if (!navigator.onLine) {
        showToast('Sin conexion. Se sincroniza cuando vuelva internet');
        setSyncStatus('Sin conexion (modo offline)', 'warn');
        return;
      }

      try {
        setSyncStatus('Sincronizacion manual en curso...', 'warn');
        await syncQueue();
        await initData();
        updateDashboard();
        setSyncStatus('Sincronizado...', 'ok');
        showToast('Sincronizacion completada');
      } catch (err) {
        console.error('Error en sincronizacion manual:', err);
        setSyncStatus('Error en sincronizacion manual', 'err');
        showToast('No se pudo sincronizar ahora');
      }
    }

  

    function toggleEditMode() { openFormEdit(); }

  

    // --- TOAST ---

    function showToast(msg) {

      let t = document.getElementById('appToast');

      if (!t) {

        t = document.createElement('div');

        t.id = 'appToast';

        t.style.cssText = "position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--blue-dark);color:#fff;padding:10px 20px;border-radius:20px;font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:200;opacity:0;transition:all .3s;white-space:nowrap;border:1px solid rgba(255,255,255,.1);";

        document.body.appendChild(t);

      }

      t.textContent = msg;

      t.style.opacity = '1';

      t.style.transform = 'translateX(-50%) translateY(0)';

      clearTimeout(t._timer);

      t._timer = setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(10px)'; }, 2800);

    }

  

    

    function setSyncStatus(msg, status) {
      const el = document.getElementById('syncStatus');
      if (!el) return;
      if (location.protocol === 'file:') {
        el.textContent = 'Abri con http://localhost para sincronizar';
        el.setAttribute('data-status', 'err');
        return;
      }
      el.textContent = msg;
      if (status) el.setAttribute('data-status', status);
      else el.removeAttribute('data-status');
    }




    // --- DASHBOARD ---
    let chartEstados = null;
    let chartProduccion = null;

    function getDashboardDataSource() {
      const hasFilters = Object.keys(activeFilters || {}).length > 0;
      return hasFilters ? applyFiltersToData(JUNTAS, activeFilters) : JUNTAS;
    }

    function parseFechaToDate(fecha) {
      if (!hasWeldDate(fecha)) return null;
      if (fecha.includes('/')) {
        const p = String(fecha).trim().split('/');
        if (p.length === 3) {
          const day = String(p[0]).padStart(2, '0');
          const month = String(p[1]).padStart(2, '0');
          let year = String(p[2]).trim();
          if (year.length === 2) year = `20${year}`;
          const d = new Date(`${year}-${month}-${day}T00:00:00`);
          return isNaN(d.getTime()) ? null : d;
        }
      }
      const d = new Date(fecha);
      return isNaN(d.getTime()) ? null : d;
    }

    function buildDiametersSummary(list) {
      let soldado = 0;
      let pendiente = 0;
      list.forEach(j => {
        const diam = parseFloat(j.diam) || 0;
        const tieneFecha = hasWeldDate(j.fecha);
        if (tieneFecha) soldado += diam;
        else pendiente += diam;
      });
      return { soldado, pendiente, total: soldado + pendiente };
    }

    function buildProductionSeries(list) {
      const byDay = {};

      list.forEach(j => {
        const d = parseFechaToDate(j.fecha);
        if (!d) return;
        const key = d.toISOString().slice(0, 10);
        byDay[key] = (byDay[key] || 0) + (parseFloat(j.diam) || 0);
      });

      const orderedKeys = Object.keys(byDay).sort();
      const labels = orderedKeys.map((key) => {
        const [y, m, d] = key.split('-');
        return `${d}/${m}/${y.slice(2)}`;
      });
      return { labels, data: orderedKeys.map(k => byDay[k]) };
    }

    async function updateDashboard() {
      const filtered = getDashboardDataSource();
      const summary = buildDiametersSummary(filtered);
      const totalJuntas = filtered.length;

      const kTotal = document.getElementById('kpi-total');
      const kOk = document.getElementById('kpi-ok');
      const kNok = document.getElementById('kpi-nok');
      const kPending = document.getElementById('kpi-pending');
      if (kTotal) kTotal.textContent = summary.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (kOk) kOk.textContent = summary.soldado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (kNok) kNok.textContent = totalJuntas;
      if (kPending) kPending.textContent = summary.pendiente.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      if (chartEstados) {
        chartEstados.data.labels = ['Pulgadas soldadas', 'Pulgadas pendientes'];
        chartEstados.data.datasets[0].data = [summary.soldado, summary.pendiente];
        chartEstados.data.datasets[0].backgroundColor = ['#2E7D32', '#FFB300'];
        chartEstados.update();
      }

      if (chartProduccion) {
        const series = buildProductionSeries(filtered);
        chartProduccion.data.labels = series.labels;
        chartProduccion.data.datasets[0].data = series.data;
        chartProduccion.update();
      }
    }

    function initDashboard() {
      if (!window.Chart) return;
      const elEstados = document.getElementById('chartEstados');
      const elProd = document.getElementById('chartProduccion');
      if (!elEstados || !elProd) return;

      chartEstados = new Chart(elEstados, {
        type: 'doughnut',
        data: {
          labels: ['Pulgadas soldadas', 'Pulgadas pendientes'],
          datasets: [{
            data: [0, 0],
            backgroundColor: ['#2E7D32', '#FFB300']
          }]
        },
        options: {
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                title: () => '',
                label: (ctx) => {
                  const v = Number(ctx.parsed || 0);
                  return `${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`;
                }
              }
            }
          },
          cutout: '60%'
        }
      });

      chartProduccion = new Chart(elProd, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Suma de pulgadas por fecha',
            data: [],
            borderColor: '#1565C0',
            backgroundColor: 'rgba(21,101,192,0.12)',
            tension: 0.35,
            fill: true
          }]
        },
        options: {
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: () => '',
                label: (ctx) => {
                  const v = Number(ctx.parsed?.y || ctx.parsed || 0);
                  return `${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`;
                }
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true }
          }
        }
      });

      updateDashboard();
      setInterval(updateDashboard, 3000);
    }
// --- INITIALIZATION ---

    document.addEventListener('DOMContentLoaded', () => {

      debugLog("🏠 DOM Ready. Start Init.");

      try {

        // 1. Data first

        loadFromLocalStorage();

        debugLog(`📦 JUNTAS loaded: ${JUNTAS.length}`);



        // 2. UI Components second

        initFilterChips();
        ensureExtendedFormFields();
        ensureExtendedDetailFields();
        ensureStatsScreen();
        normalizeStaticTexts();

        const btnLimpiar = document.getElementById('btnLimpiar');

        if (btnLimpiar) btnLimpiar.addEventListener('click', clearFilters);

        

        // 3. Initial Render

        renderMainList();

        

        // 4. Remote Sync

        initData();
        initDashboard();
        if (navigator.onLine) syncQueue();
        window.addEventListener('online', () => { setSyncStatus('Conexion restaurada. Sincronizando...', 'warn'); syncQueue(); });
        window.addEventListener('offline', () => setSyncStatus('Sin conexion (modo offline)', 'warn'));
        setInterval(() => { if (navigator.onLine) syncQueue(); }, 30000);

      } catch (err) {

        debugLog("❌ Fatal Init: " + err.message, true);

      }

    });

    // --- MAIN LIST FILTRADO ---

    function applyMainSearchFilter() {

      const mainSearch = document.getElementById('mainSearchInput');

      const v = (mainSearch?.value || '').trim().toLowerCase();

      document.querySelectorAll('#mainList .area-row').forEach(function(row) {

        const lineas = (row.getAttribute('data-lineas') || '').toLowerCase();

        row.style.display = (!v || lineas.includes(v)) ? '' : 'none';

      });

    }

    const mainSearch = document.getElementById('mainSearchInput');

    if (mainSearch) {

      mainSearch.addEventListener('input', function() {

        applyMainSearchFilter();

      });

    }



    // --- EXPOSE TO GLOBAL SCOPE ---

    window.openDetail = openDetail;

    window.closeDetail = closeDetail;

    window.openEdit = openEdit;

    window.closeEdit = closeEdit;

    window.toggleDetailSearch = toggleDetailSearch;

    window.clearDetailSearch = clearDetailSearch;

    window.onDetailSearch = onDetailSearch;

    window.refreshMain = refreshMain;
    window.syncNow = syncNow;

    window.toggleEditMode = toggleEditMode;

    window.saveForm = saveForm;

    window.closeForm = closeForm;

    window.openFormNew = openFormNew;

    window.openFormEdit = openFormEdit;

    window.confirmDelete = confirmDelete;

    window.closeConfirm = closeConfirm;

    window.executeDelete = executeDelete;

    window.openQR = openQR;

    window.closeQR = closeQR;

    window.downloadQR = downloadQR;

    window.shareQR = shareQR;

    window.openQRScanner = openQRScanner;

    window.closeQRScanner = closeQRScanner;

