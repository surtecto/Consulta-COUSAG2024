(function () {
  var $ = function (id) { return document.getElementById(id); };
  var pesos = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  var dec = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
  var P = function (n) { return "$ " + pesos.format(Math.round(n)); };
  var pct = function (x) { return dec.format(x * 100) + " %"; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var FC = CFG.colegio.UR / 20;
  var SIT = { construir: "A construir", existente: "Existente sin plano", demoler: "A demoler" };
  var D = window.COU_DATOS || null;
  var ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII", 13: "XIII", 14: "XIV", 15: "XV", 16: "XVI", 17: "XVII" };
  var NOM = ["Circ.", "Secc.", "Ch.", "Qta.", "Fr.", "Mz.", "Pc."];
  var AP = '<span class="aprox" title="Valor aproximado">≈</span> ';

  var EJEMPLOS = {
    nueva: { partes: [{ texto: "casa", sit: "construir", cub: 90, semi: 12 }], declarada: 0 },
    declarar: { partes: [{ texto: "casa", sit: "existente", cub: 75, semi: 0 }], declarada: 0 },
    mixto: { partes: [{ texto: "ampliación de la casa", sit: "construir", cub: 40, semi: 10 }, { texto: "quincho", sit: "existente", cub: 28, semi: 0 }], declarada: 85 },
    local: { partes: [{ texto: "local comercial", sit: "construir", cub: 60, semi: 0 }], declarada: 0 }
  };
  var partes = [], seq = 0, viv = {}, parcela = null, tab = "inicio", ultimo = null;
  function nuevaParte(p) { return { id: ++seq, texto: p.texto || "", sit: p.sit || "construir", cub: p.cub == null ? 0 : p.cub, semi: p.semi || 0, opcion: null, manual: null, coefManual: 1, verLista: false, uso: null }; }
  function cargarEjemplo(k) { partes = EJEMPLOS[k].partes.map(nuevaParte); $("declarada").value = EJEMPLOS[k].declarada; pintarPartes(); recalcular(); }

  /* ---------- Parcela ---------- */
  function nomTexto(r) { var o = []; for (var i = 0; i < 7; i++) if (r[1 + i]) o.push(NOM[i] + " " + r[1 + i]); return o.join(" · ") || "Sin nomenclatura en la base"; }
  function partidaTexto(p) { return p ? "094-" + ("000000" + p).slice(-6) : "sin partida"; }
  function mensaje(id, t) { var el = $(id); el.textContent = t || ""; el.hidden = !t; el.classList.remove("traida"); }
  function listar(rows) {
    $("res-parcela").innerHTML = rows.length > 1 ? rows.slice(0, 12).map(function (r, i) {
      return '<button type="button" data-i="' + i + '">Partida ' + partidaTexto(r[0]) + " · " + esc(nomTexto(r)) + " · zona " + esc(D.zonas[r[8]] || "sin asignar") + "</button>";
    }).join("") : "";
    $("res-parcela")._rows = rows;
  }
  function buscarPartida() {
    if (!D) return mensaje("msg-parcela", "No se pudo cargar la base de parcelas. Elegí la zona y cargá la superficie a mano.");
    var t = $("partida").value.trim().replace(/^0?94\s*-\s*/, "").replace(/\D/g, ""), n = Number(t);
    if (!n) return mensaje("msg-parcela", "Escribí el número de partida, sin puntos.");
    var rows = D.parcelas.filter(function (r) { return r[0] === n; });
    if (!rows.length) { listar([]); return mensaje("msg-parcela", "No hay una parcela con la partida " + partidaTexto(n) + " en la base. Revisá el número o buscá por nomenclatura."); }
    mensaje("msg-parcela", rows.length > 1 ? "Hay " + rows.length + " parcelas con esa partida. Elegí la tuya." : "");
    listar(rows); elegir(rows[0]);
  }
  function buscarNomen() {
    if (!D) return mensaje("msg-parcela", "No se pudo cargar la base de parcelas. Elegí la zona y cargá la superficie a mano.");
    var v = ["n-c", "n-s", "n-ch", "n-q", "n-f", "n-m", "n-p"].map(function (id) { return $(id).value.trim().toLowerCase().replace(/^0+(?=\w)/, ""); });
    if (v[0] && /^\d+$/.test(v[0])) v[0] = (ROMAN[+v[0]] || v[0]).toLowerCase();
    if (!v.some(Boolean)) return mensaje("msg-parcela", "Completá al menos un campo de la nomenclatura.");
    if (!v[2] && !v[3] && !v[4] && !v[5] && !v[6]) return mensaje("msg-parcela", "Agregá manzana, parcela, chacra, quinta o fracción para acotar la búsqueda.");
    var rows = D.parcelas.filter(function (r) { return v.every(function (x, i) { return !x || String(r[1 + i] || "").toLowerCase() === x; }); });
    if (!rows.length) { listar([]); return mensaje("msg-parcela", "No hay parcelas con esa nomenclatura en la base. Revisá la circunscripción y la sección."); }
    mensaje("msg-parcela", rows.length > 1 ? rows.length + " parcelas coinciden. Elegí la tuya." + (rows.length > 12 ? " Se muestran las primeras 12." : "") : "");
    listar(rows); elegir(rows[0]);
  }
  function elegir(r) {
    parcela = r;
    var z = D.zonas[r[8]] || "", k = D.mapa[z] || "";
    $("zona").value = k; $("terreno").value = r[9] || "";
    if (r[0]) $("partida").value = r[0];
    pintarFicha(); recalcular();
  }
  /* ---------- Ida y vuelta a la Consulta Urbanística ---------- */
  var CLAVE = "estimador-giles-ida";
  function juntoALaConsulta() { try { return /^https?:$/.test(location.protocol) && /\/estimador\/(index\.html)?$/.test(location.pathname) && window.self === window.top; } catch (e) { return false; } }
  function urlConsulta() {
    var base = juntoALaConsulta() ? location.origin + location.pathname.replace(/estimador\/(index\.html)?$/, "") : CFG.enlaces.cou;
    return base + "?estimador=1" + (parcela && parcela[0] ? "#p=" + parcela[0] : "");
  }
  function guardarEstado() {
    try {
      var campos = {};
      Array.prototype.forEach.call($("form").querySelectorAll("input[id],select[id],textarea[id]"), function (el) {
        if (el.type === "file" || el.closest("#partes") || el.closest("#pdf-campos")) return;
        campos[el.id] = el.type === "checkbox" || el.type === "radio" ? el.checked : el.value;
      });
      sessionStorage.setItem(CLAVE, JSON.stringify({ t: Date.now(), partes: partes, seq: seq, viv: viv, parcela: parcela, campos: campos }));
    } catch (e) { /* sin almacenamiento: se vuelve con la parcela, pero hay que recargar la obra */ }
  }
  function restaurarEstado() {
    var s = null;
    try { s = JSON.parse(sessionStorage.getItem(CLAVE) || "null"); sessionStorage.removeItem(CLAVE); } catch (e) { s = null; }
    if (!s || !Array.isArray(s.partes) || !(Date.now() - s.t < 12 * 3600e3)) return false;
    partes = s.partes; seq = Math.max(s.seq || 0, partes.reduce(function (m, x) { return Math.max(m, x.id || 0); }, 0)); viv = s.viv || {};
    parcela = Array.isArray(s.parcela) ? s.parcela : null;
    Object.keys(s.campos || {}).forEach(function (id) {
      var el = $(id); if (!el) return;
      if (el.type === "checkbox" || el.type === "radio") el.checked = !!s.campos[id]; else el.value = s.campos[id];
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-viv]"), function (el) { el.checked = !!viv[el.dataset.viv]; });
    pintarPartes(); pintarFicha(); recalcular();
    return true;
  }
  /* La Consulta devuelve partida, nomenclatura, zona y superficie de la parcela elegida. */
  function recibirDeConsulta(Q) {
    var p = Number(Q.get("p")) || 0, n = (Q.get("n") || "").split("|"), z = Q.get("z") || "", s = Number(Q.get("s")) || 0, fila = null;
    var conNomen = n.some(Boolean), msg = $("msg-parcela");
    if (D && (p || conNomen || z)) {
      var dif = function (r) { return (D.zonas[r[8]] === z ? 0 : 1e9) + Math.abs((r[9] || 0) - s); };
      var c = D.parcelas.filter(function (r) {
        if ((r[0] || 0) !== p) return false;
        for (var i = 0; i < 7; i++) if (String(r[1 + i] || "") !== String(n[i] || "")) return false;
        return true;
      }).sort(function (a, b) { return dif(a) - dif(b); });
      if (c.length && (p || conNomen || dif(c[0]) < 0.11)) fila = c[0];
    }
    irTab("inicio"); listar([]);
    if (fila) {
      elegir(fila);
      mensaje("msg-parcela", "Parcela traída de la Consulta Urbanística: " + (fila[0] ? "partida " + partidaTexto(fila[0]) + " · " : "") + nomTexto(fila) + ". Zona, superficie e indicadores ya están cargados.");
      msg.classList.add("traida");
    } else if (D && z) {
      parcela = null; $("zona").value = D.mapa[z] || ""; if (s) $("terreno").value = Math.round(s * 10) / 10; $("partida").value = p || "";
      pintarFicha(); recalcular();
      mensaje("msg-parcela", "Se tomaron de la Consulta Urbanística la zona " + z + " y la superficie del terreno. Esa parcela todavía no figura en la base de esta planilla: revisá los datos.");
      msg.classList.add("traida");
    }
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* queda el enlace como vino */ }
    if (fila || z) { var h = $("h-parcela"); if (h && h.scrollIntoView) h.scrollIntoView({ block: "start" }); }
  }

  function fichaActual() { return D && $("zona").value ? D.fichas[$("zona").value] : null; }
  function pintarFicha() {
    var f = fichaActual(), h = "";
    if (f) {
      var k = $("zona").value, zp = parcela ? (D.zonas[parcela[8]] || "") : "";
      var ind = [["FOS", f.fos], ["FOT", f.fot], ["Altura", f.alt], ["Retiro de frente", f.rf], ["Retiro de fondo", f.rfo], ["Retiros laterales", f.rb], ["Densidad", f.den ? f.den + " hab/ha" : ""]]
        .filter(function (x) { return x[1] && !/^[-–\s]+$/.test(x[1]); });
      h = '<div class="ficha llega">' +
        (parcela ? '<span class="id">Partida ' + partidaTexto(parcela[0]) + " · " + esc(nomTexto(parcela)) + "</span>" : "") +
        '<b class="z">Zona ' + esc(zp && zp !== k ? zp : k) + " · " + esc(f.n) + "</b>" +
        (ind.length ? '<ul class="indic">' + ind.map(function (x) { return "<li>" + x[0] + " <b>" + esc(x[1]) + "</b></li>"; }).join("") + "</ul>" : '<span class="id">La ficha de esta zona no fija indicadores numéricos: los define la Dirección de Planeamiento.</span>') +
        '<span class="id">Código de Ordenamiento Urbano, pág. ' + esc(f.pag) + ". " + (f.sec ? "La zona tiene sectores con reglas propias. " : "") + '<a href="' + CFG.enlaces.cou + '">Ver la ficha completa</a></span></div>';
    }
    $("ficha-parcela").innerHTML = h;
  }

  /* ---------- Partes ---------- */
  function opcionesLista(sel) {
    var h = '<option value="">Elegí de la lista del Colegio…</option>';
    DESTINOS.forEach(function (g) {
      h += '<optgroup label="' + g[0] + '">';
      g[1].forEach(function (d) { h += '<option value="' + d[0] + '"' + (d[0] === sel ? " selected" : "") + ">" + esc(d[1]) + " · coef. " + dec.format(d[2]) + "</option>"; });
      h += "</optgroup>";
    });
    return h + '<optgroup label="Otro"><option value="otro"' + (sel === "otro" ? " selected" : "") + ">Otro destino: indicar coeficiente</option></optgroup>";
  }
  function pintarPartes() {
    var cont = $("partes"); cont.innerHTML = "";
    partes.forEach(function (p, i) {
      var d = document.createElement("div"), n = p.id;
      d.className = "parte"; d.dataset.sit = p.sit; d.dataset.id = n;
      d.innerHTML =
        '<div class="campo c-texto"><label for="x' + n + '">Parte ' + (i + 1) + ': ¿qué es?</label><input type="text" id="x' + n + '" data-k="texto" list="sugerencias" autocomplete="off" placeholder="casa, quincho, local, galpón, pileta…" value="' + esc(p.texto) + '"></div>' +
        '<div class="campo c-sit"><label for="s' + n + '">Situación</label><select id="s' + n + '" data-k="sit">' +
          Object.keys(SIT).map(function (k) { return '<option value="' + k + '"' + (k === p.sit ? " selected" : "") + ">" + SIT[k] + "</option>"; }).join("") + "</select></div>" +
        '<div class="campo"><label for="c' + n + '">Cubierta (m²)</label><input type="number" id="c' + n + '" data-k="cub" min="0" step="0.5" inputmode="decimal" value="' + p.cub + '"></div>' +
        '<div class="campo"><label for="m' + n + '">Semicubierta (m²)</label><input type="number" id="m' + n + '" data-k="semi" min="0" step="0.5" inputmode="decimal" value="' + p.semi + '"></div>' +
        '<div class="encuadre" data-enc></div>' +
        '<div class="pie"><span>Valor referencial de esta parte: <b data-monto></b></span>' +
        (partes.length > 1 ? '<button type="button" class="quitar" data-quitar aria-label="Quitar la parte ' + (i + 1) + '">Quitar</button>' : "") + "</div>";
      cont.appendChild(d);
    });
  }
  function pintarEncuadre(p, r, ctx) {
    var el = document.querySelector('.parte[data-id="' + p.id + '"] [data-enc]'); if (!el) return;
    if (el.contains(document.activeElement) && document.activeElement.tagName === "INPUT") return;
    var n = p.id, h = "", duda = false;
    var lista = '<div class="linea2"><select id="l' + n + '" data-k="manual" aria-label="Encuadre del Colegio">' + opcionesLista(p.manual) + "</select></div>";
    if (p.manual) {
      h = "<span>Elegido a mano: <b>" + esc(r.nombre) + '</b> <span class="cod">' + (p.manual === "otro" ? "" : p.manual + " · ") + "coef. " + dec.format(r.coef) + "</span></span>" + lista +
        (p.manual === "otro" ? '<div class="linea2"><label for="k' + n + '">Coeficiente</label><input type="number" id="k' + n + '" data-k="coefManual" min="0" step="0.05" value="' + p.coefManual + '" style="max-width:110px"></div>' : "") +
        '<div><button type="button" class="linkbtn" data-auto>Volver a detectar por el nombre</button></div>';
    } else if (!norm(p.texto)) {
      duda = true; h = '<span class="pide">Escribí qué es esta parte para encontrar su encuadre.</span>';
    } else if (r.sinDetectar) {
      duda = true; h = '<span class="pide">No reconocí «' + esc(p.texto) + "». Probá con otra palabra o elegilo de la lista.</span>" + lista;
    } else {
      h = "<span>Encuadre del Colegio: <b>" + esc(r.nombre) + '</b> <span class="cod">' + r.cod + " · coef. " + dec.format(r.coef) + "</span></span>";
      if (r.auto) h += "<span>Definido " + r.auto + ": " + dec.format(ctx.supEncuadre) + " m².</span>";
      if (r.opciones) {
        duda = r.provisorio;
        h += '<div class="linea2"><label for="o' + n + '"' + (duda ? ' class="pide"' : "") + ">" + (duda ? "Necesito una precisión. " : "") + esc(r.pregunta) + '</label><select id="o' + n + '" data-k="opcion">' +
          (duda ? '<option value="">Elegí una opción…</option>' : "") +
          r.opciones.map(function (c, i) { return '<option value="' + i + '"' + (!duda && i === (p.opcion || 0) ? " selected" : "") + ">" + esc(c === "VIV" ? OPCION_VIV : DEST[c].nombre) + "</option>"; }).join("") + "</select></div>";
        if (duda) h += "<span>Mientras tanto se calcula con la primera opción.</span>";
      }
      if (r.esViv && !p.manual) h += "<span>La categoría sale de las características de la vivienda, más abajo.</span>";
      h += p.verLista ? lista : '<div><button type="button" class="linkbtn" data-lista>No es esto: elegir de la lista</button></div>';
    }
    if (r.usoAplica) {
      if (r.usoFijo) h += '<span class="uso">Uso del Código: <b>VU · ' + esc(D.usos.VU || "Vivienda unifamiliar") + "</b>, con sus dependencias.</span>";
      else {
        var ops = r.uso ? "" : '<option value="">Elegí el uso…</option>';
        if (r.usoCands.length) ops += '<optgroup label="Sugeridos por la Consulta Urbanística">' + r.usoCands.map(function (x) { return '<option value="' + x.c + '"' + (x.c === r.uso ? " selected" : "") + ">" + x.c + " · " + esc(D.usos[x.c] || "") + "</option>"; }).join("") + "</optgroup>";
        var grupo = "", enSug = {}; r.usoCands.forEach(function (x) { enSug[x.c] = 1; });
        D.usosDef.forEach(function (u) {
          if (u[3] !== grupo) { ops += (grupo ? "</optgroup>" : "") + '<optgroup label="' + esc(u[3]) + '">'; grupo = u[3]; }
          ops += '<option value="' + u[0] + '"' + (u[0] === r.uso && !enSug[u[0]] ? " selected" : "") + ">" + u[0] + " · " + esc(u[1]) + "</option>";
        });
        ops += "</optgroup>";
        if (!r.uso) duda = true;
        h += '<div class="linea2 uso"><label for="u' + n + '"' + (r.uso ? "" : ' class="pide"') + ">" + (r.uso ? "Uso del Código:" : "No encontré esta actividad en la Consulta Urbanística. Escribí el rubro, por ejemplo kiosco o taller, o elegí el uso:") + '</label><select id="u' + n + '" data-k="uso">' + ops + "</select></div>" +
          (r.uso && !p.uso && r.usoCands.length > 1 ? "<span>Es el uso que sugiere la Consulta Urbanística para esa actividad y superficie. Cambialo si no corresponde.</span>" : "");
      }
    }
    el.className = "encuadre" + (duda ? " duda" : ""); el.innerHTML = h;
  }

  /* ---------- Estado y cálculo ---------- */
  function supDe(p) { return (Number(p.cub) || 0) + (Number(p.semi) || 0); }
  function resolverTodo() {
    var decl = Number($("declarada").value) || 0;
    var pre = partes.map(function (p) { return resolverParte(p, { catViv: "1.2.1.1", supEncuadre: 0 }); });
    var supViv = decl; pre.forEach(function (r, i) { if (r.esViv && partes[i].sit !== "demoler") supViv += supDe(partes[i]); });
    var cat = categoriaVivienda(viv, supViv);
    var porRegla = {};
    partes.forEach(function (p, i) { var id = pre[i].regla && pre[i].regla.id; if (id && p.sit !== "demoler") porRegla[id] = (porRegla[id] || 0) + supDe(p); });
    // Lo ya declarado suma a la vivienda si la hay; si no, al destino de la primera parte
    var declDe = pre.some(function (r) { return r.esViv; }) ? "" : (pre[0] && pre[0].regla ? pre[0].regla.id : "");
    var res = partes.map(function (p, i) {
      var id = pre[i].regla && pre[i].regla.id, ctx = { catViv: cat.cod, supEncuadre: (id && id === declDe ? decl : 0) + (porRegla[id] || 0) };
      var r = resolverParte(p, ctx); r.ctx = ctx; return r;
    });
    res.forEach(function (r, i) {
      var p = partes[i]; r.uso = null; r.usoCands = []; r.usoAplica = false;
      if (!D || p.sit === "demoler" || r.tipo === "pileta" || !r.coef) return;
      r.usoAplica = true;
      if (r.esViv) { r.uso = "VU"; r.usoFijo = true; return; }
      r.usoCands = interpretarUso(p.texto, r.ctx.supEncuadre || supDe(p), D);
      r.uso = p.uso || (r.usoCands[0] ? r.usoCands[0].c : null);
    });
    return { res: res, cat: cat, supViv: supViv, hayViv: res.some(function (r) { return r.esViv; }), decl: decl };
  }
  function recalcular() {
    var R = resolverTodo(), M = CFG.municipio, C = CFG.colegio;
    var e = {
      partes: partes.map(function (p, i) { return { sit: p.sit, cub: p.cub, semi: p.semi, coef: R.res[i].coef, tipo: R.res[i].tipo }; }),
      proyecto: $("t-proyecto").checked, direccion: $("t-direccion").checked,
      modalidad: (document.querySelector('input[name="modalidad"]:checked') || {}).value || "unica",
      antig70: $("antig70").checked, estado: $("estado").value, demolicionSinPermiso: $("demopermiso").value === "sin", linea: $("linea").checked,
      gastos: { viajes: $("g-viajes").value, valorViaje: $("g-valorviaje").value, formato: $("g-formato").value, laminas: $("g-laminas").value, copias: $("g-copias").value, precioM2: $("g-preciom2").value, otros: $("g-otros").value },
      incluidos: $("incluidos").checked
    };
    var r = calcular(e, CFG), h = r.honorarios, c = r.colegio, m = r.municipio, g = r.gastos;

    // Partes: encuadre y valor
    partes.forEach(function (p, i) {
      pintarEncuadre(p, R.res[i], R.res[i].ctx || {});
      var b = document.querySelector('.parte[data-id="' + p.id + '"] [data-monto]');
      if (b) b.textContent = r.partes[i].sup > 0 && R.res[i].coef > 0 ? P(r.partes[i].monto) + " (" + dec.format(r.partes[i].sup) + " m² computables)" : (r.partes[i].sup > 0 ? "falta el encuadre" : "cargá la superficie");
    });
    $("b-vivienda").hidden = !R.hayViv;
    if (R.hayViv) {
      var d = DEST[R.cat.cod];
      $("txt-categoria").innerHTML = "Resultado: <b>" + esc(d.nombre) + "</b>, coeficiente " + dec.format(d.coef) + ". Cumple " + R.cat.items + (R.cat.items === 1 ? " ítem" : " ítems") + " de ocho" +
        (R.cat.porSup ? ", incluido el de más de 150 m² totales (" + dec.format(R.supViv) + " m² entre lo declarado, lo existente y lo nuevo)" : "; la superficie total de la vivienda es de " + dec.format(R.supViv) + " m² y no supera los 150") +
        (viv.country && R.cat.items === 2 && !R.cat.porSup && Object.keys(viv).filter(function (k) { return viv[k]; }).length === 1 ? ". La ubicación en urbanización privada cuenta doble" : "") + ". " + AP + "La categoría definitiva la fija el Colegio al visar.";
    }
    $("txt-declarada").textContent = R.decl > 0
      ? "Los " + dec.format(R.decl) + " m² ya declarados no pagan de nuevo: el profesional los dibuja como antecedente aprobado. Sí cuentan para la categoría y para verificar los indicadores de la zona."
      : "Si la parcela ya tiene una construcción con plano aprobado, indicá sus metros: no generan nuevos costos, pero cuentan para la categoría y para los indicadores de la zona.";
    $("b-construir").hidden = !(r.sup.construir > 0);
    $("b-existente").hidden = !(r.sup.existente > 0);
    $("b-demoler").hidden = !(r.sup.demoler > 0);
    $("f-modalidad").hidden = !e.direccion;
    var bl = document.querySelectorAll("#v-inicio .bloque");
    bl[0].dataset.listo = fichaActual() ? "1" : "0";
    bl[1].dataset.listo = r.supTotal > 0 && !R.res.some(function (x, i) { return supDe(partes[i]) > 0 && (x.provisorio || !x.coef || (x.usoAplica && !x.uso)); }) ? "1" : "0";
    var nPaso = 0;
    document.querySelectorAll("#v-inicio .bloque").forEach(function (bl) { var s = bl.querySelector(".paso"); if (s && !bl.hidden) s.textContent = ++nPaso; });

    // Verificación del COU
    var f = fichaActual(), V = null;
    var cuenta = partes.filter(function (p, i) { return p.sit !== "demoler" && R.res[i].tipo !== "pileta"; });
    var sumaCub = R.decl + cuenta.reduce(function (a, p) { return a + (Number(p.cub) || 0) + 0.5 * (Number(p.semi) || 0); }, 0);
    var sumaTodo = R.decl + cuenta.reduce(function (a, p) { return a + supDe(p); }, 0);
    var plantas = $("v-plantas").value, huellaIn = $("v-huella").value;
    var huella = huellaIn !== "" ? huellaIn : (plantas === "1" ? sumaTodo : "");
    $("v-huella").placeholder = plantas === "1" ? dec.format(sumaTodo) : "";
    $("txt-huella").textContent = plantas === "1"
      ? "Con una sola planta, si dejás vacía la superficie en planta baja se usa la suma de lo cargado: " + dec.format(sumaTodo) + " m². Para el FOT se cuenta la superficie cubierta más la mitad de la semicubierta: " + dec.format(sumaCub) + " m². Las piletas no se suman."
      : "Con más de una planta, indicá cuánto ocupa la construcción en planta baja. Para el FOT se cuenta la superficie cubierta de todas las plantas más la mitad de la semicubierta: " + dec.format(sumaCub) + " m². Las piletas no se suman.";
    if (f) {
      var usos = [], vistos = {};
      partes.forEach(function (p, i) {
        var x = R.res[i]; if (!x.usoAplica || supDe(p) <= 0) return;
        var key = (x.uso || "?" + p.id) + p.sit; if (vistos[key]) return; vistos[key] = 1;
        usos.push({ nombre: p.texto || x.nombre, sit: p.sit, codigo: x.uso, nombreUso: x.uso ? D.usos[x.uso] || "" : "" });
      });
      V = verificar({ ficha: f, supTerreno: $("terreno").value, huella: huella, supFOT: sumaCub, plantas: plantas,
        rFrente: $("v-frente").value, rFondo: $("v-fondo").value, rLateral: $("v-lateral").value, usos: usos,
        hayExistente: r.sup.existente > 0 }, CFG);
      pintarVerif(V.items);
    } else {
      pintarVerif([{ id: "sinzona", nombre: "Elegí tu parcela o la zona", estado: "sd", exigido: "", nota: "Sin la zona no se puede comparar con el Código." }]);
    }

    bl[2].dataset.listo = V && !V.faltan ? "1" : "0";
    ultimo = { r: r, e: e, R: R, V: V, f: f };
    pintarPanel();

    // Textos de gastos
    var area = CFG.ploteo.formatos[e.gastos.formato] || 0;
    $("txt-copias").innerHTML = AP + "Son " + dec.format(g.m2Copias) + " m² de plano: " + (Number(e.gastos.laminas) || 0) + " láminas " + esc(e.gastos.formato) + " de " + dec.format(area) + " m², " + (Number(e.gastos.copias) || 0) + " copias de cada una. El precio por m² toma como referencia el ploteo municipal A1 en blanco y negro (" + P(CFG.ploteo.precioM2 * 0.5) + " por lámina, " + M.valoresDe + "). Una imprenta puede cobrar distinto y el color cuesta más. La cantidad de copias que pide cada oficina puede variar.";
    $("txt-gastos").innerHTML = AP + "El valor por viaje es el medio día de viaje del arancel. Cuando no se presentan comprobantes, los gastos a cargo del comitente se presumen hasta " + P(g.topePresunto) + " para estos honorarios (Decreto 6964/65, Título I, art. 11).";
  }

  var IC = { ok: "✓", no: "✕", rev: "?", sd: "…" }, TXE = { ok: "Cumple", no: "No cumple", rev: "A revisar", sd: "Falta un dato" };
  function pintarVerif(items) {
    var ul = $("lista-verif"), viejos = {};
    Array.prototype.forEach.call(ul.children, function (li) { viejos[li.dataset.id] = li; });
    items.forEach(function (x) {
      var li = viejos[x.id], nuevo = !li;
      if (nuevo) { li = document.createElement("li"); li.dataset.id = x.id; li.innerHTML = '<span class="ic" aria-hidden="true"></span><span class="v1"></span><span class="v2"></span><div class="medidor" hidden><i></i><b></b></div><span class="v3"></span>'; }
      else delete viejos[x.id];
      var cambio = !nuevo && li.dataset.e !== x.estado && (x.estado === "no" || x.estado === "ok");
      li.dataset.e = x.estado;
      li.children[0].textContent = IC[x.estado];
      li.children[1].innerHTML = "<b>" + esc(x.nombre) + "</b>" + (x.id === "sinzona" ? "" : " · " + TXE[x.estado]);
      li.children[2].textContent = (x.exigido ? "Zona: " + x.exigido : "") + (x.tuObra ? " · Tu obra: " + x.tuObra : "");
      li.children[2].hidden = !x.exigido && !x.tuObra;
      var md = li.children[3];
      if (x.med) {
        var tope = Math.max(x.med.lim * 1.25, x.med.v * 1.05);
        md.hidden = false; md.children[1].style.left = (x.med.lim / tope * 100) + "%";
        md.title = "Tu obra frente al máximo de la zona";
        var w = Math.min(100, x.med.v / tope * 100) + "%";
        if (nuevo) requestAnimationFrame(function () { requestAnimationFrame(function () { md.children[0].style.width = w; }); }); else md.children[0].style.width = w;
      } else md.hidden = true;
      li.children[4].textContent = x.nota || ""; li.children[4].hidden = !x.nota;
      ul.appendChild(li);
      if (cambio) { li.classList.remove("cambio"); void li.offsetWidth; li.classList.add("cambio"); }
    });
    Object.keys(viejos).forEach(function (k) { ul.removeChild(viejos[k]); });
  }
  var sinMovimiento = false; try { sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (err) { /* sin matchMedia */ }
  function animarTotal(valor) {
    var els = [$("o-total"), $("o-barra")], desde = animarTotal.v || 0; animarTotal.v = valor;
    cancelAnimationFrame(animarTotal.raf);
    if (sinMovimiento || Math.abs(valor - desde) < 1 || !window.requestAnimationFrame) { els.forEach(function (e) { e.textContent = P(valor); }); return; }
    var t0 = null, dur = 520;
    (function paso(t) {
      if (t0 == null) t0 = t; var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3), v = desde + (valor - desde) * e;
      els.forEach(function (el) { el.textContent = P(v); });
      if (k < 1) animarTotal.raf = requestAnimationFrame(paso);
    })(performance.now());
  }

  /* ---------- Panel de resultados ---------- */
  function renglon(con, imp, extra, clase, aclara) {
    return '<div class="renglon' + (clase ? " " + clase : "") + '"><span class="con">' + con + (extra ? "<small>" + extra + "</small>" : "") + (aclara ? '<small class="ac">≈ ' + aclara + "</small>" : "") + '</span><span class="pts"></span><span class="imp">' + imp + "</span></div>";
  }
  function grupo(titulo, total, filas, n, parte) { return '<div class="grupo"><h3><span style="font-family:inherit;color:inherit;letter-spacing:inherit;white-space:normal">' + (n ? '<i class="pt c' + n + '"></i>' : "") + titulo + (parte != null ? "<em>" + Math.round(parte * 100) + " %</em>" : "") + "</span><span>" + total + "</span></h3>" + filas.join("") + "</div>"; }
  function modulos(a) { return pesos.format(a[0]) + " a " + pesos.format(a[1]) + " módulos"; }
  function marcoMulta(mu) {
    return "Marco legal: el Código de Faltas prevé para una obra antirreglamentaria de " + modulos(mu.legal) + " (art. 89) y puede ordenar adecuarla o demolerla. " +
      (mu.usoProhibido ? "Para una actividad que funciona donde la zonificación no la admite, de " + modulos(mu.usoProhibido) + " (art. 100). " : "") +
      "Las multas se fijan en módulos municipales y cuántos corresponden lo decide el Juez de Faltas." + (CFG.faltas.modulo ? " Valor del módulo: " + P(CFG.faltas.modulo) + "." : "");
  }
  function pintarPanel() {
    if (!ultimo) return;
    var r = ultimo.r, e = ultimo.e, V = ultimo.V, h = r.honorarios, c = r.colegio, m = r.municipio, g = r.gastos, M = CFG.municipio, C = CFG.colegio;
    var det = tab === "detalle";
    if (r.supTotal <= 0) {
      animarTotal(0); $("o-sub").textContent = ""; Array.prototype.forEach.call($("o-compo").children, function (sp) { sp.style.width = "0"; });
      $("o-grupos").innerHTML = '<p class="vacio">Cargá qué es y la superficie de al menos una parte para ver la estimación.</p>';
      $("o-cou").innerHTML = ""; $("o-fuera").innerHTML = ""; $("o-supuestos").innerHTML = ""; return;
    }
    var G = [], f;
    // Honorarios
    f = [];
    if (det) {
      if (h.proyecto) f.push(renglon("Proyecto", P(h.proyecto)));
      if (h.direccion) f.push(renglon("Dirección de obra", P(h.direccion)));
      if (h.suplemento) f.push(renglon("Suplemento de dirección", P(h.suplemento), e.modalidad === "separados" ? "por contratos separados" : "por administración"));
      if (h.medicion) f.push(renglon("Medición y planos de lo existente", P(h.medicion)));
      if (h.informe) f.push(renglon("Informe técnico con inspección", P(h.informe)));
      if (h.demolicion) f.push(renglon("Demolición", P(h.demolicion)));
      if (h.ajusteMinimo) f.push(renglon("Ajuste al mínimo del arancel", P(h.ajusteMinimo)));
      if (!f.length) f.push('<p class="vacio">Marcá al menos una tarea para lo que vas a construir.</p>');
    }
    f.push(renglon("", "", "", "", "Son mínimos de referencia del Colegio: el profesional puede convenir más, y la categoría la confirma el Colegio al visar.").replace('<span class="pts"></span><span class="imp"></span>', ""));
    G.push(grupo("Honorarios mínimos de referencia", P(h.total), f, 1, h.total / r.total));
    // Colegio y Caja
    f = []; var tach = e.incluidos ? "tachado" : "";
    if (det) {
      if (c.cep) f.push(renglon("Tasa de visado del Colegio (CEP)", P(c.cep), c.cep <= C.cepMinimoFC * FC + 0.5 ? "importe mínimo" : pct(C.cepAlicuota) + " del honorario", tach, "Alícuota deducida de liquidaciones del Colegio; puede llevar descuento."));
      if (c.aportes) f.push(renglon("Aporte a la Caja (CAAITBA)", P(c.aportes), pct(C.aporteCaja) + " del honorario, Ley 12.490", tach));
      if (c.art29) f.push(renglon("Contribución art. 29, Ley 12.490", P(c.art29), "por obra que nunca se declaró", "", "La liquida la Caja y puede tener excepciones."));
    } else if (c.art29) f.push(renglon("", "", "", "", "Incluye la contribución del art. 29 por obra no declarada (" + P(c.art29) + "); la liquida la Caja.").replace('<span class="pts"></span><span class="imp"></span>', ""));
    if (c.cep || c.art29) G.push(grupo("Colegio y Caja de Previsión", P(r.colegioSumado), f, 2, r.colegioSumado / r.total));
    // Municipalidad
    f = [];
    var acOf = "Importe de " + M.valoresDe + "; la ordenanza prevé ajuste trimestral por inflación.";
    if (det) {
      if (m.construir) f.push(renglon("Derecho de construcción, obra nueva", P(m.construir), "sobre " + P(r.monto.construir) + ", art. 15", "", "Se liquida con la unidad referencial vigente ese día."));
      if (m.existente) f.push(renglon("Derecho de construcción, obra sin permiso", P(m.existente), (m.ajusteMinimo ? "mínimo por parcela, art. 16" : (e.antig70 ? "alícuota reducida por antigüedad, art. 17, " : "art. 16, ") + "sobre " + P(r.monto.existente)), "", "Ya incluye el recargo por construir sin permiso. La liquidación vale 60 días."));
      if (m.demoler) f.push(renglon("Derecho por demolición", P(m.demoler), "art. 19, sobre el valor como obra nueva"));
      m.oficina.forEach(function (o) { f.push(renglon(o.nombre, P(o.valor), "art. 14", "", acOf)); });
    } else f.push(renglon("", "", "", "", "Derecho de construcción más derechos de oficina (" + P(m.oficinaTotal) + ", valores de " + M.valoresDe + "). No incluye multas.").replace('<span class="pts"></span><span class="imp"></span>', ""));
    G.push(grupo("Municipalidad", P(m.total), f, 3, m.total / r.total));
    // Gastos
    f = [];
    if (det) {
      if (g.copias) f.push(renglon("Copias de planos", P(g.copias), dec.format(g.m2Copias) + " m² de ploteo", "", "Estimado con la tarifa municipal de ploteo."));
      if (g.viaticos) f.push(renglon("Viáticos", P(g.viaticos), e.gastos.viajes + " viajes", "", "Valor de arancel por medio día de viaje."));
      if (g.otros) f.push(renglon("Sellados y otros", P(g.otros)));
    } else if (g.total) f.push(renglon("", "", "", "", "Copias de planos" + (g.viaticos ? ", viáticos" : "") + (g.otros ? " y sellados" : "") + ": precios orientativos.").replace('<span class="pts"></span><span class="imp"></span>', ""));
    if (g.total) G.push(grupo("Gastos del trámite", P(g.total), f, 4, g.total / r.total));
    $("o-grupos").innerHTML = G.join("");
    $("o-grupos").style.cssText = "display:flex;flex-direction:column;gap:16px";

    animarTotal(r.total);
    [h.total, r.colegioSumado, m.total, g.total].forEach(function (v, i) { $("o-compo").children[i].style.width = (r.total > 0 ? v / r.total * 100 : 0) + "%"; });
    var d2 = [];
    if (r.sup.construir) d2.push(dec.format(r.sup.construir) + " m² a construir");
    if (r.sup.existente) d2.push(dec.format(r.sup.existente) + " m² a declarar");
    if (r.sup.demoler) d2.push(dec.format(r.sup.demoler) + " m² a demoler");
    $("o-sub").textContent = d2.join(" · ") + ". Equivale a " + P(r.total / r.supTotal) + " por m². No incluye multas.";

    // Código y multa
    var hc = "";
    if (V) {
      var p = [];
      if (V.incumple) p.push('<span class="pill no">' + V.incumple + (V.incumple === 1 ? " indicador no cumple" : " indicadores no cumplen") + "</span>");
      if (V.revisar) p.push('<span class="pill rev">' + V.revisar + " a revisar</span>");
      if (V.faltan) p.push('<span class="pill rev">' + V.faltan + (V.faltan === 1 ? " dato pendiente" : " datos pendientes") + "</span>");
      if (!V.incumple && !V.revisar && !V.faltan) p.push('<span class="pill ok">Cumple los indicadores cargados</span>');
      hc += '<div class="grupo"><h3 style="color:var(--tinta-2)">Código de Ordenamiento Urbano</h3><div class="estadoCOU">' + p.join("") + "</div></div>";
      if (V.multa) {
        hc += '<div class="multa"><h3>Puede corresponder una multa</h3>' +
          "<p>Con lo que cargaste, lo ya construido no cumple " + (V.incumple === 1 ? "un indicador" : V.incumple + " indicadores") + " de la zona. <b>La multa la define el Juez de Faltas</b> en cada caso: esta planilla no la estima ni la suma al total.</p>" +
          "<p><small>" + marcoMulta(V.multa) + "</small></p></div>";
      } else if (V.incumple) {
        hc += '<div class="multa"><h3>El proyecto necesita ajustes</h3><p>Con estos datos la obra a construir no cumple los indicadores de la zona y no se aprobaría así. No hay multa porque todavía no se construyó: revisalo con tu profesional antes de presentar.</p></div>';
      } else if (r.hayExistente) {
        hc += '<p class="supuestos">' + (V.faltan || V.revisar ? "Completá o revisá los datos de la verificación para saber si puede corresponder una multa por incumplir el Código." : "Con lo que cargaste no surge una multa por indicadores. El recargo por haber construido sin permiso ya está en el derecho de construcción.") + "</p>";
      }
    } else if (r.hayExistente || r.sup.construir > 0) {
      hc = '<p class="supuestos">Elegí tu parcela o la zona para verificar los indicadores del Código y saber si puede corresponder una multa.</p>';
    }
    $("o-cou").innerHTML = hc;
    var clave = V && V.multa ? "m" : V && V.incumple ? "p" : "";
    if (clave && clave !== pintarPanel.clave) { var caja = $("o-cou").querySelector(".multa"); if (caja) caja.classList.add("llega"); }
    pintarPanel.clave = clave;

    var sp = [];
    if (r.sup.construir > 0) sp.push((e.proyecto ? "proyecto" : "") + (e.proyecto && e.direccion ? " y " : "") + (e.direccion ? "dirección de obra " + (e.modalidad === "separados" ? "con gremios por separado" : e.modalidad === "administracion" ? "por administración" : "con una empresa") : ""));
    sp.push((Number(e.gastos.copias) || 0) + " copias de " + (Number(e.gastos.laminas) || 0) + " láminas " + esc(e.gastos.formato));
    $("o-supuestos").innerHTML = det ? "" : "Supuestos: " + sp.join("; ") + '. <button type="button" class="linkbtn" data-ir="detalle">Cambiarlos y ver el cálculo renglón por renglón</button>';

    var fuera = ["El costo de construir la obra: materiales y mano de obra."];
    fuera.push("Multas del Juzgado de Faltas, si correspondieran.");
    fuera.push("Otros especialistas que la obra pueda requerir: agrimensor, estructuras, estudio de suelos, instalaciones.");
    fuera.push("El sellado del contrato ante ARBA, si se firma por escrito.");
    $("o-fuera").innerHTML = det ? '<h3 style="color:var(--tinta-2)">No incluido en el total</h3><ul style="margin:0;padding-left:1.1em;font-size:.86rem;color:var(--tinta-2);display:flex;flex-direction:column;gap:3px">' + fuera.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>" : "";
  }

  function resumenTexto() {
    if (!ultimo || ultimo.r.supTotal <= 0) return "";
    var r = ultimo.r, e = ultimo.e, R = ultimo.R, V = ultimo.V, h = r.honorarios, c = r.colegio, m = r.municipio, g = r.gastos, L = [];
    L.push("ESTIMACIÓN DE EXPEDIENTE DE OBRA · San Andrés de Giles");
    L.push("Valores al " + CFG.actualizado + " · UR " + P(CFG.colegio.UR) + " por m²");
    if (parcela) L.push("Parcela: partida " + partidaTexto(parcela[0]) + " · " + nomTexto(parcela));
    if (ultimo.f) L.push("Zona: " + $("zona").value + " · " + ultimo.f.n + " · terreno " + ($("terreno").value || "s/d") + " m²");
    L.push("");
    partes.forEach(function (p, i) {
      if (r.partes[i].sup <= 0) return;
      L.push("- " + SIT[p.sit] + ": " + (p.texto || "sin nombre") + " → " + (R.res[i].nombre || "sin encuadre") + ", " + dec.format(r.partes[i].sup) + " m² computables, valor referencial " + P(r.partes[i].monto));
    });
    if (R.decl) L.push("- Ya declarado con plano aprobado: " + dec.format(R.decl) + " m²");
    L.push("");
    L.push("HONORARIOS MÍNIMOS DE REFERENCIA: " + P(h.total));
    [["Proyecto", h.proyecto], ["Dirección de obra", h.direccion], ["Suplemento de dirección", h.suplemento], ["Medición y planos", h.medicion], ["Informe técnico", h.informe], ["Demolición", h.demolicion], ["Ajuste al mínimo", h.ajusteMinimo]]
      .forEach(function (x) { if (x[1]) L.push("  " + x[0] + ": " + P(x[1])); });
    L.push("COLEGIO Y CAJA: " + P(r.colegioSumado) + (e.incluidos ? " (CEP y aporte incluidos en el honorario)" : ""));
    if (c.cep) L.push("  Tasa de visado (CEP): " + P(c.cep));
    if (c.aportes) L.push("  Aporte CAAITBA: " + P(c.aportes));
    if (c.art29) L.push("  Contribución art. 29: " + P(c.art29));
    L.push("MUNICIPALIDAD: " + P(m.total));
    if (m.construir) L.push("  Derecho de construcción, obra nueva: " + P(m.construir));
    if (m.existente) L.push("  Derecho de construcción, obra sin permiso: " + P(m.existente));
    if (m.demoler) L.push("  Derecho por demolición: " + P(m.demoler));
    m.oficina.forEach(function (o) { L.push("  " + o.nombre + ": " + P(o.valor)); });
    if (g.total) L.push("GASTOS DEL TRÁMITE: " + P(g.total));
    L.push("");
    L.push("TOTAL ESTIMADO (sin multas): " + P(r.total));
    if (V) {
      L.push(""); L.push("VERIFICACIÓN ORIENTATIVA DEL CÓDIGO:");
      var TX = { ok: "cumple", no: "NO CUMPLE", rev: "a revisar", sd: "falta un dato" };
      V.items.forEach(function (x) { L.push("  " + x.nombre + ": " + TX[x.estado] + (x.tuObra ? " (" + x.tuObra + "; zona: " + x.exigido + ")" : "")); });
      if (V.multa) L.push("  Puede corresponder una multa. La define el Juez de Faltas. " + marcoMulta(V.multa));
    }
    L.push(""); L.push("Estimación orientativa. No reemplaza el visado del Colegio ni la liquidación municipal.");
    return L.join("\n");
  }

  /* ---------- Plano en PDF ---------- */
  var PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  function cargarScript(src) { return new Promise(function (ok, err) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { err(new Error("carga")); }; document.head.appendChild(s); }); }
  function cargarPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return cargarScript(PDFJS + "pdf.worker.min.js").then(function () { return cargarScript(PDFJS + "pdf.min.js"); })
      .then(function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js"; });
  }
  function itemsDe(tc, vp) {
    var out = [];
    tc.items.forEach(function (it) {
      if (!it.str || !it.str.trim()) return;
      var t = window.pdfjsLib.Util.transform(vp.transform, it.transform);
      if (Math.abs(Math.atan2(t[1], t[0])) > 0.2) return;            // textos girados respecto de la hoja: cotas verticales
      out.push({ s: it.str, x: t[4], y: t[5], w: it.width || 0, h: it.height || Math.hypot(t[2], t[3]) || 8 });
    });
    return out;
  }
  function leerPdf(file) {
    mensaje("msg-pdf", "Leyendo el plano…"); $("pdf-campos").hidden = true; $("pdf-canvas").hidden = true;
    var lector = new FileReader();
    lector.onerror = function () { mensaje("msg-pdf", "No se pudo abrir el archivo. Probá de nuevo."); };
    lector.onload = function () {
      cargarPdfJs().then(function () { return window.pdfjsLib.getDocument({ data: new Uint8Array(lector.result) }).promise; }).then(function (pdf) {
        var n = Math.min(pdf.numPages, 12), hallazgos = [], cadena = Promise.resolve();
        for (var i = 1; i <= n; i++) (function (i) {
          cadena = cadena.then(function () { return pdf.getPage(i); }).then(function (pg) {
            var v1 = pg.getViewport({ scale: 1 });
            return pg.getTextContent().then(function (tc) {
              hallazgos.push(analizarPlano(itemsDe(tc, v1), v1.width));
              if (i !== 1) return;
              var vp = pg.getViewport({ scale: Math.min(2, 1400 / v1.width) }), cv = $("pdf-canvas");
              cv.width = vp.width; cv.height = vp.height; cv.hidden = false;
              return pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise.catch(function () { cv.hidden = true; });
            });
          });
        })(i);
        return cadena.then(function () { mostrarPlano(unirHallazgos(hallazgos), pdf.numPages); });
      }).catch(function (err) {
        mensaje("msg-pdf", err && err.message === "carga" ? "No se pudo cargar el lector de PDF. Revisá la conexión y probá de nuevo, o cargá los datos a mano en Inicio." : "No se pudo leer ese archivo. Verificá que sea un PDF y que no tenga contraseña.");
      });
    };
    lector.readAsArrayBuffer(file);
  }
  function unirHallazgos(hs) {           // varias láminas: se toma el primer dato encontrado de cada tipo
    var a = { campos: {}, evidencia: [], notas: [], destino: "", partida: null, zona: "", nom: null, hay: false, texto: 0 };
    hs.forEach(function (h) {
      Object.keys(h.campos).forEach(function (k) { if (a.campos[k] == null) a.campos[k] = h.campos[k]; });
      a.evidencia = a.evidencia.concat(h.evidencia); a.notas = a.notas.concat(h.notas);
      a.destino = a.destino || h.destino; a.partida = a.partida || h.partida; a.zona = a.zona || h.zona; a.nom = a.nom || h.nom;
      a.hay = a.hay || h.hay; a.texto += h.texto;
    });
    return a;
  }
  var CAMPOS_PDF = ["terreno", "declCub", "consCub", "consSemi", "exCub", "exSemi", "demoCub"];
  var planoLeido = null;
  function mostrarPlano(a, paginas) {
    planoLeido = a;
    if (a.texto < 20) { $("pdf-campos").hidden = true; return mensaje("msg-pdf", "Este PDF no tiene texto que se pueda leer: suele pasar con planos escaneados o exportados como dibujo. Mirá la vista previa y cargá los datos a mano en Inicio."); }
    $("pdf-campos").hidden = false;
    CAMPOS_PDF.forEach(function (k) { $("p-" + k).value = a.campos[k] != null ? a.campos[k] : ""; });
    var decl = (a.campos.declCub || 0) + (a.campos.declSemi || 0); if (a.campos.declSemi) $("p-declCub").value = Math.round(decl * 100) / 100;
    $("p-destino").value = a.destino || ""; $("p-partida").value = a.partida || "";
    var hallados = CAMPOS_PDF.filter(function (k) { return a.campos[k] != null; }).length, extra = [];
    if (a.destino) extra.push("el destino"); if (a.partida) extra.push("la partida"); if (a.zona) extra.push("la zona " + a.zona);
    mensaje("msg-pdf", !a.hay ? "Se leyó el texto del plano, pero no se encontró una planilla de superficies reconocible. Completá los datos mirando la vista previa." :
      "Se encontraron " + hallados + (hallados === 1 ? " superficie" : " superficies") + (extra.length ? ", " + extra.join(", ") : "") + ". Revisalos contra el plano antes de pasarlos." + (paginas > 12 ? " Se leyeron las primeras 12 páginas." : ""));
    var ev = a.notas.map(function (t) { return "Nota: " + t; }).concat(a.evidencia.slice(0, 14).map(function (l) { return "· " + l.slice(0, 140); }));
    if (a.nom) ev.push("· Nomenclatura: " + a.nom.map(function (v, i) { return v ? NOM[i] + " " + v : ""; }).filter(Boolean).join(" · "));
    $("pdf-evid").innerHTML = ev.length ? "Leído del plano:<br>" + ev.map(esc).join("<br>") : "";
    $("pdf-campos").classList.remove("llega"); void $("pdf-campos").offsetWidth; $("pdf-campos").classList.add("llega");
  }
  function usarPlano() {
    var v = function (k) { return Number($("p-" + k).value) || 0; }, dest = $("p-destino").value.trim() || "casa", nuevas = [], a = planoLeido || {};
    if (v("consCub") || v("consSemi")) nuevas.push(nuevaParte({ texto: dest, sit: "construir", cub: v("consCub"), semi: v("consSemi") }));
    if (v("exCub") || v("exSemi")) nuevas.push(nuevaParte({ texto: dest, sit: "existente", cub: v("exCub"), semi: v("exSemi") }));
    if (v("demoCub")) nuevas.push(nuevaParte({ texto: dest, sit: "demoler", cub: v("demoCub"), semi: 0 }));
    if (!nuevas.length) return mensaje("msg-pdf", "Cargá al menos una superficie a construir, sin plano o a demoler para pasar los datos.");
    partes = nuevas; $("declarada").value = v("declCub");
    pintarPartes();
    var pt = $("p-partida").value.replace(/^0?94\s*-\s*/, "").replace(/\D/g, "");
    parcela = null;
    if (D && pt) { $("partida").value = pt; buscarPartida(); }
    if (D && !parcela && a.nom) { ["n-c", "n-s", "n-ch", "n-q", "n-f", "n-m", "n-p"].forEach(function (id, i) { $(id).value = a.nom[i] || ""; }); $("det-nomen").open = true; buscarNomen(); }
    if (D && !parcela && a.zona) { var k = D.mapa[a.zona] || (D.fichas[a.zona.toUpperCase()] ? a.zona.toUpperCase() : ""); if (k) { $("zona").value = k; pintarFicha(); } }
    if (v("terreno")) $("terreno").value = v("terreno");      // ante una diferencia con la base, vale el plano
    recalcular(); irTab("inicio", true);
  }

  /* ---------- Verificación de valores ---------- */
  function trasValores(antes) {
    FC = CFG.colegio.UR / 20;
    if (Number($("g-valorviaje").value) === antes.viaje) $("g-valorviaje").value = Math.round(CFG.colegio.medioDiaViajeFC * FC);
    if (Number($("g-preciom2").value) === antes.m2) $("g-preciom2").value = CFG.ploteo.precioM2;
    pintarFijos(); recalcular();
  }
  function fechaCorta(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso.split("-").reverse().join("/") : ""; }
  function verificarValores(manual) {
    var b = $("verificar"), caja = $("msg-valores"), antes = { viaje: Math.round(CFG.colegio.medioDiaViajeFC * FC), m2: CFG.ploteo.precioM2 };
    if (manual) { b.disabled = true; b.textContent = "Verificando…"; }
    var leido = null, cambios = [];
    return fetch(CFG.enlaces.valores, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("valores"); return r.json(); })
      .then(function (v) { leido = v; cambios = aplicarValores(CFG, v); trasValores(antes); }, function () { leido = null; })
      .then(function () {
        if (!manual) return null;
        return fetch(CFG.enlaces.digestoDatos, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("digesto"); return r.json(); })
          .then(function (j) { return { ok: true, nov: novedadesDigesto(j.posts, CFG, leido && leido.revisadoHasta) }; }, function () { return { ok: false, nov: [] }; });
      }).then(function (dig) {
        var avisos = ((leido && leido.avisos) || []).concat((leido && leido.avisosAuto) || []), L = [], alerta = false;
        if (!manual) {
          /* Al abrir no se muestra nada salvo que haya un aviso que el vecino deba conocer. */
          if (!avisos.length) return;
          avisos.forEach(function (a) { L.push("<b>Aviso:</b> " + esc(a)); });
          caja.innerHTML = L.join("<br>"); caja.hidden = false; caja.dataset.alerta = "1"; return;
        }
        var ahora = new Date(), hora = ("0" + ahora.getHours()).slice(-2) + ":" + ("0" + ahora.getMinutes()).slice(-2);
        var f = function (x) { return x == null ? "sin cargar" : x < 1 ? pct(x) : P(x); };
        if (leido) L.push("<b>Verificado hoy a las " + hora + ".</b> El archivo de valores fue revisado el " + esc(CFG.actualizado) + "." + (cambios.length ? " Se actualizaron " + cambios.length + (cambios.length === 1 ? " valor:" : " valores:") : " No hubo cambios respecto de lo que ya estaba cargado."));
        else L.push("No se pudo leer el archivo de valores. Se usan los valores incluidos en la página, revisados el " + esc(CFG.actualizado) + ".");
        cambios.forEach(function (c) { L.push("· " + esc(c.nombre) + ": " + f(c.antes) + " → <b>" + f(c.ahora) + "</b>"); });
        L.push("<b>Derecho de construcción</b> (" + esc(CFG.municipio.norma) + "): " + pct(CFG.municipio.aConstruir) + " obra a construir, " + pct(CFG.municipio.sinPermiso) + " obra sin permiso, mínimo " + P(CFG.municipio.minSinPermiso) + " por parcela." + (CFG.municipio.lectura ? " " + esc(CFG.municipio.lectura) : ""));
        if (dig.ok && dig.nov.length) { alerta = true; L.push("<b>Atención:</b> el Digesto municipal registra normas posteriores a las cargadas. Los porcentajes y las tasas pueden haber cambiado: " + dig.nov.slice(0, 4).map(function (n) { return n.link ? '<a href="' + esc(n.link) + '">' + esc(n.titulo) + "</a>" : esc(n.titulo); }).join("; ") + "."); }
        else if (dig.ok) L.push("Consultado recién el Digesto municipal: no registra una Ordenanza Impositiva ni un Código de Faltas posteriores a los cargados.");
        else L.push("No se pudo consultar el Digesto municipal desde esta ubicación. Esa comprobación funciona en la versión publicada junto al Digesto.");
        var cq = (leido && leido.consultas) || {}, col = cq.colegio;
        L.push("<b>Unidad referencial del Colegio</b>: " + P(CFG.colegio.UR) + " por m², vigente desde " + esc(CFG.colegio.vigenciaUR) + ". " +
          (col ? "Verificación automática del " + fechaCorta(col.fecha) + ": " + esc(col.detalle) : "La página no puede leer el sitio del Colegio: lo consulta la verificación automática semanal, que todavía no corrió."));
        if (col && !col.ok) alerta = true;
        if (cq.digesto && !cq.digesto.ok) { alerta = true; L.push("Verificación automática del " + fechaCorta(cq.digesto.fecha) + ": " + esc(cq.digesto.detalle)); }
        L.push("Multas: se fijan en módulos municipales y las decide el Juez de Faltas. La planilla no las calcula." + (CFG.faltas.modulo ? " Valor del módulo: " + P(CFG.faltas.modulo) + "." : ""));
        avisos.forEach(function (a) { alerta = true; L.push("<b>Aviso:</b> " + esc(a)); });
        caja.innerHTML = L.join("<br>"); caja.hidden = false; caja.dataset.alerta = alerta ? "1" : "0";
        caja.classList.remove("llega"); void caja.offsetWidth; caja.classList.add("llega");
        b.disabled = false; b.textContent = "Verificar valores actualizados";
      });
  }

  /* ---------- Pestañas y arranque ---------- */
  function irTab(t, mover) {
    if (!{ inicio: 1, plano: 1, detalle: 1 }[t]) t = "inicio";
    tab = t;
    ["inicio", "plano", "detalle"].forEach(function (k) { $("v-" + k).hidden = k !== t; $("tab-" + k).setAttribute("aria-selected", k === t ? "true" : "false"); });
    try { if (location.hash !== "#" + t) history.replaceState(null, "", "#" + t); } catch (err) { /* sin historial */ }
    pintarPanel();
    if (mover) { try { document.querySelector(".tabs").scrollIntoView({ block: "start" }); } catch (err) { /* nada */ } }
  }
  function leerHash() {
    var h = (location.hash || "").replace("#", ""), mp = h.match(/^p-?(\d+)$/);
    if (/(^|&)desde=consulta(&|$)/.test(h)) { var Q = null; try { Q = new URLSearchParams(h); } catch (e) { Q = null; } if (Q) recibirDeConsulta(Q); return; }
    if (mp && D) { $("partida").value = mp[1]; irTab("inicio"); buscarPartida(); }
    else if ({ inicio: 1, plano: 1, detalle: 1 }[h]) irTab(h);
  }
  function pintarFijos() {
    var C = CFG.colegio, M = CFG.municipio, Fa = CFG.faltas, primera = !pintarFijos.hecho; pintarFijos.hecho = true;
    $("vigencia").innerHTML =
      '<span class="dato">Unidad referencial <b>' + P(C.UR) + "/m²</b></span>" +
      '<span class="dato">vigente desde <b>' + C.vigenciaUR + "</b></span>" +
      '<span class="dato">tasas municipales de <b>' + M.valoresDe + "</b></span>" +
      '<span class="dato">revisado el <b>' + CFG.actualizado + "</b></span>";
    if (primera) {
    $("lnk-cou").href = CFG.enlaces.cou;
    if (!juntoALaConsulta()) { $("ir-mapa").target = "_blank"; $("ir-mapa").rel = "noopener"; }
    $("g-valorviaje").value = Math.round(C.medioDiaViajeFC * FC);
    $("g-preciom2").value = CFG.ploteo.precioM2; $("g-copias").value = CFG.ploteo.copias;
    $("g-formato").innerHTML = Object.keys(CFG.ploteo.formatos).map(function (k) { return '<option value="' + k + '"' + (k === CFG.ploteo.formato ? " selected" : "") + ">" + k + " · " + dec.format(CFG.ploteo.formatos[k]) + " m²</option>"; }).join("");
    $("items-viv").innerHTML = ITEMS_VIV.map(function (it) { return '<label class="chk"><input type="checkbox" id="iv-' + it[0] + '" data-viv="' + it[0] + '"><span>' + it[1] + "</span></label>"; }).join("");
    var zs = '<option value="">Elegí la zona…</option>';
    if (D) Object.keys(D.fichas).forEach(function (k) { zs += '<option value="' + esc(k) + '">' + esc(k) + " · " + esc(D.fichas[k].n) + "</option>"; });
    $("zona").innerHTML = zs;
    if (!D) mensaje("msg-parcela", "No se pudo cargar la base de parcelas y zonas. La estimación de costos funciona igual; la verificación del Código no está disponible.");
    var dl = document.createElement("datalist"); dl.id = "sugerencias";
    dl.innerHTML = ["casa", "ampliación de la casa", "quincho", "cochera", "pileta", "departamentos", "local comercial", "kiosco", "oficina", "consultorio", "galpón", "depósito", "tinglado", "taller", "fábrica", "criadero", "invernadero", "restaurante", "casa de comidas", "hostería", "cabañas", "salón de fiestas", "escuela", "club", "capilla"].map(function (s) { return '<option value="' + s + '">'; }).join("");
    document.body.appendChild(dl);

    }
    var filasPD = "", desde = 0;
    C.tablaPD.forEach(function (t) { filasPD += "<tr><td>" + (t[0] === Infinity ? "Más de " + P(desde) : "Hasta " + P(t[0] * FC)) + '</td><td class="n">' + pct(t[1]) + "</td></tr>"; desde = t[0] * FC; });
    var filasM = "<tr><td>Hasta " + P(C.tablaMed.baseFC * FC) + '</td><td class="n">' + P(C.tablaMed.minimoFC * FC) + " fijo</td></tr>"; desde = C.tablaMed.baseFC * FC;
    C.tablaMed.tramos.forEach(function (t) { filasM += "<tr><td>" + (t[0] === Infinity ? "Más de " + P(desde) : "Hasta " + P(t[0] * FC)) + '</td><td class="n">' + pct(t[1]) + "</td></tr>"; desde = t[0] * FC; });
    $("metodo").innerHTML =
      "<article><h3>1. El valor referencial de la obra</h3>" +
      "<p>No es lo que vas a gastar en construir. Es una base de cálculo común al Colegio y al Municipio.</p>" +
      '<div class="formula">superficie computable × ' + P(C.UR) + " × coeficiente del destino</div>" +
      "<p>La superficie computable es la cubierta más la mitad de la semicubierta. El coeficiente sale de la tabla de categorías de obra del Colegio. La vivienda unifamiliar va de la categoría A (ningún ítem) a la E (cuatro o más) según ocho características; si la única que cumple es estar en una urbanización privada, pasa a la C.</p></article>" +

      "<article><h3>2. Honorarios por obra a construir</h3>" +
      "<p>Proyecto y dirección se calculan por tramos sobre el valor referencial: cada tramo aporta su porcentaje y se suman.</p>" +
      '<div class="tabla"><table><thead><tr><th>Tramo del valor referencial</th><th class="n">Honorario</th></tr></thead><tbody>' + filasPD + "</tbody></table></div>" +
      "<p>De ese total, el proyecto es el " + pct(C.proyecto) + " y la dirección el " + pct(C.direccion) + ". La dirección suma un " + pct(C.suplSeparados) + " por contratos separados o un " + pct(C.suplAdministracion) + " por administración. Mínimo para cualquier tarea: " + P(C.minTareaFC * FC) + ".</p></article>" +

      "<article><h3>3. Honorarios por declarar lo existente</h3>" +
      "<p>El empadronamiento suma dos tareas: la medición con confección de planos y el informe técnico.</p>" +
      '<div class="tabla"><table><thead><tr><th>Tramo del valor referencial</th><th class="n">Medición</th></tr></thead><tbody>' + filasM + "</tbody></table></div>" +
      "<p>Informe técnico con inspección: " + P(C.informeTecnicoFC * FC) + ". El conjunto no baja de " + P(C.minMedicionVivAFC * FC) + " en vivienda categoría A ni de " + P(C.minMedicionRestoFC * FC) + " en el resto. Demolición: " + pct(C.demolicion) + " del honorario de proyecto y dirección, sobre el valor depreciado según el estado.</p></article>" +

      "<article><h3>4. Colegio y Caja de Previsión</h3><ul>" +
      "<li><b>Tasa de visado (CEP):</b> " + pct(C.cepAlicuota) + " del honorario de referencia, con un mínimo de " + P(C.cepMinimoFC * FC) + ". El porcentaje surge de liquidaciones emitidas por el sistema del Colegio.</li>" +
      "<li><b>Aporte a la CAAITBA:</b> " + pct(C.aporteCaja) + " del honorario (Ley 12.490, art. 26).</li>" +
      "<li><b>Contribución del artículo 29:</b> al declarar una obra que se hizo sin control municipal ni intervención profesional registrada, el propietario paga a la Caja el " + pct(C.art29) + " del honorario de proyecto y dirección que hubiera correspondido.</li></ul>" +
      "<p>La tasa de visado y el aporte son obligaciones del profesional calculadas sobre su honorario. Muchos presupuestos los detallan aparte; otros los incluyen. Preguntalo.</p></article>" +

      "<article><h3>5. Municipalidad de San Andrés de Giles</h3>" +
      "<p>" + M.norma + ". El derecho de construcción es una alícuota sobre el mismo valor referencial, sin descuento por el estado de la obra.</p>" +
      '<div class="tabla"><table><thead><tr><th>Concepto</th><th class="n">Valor</th></tr></thead><tbody>' +
      '<tr><td>Obra a construir (art. 15)</td><td class="n">' + pct(M.aConstruir) + "</td></tr>" +
      '<tr><td>Vivienda multifamiliar a construir</td><td class="n">' + pct(M.aConstruirMulti) + "</td></tr>" +
      '<tr><td>Obra hecha sin permiso (art. 16)</td><td class="n">' + pct(M.sinPermiso) + "</td></tr>" +
      '<tr><td>Multifamiliar hecha sin permiso</td><td class="n">' + pct(M.sinPermisoMulti) + "</td></tr>" +
      '<tr><td>Mínimo por parcela, obra sin permiso</td><td class="n">' + P(M.minSinPermiso) + "</td></tr>" +
      '<tr><td>Más de 70 años acreditados (art. 17)</td><td class="n">' + pct(M.antiguedad70) + "</td></tr>" +
      '<tr><td>Demolición con / sin permiso (art. 19)</td><td class="n">' + pct(M.demolicionCon) + " / " + pct(M.demolicionSin) + "</td></tr>" +
      M.oficina.map(function (o) { return "<tr><td>" + o.nombre + ' (art. 14)</td><td class="n">' + P(o.valor) + "</td></tr>"; }).join("") +
      "</tbody></table></div>" +
      "<p>Los importes fijos son de " + M.valoresDe + " y la ordenanza prevé un ajuste trimestral por inflación (art. 68): pueden estar desactualizados. No se incluyen regímenes especiales, como cría intensiva de animales (0,5 %) o construcciones en el cementerio.</p></article>" +

      "<article><h3>6. Verificación del Código y multas</h3>" +
      "<p>La planilla compara lo que cargaste con el FOS, el FOT, la altura y los retiros de la ficha de zona. Para el FOT cuenta la superficie cubierta más la mitad de la semicubierta. El uso de cada parte sale del buscador de actividades de la Consulta Urbanística Giles y se contrasta con los usos admitidos en la zona. Es una ayuda para anticipar problemas, no un dictamen.</p><ul>" +
      "<li>Construir sin permiso se sanciona con el recargo de la Ordenanza Impositiva (art. 88 del Código de Faltas): ya está en la alícuota del " + pct(M.sinPermiso) + ".</li>" +
      "<li>Una obra antirreglamentaria tiene multa de " + modulos(Fa.antirreglamentaria) + " (art. 89), más la obligación de adecuarla o demolerla.</li>" +
      "<li>La planilla avisa cuándo puede corresponder una multa, pero no la estima.</li></ul>" +
      "<p>El módulo es la unidad municipal de las multas: el 2 % del sueldo básico inicial de la categoría II (art. 9)" + (Fa.modulo ? ", hoy " + P(Fa.modulo) : "") + ". Cuántos módulos corresponden en cada caso lo decide el Juez de Faltas; por eso la planilla no calcula multas.</p></article>" +

      "<article><h3>7. Gastos del trámite</h3><ul>" +
      "<li><b>Copias:</b> metros cuadrados de plano por precio. Una lámina A0 mide 1 m², la A1 0,5 m², la A2 0,25 m². Base de " + CFG.ploteo.copias + " copias de cada lámina.</li>" +
      "<li><b>Viáticos:</b> el arancel fija el medio día de viaje en " + P(C.medioDiaViajeFC * FC) + " y el día completo en " + P(FC) + ".</li>" +
      "<li><b>Sellados y estampillas:</b> cargá los que te informen en Mesa de Entradas.</li></ul></article>";

    $("pie-cou").innerHTML = "Zonas, indicadores y parcelas: " + (D ? esc(D.fuente) + ", base del " + esc(D.fecha.split("-").reverse().join("/")) + ". " : "") + 'Mapa y fichas completas en <a href="' + CFG.enlaces.cou + '">Consulta Urbanística Giles</a>.';
    $("pie-fuentes").innerHTML = 'Fuentes: <a href="' + CFG.enlaces.tablas + '">tabla de valores referenciales del Colegio (Res. 8/26)</a>, <a href="' + CFG.enlaces.colegio + '">visado, CEP y aportes</a>, <a href="' + CFG.enlaces.ley12490 + '">Ley 12.490</a>, Decreto 6964/65, <a href="' + CFG.enlaces.impositiva + '">' + M.norma + '</a>, <a href="' + CFG.enlaces.faltas + '">Código de Faltas (Ord. 2617/23)</a> y <a href="' + CFG.enlaces.digesto + '">Digesto municipal</a>.';
    $("pie-autor").textContent = CFG.autor;
  }

  // Eventos
  $("partes").addEventListener("input", function (ev) {
    var el = ev.target, k = el.dataset.k; if (!k) return;
    var p = partes.filter(function (x) { return x.id === Number(el.closest(".parte").dataset.id); })[0]; if (!p) return;
    if (k === "texto") { p.texto = el.value; p.opcion = null; p.manual = null; p.verLista = false; p.uso = null; }
    else if (k === "uso") p.uso = el.value || null;
    else if (k === "sit") { p.sit = el.value; el.closest(".parte").dataset.sit = p.sit; }
    else if (k === "opcion") p.opcion = el.value === "" ? null : Number(el.value);
    else if (k === "manual") { p.manual = el.value || null; p.verLista = false; }
    else p[k] = el.value === "" ? 0 : Number(el.value);
    recalcular();
  });
  $("partes").addEventListener("click", function (ev) {
    var t = ev.target, cont = t.closest(".parte"); if (!cont) return;
    var id = Number(cont.dataset.id), p = partes.filter(function (x) { return x.id === id; })[0];
    if (t.matches("[data-quitar]")) { partes = partes.filter(function (x) { return x.id !== id; }); pintarPartes(); recalcular(); }
    else if (t.matches("[data-lista]")) { p.verLista = true; recalcular(); }
    else if (t.matches("[data-auto]")) { p.manual = null; recalcular(); }
  });
  $("agregar").addEventListener("click", function () {
    partes.push(nuevaParte({ sit: (partes[partes.length - 1] || {}).sit }));
    pintarPartes(); recalcular();
    var c = $("x" + partes[partes.length - 1].id); if (c) c.focus();
  });
  document.querySelectorAll("[data-ej]").forEach(function (b) { b.addEventListener("click", function () { cargarEjemplo(b.dataset.ej); }); });
  $("form").addEventListener("input", function (ev) {
    var t = ev.target; if (t.closest("#partes") || t.closest("#pdf-campos") || t.id === "pdf" || t.id === "partida" || /^n-/.test(t.id)) return;
    if (t.dataset.viv) viv[t.dataset.viv] = t.checked;
    if (t.id === "zona") { if (parcela && (D.mapa[D.zonas[parcela[8]]] || "") !== t.value) parcela = null; pintarFicha(); }
    recalcular();
  });
  $("form").addEventListener("submit", function (ev) { ev.preventDefault(); });
  $("buscar-partida").addEventListener("click", buscarPartida);
  $("partida").addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); buscarPartida(); } });
  $("buscar-nomen").addEventListener("click", buscarNomen);
  $("ir-mapa").href = urlConsulta();
  $("ir-mapa").addEventListener("click", function () { this.href = urlConsulta(); if (juntoALaConsulta()) guardarEstado(); });
  $("res-parcela").addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (b) elegir($("res-parcela")._rows[Number(b.dataset.i)]); });
  document.querySelectorAll(".tab").forEach(function (b) { b.addEventListener("click", function () { irTab(b.dataset.tab); }); });
  $("liquidacion").addEventListener("click", function (ev) { var b = ev.target.closest("[data-ir]"); if (b) irTab(b.dataset.ir, true); });
  $("barra-ver").addEventListener("click", function (ev) { ev.preventDefault(); $("liquidacion").scrollIntoView({ block: "start" }); });
  $("pdf").addEventListener("change", function () { if (this.files && this.files[0]) leerPdf(this.files[0]); });
  var zona = $("soltar");
  ["dragenter", "dragover"].forEach(function (n) { zona.addEventListener(n, function (ev) { ev.preventDefault(); zona.classList.add("sobre"); }); });
  ["dragleave", "drop"].forEach(function (n) { zona.addEventListener(n, function (ev) { ev.preventDefault(); zona.classList.remove("sobre"); }); });
  zona.addEventListener("drop", function (ev) { var f = ev.dataTransfer && ev.dataTransfer.files[0]; if (f) leerPdf(f); });
  $("pdf-usar").addEventListener("click", usarPlano);
  $("copiar").addEventListener("click", function () {
    var t = resumenTexto(), b = $("copiar"); if (!t) return;
    var ok = function () { b.textContent = "Resumen copiado"; setTimeout(function () { b.textContent = "Copiar resumen"; }, 2000); };
    try { navigator.clipboard.writeText(t).then(ok, function () { b.textContent = "No se pudo copiar"; }); }
    catch (err) { b.textContent = "No se pudo copiar"; }
  });
  var enMarco = false; try { enMarco = window.self !== window.top; } catch (err) { enMarco = true; }
  if (!enMarco) { $("imprimir").hidden = false; $("imprimir").addEventListener("click", function () { window.print(); }); }
  window.addEventListener("hashchange", leerHash);
  $("verificar").addEventListener("click", function () { verificarValores(true); });

  pintarFijos();
  cargarEjemplo("nueva");
  restaurarEstado();
  leerHash();
  if (window.fetch) verificarValores(false);
})();
