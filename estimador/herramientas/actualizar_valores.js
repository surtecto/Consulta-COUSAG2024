// Verificación automática de datos/valores.json. La corre GitHub Actions (ver LEEME.md).
// Uso: node herramientas/actualizar_valores.js [--simular carpeta]
//   --simular: en vez de salir a internet lee de la carpeta los archivos hcd-cache.json,
//              digesto-novedades.js y colegio.html (sirve para probar).
const fs = require("fs"), path = require("path");
const M = require("../src/motor.js");
const ARCH = path.join(__dirname, "..", "datos", "valores.json");
const DIGESTO = "https://surtecto.github.io/HCD-SAG-Digesto2026/";
const sim = process.argv.indexOf("--simular") >= 0 ? process.argv[process.argv.indexOf("--simular") + 1] : null;
const salida = process.argv.indexOf("--salida") >= 0 ? process.argv[process.argv.indexOf("--salida") + 1] : ARCH;

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date()); // AAAA-MM-DD
const dma = (iso) => iso.split("-").reverse().join("/");
const pesos = (n) => "$ " + Math.round(n).toLocaleString("es-AR");
const pct = (x) => (Math.round(x * 10000) / 100).toLocaleString("es-AR") + " %";
const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

async function traer(url, archivoSim) {
  if (sim) return fs.readFileSync(path.join(sim, archivoSim), "utf8");
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Estimador de Expediente de Obra, San Andres de Giles)" }, redirect: "follow", signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error("respuesta " + r.status);
  return await r.text();
}
// Un valor leído sólo se acepta si es razonable respecto del cargado (evita aplicar una mala lectura).
const razonable = (nuevo, viejo, min, max) => typeof nuevo === "number" && isFinite(nuevo) && nuevo > 0 && (!viejo || (nuevo / viejo >= min && nuevo / viejo <= max));

(async () => {
  const v = JSON.parse(fs.readFileSync(ARCH, "utf8"));
  v.consultas = v.consultas || {};
  const avisos = [], cambios = [];

  /* ---- Municipalidad: Ordenanza Impositiva y Código de Faltas, por el Digesto ---- */
  try {
    const cache = JSON.parse(await traer(DIGESTO + "novedades/hcd-cache.json", "hcd-cache.json"));
    const cfg = JSON.parse(JSON.stringify(M.CFG)); M.aplicarValores(cfg, v);
    const nov = M.novedadesDigesto(cache.posts, cfg, v.revisadoHasta);
    const imps = nov.filter((n) => n.tipo === "impositiva"), fal = nov.filter((n) => n.tipo === "faltas");
    let det = "El Digesto no registra una Ordenanza Impositiva ni un Código de Faltas posteriores a los cargados.";
    if (imps.length) {
      let textos = {};
      try {
        const js = await traer(DIGESTO + "digesto-novedades.js", "digesto-novedades.js");
        const d = JSON.parse(js.slice(js.indexOf("{"), js.lastIndexOf("}") + 1));
        (d.list || []).forEach((o) => { if (o.t === "ord" && o.texto) textos[o.n + "-" + o.y] = o.texto; });
      } catch (e) { /* sin textos: queda el aviso */ }
      let aplicada = null; const saltadas = [];
      for (const imp of imps) {                       // de la más nueva a la más vieja
        const L = textos[imp.n + "-" + imp.y] ? M.leerImpositiva(textos[imp.n + "-" + imp.y]) : null;
        if (!L || !L.completo) { saltadas.push(imp); continue; }
        const m = v.municipio, malas = [];
        const pone = (k, nuevo, min, max, nombre, fmt) => {
          if (nuevo == null) return;
          if (!razonable(nuevo, m[k], min, max)) { malas.push(nombre); return; }
          if (m[k] !== nuevo) { cambios.push(nombre + ": " + fmt(m[k]) + " → " + fmt(nuevo)); m[k] = nuevo; }
        };
        const antes = JSON.stringify(m);
        pone("aConstruir", L.aConstruir, 0.4, 2.5, "Obra a construir", pct);
        pone("sinPermiso", L.sinPermiso, 0.4, 2.5, "Obra sin permiso", pct);
        if (malas.length) { Object.assign(m, JSON.parse(antes)); cambios.length = 0; saltadas.push(imp); continue; }   // lectura dudosa: no se toca nada
        pone("aConstruirMulti", L.aConstruirMulti, 0.4, 2.5, "Multifamiliar a construir", pct);
        pone("sinPermisoMulti", L.sinPermisoMulti, 0.4, 2.5, "Multifamiliar sin permiso", pct);
        pone("minSinPermiso", L.minSinPermiso, 0.5, 6, "Mínimo por parcela sin permiso", pesos);
        pone("antiguedad70", L.antiguedad70, 0.4, 2.5, "Antigüedad mayor a 70 años", pct);
        pone("demolicionCon", L.demolicionCon, 0.4, 2.5, "Demolición con permiso", pct);
        pone("demolicionSin", L.demolicionSin, 0.4, 2.5, "Demolición sin permiso", pct);
        m.oficina = m.oficina || {};
        [["inicio", "Inicio de actuaciones"], ["final", "Certificado final de obra"], ["linea", "Línea municipal"]].forEach(([k, nombre]) => {
          const nuevo = L.oficina[k]; if (nuevo == null) return;
          if (!razonable(nuevo, m.oficina[k], 0.5, 6)) { malas.push(nombre); return; }
          if (m.oficina[k] !== nuevo) { cambios.push(nombre + ": " + pesos(m.oficina[k]) + " → " + pesos(nuevo)); m.oficina[k] = nuevo; }
        });
        pone("ploteoA1", L.ploteoA1, 0.5, 6, "Ploteo A1", pesos);
        const f = /^\d{4}-\d{2}/.test(imp.fecha || "") ? imp.fecha : hoy;
        m.norma = "Ordenanza Impositiva N.º " + imp.n + "/" + String(imp.y).slice(-2); m.numero = imp.n; m.anio = imp.y;
        m.valoresDe = MES[Number(f.slice(5, 7)) - 1] + " de " + f.slice(0, 4);
        if (imp.link) m.url = imp.link;
        m.lectura = "Valores leídos automáticamente del texto publicado en el Digesto el " + dma(hoy) + ". Conviene confirmarlos con la ordenanza.";
        if (malas.length) avisos.push("De la " + m.norma + " no se pudieron leer con seguridad: " + malas.join(", ") + ". Esos importes siguen siendo los anteriores.");
        aplicada = imp; break;
      }
      if (aplicada) {
        det = "Se incorporó la " + v.municipio.norma + " leída del Digesto" + (cambios.length ? " (" + cambios.length + " valores cambiaron)." : " (sin cambios en los valores).");
        if (saltadas.length) avisos.push("Hay una norma posterior a la " + v.municipio.norma + " que puede modificarla: «" + saltadas[0].titulo + "». No se pudo leer de forma automática; hasta revisarla, los porcentajes y tasas de esta página son los de la " + v.municipio.norma + ".");
      } else {
        det = "Hay una norma impositiva posterior que no se pudo leer de forma automática.";
        avisos.push("El Concejo publicó una norma posterior a la " + v.municipio.norma + ": «" + imps[0].titulo + "». Sus valores no se pudieron leer de forma automática; los porcentajes y tasas de esta página son los anteriores hasta que se actualice el archivo de valores.");
      }
    }
    if (fal.length) avisos.push("El Concejo publicó una norma posterior al Código de Faltas cargado: «" + fal[0].titulo + "». Conviene revisar los artículos citados.");
    v.consultas.digesto = { fecha: hoy, ok: true, detalle: det };
  } catch (e) {
    v.consultas.digesto = { fecha: hoy, ok: false, detalle: "No se pudo consultar el Digesto (" + String(e.message).slice(0, 80) + ")." };
  }

  /* ---- Colegio: Unidad Referencial ---- */
  {
    const paginas = (v.colegio.paginas && v.colegio.paginas.length ? v.colegio.paginas : [v.colegio.url]).filter(Boolean);
    let leidas = 0, confirma = false, nuevo = null, de = "";
    for (let i = 0; i < paginas.length; i++) {
      try {
        const r = M.leerUR(await traer(paginas[i], i ? "colegio" + (i + 1) + ".html" : "colegio.html"), v.colegio.UR); leidas++;
        confirma = confirma || r.confirma;
        if (r.nuevo && (!nuevo || r.nuevo.v > nuevo.v)) { nuevo = r.nuevo; de = paginas[i]; }
      } catch (e) { /* se informa abajo */ }
    }
    if (nuevo) {
      cambios.push("Unidad referencial: " + pesos(v.colegio.UR) + " → " + pesos(nuevo.v));
      v.colegio.UR = nuevo.v; v.colegio.vigenciaUR = nuevo.vigencia || dma(hoy);
      v.colegio.fuente = "Leído automáticamente del sitio del Colegio (" + de + ") el " + dma(hoy) + ". Conviene confirmarlo con la resolución.";
      v.consultas.colegio = { fecha: hoy, ok: true, detalle: "El sitio del Colegio publica una Unidad Referencial nueva: " + pesos(nuevo.v) + " por m²." };
    } else if (confirma) v.consultas.colegio = { fecha: hoy, ok: true, detalle: "El sitio del Colegio sigue publicando " + pesos(v.colegio.UR) + " por m²." };
    else if (leidas) v.consultas.colegio = { fecha: hoy, ok: false, detalle: "Se abrió el sitio del Colegio pero no se encontró allí el valor de la Unidad Referencial. Hay que confirmarlo a mano." };
    else v.consultas.colegio = { fecha: hoy, ok: false, detalle: "No se pudo abrir el sitio del Colegio. Hay que confirmar la Unidad Referencial a mano." };
  }

  v.avisosAuto = avisos;
  if (v.consultas.digesto.ok && v.consultas.colegio.ok) v.verificado = hoy;
  fs.writeFileSync(salida, JSON.stringify(v, null, 2) + "\n");
  console.log("Digesto:", v.consultas.digesto.ok ? "ok" : "falló", "·", v.consultas.digesto.detalle);
  console.log("Colegio:", v.consultas.colegio.ok ? "ok" : "falló", "·", v.consultas.colegio.detalle);
  cambios.forEach((c) => console.log("  cambio ·", c));
  avisos.forEach((a) => console.log("  aviso ·", a));
})().catch((e) => { console.error(e); process.exit(1); });
