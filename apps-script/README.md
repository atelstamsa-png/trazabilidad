1. Crear un proyecto de Google Apps Script.
2. Pegar el contenido de [`Code.gs`](/C:/Users/Usuario/OneDrive/Desktop/Trazabilidad/apps-script/Code.gs).
3. Reemplazar `SPREADSHEET_ID` por el ID real de tu Google Sheet.
4. Verificar que la hoja `Juntas` exista y tenga encabezados en la fila 1.
5. Asegurar que exista una columna `id`.
6. Publicar como Web App con acceso para quien corresponda.
7. Reemplazar `API_URL` en [`js/app.js`](/C:/Users/Usuario/OneDrive/Desktop/Trazabilidad/js/app.js) por la nueva URL publicada.

Cambios del backend:
- `GET` ahora soporta `page` y `limit`.
- `POST` ahora soporta un lote con `{ "action": "batch", "batch": [...] }`.
- `save` actualiza por `id` si existe, o inserta si no existe.
- `delete` elimina por `id`.
