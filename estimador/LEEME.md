# Estimador de Expediente de Obra · San Andrés de Giles

Web pública para estimar cuánto cuesta presentar un expediente de obra: honorarios mínimos de
referencia del Colegio (CAUBA, ex CAPBA), pagos al Colegio y a la Caja, derechos municipales y gastos
del trámite. Trabaja junto con la Consulta Urbanística: toma de ella las parcelas, las zonas, los
indicadores y los usos.

Se publica en `https://surtecto.github.io/Consulta-COUSAG2024/estimador/`.

## Qué se actualiza solo

La acción **Estimador · verificar valores y datos** (pestaña Actions del repositorio) corre todos los
lunes a la mañana, cada vez que se modifica la Consulta y cuando se la lanza a mano («Run workflow»).

1. **Parcelas, zonas, indicadores y usos.** Relee `index.html` y `parcelas.js` de la Consulta y rehace
   `datos/cou.js`. Si la Consulta cambia, el Estimador la sigue sin tocar nada.
2. **Ordenanza Impositiva.** Consulta el Digesto. Si el Concejo publicó una Ordenanza Impositiva
   posterior a la cargada, lee de su texto los porcentajes del derecho de construcción, el mínimo y los
   derechos de oficina, y los pasa a `datos/valores.json`. Si no puede leerla con seguridad no toca
   nada y deja un aviso que la web muestra a todos.
3. **Unidad Referencial del Colegio.** Abre las páginas del Colegio anotadas en `colegio.paginas` y busca
   el valor. Si encuentra uno mayor al cargado lo actualiza; si no lo encuentra, lo dice.
4. **Código de Faltas.** Sólo avisa si aparece una norma posterior. Las multas se fijan en módulos
   municipales y las decide el Juez de Faltas: la web no las calcula.

El botón **Verificar valores actualizados** de la web relee `datos/valores.json`, consulta el Digesto en
el momento y muestra qué encontró la última verificación automática.

Toda lectura automática queda anotada en el archivo (`municipio.lectura`, `colegio.fuente`,
`consultas`) y se ve en la web. Conviene confirmarla con la norma: la lectura es de texto, no de criterio.

## Corregir o cargar valores a mano: `datos/valores.json`

Se edita desde GitHub (lápiz → «Commit changes»). La web toma el cambio en uno o dos minutos.

- `colegio.UR` y `colegio.vigenciaUR`: Unidad Referencial y fecha desde la que rige.
- `municipio`: porcentajes en tanto por uno (1 % = `0.01`), mínimo por parcela, derechos de oficina,
  ploteo A1. Los importes fijos se ajustan por trimestre (art. 68 de la Impositiva): ese ajuste no sale
  por ordenanza, así que hay que cargarlo acá.
- `avisos`: textos libres que la web muestra arriba, por ejemplo `["Tasas en revisión."]`.
- `revisadoHasta`: para que deje de avisar por una norma que ya se revisó y no cambia los valores,
  por ejemplo `{"impositiva": {"n": 2870, "y": 2027}}`.
- `faltas.modulo`: opcional. Si se carga, la web muestra el valor del módulo como dato, sin calcular multas.
- `consultas` y `avisosAuto` los escribe la verificación automática: no editar.

## Archivos

- `index.html`: la página. Se arma con `node herramientas/armar.js` a partir de `src/`.
- `src/motor.js`: cálculo, tablas y lecturas (sin interfaz). `src/ui.js`: interfaz.
- `datos/cou.js`: base tomada de la Consulta (`node herramientas/generar_datos.js <carpeta de la Consulta>`).
- `herramientas/actualizar_valores.js`: la verificación automática.
- Desde la Consulta se puede enlazar una parcela ya cargada: `estimador/#p-6510` (número de partida).
