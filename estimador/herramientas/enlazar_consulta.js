// Asegura que la Consulta cargue el puente con el Estimador (estimador/puente.js).
// Si se sube un index.html nuevo de la Consulta sin esa línea, la vuelve a agregar. No cambia nada más.
// Uso: node estimador/herramientas/enlazar_consulta.js <carpeta de la Consulta>
const fs = require("fs"), path = require("path");
const arch = path.join(process.argv[2] || ".", "index.html"), LINEA = '<script src="estimador/puente.js"></script>';
let s = fs.readFileSync(arch, "utf8");
if (s.includes("estimador/puente.js")) { console.log("La Consulta ya carga el puente con el Estimador."); process.exit(0); }
const i = s.lastIndexOf("</body>");
if (i < 0) { console.log("No se encontró </body> en index.html: no se agrega el puente."); process.exit(0); }
fs.writeFileSync(arch, s.slice(0, i) + LINEA + "\n" + s.slice(i));
console.log("Se agregó el puente con el Estimador al final de index.html.");
