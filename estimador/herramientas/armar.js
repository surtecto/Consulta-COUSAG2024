// Arma index.html a partir de src/. Uso: node herramientas/armar.js
const fs = require("fs"), path = require("path"), src = (f) => fs.readFileSync(path.join(__dirname, "..", "src", f), "utf8");
const html = `<!DOCTYPE html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#211B3D">
<title>Estimador de Expediente de Obra Giles</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${src("estilos.css")}</style>
</head>
<body>
${src("cuerpo.html")}
<script src="datos/cou.js"></script>
<script id="motor">
${src("motor.js")}
</script>
<script>
${src("ui.js")}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, "..", "index.html"), html);
console.log("index.html:", html.length, "caracteres");
