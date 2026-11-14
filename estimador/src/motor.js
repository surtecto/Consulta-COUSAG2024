/* =====================================================================
   VALORES VIGENTES. Para actualizar la herramienta alcanza con editar este bloque.
   Todas las tablas del Colegio derivan de la Unidad Referencial (UR).
   ===================================================================== */
var CFG = {
  actualizado: "14/11/2026",
  colegio: {
    UR: 1518000,                    // Unidad Referencial por m². Res. CAUBA 8/26, vigente desde 01/04/2026
    vigenciaUR: "01/04/2026",
    semicubierta: 0.5,              // la superficie semicubierta computa al 50 %
    cepAlicuota: 0.033,             // tasa de visado (CEP): 3,3 % del honorario referencial (deducida de previsados)
    cepMinimoFC: 0.75,              // CEP mínima = 0,75 FC ($ 56.925)
    aporteCaja: 0.10,               // Ley 12.490, art. 26 inc. b
    art29: 0.10,                    // contribución art. 29: 10 % del honorario de proyecto y dirección
    proyecto: 0.60, direccion: 0.40,
    suplSeparados: 1.0, suplAdministracion: 2.0,   // Res. CAPBA 67/10
    demolicion: 0.16, estado: { bueno: 0.30, regular: 0.45, malo: 0.60 },
    minTareaFC: 5,                  // mínimo para cualquier tarea = 5 FC ($ 379.500)
    informeTecnicoFC: 6.5,          // informe técnico con inspección ocular = 6,5 FC ($ 493.350)
    minMedicionVivAFC: 10,          // medición + informe, vivienda categoría A ($ 759.000)
    minMedicionRestoFC: 16,         // medición + informe, resto ($ 1.214.400)
    medioDiaViajeFC: 0.5,           // medio día de viaje ($ 37.950)
    tablaPD: [[1000, 0.085], [5000, 0.08], [10000, 0.075], [30000, 0.07], [100000, 0.065], [Infinity, 0.06]],
    tablaMed: { baseFC: 200, minimoFC: 2.5, tramos: [[1000, 0.01], [2000, 0.007], [5000, 0.005], [Infinity, 0.003]] },
    tablaGastos: [[5, 0.25], [20, 0.20], [50, 0.15], [Infinity, 0.10]]
  },
  municipio: {
    norma: "Ordenanza Impositiva N.º 2787/26", numero: 2787, anio: 2026,
    valoresDe: "enero de 2026",
    aConstruir: 0.01, aConstruirMulti: 0.015,       // art. 15 a
    sinPermiso: 0.025, sinPermisoMulti: 0.03,       // art. 16
    minSinPermiso: 120000,                          // art. 16, mínimo por parcela edificada
    antiguedad70: 0.0075,                           // art. 17
    demolicionCon: 0.0025, demolicionSin: 0.0075,   // art. 19
    oficina: [                                       // art. 14
      { id: "inicio", nombre: "Inicio de actuaciones (Mesa de Entradas)", valor: 10000, cuando: "siempre" },
      { id: "final", nombre: "Certificado final de obra", valor: 30000, cuando: "construir" },
      { id: "linea", nombre: "Otorgamiento de línea municipal", valor: 30000, cuando: "linea" }
    ]
  },
  // Código de Faltas, Ord. 2617/23. La multa la fija el Juez de Faltas; la planilla solo informa el marco legal.
  faltas: {
    norma: "Código de Faltas, Ordenanza N.º 2617/23", numero: 2617, anio: 2023,
    modulo: null,                   // valor del módulo en pesos (2 % del sueldo básico inicial de la categoría II municipal)
    antirreglamentaria: [10, 15000],// art. 89: obras o ampliaciones antirreglamentarias
    usoProhibido: [50, 4000]        // art. 100: funcionamiento prohibido por zonificación
  },
  // Copias: precio por m² de plano ploteado. Referencia: ploteo municipal A1 en blanco y negro, $ 4.200 (art. 14 inc. 10 c.4).
  ploteo: { precioM2: 8400, copias: 8, formato: "A1", formatos: { A4: 0.0625, A3: 0.125, A2: 0.25, A1: 0.5, A0: 1 } },
  enlaces: {
    cou: "https://surtecto.github.io/Consulta-COUSAG2024/",
    digesto: "https://surtecto.github.io/HCD-SAG-Digesto2026/",
    digestoDatos: "https://surtecto.github.io/HCD-SAG-Digesto2026/novedades/hcd-cache.json",
    valores: "datos/valores.json",
    colegio: "https://caubauno.org/visado/",
    tablas: "https://caubauno.org/wp-content/uploads/2026/03/8-26-VALORES-REF-2026.pdf",
    impositiva: "https://hcdsanandresdegiles.com.ar/2026-ord2787-ordenanza-impositiva/",
    faltas: "https://hcdsanandresdegiles.com.ar/2023-ord02617-codigo-de-faltas/",
    ley12490: "https://normas.gba.gob.ar/documentos/BLmDYSQV.html"
  },
  autor: ""
};

/* Destinos de obra y coeficientes. Anexo I, Res. CAUBA 8/26. */
var DESTINOS = [
  ["Vivienda", [
    ["1.2.1.1", "Vivienda unifamiliar, categoría A", 0.70, "vivA"],
    ["1.2.1.2", "Vivienda unifamiliar, categoría B", 0.80, "viv"],
    ["1.2.2.1", "Vivienda unifamiliar, categoría C", 1.00, "viv"],
    ["1.2.2.2", "Vivienda unifamiliar, categoría D", 1.20, "viv"],
    ["1.2.3.1", "Vivienda unifamiliar, categoría E", 1.40, "viv"],
    ["1.1", "Vivienda de interés social (Ley de Acceso Justo al Hábitat)", 0.50],
    ["1.5", "Vivienda industrializada", 0.50],
    ["1.3.1.1", "Vivienda multifamiliar, hasta 4 plantas", 0.90, "multi"],
    ["1.3.3.1", "Vivienda multifamiliar, más de 4 plantas", 1.00, "multi"],
    ["1.6.1", "Pileta de hormigón revestida, con equipo de bombeo", 0.50, "pileta"],
    ["1.6.2", "Otras piletas", 0.25, "pileta"]
  ]],
  ["Comercio", [
    ["3.1", "Comercio minorista individual, hasta 50 m²", 0.50],
    ["3.4", "Comercio minorista o mayorista, de 50 a 300 m²", 0.70],
    ["3.4.1", "Comercio minorista o mayorista, más de 300 m²", 0.80]
  ]],
  ["Industria, depósitos y campo", [
    ["2.1", "Depósito o industria de baja complejidad (hasta 12 m de luz y 6 m de alto)", 0.30],
    ["2.2.1", "Depósito que supera 12 m de luz o 6 m de alto", 0.45],
    ["2.2.2", "Industria que supera 12 m de luz o 6 m de alto", 0.60],
    ["2.3", "Industria de alta complejidad o laboratorio industrial", 1.00],
    ["2.4", "Invernáculo o local para cría de animales", 0.10],
    ["2.5", "Tinglado: cubierta sin cerramientos laterales", 0.20]
  ]],
  ["Gastronomía y alojamiento", [
    ["9.1", "Parrilla o casa de comidas", 0.70],
    ["9.2", "Restaurante, bar, confitería o pizzería", 0.80],
    ["9.3", "Restaurante de categoría", 1.20],
    ["8.1", "Hostería, hospedaje o pensión", 0.80],
    ["8.2", "Hotel de 2 y 3 estrellas", 1.00]
  ]],
  ["Salud y educación", [
    ["6.1", "Dispensario o sala de primeros auxilios", 0.70],
    ["6.2", "Consultorios o laboratorio de análisis clínicos", 0.80],
    ["6.3", "Clínica, sanatorio o geriátrico", 1.00],
    ["5.1", "Establecimiento educativo, hasta 200 m²", 0.50],
    ["5.2", "Establecimiento educativo, más de 200 m²", 1.00]
  ]],
  ["Oficinas, reunión y deporte", [
    ["12.1", "Oficinas y administración, edificio privado", 1.00],
    ["7.1", "Banco, financiera o seguros", 1.25],
    ["4.2", "Salón de fiestas", 1.00],
    ["10.1", "Capilla o equivalente", 0.70],
    ["13.1", "Club social", 0.70],
    ["13.2.1", "Club deportivo sin tribuna, luces menores de 15 m", 0.70],
    ["13.3.1", "Natatorio descubierto de club", 0.50, "pileta"]
  ]],
  ["Cocheras y servicios", [
    ["14.1", "Cochera en planta única con cubierta liviana", 0.30],
    ["15.1", "Playa de estacionamiento o maniobras", 0.08],
    ["15.2.1", "Estación de servicio: playa de expendio cubierta o semicubierta", 0.60]
  ]]
];
var DEST = {};
DESTINOS.forEach(function (g) { g[1].forEach(function (d) { DEST[d[0]] = { cod: d[0], nombre: d[1], coef: d[2], tipo: d[3] || "" }; }); });

/* ---------------- Destino en palabras del vecino → código del Colegio ----------------
   Cada regla: patrón sobre el texto normalizado y uno de: ops (códigos posibles; "VIV" = parte de la vivienda),
   auto ("comercio" o "educacion": se resuelve por superficie). uso: códigos de uso del COU a verificar. */
var REGLAS = [
  { id: "pileta", re: /pileta|piscina|natatorio/, ops: ["1.6.1", "1.6.2"], pregunta: "¿Cómo es la pileta?" },
  { id: "multi", re: /departamento|depto|duplex|multifamiliar|\bph\b|propiedad horizontal|edificio de (viviendas|departamentos)|dos viviendas|complejo de viviendas/, ops: ["1.3.1.1", "1.3.3.1"], pregunta: "¿Cuántas plantas tiene?" },
  { id: "comidas", re: /casa de comidas|rotiseria|comidas para llevar|parrilla al paso/, ops: ["9.1"] },
  { id: "gastro", re: /restaurante|restaurant|restoran|\bbar\b|confiteria|pizzeria|cafeteria|\bcafe\b|cerveceria|heladeria|comedor/, ops: ["9.2", "9.3"], pregunta: "¿Qué tipo de local gastronómico es?" },
  { id: "geriatrico", re: /geriatrico|hogar de ancianos|residencia para mayores|clinica|sanatorio/, ops: ["6.3"] },
  { id: "fiestas", re: /salon de (fiestas|eventos)|eventos/, ops: ["4.2"] },
  { id: "estacion", re: /estacion de servicio|\bgnc\b|surtidor/, ops: ["15.2.1"] },
  { id: "playa", re: /playa de estacionamiento|estacionamiento/, ops: ["15.1", "14.1"], pregunta: "¿Es descubierta o techada?" },
  { id: "hotel", re: /hotel|hosteria|hospedaje|pension|hostel|alojamiento/, ops: ["8.1", "8.2"], pregunta: "¿Qué tipo de alojamiento es?" },
  { id: "banco", re: /banco|financiera|seguros/, ops: ["7.1"] },
  { id: "salita", re: /primeros auxilios|dispensario|salita/, ops: ["6.1"] },
  { id: "consultorio", re: /consultorio|laboratorio de analisis|odontolog|kinesiolog|veterinaria|optica|centro medico/, ops: ["6.2"] },
  { id: "educacion", re: /escuela|colegio|jardin de infantes|jardin maternal|instituto|academia|guarderia/, auto: "educacion" },
  { id: "culto", re: /iglesia|capilla|templo|culto/, ops: ["10.1"] },
  { id: "club", re: /club|sede social|sociedad de fomento|gimnasio/, ops: ["13.1", "13.2.1"], pregunta: "¿Qué tipo de club es?" },
  { id: "oficina", re: /oficina|estudio|escritorio|inmobiliaria|administracion/, ops: ["12.1"] },
  { id: "cria", re: /criadero|gallinero|pollo|cerdo|porcino|avicola|granja|tambo|establo|caballeriza|invernadero|invernaculo|vivero/, ops: ["2.4"] },
  { id: "tinglado", re: /tinglado|cobertizo/, ops: ["2.5", "2.1"], pregunta: "¿Tiene paredes?" },
  { id: "industria", re: /fabrica|industria|taller|carpinteria|herreria|metalurgic|elaboracion|frigorifico/, ops: ["2.1", "2.2.2", "2.3"], pregunta: "¿Qué tamaño y complejidad tiene?", uso: ["Ind1", "Ind2", "Ind3", "S5a", "S5b", "S6a", "S6b", "S6c"] },
  { id: "galpon", re: /galpon|deposito|\bnave\b|logistic|acopio/, ops: ["2.1", "2.2.1"], pregunta: "¿Qué tamaño tiene?" },
  { id: "comercio", re: /kiosco|quiosco|local|comercio|negocio|almacen|tienda|supermercado|autoservicio|despensa|verduleria|carniceria|panaderia|farmacia|ferreteria|mayorista|showroom|comercial|venta/, auto: "comercio" },
  { id: "prefab", re: /prefabricad|industrializad|modular|contenedor|container/, ops: ["1.5"] },
  { id: "social", re: /interes social|vivienda social/, ops: ["1.1"] },
  { id: "cochera", re: /cochera|garage|garaje/, ops: ["VIV", "14.1"], pregunta: "¿De qué es la cochera?" },
  { id: "cabana", re: /caban/, ops: ["VIV", "8.1"], pregunta: "¿Para qué se usa?" },
  { id: "vivienda", re: /casa|vivienda|chalet|hogar|monoambiente|quincho|parrilla|galeria|lavadero|dormitorio|bano|cocina|living|habitacion|ampliacion|estar|pergola|alero|sum\b/, ops: ["VIV"] }
];
var OPCION_VIV = "Es parte de una vivienda unifamiliar";

function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim(); }
function detectarDestino(texto) {
  var t = norm(texto); if (!t) return null;
  for (var i = 0; i < REGLAS.length; i++) if (REGLAS[i].re.test(t)) return REGLAS[i];
  return null;
}
/* Categoría de vivienda unifamiliar. Ocho ítems de la planilla del Colegio; el de superficie se calcula solo. */
var ITEMS_VIV = [
  ["servicio", "Tiene dependencias de servicio (habitación para personal)"],
  ["cocheras", "Tiene dos o más cocheras cubiertas o semicubiertas"],
  ["aire", "Tiene aire acondicionado central u otra instalación especial"],
  ["banos", "Tiene cuatro o más baños o toilettes"],
  ["piscina", "Tiene sauna o pileta con espejo de agua mayor de 30 m²"],
  ["country", "Está en un country, club de campo u otra urbanización privada"],
  ["niveles", "Tiene más de tres niveles o plantas"]
];
function categoriaVivienda(items, supTotal) {
  var n = 0; items = items || {};
  ITEMS_VIV.forEach(function (it) { if (items[it[0]]) n++; });
  var porSup = supTotal > 150; if (porSup) n++;
  if (items.country && n === 1) n = 2;      // el ítem de ubicación solo cuenta doble
  var cod = ["1.2.1.1", "1.2.1.2", "1.2.2.1", "1.2.2.2", "1.2.3.1"][Math.min(n, 4)];
  return { cod: cod, items: n, porSup: porSup };
}
/* Resuelve el encuadre de una parte. ctx: { catViv, supEncuadre } */
function resolverParte(p, ctx) {
  var r = { cod: null, provisorio: false, opciones: null, pregunta: "", auto: "", regla: null };
  if (p.manual) {
    if (p.manual === "otro") return { cod: "otro", coef: Number(p.coefManual) || 0, tipo: "", nombre: "Otro destino", provisorio: false };
    r.cod = p.manual;
  } else {
    var regla = detectarDestino(p.texto); r.regla = regla;
    if (!regla) return { cod: null, coef: 0, tipo: "", nombre: "", provisorio: false, sinDetectar: !!norm(p.texto) };
    if (regla.auto === "comercio") { r.cod = ctx.supEncuadre <= 50 ? "3.1" : ctx.supEncuadre <= 300 ? "3.4" : "3.4.1"; r.auto = "por la superficie total del comercio"; }
    else if (regla.auto === "educacion") { r.cod = ctx.supEncuadre <= 200 ? "5.1" : "5.2"; r.auto = "por la superficie total del establecimiento"; }
    else {
      var ops = regla.ops, i = p.opcion == null ? 0 : Math.min(p.opcion, ops.length - 1);
      r.cod = ops[i]; r.opciones = ops.length > 1 ? ops : null; r.pregunta = regla.pregunta || "";
      r.provisorio = ops.length > 1 && p.opcion == null;
    }
  }
  var esViv = r.cod === "VIV"; if (esViv) r.cod = ctx.catViv;
  var d = DEST[r.cod];
  r.coef = d.coef; r.tipo = d.tipo; r.nombre = d.nombre; r.esViv = esViv || d.tipo === "viv" || d.tipo === "vivA";
  return r;
}
/* Uso del Código a partir de las palabras del vecino. Es el buscador de actividades de la Consulta Urbanística Giles
   (misma lista de actividades, mismas definiciones y mismos rangos de superficie), leído de datos/cou.js.
   Devuelve los usos posibles ordenados: [{ c: código, s: puntaje }]. */
function normTxt(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim(); }
function interpretarUso(q, cub, DC) {
  if (!DC || !DC.actividades) return [];
  var nq = " " + normTxt(q) + " "; if (nq.trim().length < 3) return [];
  var stop = {}; (DC.stop || []).forEach(function (w) { stop[w] = 1; });
  var toks = nq.trim().split(" ").filter(function (t) { return t.length >= 3 && !stop[t]; });
  var sc = {}, orden = [];
  function add(c, pts) { if (!sc[c]) { sc[c] = { c: c, s: 0 }; orden.push(sc[c]); } sc[c].s += pts; }
  DC.actividades.forEach(function (e) {
    var best = 0;
    e[0].forEach(function (k) {
      var nk = normTxt(k);
      if (nq.indexOf(" " + nk + " ") >= 0) { var v = 20 + nk.length * 2; if (v > best) best = v; }
      else if (nk.indexOf(" ") < 0 && nk.length >= 5 && toks.some(function (t) {
        return t.length >= 5 && (t.indexOf(nk.slice(0, Math.max(5, nk.length - 2))) === 0 || nk.indexOf(t.slice(0, Math.max(5, t.length - 2))) === 0);
      })) { var v2 = 10 + nk.length; if (v2 > best) best = v2; }
    });
    if (best) e[1].forEach(function (c, i) { add(c, best - i * 2); });
  });
  (DC.usosDef || []).forEach(function (u) {
    var nd = " " + normTxt(u[1] + " " + u[2]) + " ", m = 0;
    toks.forEach(function (t) { if (nd.indexOf(" " + t) >= 0) m += t.length >= 6 ? 4 : 2; });
    if (m) add(u[0], m);
  });
  if (/ venta /.test(nq) && !orden.some(function (x) { return /^C/.test(x.c); })) ["C1a", "C1b", "C1c"].forEach(function (c, i) { add(c, 8 - i); });
  if (/ (fabrica|fabricacion|elaboracion|produccion) /.test(nq)) add("Ind1", 6);
  if (/ reparacion /.test(nq) && !orden.length) add("S3", 6);
  var arr = orden.slice().sort(function (a, b) { return b.s - a.s; });
  if (!arr.length) return [];
  var top = arr[0].s; arr = arr.filter(function (x) { return x.s >= Math.max(6, top * 0.35); }).slice(0, 6);
  if (cub) arr.forEach(function (x) {
    var r = DC.rango && DC.rango[x.c];
    if (r) { x.fit = cub >= r[0] && cub <= (r[1] == null ? Infinity : r[1]); x.s += x.fit ? 15 : -10; }
  });
  arr.sort(function (a, b) { return b.s - a.s; });
  return arr;
}

/* ---------------- Honorarios y costos ---------------- */
function escalaAcumulada(valor, tramos, unidad) {
  var total = 0, desde = 0;
  for (var i = 0; i < tramos.length && valor > desde; i++) {
    var hasta = tramos[i][0] * unidad;
    total += (Math.min(valor, hasta) - desde) * tramos[i][1];
    desde = hasta;
  }
  return total;
}
function honorarioPD(monto, c) { return monto > 0 ? escalaAcumulada(monto, c.tablaPD, c.UR / 20) : 0; }
function honorarioMedicion(monto, c) {
  if (monto <= 0) return 0;
  var FC = c.UR / 20, t = c.tablaMed, total = t.minimoFC * FC, desde = t.baseFC * FC;
  for (var i = 0; i < t.tramos.length && monto > desde; i++) {
    var hasta = t.tramos[i][0] * FC;
    total += (Math.min(monto, hasta) - desde) * t.tramos[i][1];
    desde = hasta;
  }
  return total;
}
function calcular(e, cfg) {
  var c = cfg.colegio, m = cfg.municipio, FC = c.UR / 20;
  var r = { partes: [], sup: { construir: 0, existente: 0, demoler: 0 }, monto: { construir: 0, existente: 0, demoler: 0 } };
  var derConstruir = 0, derExistente = 0, derDemoler = 0, todasVivA = true, hayExistente = false;
  e.partes.forEach(function (p) {
    var coef = Number(p.coef) || 0;
    var sup = Math.max(0, Number(p.cub) || 0) + c.semicubierta * Math.max(0, Number(p.semi) || 0);
    var monto = sup * c.UR * coef;
    r.partes.push({ sup: sup, monto: monto });
    if (sup <= 0 || coef <= 0) return;
    r.sup[p.sit] += sup; r.monto[p.sit] += monto;
    var multi = p.tipo === "multi";
    if (p.sit === "construir") derConstruir += monto * (multi ? m.aConstruirMulti : m.aConstruir);
    if (p.sit === "existente") {
      hayExistente = true; if (p.tipo !== "vivA") todasVivA = false;
      derExistente += monto * (e.antig70 ? m.antiguedad70 : (multi ? m.sinPermisoMulti : m.sinPermiso));
    }
    if (p.sit === "demoler") derDemoler += monto * (e.demolicionSinPermiso ? m.demolicionSin : m.demolicionCon);
  });
  var ajusteMinMuni = 0;
  if (hayExistente && derExistente < m.minSinPermiso) { ajusteMinMuni = m.minSinPermiso - derExistente; derExistente = m.minSinPermiso; }

  var h = { proyecto: 0, direccion: 0, suplemento: 0, medicion: 0, informe: 0, demolicion: 0, ajusteMinimo: 0 };
  var pd = honorarioPD(r.monto.construir, c);
  if (pd > 0) {
    if (e.proyecto) h.proyecto = pd * c.proyecto;
    if (e.direccion) {
      h.direccion = pd * c.direccion;
      h.suplemento = h.direccion * (e.modalidad === "separados" ? c.suplSeparados : e.modalidad === "administracion" ? c.suplAdministracion : 0);
    }
    var sumaPD = h.proyecto + h.direccion + h.suplemento;
    if (sumaPD > 0 && sumaPD < c.minTareaFC * FC) h.ajusteMinimo += c.minTareaFC * FC - sumaPD;
  }
  if (hayExistente) {
    h.medicion = honorarioMedicion(r.monto.existente, c);
    h.informe = c.informeTecnicoFC * FC;
    var minMed = (todasVivA ? c.minMedicionVivAFC : c.minMedicionRestoFC) * FC;
    if (h.medicion + h.informe < minMed) h.ajusteMinimo += minMed - (h.medicion + h.informe);
  }
  if (r.monto.demoler > 0) {
    h.demolicion = Math.max(c.demolicion * honorarioPD(r.monto.demoler * c.estado[e.estado || "regular"], c), c.minTareaFC * FC);
  }
  h.total = h.proyecto + h.direccion + h.suplemento + h.medicion + h.informe + h.demolicion + h.ajusteMinimo;
  r.honorarios = h;

  var col = { cep: 0, aportes: 0, art29: 0 };
  if (h.total > 0) { col.cep = Math.max(c.cepAlicuota * h.total, c.cepMinimoFC * FC); col.aportes = c.aporteCaja * h.total; }
  if (hayExistente) col.art29 = c.art29 * honorarioPD(r.monto.existente, c);
  r.colegio = col;

  var of = [], ofTotal = 0, hayAlgo = r.sup.construir + r.sup.existente + r.sup.demoler > 0;
  m.oficina.forEach(function (o) {
    var aplica = o.cuando === "siempre" ? hayAlgo : o.cuando === "linea" ? (!!e.linea && r.sup.construir > 0) : r.sup[o.cuando] > 0;
    if (!aplica) return;
    of.push(o); if (o.valor != null) ofTotal += o.valor;
  });
  r.municipio = { construir: derConstruir, existente: derExistente, demoler: derDemoler, ajusteMinimo: ajusteMinMuni, oficina: of, oficinaTotal: ofTotal,
                  total: derConstruir + derExistente + derDemoler + ofTotal };

  var g = e.gastos || {}, pl = cfg.ploteo;
  var viaticos = (Number(g.viajes) || 0) * (Number(g.valorViaje) || 0);
  var m2Lamina = pl.formatos[g.formato] || pl.formatos[pl.formato];
  var m2Copias = (Number(g.laminas) || 0) * (Number(g.copias) || 0) * m2Lamina;
  var copias = m2Copias * (Number(g.precioM2) || 0);
  var otros = Number(g.otros) || 0;
  r.gastos = { viaticos: viaticos, copias: copias, m2Copias: m2Copias, otros: otros, total: viaticos + copias + otros,
               topePresunto: escalaAcumulada(h.total, c.tablaGastos, FC) };

  r.colegioSumado = (e.incluidos ? 0 : col.cep + col.aportes) + col.art29;
  r.total = h.total + r.colegioSumado + r.municipio.total + r.gastos.total;
  r.supTotal = r.sup.construir + r.sup.existente + r.sup.demoler;
  r.hayExistente = hayExistente;
  return r;
}

/* ---------------- Verificación de indicadores del COU ---------------- */
function numero(s) {
  if (s == null) return null; s = String(s).trim(); if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  var x = parseFloat(s); return isNaN(x) ? null : x;
}
function leerRetiro(txt) {
  var t = norm(txt);
  if (!t || /^[-–\s]+$/.test(t)) return { tipo: "sin" };
  if (/no se exige|optativo/.test(t)) return { tipo: "libre" };
  if (/no se permite/.test(t)) return { tipo: "prohibido" };
  var m = t.match(/^(\d+(?:[.,]\d+)?)/);
  if (m) return { tipo: "min", m: numero(m[1]), simple: /^\d+(?:[.,]\d+)?\s*m?\.?$/.test(t) };
  return { tipo: "texto" };
}
function leerAltura(txt) {
  var t = norm(txt); if (!t || /^[-–\s]+$/.test(t)) return null;
  var p = t.match(/pb\s*\+\s*(\d)/g);
  if (p) {
    var ns = p.map(function (x) { return Number(x.replace(/\D/g, "")) + 1; });
    return { plantas: ns[0], avenidas: /avenida/.test(t) && ns[1] ? ns[1] : null };
  }
  var m = t.match(/^(\d+(?:[.,]\d+)?)\s*m/); if (m) return { metros: numero(m[1]) };
  return null;
}
/* v: { ficha, supTerreno, huella, supFOT, plantas, rFrente, rFondo, rLateral, usos:[{nombre, sit, codigo, nombreUso}], hayExistente }
   Compara con los indicadores de la zona. No gradúa ni estima multas: eso es del Juez de Faltas. */
function verificar(v, cfg) {
  var f = v.ficha, it = [], F = cfg.faltas;
  function pct(x) { return (Math.round(x * 1000) / 10).toString().replace(".", ",") + " %"; }
  function dec(x) { return (Math.round(x * 100) / 100).toString().replace(".", ","); }
  if (!f) return { items: [], sinZona: true };
  var T = numero(v.supTerreno);

  [["fos", "Ocupación del suelo (FOS)", numero(v.huella), "la superficie que la construcción ocupa en planta baja"],
   ["fot", "Superficie total construida (FOT)", numero(v.supFOT), "la superficie construida"]].forEach(function (d) {
    var lim = numero(f[d[0]]);
    if (lim == null) { it.push({ id: d[0], nombre: d[1], exigido: "La zona no fija un valor", estado: "rev", nota: "Lo define la Dirección de Planeamiento para cada caso." }); return; }
    var ex = "Hasta " + dec(lim) + (T ? " (" + dec(lim * T) + " m² en tu terreno)" : "");
    if (!T || d[2] == null || d[2] <= 0) { it.push({ id: d[0], nombre: d[1], exigido: ex, estado: "sd", nota: "Falta " + (!T ? "la superficie del terreno" : d[3]) + "." }); return; }
    var val = d[2] / T, exceso = val / lim - 1, base = { id: d[0], nombre: d[1], exigido: ex, tuObra: dec(val) + " (" + dec(d[2]) + " m²)", med: { v: val, lim: lim } };
    if (exceso > 0.0005) { base.estado = "no"; base.exceso = exceso; base.nota = "Supera el máximo en " + pct(exceso) + ", unos " + dec(d[2] - lim * T) + " m²."; }
    else base.estado = "ok";
    it.push(base);
  });

  var a = leerAltura(f.alt), pl = Number(v.plantas) || 0;
  if (!a) it.push({ id: "alt", nombre: "Altura", exigido: f.alt && !/^[-–\s]+$/.test(f.alt) ? f.alt : "La zona no fija un valor", estado: "rev", nota: "Consultalo con tu profesional." });
  else if (a.metros) it.push({ id: "alt", nombre: "Altura", exigido: "Hasta " + dec(a.metros) + " m", tuObra: pl ? pl + (pl === 1 ? " planta" : " plantas") : "", estado: "rev", nota: "El límite está en metros: medí la altura total de la construcción." });
  else if (!pl) it.push({ id: "alt", nombre: "Altura", exigido: f.alt, estado: "sd", nota: "Falta la cantidad de plantas." });
  else if (pl <= a.plantas) it.push({ id: "alt", nombre: "Altura", exigido: f.alt, tuObra: pl + (pl === 1 ? " planta" : " plantas"), estado: "ok" });
  else if (a.avenidas && pl <= a.avenidas) it.push({ id: "alt", nombre: "Altura", exigido: f.alt, tuObra: pl + " plantas", estado: "rev", nota: "Esa altura solo se admite en parcelas sobre avenidas." });
  else it.push({ id: "alt", nombre: "Altura", exigido: f.alt, tuObra: pl + " plantas", estado: "no", nota: "Supera la cantidad de plantas admitida." });

  [["rf", "Retiro de frente", v.rFrente, f.rf], ["rfo", "Retiro de fondo", v.rFondo, f.rfo], ["rb", "Retiros laterales", v.rLateral, f.rb]].forEach(function (d) {
    var R = leerRetiro(d[3]), x = numero(d[2]);
    if (R.tipo === "sin") return;
    if (R.tipo === "libre") { it.push({ id: d[0], nombre: d[1], exigido: "No se exige", estado: "ok" }); return; }
    if (R.tipo === "prohibido") {
      if (x == null) it.push({ id: d[0], nombre: d[1], exigido: "No se permite retirarse", estado: "sd", nota: "Indicá la distancia. Si la construcción está sobre la línea, poné 0." });
      else if (x > 0) it.push({ id: d[0], nombre: d[1], exigido: "No se permite retirarse", tuObra: dec(x) + " m", estado: "rev", nota: "La zona pide construir sobre la línea. Consultalo en Planeamiento." });
      else it.push({ id: d[0], nombre: d[1], exigido: "No se permite retirarse", tuObra: "sobre la línea", estado: "ok" });
      return;
    }
    if (R.tipo === "texto") { it.push({ id: d[0], nombre: d[1], exigido: d[3], estado: "rev", nota: "Depende de la manzana: lo determina tu profesional." }); return; }
    var ex = R.simple ? "Mínimo " + dec(R.m) + " m" : d[3];
    if (x == null) { it.push({ id: d[0], nombre: d[1], exigido: ex, estado: "sd", nota: "Falta la distancia." }); return; }
    if (x + 0.005 < R.m) it.push({ id: d[0], nombre: d[1], exigido: ex, tuObra: dec(x) + " m", estado: "no", nota: "Faltan " + dec(R.m - x) + " m para el mínimo." + (R.simple ? "" : " La zona tiene excepciones: revisalas.") });
    else it.push({ id: d[0], nombre: d[1], exigido: ex, tuObra: dec(x) + " m", estado: "ok" });
  });

  // Usos: el código de uso sale del buscador de la Consulta Urbanística; el estado, de la ficha de zona
  var usoProhibidoExistente = false, infraUsoNuevo = 0;
  (v.usos || []).forEach(function (u, i) {
    var base = { id: "uso" + i, nombre: "Uso: " + u.nombre, exigido: u.codigo ? u.codigo + " · " + (u.nombreUso || "") : "Usos admitidos en la zona" };
    if (!u.codigo) { base.estado = "sd"; base.nota = "Elegí el uso del Código en la parte correspondiente."; it.push(base); return; }
    var s = f.u[u.codigo], st = s ? s.charAt(0) : "", nota = s && s.indexOf("|") > 0 ? s.split("|")[1] : "";
    var sec = f.sec ? " La zona tiene sectores con usos adicionales: miralos en la Consulta Urbanística." : "";
    if (st === "P") { base.estado = "ok"; base.tuObra = "Permitido" + (nota ? " (" + nota + ")" : ""); }
    else if (st === "C") { base.estado = "rev"; base.tuObra = "Condicionado"; base.nota = "Requiere evaluación de la Dirección de Planeamiento." + (nota ? " " + nota + "." : ""); }
    else if (st === "X") { base.estado = "rev"; base.tuObra = "Complementario"; base.nota = "Se admite como accesorio de otro uso principal."; }
    else {
      base.estado = "no"; base.tuObra = "No figura entre los usos de la zona";
      base.nota = "Consultá en Planeamiento antes de avanzar." + sec;
      if (u.sit === "existente") usoProhibidoExistente = true; else infraUsoNuevo++;
    }
    it.push(base);
  });

  var incumple = it.filter(function (x) { return x.estado === "no"; }).length;
  var res = { items: it, incumple: incumple, faltan: it.filter(function (x) { return x.estado === "sd"; }).length,
              revisar: it.filter(function (x) { return x.estado === "rev"; }).length, multa: null };
  // Lo ya construido que no cumple puede ser sancionado; el monto lo fija el Juez de Faltas
  if (incumple > infraUsoNuevo && v.hayExistente) res.multa = { legal: F.antirreglamentaria, modulo: F.modulo, usoProhibido: usoProhibidoExistente ? F.usoProhibido : null };
  return res;
}

/* ---------------- Valores vigentes: archivo verificable y novedades del Digesto ---------------- */
function aplicarValores(cfg, v) {
  var cambios = [];
  function pone(obj, k, nuevo, nombre, esTexto) {
    if (esTexto ? !(typeof nuevo === "string" && nuevo) : !(typeof nuevo === "number" && isFinite(nuevo) && nuevo > 0)) return;
    if (obj[k] !== nuevo) { if (nombre) cambios.push({ nombre: nombre, antes: obj[k], ahora: nuevo }); obj[k] = nuevo; }
  }
  if (!v || typeof v !== "object") return cambios;
  var c = v.colegio || {}, m = v.municipio || {}, f = v.faltas || {};
  pone(cfg.colegio, "UR", c.UR, "Unidad referencial del Colegio");
  pone(cfg.colegio, "vigenciaUR", c.vigenciaUR, "", true);
  pone(cfg.municipio, "norma", m.norma, "", true); pone(cfg.municipio, "numero", m.numero, ""); pone(cfg.municipio, "anio", m.anio, "");
  pone(cfg.municipio, "valoresDe", m.valoresDe, "", true);
  if (typeof m.url === "string" && /^https:\/\//.test(m.url)) cfg.enlaces.impositiva = m.url;
  cfg.municipio.lectura = typeof m.lectura === "string" ? m.lectura : "";
  [["aConstruir", "Derecho de construcción, obra a construir"], ["aConstruirMulti", "Derecho de construcción, multifamiliar a construir"],
   ["sinPermiso", "Derecho de construcción, obra sin permiso"], ["sinPermisoMulti", "Derecho de construcción, multifamiliar sin permiso"],
   ["minSinPermiso", "Mínimo por parcela, obra sin permiso"], ["antiguedad70", "Alícuota por antigüedad mayor a 70 años"],
   ["demolicionCon", "Demolición con permiso"], ["demolicionSin", "Demolición sin permiso"]].forEach(function (d) { pone(cfg.municipio, d[0], m[d[0]], d[1]); });
  var of = m.oficina || {};
  cfg.municipio.oficina.forEach(function (o) { pone(o, "valor", of[o.id], o.nombre); });
  if (typeof m.ploteoA1 === "number" && m.ploteoA1 > 0) pone(cfg.ploteo, "precioM2", m.ploteoA1 / cfg.ploteo.formatos.A1, "Precio de referencia por m² de ploteo");
  pone(cfg.faltas, "modulo", f.modulo, "Valor del módulo de multas");
  if (typeof v.verificado === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.verificado)) cfg.actualizado = v.verificado.split("-").reverse().join("/");
  return cambios;
}
/* posts: publicaciones del Concejo que releva el Digesto. Devuelve normas posteriores a las cargadas.
   visto (opcional): { impositiva: {n, y}, faltas: {n, y} } marca hasta dónde ya se revisó a mano. */
function novedadesDigesto(posts, cfg, visto) {
  var out = [], M = cfg.municipio, F = cfg.faltas, V = visto || {};
  function tope(a, n, v) { return v && (Number(v.y) > a || (Number(v.y) === a && Number(v.n) > n)) ? [Number(v.y), Number(v.n)] : [a, n]; }
  var tI = tope(M.anio, M.numero, V.impositiva), tF = tope(F.anio, F.numero, V.faltas);
  Object.keys(posts || {}).forEach(function (k) {
    var p = posts[k]; if (!p || p.t !== "ord" || !p.titulo) return;
    var t = norm(p.titulo), y = Number(p.y) || 0, n = Number(p.n) || 0;
    var posterior = function (tp) { return y > tp[0] || (y === tp[0] && n > tp[1]); };
    if (/ordenanza impositiva|fiscal e impositiva|impositiva/.test(t) && posterior(tI)) out.push({ tipo: "impositiva", titulo: p.titulo, link: p.link || "", y: y, n: n, fecha: p.fecha_post || "" });
    else if (/codigo de faltas|faltas y contravenciones|codigo contravencional/.test(t) && posterior(tF)) out.push({ tipo: "faltas", titulo: p.titulo, link: p.link || "", y: y, n: n, fecha: p.fecha_post || "" });
  });
  return out.sort(function (a, b) { return b.y - a.y || b.n - a.n; });
}

/* ---------------- Lectura automática de las fuentes ----------------
   La usa herramientas/actualizar_valores.js (GitHub Actions). Son lecturas tolerantes: si algo no se
   reconoce con claridad no se informa, y el archivo de valores queda como estaba. */
function importe(s) {
  var t = String(s).replace(/[^\d.,]/g, "").replace(/[.,]+$/, "");
  if (!t) return NaN;
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", "."); else t = t.replace(/[.,]/g, "");
  return Number(t);
}
function porcentajes(s) {
  var re = /(\d{1,2}(?:[.,]\d{1,3})?)\s*(?:%|por\s+ciento)/gi, out = [], m;
  while ((m = re.exec(s))) {
    var v = Math.round(Number(m[1].replace(",", ".")) * 1e6) / 1e8;
    if (!(v > 0 && v <= 0.1)) continue;                                   // alícuotas, no "al 50 %"
    var u = out[out.length - 1];
    if (u && u.v === v && m.index - u.i < 40) continue;                    // "uno por ciento (1 %)"
    out.push({ v: v, i: m.index });
  }
  return out;
}
function cercano(ps, i, excluir) {
  var mejor = null;
  ps.forEach(function (p) { if (p === excluir) return; var d = Math.abs(p.i - i); if (d <= 220 && (!mejor || d < mejor.d)) mejor = { p: p, d: d }; });
  return mejor ? mejor.p : null;
}
/* Texto de una Ordenanza Impositiva → alícuotas del derecho de construcción y derechos de oficina. */
function leerImpositiva(texto) {
  var t = "\n" + String(texto || "").replace(/\r/g, ""), R = { oficina: {}, faltan: [], articulos: {} };
  var reArt = /\n\s*ART[ÍI]CULO\s+(\d+)\s*[º°o]?\.?\s*(?:bis\s*)?[:.\-–)]/gi;
  var cab = t.search(/\n[ \t]*(?:CAP[ÍI]TULO[^\n]{0,24})?DERECHOS?\s+DE\s+CONSTRUCCI[OÓ]N[ \t.:\-–]*\n/i);
  var cap = t;
  if (cab >= 0) {
    var resto = t.slice(cab + 10), fin = resto.search(/\n\s*(?:CAP[ÍI]TULO|Cap[íi]tulo|T[ÍI]TULO|T[íi]tulo)\s+[IVXLC\d]+\b/);
    cap = t.slice(cab, fin >= 0 ? cab + 10 + fin : t.length);
  }
  var cortes = [], m; reArt.lastIndex = 0;
  while ((m = reArt.exec(cap))) cortes.push({ n: Number(m[1]), i: m.index });
  var arts = cortes.map(function (c, k) { return { n: c.n, s: cap.slice(c.i, k + 1 < cortes.length ? cortes[k + 1].i : cap.length) }; });
  if (cab < 0) arts = arts.filter(function (a) { return /construcci|demolici/i.test(a.s); });
  arts.forEach(function (a) {
    var s = a.s, ps = porcentajes(s); if (!ps.length) return;
    var iMulti = s.search(/multifamiliar/i), multi = iMulti >= 0 && ps.length > 1 ? cercano(ps, iMulti, ps[0]) : null;
    if (/cementerio|b[oó]veda|pante[oó]n|sepultura|nicho/i.test(s)) return;
    if (/demolici/i.test(s.slice(0, 150))) {
      if (R.demolicionCon == null) {
        var vs = ps.map(function (p) { return p.v; });
        R.demolicionCon = Math.min.apply(null, vs); if (vs.length > 1) R.demolicionSin = Math.max.apply(null, vs);
        R.articulos.demolicion = a.n;
      }
    } else if (/setenta|\b70\b|antig[üu]edad/i.test(s) && R.antiguedad70 == null && !/sin\s+(?:el\s+)?(?:correspondiente\s+|previo\s+|debido\s+)?permiso/i.test(s.slice(0, 260))) {
      R.antiguedad70 = ps[0].v; R.articulos.antiguedad = a.n;
    } else if (/sin\s+(?:el\s+|la\s+)?(?:correspondiente\s+|previo\s+|previa\s+|debido\s+|debida\s+)?(?:permiso|autorizaci)|clandestin|no\s+declarad|sin\s+declarar|subsistente|empadronamiento/i.test(s)) {
      if (R.sinPermiso == null) {
        R.sinPermiso = ps[0].v; if (multi) R.sinPermisoMulti = multi.v;
        var mm = s.match(/m[ií]nimo[^$]{0,120}\$\s*([\d.,]+)/i); if (mm && isFinite(importe(mm[1]))) R.minSinPermiso = importe(mm[1]);
        R.articulos.sinPermiso = a.n;
      }
    } else if (R.aConstruir == null) {
      R.aConstruir = ps[0].v; if (multi) R.aConstruirMulti = multi.v; R.articulos.aConstruir = a.n;
    }
  });
  function monto(re) { var x = t.match(re); var v = x ? importe(x[1]) : NaN; return isFinite(v) && v > 0 ? v : null; }
  var of = { inicio: monto(/inicio\s+de\s+(?:las\s+)?actuaci[oó]n(?:es)?[^$]{0,160}\$\s*([\d.,]+)/i),
    final: monto(/final\s+de\s+obra[^$]{0,160}\$\s*([\d.,]+)/i), linea: monto(/l[ií]nea\s+municipal[^$]{0,160}\$\s*([\d.,]+)/i) };
  Object.keys(of).forEach(function (k) { if (of[k]) R.oficina[k] = of[k]; });
  var pl = monto(/\bA\s?-?1\b[^$\n]{0,120}\$\s*([\d.,]+)/); if (pl) R.ploteoA1 = pl;
  ["aConstruir", "sinPermiso"].forEach(function (k) { if (R[k] == null) R.faltan.push(k); });
  R.completo = !R.faltan.length && R.sinPermiso >= R.aConstruir;
  return R;
}
/* Página del Colegio (HTML o texto) → valor de la Unidad Referencial. actual: valor cargado hoy. */
var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function leerUR(html, actual) {
  var t = String(html || "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&#0?36;|&dollar;/gi, "$").replace(/&nbsp;|&#160;/gi, " ").replace(/&[a-z]+;|&#\d+;/gi, " ").replace(/\s+/g, " ");
  var re = /(unidad(?:es)?\s+referencial(?:es)?|\bU\.\s?R\.|\bUR\b)[^$]{0,160}\$\s*([\d.]{7,}(?:,\d{1,2})?)/gi, m, c = [];
  while ((m = re.exec(t))) {
    var v = importe(m[2]);
    if (isFinite(v)) c.push({ v: v, ctx: t.slice(Math.max(0, m.index - 220), m.index + m[0].length + 220) });
    re.lastIndex = m.index + m[1].length;
  }
  var nuevo = null;
  c.forEach(function (x) { if (x.v > actual && x.v <= actual * 2.5 && (!nuevo || x.v > nuevo.v)) nuevo = x; });
  var out = { candidatos: c.length, confirma: c.some(function (x) { return x.v === actual; }), nuevo: null };
  if (nuevo) {
    var vig = "", f = nuevo.ctx.match(/(?:desde|partir)\s+(?:de(?:l)?\s+)?(?:el\s+)?(?:d[ií]a\s+)?(\d{1,2})\s*[°º]?\s*(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|sep?tiembre|octubre|noviembre|diciembre)\s*(?:de(?:l)?\s+)?(\d{4})/i),
      g = nuevo.ctx.match(/(?:desde|partir)[^\d]{0,20}(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (f) vig = ("0" + f[1]).slice(-2) + "/" + ("0" + (MESES.indexOf(f[2].toLowerCase().replace("setiembre", "septiembre")) + 1)).slice(-2) + "/" + f[3];
    else if (g) vig = ("0" + g[1]).slice(-2) + "/" + ("0" + g[2]).slice(-2) + "/" + g[3];
    out.nuevo = { v: nuevo.v, vigencia: vig };
  }
  return out;
}

/* ---------------- Lectura de un plano ----------------
   items: textos del PDF con su posición visual { s, x, y, w, h } (ya corregida la rotación de la hoja).
   Las carátulas traen el rótulo en una celda y el valor en otra: se busca el número más cercano en la misma fila. */
var ES_NUM = /^\d[\d.,]*(\s*(m2|m²|mts2))?$/i;
function segmentosDe(items) {
  var its = items.filter(function (i) { return i.s && String(i.s).trim(); }).slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; });
  var filas = [];
  its.forEach(function (it) {
    var f = null, h = it.h || 8;
    for (var i = filas.length - 1; i >= 0 && i >= filas.length - 60; i--) {
      if (Math.abs(filas[i].y - it.y) <= Math.max(2.5, 0.45 * Math.min(h, filas[i].h))) { f = filas[i]; break; }
    }
    if (!f) { f = { y: it.y, h: h, it: [] }; filas.push(f); }
    f.it.push(it);
  });
  var segs = [];
  filas.forEach(function (f) {
    f.it.sort(function (a, b) { return a.x - b.x; });
    var cur = null;
    f.it.forEach(function (it) {
      var h = it.h || 8, t = String(it.s).trim();
      if (cur) {
        var gap = it.x - (cur.x + cur.w);
        if (gap <= 0.8 * h) { cur.s += (gap > 0.15 * h ? " " : "") + t; cur.w = it.x + (it.w || 0) - cur.x; return; }
      }
      cur = { s: t, x: it.x, y: it.y, w: it.w || 0, h: h }; segs.push(cur);
    });
  });
  return segs;
}
function analizarPlano(items, ancho) {
  ancho = ancho || 1000;
  var segs = segmentosDe(items), ev = {}, notas = [], destino = "", destinoDebil = "", partida = null, zona = "", nom = null;
  var NUM = /(?<![a-z\d.,])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)(?![\d.,]*\d)/g, lim = Math.max(160, 0.2 * ancho);
  function numeros(t) { var out = [], m; NUM.lastIndex = 0; while ((m = NUM.exec(t))) { var x = numero(m[1]); if (x != null) out.push(x); } return out; }
  function enFila(a, b) { return Math.abs(a.y - b.y) <= Math.max(3, 0.6 * Math.min(a.h, b.h)); }
  function vecino(L, filtro) {          // segmento más cercano en la misma fila: primero a la derecha, después a la izquierda
    var der = null, dd = 1e9, izq = null, di = 1e9;
    segs.forEach(function (s) {
      if (s === L || !filtro(s) || !enFila(s, L)) return;
      var d1 = s.x - (L.x + L.w), d2 = L.x - (s.x + s.w);
      if (d1 >= -1 && d1 <= lim && d1 < dd) { der = s; dd = d1; }
      if (d2 >= -1 && d2 <= lim && d2 < di) { izq = s; di = d2; }
    });
    return der || izq;
  }
  function debajo(L, filtro) {
    var b = null, bd = 1e9;
    segs.forEach(function (s) {
      var dy = s.y - L.y; if (s === L || !filtro(s) || dy <= 0.5 * L.h || dy > 3.2 * L.h) return;
      if (Math.abs(s.x - L.x) > Math.max(20, L.w)) return;
      if (dy < bd) { b = s; bd = dy; }
    });
    return b;
  }
  var esNum = function (s) { return ES_NUM.test(s.s); };
  segs.forEach(function (L) {
    var t = norm(L.s), x;
    // Destino
    if ((x = t.match(/^destino\b\s*:?\s*(.*)$/))) {
      if (x[1].length > 2 && !destino) destino = x[1];
      else if (!x[1] && !destinoDebil) { var bd = debajo(L, function (s) { return !esNum(s) && s.s.length > 3; }); if (bd) destinoDebil = norm(bd.s); }
    }
    // Partida
    if (!partida && /partida/.test(t)) {
      var mp = t.match(/partida\D{0,40}?(?:0?94\s*-\s*)?0*(\d{3,6})\b/);
      if (!mp) { var vp = vecino(L, function (s) { return /^(0?94\s*-\s*)?\d{3,6}$/.test(s.s.trim()); }); if (vp) mp = vp.s.match(/(?:0?94\s*-\s*)?0*(\d{3,6})$/); }
      if (mp) partida = Number(mp[1]);
    }
    if (!zona && (x = L.s.match(/\bzona\s+([A-Za-z]{1,5}\d?(?:-[A-Za-z0-9]+)?)/i))) zona = x[1];
    // Superficies
    if (!/sup|cubiert|semicub|terreno/.test(t) || /libre|absorbente|\bfos\b|\bfot\b|factor|silueta|balance/.test(t)) return;
    var semi = /semi\s*-?\s*cub/.test(t), cub = !semi && /cubiert|\bcub\b|\bcub\./.test(t);
    var clase = /demol/.test(t) ? "demo" :
      /empadron|sin permiso|s\/ ?permiso|declarar|a incorporar|a regularizar|subsist|clandest|sin plano|a relevar|relevad/.test(t) ? "ex" :
      /a construir|a ampliar|ampliacion|proyectad|nueva|a ejecutar/.test(t) ? "cons" :
      /existente|aprobad|con permiso|c\/ ?permiso|antecedente|declarad/.test(t) ? "decl" :
      (/terreno|lote|parcela|predio/.test(t) && !cub && !semi) ? "terreno" : null;
    if (!clase) return;
    var ns = numeros(t.replace(/m\s?2\b|m²|mts?\.?\s?2\b/g, " ")), val = null;
    if (ns.length) val = ns[ns.length - 1];
    else { var v = vecino(L, esNum) || debajo(L, esNum); if (v) val = numeros(norm(v.s).replace(/m\s?2\b|m²/g, " "))[0]; }
    if (val == null) return;
    var k = clase === "terreno" ? "terreno" : clase + (semi ? "Semi" : "Cub");
    if (!ev[k]) ev[k] = { vals: [], totales: [], lineas: [] };
    var lista = /total/.test(t) ? ev[k].totales : ev[k].vals, r2 = Math.round(val * 100) / 100;
    if (lista.indexOf(r2) < 0) lista.push(r2);
    ev[k].lineas.push(L.s.replace(/\s*:\s*$/, "") + " → " + String(r2).replace(".", ","));
  });
  if (!partida) segs.some(function (s) { var m = s.s.trim().match(/^0?94\s*-\s*0*(\d{3,6})$/); if (m) partida = Number(m[1]); return !!m; });
  if (!destino) destino = destinoDebil;
  if (!destino) segs.some(function (sg) { var t = norm(sg.s); if (/^(vivienda( unifamiliar| multifamiliar)?|local( comercial)?|comercio|galpon|deposito|industria|oficinas?)$/.test(t)) { destino = t; return true; } return false; });
  // Nomenclatura: fila de encabezados (Circ., Secc., Mz., Pc…) y valores en la fila de abajo
  var CLAVES = [/^circ/, /^secc/, /^ch/, /^q(t|ta|uinta)/, /^fr/, /^m(z|anz)/, /^(pc|parc|lote)/];
  var cab = items.filter(function (i) { var t = norm(i.s); return t.length <= 9 && CLAVES.some(function (re) { return re.test(t); }); });
  var circ = cab.filter(function (i) { return /^circ/.test(norm(i.s)); })[0];
  if (circ) {
    nom = ["", "", "", "", "", "", ""];
    cab.forEach(function (hd) {
      if (Math.abs(hd.y - circ.y) > 4) return;
      var idx = -1, t = norm(hd.s); CLAVES.forEach(function (re, i) { if (idx < 0 && re.test(t)) idx = i; });
      var b = null, bd = 1e9, h = hd.h || 10;
      items.forEach(function (v) {
        var dy = v.y - hd.y, tv = String(v.s).trim(); if (dy <= 0.5 * h || dy > 3.5 * h || tv.length > 5 || !/^[\dA-Za-z]+$/.test(tv)) return;
        var dx = Math.abs((v.x + (v.w || 0) / 2) - (hd.x + (hd.w || 0) / 2)); if (dx > Math.max(18, (hd.w || 0))) return;
        if (dx < bd) { b = v; bd = dx; }
      });
      if (b && idx >= 0) nom[idx] = String(b.s).trim();
    });
    if (!nom.some(Boolean)) nom = null;
  }
  var c = {};
  Object.keys(ev).forEach(function (k) {
    var e = ev[k];
    c[k] = e.totales.length ? Math.max.apply(null, e.totales) : (k === "terreno" ? e.vals[0] : e.vals.reduce(function (a, b) { return a + b; }, 0));
    c[k] = Math.round(c[k] * 100) / 100;
  });
  // Plano de empadronamiento sin antecedente: lo "existente" es lo que se declara
  var todo = norm(segs.map(function (s) { return s.s; }).join(" "));
  if ((c.declCub || c.declSemi) && !c.exCub && !c.exSemi && !c.consCub && !c.consSemi && /empadron/.test(todo) && !/antecedente|conforme a obra/.test(todo)) {
    if (c.declCub) { c.exCub = c.declCub; delete c.declCub; }
    if (c.declSemi) { c.exSemi = c.declSemi; delete c.declSemi; }
    notas.push("El plano es de empadronamiento y no cita un antecedente: la superficie existente se tomó como obra sin plano.");
  }
  var lineas = []; Object.keys(ev).forEach(function (k) { ev[k].lineas.forEach(function (l) { lineas.push(l); }); });
  return { campos: c, evidencia: lineas, notas: notas, destino: destino, partida: partida, zona: zona, nom: nom,
           hay: Object.keys(c).length > 0 || !!destino || !!partida, texto: todo.length };
}

if (typeof module !== "undefined") module.exports = { CFG: CFG, DEST: DEST, REGLAS: REGLAS, calcular: calcular, honorarioPD: honorarioPD, honorarioMedicion: honorarioMedicion,
  detectarDestino: detectarDestino, categoriaVivienda: categoriaVivienda, resolverParte: resolverParte, interpretarUso: interpretarUso, aplicarValores: aplicarValores, novedadesDigesto: novedadesDigesto, leerImpositiva: leerImpositiva, leerUR: leerUR, importe: importe, verificar: verificar,
  analizarPlano: analizarPlano, segmentosDe: segmentosDe, numero: numero, leerRetiro: leerRetiro, leerAltura: leerAltura, norm: norm };
