// Genera datos/cou.js a partir del repositorio de la Consulta Urbanística Giles.
// Uso: node herramientas/generar_datos.js <carpeta de Consulta-COUSAG2024> [fecha]
const fs = require("fs"), path = require("path");
const dir = process.argv[2], fecha = process.argv[3] || new Date().toISOString().slice(0, 10);
const jsonDe = (txt) => JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
const P = jsonDe(fs.readFileSync(path.join(dir, "parcelas.js"), "utf8"));
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const ini = html.indexOf("const FICHAS_COU=") + "const FICHAS_COU=".length;
const fin = html.indexOf("\nconst ITEMS_COU=");
const F = JSON.parse(html.slice(ini, fin).trim().replace(/;$/, ""));
const usosNom = {};
for (const m of html.matchAll(/\["([A-Za-z]{1,4}\d?[a-z]?)","([^"]+)","[^"]*"\]/g)) if (!usosNom[m[1]]) usosNom[m[1]] = m[2];

// Buscador de actividades de la Consulta: palabras del vecino → usos del Código
const bloque = (desde, hasta) => html.slice(html.indexOf(desde) + desde.length, html.indexOf(hasta, html.indexOf(desde)));
const actTxt = bloque("const ACTIV = ", "\nconst STOP=").trim().replace(/;$/, "").replace(/^\s*\/\/.*$/gm, "")
  .replace(/\{\s*k:/g, '{"k":').replace(/,\s*u:\[/g, ',"u":[').replace(/,\s*r:"/g, ',"r":"');
const actividades = JSON.parse(actTxt).map((e) => [e.k, e.u]);
const stop = JSON.parse(bloque("const STOP=new Set(", ");"));
const usosDef = [];
{ let g = ""; for (const m of bloque("const USOS = ", "\nconst USO_BY").matchAll(/\{g:"([^"]+)"|\["([A-Za-z0-9]+)","([^"]+)","((?:[^"\\]|\\.)*)"\]/g)) { if (m[1]) g = m[1]; else usosDef.push([m[2], m[3], m[4].replace(/\\"/g, '"'), g]); } }
const rango = {};
for (const m of bloque("const RANGO = {", "};").matchAll(/([A-Za-z0-9]+):\[(\d+),(\d+|Infinity)/g)) rango[m[1]] = [Number(m[2]), m[3] === "Infinity" ? null : Number(m[3])];

const fichaDe = (z) => {
  const raw = (z || "").trim(); if (!raw) return null;
  const sp = raw.split(" ")[0], dash = sp.split("-")[0], letras = (sp.match(/^[A-Za-z]+/) || [""])[0];
  for (const k of [raw, sp, dash, letras]) if (F[k]) return k;
  return null;
};
const fichas = {};
for (const k in F) {
  const f = F[k], usos = {};
  for (const u in f.usos) usos[u] = typeof f.usos[u] === "string" ? f.usos[u] : f.usos[u].s + (f.usos[u].nota ? "|" + f.usos[u].nota : "");
  fichas[k] = { n: f.nombre, pag: f.pagina, fos: f.fos, fot: f.fot, cas: f.cas, alt: f.altura_max, rf: f.retiro_frente, rfo: f.retiro_fondo,
    rl: f.retiro_lateral, rb: f.retiro_bilateral, den: f.densidad, u: usos, sec: (f.sectores || []).length };
  for (const q in fichas[k]) if (fichas[k][q] === undefined) delete fichas[k][q];
}
const zonas = [], zIdx = {}, mapa = {}, sinFicha = [];
const filas = P.parcelas.map((p) => {
  if (!(p.z in zIdx)) { zIdx[p.z] = zonas.length; zonas.push(p.z); const k = fichaDe(p.z); if (k) mapa[p.z] = k; else sinFicha.push(p.z); }
  return [p.p || 0, ...p.n, zIdx[p.z], Math.round(p.s * 10) / 10];
});
const out = { fuente: "Consulta Urbanística Giles (" + P.fuente + ")", fecha, zonas, mapa, fichas, usos: usosNom, usosDef, actividades, stop, rango, parcelas: filas };
console.log("parcelas:", filas.length, "de", P.parcelas.length, "| zonas:", zonas.length, "| fichas:", Object.keys(fichas).length, "| usos:", usosDef.length, "| actividades:", actividades.length, "| rangos:", Object.keys(rango).length);
console.log("zonas sin ficha:", sinFicha.join(", ") || "ninguna");
// Si la Consulta cambió de forma y la lectura quedó pobre, no se pisa la base anterior.
if (filas.length < 10000 || Object.keys(fichas).length < 40 || usosDef.length < 60 || actividades.length < 50) {
  console.error("La lectura de la Consulta quedó incompleta: no se actualiza datos/cou.js."); process.exit(1);
}
// Sólo se reescribe si cambió algo además de la fecha.
const destino = path.join(__dirname, "..", "datos", "cou.js"), sinFecha = (o) => JSON.stringify(Object.assign({}, o, { fecha: "" }));
let igual = false;
try { igual = sinFecha(jsonDe(fs.readFileSync(destino, "utf8"))) === sinFecha(out); } catch (e) { /* no había base */ }
if (igual) console.log("Sin cambios en la Consulta: datos/cou.js queda como estaba.");
else { fs.writeFileSync(destino, "window.COU_DATOS=" + JSON.stringify(out) + ";\n"); console.log("datos/cou.js actualizado al", fecha); }
