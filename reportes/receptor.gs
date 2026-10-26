/**
 * Receptor de reportes de error · Consulta Urbanística Giles
 * ------------------------------------------------------------
 * Va pegado en la planilla "Registro de reportes – Consulta Urbanística"
 * (Extensiones → Apps Script). Hace tres cosas:
 *   1. Recibe cada reporte que envía un visitante desde la web.
 *   2. Lo anota como fila nueva en la hoja "Reportes" con estado "Nuevo".
 *   3. Manda un mail de aviso a la Dirección.
 * Además, cuando en la columna "Estado" se elige Corregido, Estaba bien
 * o Descartado, anota sola la fecha de cierre (y la borra si se reabre).
 */

const AVISAR_A = 'surtectura@gmail.com';
const HOJA = 'Reportes';
const CLAVE = 'cu-giles-2026';          // la misma que figura en index.html
const MAX_POR_10_MIN = 40;              // freno contra envíos masivos
const CERRADOS = ['Corregido', 'Estaba bien', 'Descartado'];
const COL_ESTADO = 11, COL_CIERRE = 13;  // K y M

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.t !== CLAVE || d.hp) return salida_({ ok: false });

    const cache = CacheService.getScriptCache();
    const n = Number(cache.get('n') || 0);
    if (n >= MAX_POR_10_MIN) return salida_({ ok: false, err: 'limite' });
    cache.put('n', String(n + 1), 600);

    const desc = corto_(d.desc, 3000);
    if (desc.trim().length < 3) return salida_({ ok: false });
    const id = /^R-[A-Z0-9]{4,12}$/.test(d.id || '') ? d.id : 'R-' + Date.now().toString(36).toUpperCase();
    const r = {
      id: id,
      tipo: corto_(d.tipo, 80),
      desc: desc,
      partida: corto_(d.partida, 40),
      nom: corto_(d.nom, 160),
      zona: corto_(d.zona, 40),
      contacto: corto_(d.contacto, 120),
      url: corto_(d.url, 600),
      disp: corto_(d.ua, 200)
    };

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sh = SpreadsheetApp.getActive().getSheetByName(HOJA);
      sh.appendRow([r.id, new Date(), r.tipo, r.desc, r.partida, r.nom, r.zona,
                    r.contacto, r.url, r.disp, 'Nuevo', '', '']);
    } finally { lock.releaseLock(); }

    avisar_(r);
    return salida_({ ok: true, id: r.id });
  } catch (err) {
    return salida_({ ok: false, err: String(err) });
  }
}

/** Para comprobar desde el navegador que la aplicación web está publicada. */
function doGet() {
  return ContentService.createTextOutput('Receptor de reportes activo.');
}

/** Sella o borra la fecha de cierre según el estado elegido. */
function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== HOJA || e.range.getRow() < 2) return;
  if (e.range.getColumn() > COL_ESTADO || e.range.getLastColumn() < COL_ESTADO) return;
  for (let row = e.range.getRow(); row <= e.range.getLastRow(); row++) {
    const estado = sh.getRange(row, COL_ESTADO).getValue();
    const cierre = sh.getRange(row, COL_CIERRE);
    if (CERRADOS.indexOf(estado) >= 0) { if (!cierre.getValue()) cierre.setValue(new Date()); }
    else cierre.clearContent();
  }
}

/** Ejecutar una vez desde el editor: autoriza los permisos y deja un reporte de prueba. */
function probar() {
  doPost({ postData: { contents: JSON.stringify({
    t: CLAVE, id: 'R-PRUEBA', tipo: 'Prueba', desc: 'Reporte de prueba del receptor. Se puede borrar.',
    partida: '', nom: '', zona: '', contacto: '', url: '', ua: 'Editor de Apps Script'
  }) } });
}

function avisar_(r) {
  const planilla = SpreadsheetApp.getActive().getUrl();
  const fila = (k, v) => v ? '<tr><td style="padding:3px 12px 3px 0;color:#4A5A5E;vertical-align:top">' + k +
    '</td><td style="padding:3px 0">' + html_(v) + '</td></tr>' : '';
  const cuerpo =
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#18262B">' +
    '<p style="margin:0 0 10px">Llegó un reporte desde la <b>Consulta Urbanística</b>.</p>' +
    '<p style="margin:0 0 12px;padding:10px 12px;background:#F5DDD8;border-radius:4px;white-space:pre-line">' + html_(r.desc) + '</p>' +
    '<table style="font-size:13px;border-collapse:collapse">' +
    fila('Código', r.id) + fila('Tipo', r.tipo) + fila('Partida', r.partida) + fila('Nomenclatura', r.nom) +
    fila('Zona', r.zona) + fila('Contacto', r.contacto) + fila('Dispositivo', r.disp) +
    '</table>' +
    (r.url ? '<p style="margin:12px 0 0"><a href="' + html_(r.url) + '">Abrir la consulta tal como la vio el visitante</a></p>' : '') +
    '<p style="margin:12px 0 0"><a href="' + planilla + '">Ir al registro de reportes</a> para cambiar el estado.</p></div>';
  const msg = {
    to: AVISAR_A,
    subject: 'Reporte ' + r.id + ' · ' + (r.tipo || 'Consulta Urbanística') + (r.partida ? ' · Partida ' + r.partida : ''),
    htmlBody: cuerpo,
    name: 'Consulta Urbanística Giles'
  };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.contacto)) msg.replyTo = r.contacto;
  MailApp.sendEmail(msg);
}

// Texto plano, recortado y sin riesgo de que la planilla lo lea como fórmula.
function corto_(v, max) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function html_(s) {
  return String(s).replace(/^'/, '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function salida_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
