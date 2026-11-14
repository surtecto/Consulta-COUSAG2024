/* Puente entre la Consulta Urbanística y el Estimador de Expediente de Obra.
   Sólo actúa cuando la Consulta se abre desde el Estimador (…/?estimador=1): muestra una barra para
   elegir la parcela (por partida, por nomenclatura o tocándola en el plano) y un botón que vuelve al
   Estimador con la partida, la nomenclatura, la zona y la superficie. En la Consulta normal no hace nada. */
(function () {
  var Q;
  try { Q = new URLSearchParams(location.search); } catch (e) { return; }
  if (Q.get("estimador") !== "1") return;
  if (typeof S === "undefined" || typeof window.selectParcel !== "function") return;

  var DEST = "estimador/", elegida = false;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var NOM = ["Circ.", "Secc.", "Ch.", "Qta.", "Fr.", "Mz.", "Pc."];
  function nom(p) { var o = []; (p.n || []).forEach(function (v, i) { if (v) o.push(NOM[i] + " " + v); }); return o.join(" · ") || "Sin nomenclatura"; }
  function partida(p) { return p.p ? "Partida 094-" + ("000000" + p.p).slice(-6) : "sin partida"; }
  function sup(p) { return p.s ? Number(p.s).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + " m²" : ""; }
  function destino(p) {
    var q = new URLSearchParams(); q.set("desde", "consulta");
    if (p) { if (p.p) q.set("p", p.p); q.set("n", (p.n || []).join("|")); q.set("z", p.z || ""); if (p.s) q.set("s", p.s); }
    return DEST + "#" + q.toString();
  }

  var st = document.createElement("style");
  st.textContent =
    "#puente-est{display:flex;align-items:center;gap:10px 16px;flex-wrap:wrap;padding:10px 16px;background:#211B3D;color:#F6F3FA;font-family:var(--f-ui);z-index:1200;box-shadow:0 -6px 18px -8px rgba(0,0,0,.45)}" +
    "#puente-est .pe-t{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:1px}" +
    "#puente-est .pe-t b{font-size:15px;letter-spacing:.01em}" +
    "#puente-est .pe-t span{font-size:13.5px;color:#D9D3EA;overflow-wrap:anywhere}" +
    "#puente-est a{font-weight:700;text-decoration:none;border-radius:6px;padding:9px 14px;white-space:nowrap;font-size:14.5px}" +
    "#puente-est .pe-b{background:#F08238;color:#1D1A33;box-shadow:0 6px 16px -8px rgba(240,130,56,.9)}" +
    "#puente-est .pe-b:hover{background:#F6A064}" +
    "#puente-est .pe-x{color:#F6F3FA;border:1px solid rgba(246,243,250,.45);font-weight:600}" +
    "#puente-est .pe-x:hover{border-color:#F6F3FA}" +
    "#puente-est a:focus-visible{outline:3px solid #fff;outline-offset:2px}" +
    "#puente-est[data-lista='1'] .pe-b{animation:pe-llega .5s ease-out}" +
    "@keyframes pe-llega{from{transform:translateY(6px);opacity:.3}to{transform:none;opacity:1}}" +
    "@media (prefers-reduced-motion:reduce){#puente-est[data-lista='1'] .pe-b{animation:none}}" +
    /* escritorio: la barra ocupa su lugar al pie y el plano se achica */
    "@media (min-width:901px){body.pe-modo{display:flex;flex-direction:column}body.pe-modo>.app{flex:1 1 auto;min-height:0;height:auto}#puente-est{flex:0 0 auto}}" +
    /* celular: barra fija al pie y lugar libre debajo del contenido */
    "@media (max-width:900px){#puente-est{position:fixed;left:0;right:0;bottom:0;padding:9px 12px}#puente-est a{flex:1 1 auto;text-align:center;white-space:normal}body.pe-modo>.app{padding-bottom:var(--pe-h,96px)}}";
  document.head.appendChild(st);

  var bar = document.createElement("div");
  bar.id = "puente-est"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Elegir la parcela para el Estimador de Expediente de Obra"); bar.setAttribute("aria-live", "polite");
  document.body.appendChild(bar); document.body.classList.add("pe-modo");

  function pintar() {
    var p = elegida ? S.sel : null;
    bar.dataset.lista = p ? "1" : "0";
    bar.innerHTML = p
      ? '<div class="pe-t"><b>Parcela elegida para el Estimador</b><span>' + esc(nom(p)) + " · " + esc(partida(p)) + " · Zona " + esc(p.z || "sin asignar") + (sup(p) ? " · " + esc(sup(p)) : "") + "</span></div>" +
        '<a class="pe-b" href="' + esc(destino(p)) + '">Usar esta parcela y volver al Estimador →</a>' +
        '<a class="pe-x" href="' + esc(destino(null)) + '">Volver sin elegir</a>'
      : '<div class="pe-t"><b>Elegí tu parcela para el Estimador de Expediente de Obra</b><span>Buscala por partida o por nomenclatura, o tocala en el plano. Después un botón te lleva de vuelta con los datos.</span></div>' +
        '<a class="pe-x" href="' + esc(destino(null)) + '">Volver sin elegir</a>';
    try { document.documentElement.style.setProperty("--pe-h", (bar.offsetHeight + 12) + "px"); } catch (e) { /* queda el valor por defecto */ }
    try { if (S.map && S.map.invalidateSize) S.map.invalidateSize(); } catch (e) { /* sin plano */ }
  }

  var original = window.selectParcel;
  window.selectParcel = function () {
    var r = original.apply(this, arguments);
    if (!S._booting) { elegida = true; pintar(); }
    return r;
  };

  /* Si el Estimador ya traía una parcela, la Consulta abre sobre ella y queda como elegida. */
  try {
    var hp = new URLSearchParams((location.hash || "").replace(/^#/, "")).get("p");
    if (hp && S.sel && String(S.sel.p) === String(hp).replace(/\D/g, "")) elegida = true;
  } catch (e) { /* sin enlace */ }
  pintar();
  window.addEventListener("resize", function () { try { document.documentElement.style.setProperty("--pe-h", (bar.offsetHeight + 12) + "px"); } catch (e) { /* nada */ } });
})();
