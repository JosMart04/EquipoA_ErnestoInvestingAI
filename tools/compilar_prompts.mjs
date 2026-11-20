// tools/compilar_prompts.mjs — compila PROMPTS_USADOS.md (R-ENT-05) a partir de docs/ia/prompts/{OP,CC,CX}.md.
// Copia cada entrada LITERALMENTE, en orden cronológico, con la herramienta y el modelo. No inventa horas: las entradas
// sin hora registrada conservan su orden dentro de su archivo y quedan marcadas como tales.
// Uso: node tools/compilar_prompts.mjs
import { readFileSync, writeFileSync } from "node:fs";

const FUENTES = [
  { archivo: "docs/ia/prompts/OP.md", herramienta: "Claude (claude.ai, conector de Figma)", modelo: "Claude Opus 5.5" },
  { archivo: "docs/ia/prompts/CC.md", herramienta: "Claude Code", modelo: null }, // el modelo viene en cada encabezado
  { archivo: "docs/ia/prompts/CX.md", herramienta: "Codex", modelo: "GPT-6 Astra" }
];

/** Fecha y hora de un encabezado «## 2026-11-17 11:45 · …» o «## 20261117-2140 · …». */
function fechaHora(encabezado) {
  const m = /^##\s+(\d{4})-?(\d{2})-?(\d{2})(?:[ -](\d{2}):?(\d{2}))?/.exec(encabezado);
  if (!m) return null;
  return { fecha: `${m[1]}-${m[2]}-${m[3]}`, hora: m[4] ? `${m[4]}:${m[5]}` : null };
}

/** Separa el archivo en secciones «## …» sin cortar dentro de bloques de código (``` o ````): un prompt literal
    puede traer sus propios encabezados «## » (p. ej. las instrucciones de sesión de Codex). */
function secciones(texto) {
  const partes = [[]];
  let cerca = null;
  for (const l of texto.split("\n")) {
    const m = /^(`{3,})/.exec(l);
    if (m) {
      if (!cerca) cerca = m[1];
      else if (m[1].length >= cerca.length && /^`+\s*$/.test(l)) cerca = null;
    } else if (!cerca && l.startsWith("## ")) partes.push([]);
    partes[partes.length - 1].push(l);
  }
  return partes.map(p => p.join("\n"));
}

const entradas = [];
for (const f of FUENTES) {
  const texto = readFileSync(f.archivo, "utf8").replace(/\r\n/g, "\n");
  const partes = secciones(texto);
  const intro = partes.shift();
  if (!partes.length) {
    // OP.md no tiene secciones: es una sola entrada (la fecha sale de su primera línea con fecha)
    const m = /(\d{4}-\d{2}-\d{2})/.exec(intro);
    entradas.push({ fecha: m ? m[1] : "2026-11-16", hora: null, f, titulo: "Figma Make: mockups e importación", cuerpo: intro.split("\n").slice(1).join("\n").trim(), orden: 0 });
    continue;
  }
  let ultimaHora = "00:00";
  partes.forEach((p, i) => {
    const [encabezado, ...resto] = p.split("\n");
    const fh = fechaHora(encabezado) || { fecha: "2026-11-17", hora: null };
    const titulo = encabezado.replace(/^##\s+/, "").split(" · ").slice(1).join(" · ");
    if (fh.hora) ultimaHora = fh.hora;
    entradas.push({ fecha: fh.fecha, hora: fh.hora, ordenHora: fh.hora || ultimaHora, f, titulo, cuerpo: resto.join("\n").trim(), orden: i });
  });
}
// Orden cronológico; las entradas sin hora van justo después de la última entrada con hora de su mismo archivo
entradas.sort((a, b) => (a.fecha + (a.ordenHora || "00:00")).localeCompare(b.fecha + (b.ordenHora || "00:00")) || (a.f.archivo === b.f.archivo ? a.orden - b.orden : 0));

const modelo = e => e.f.modelo || (e.titulo.split(" · ").pop() || "").trim();
const herramientaTitulo = e => e.f.archivo.endsWith("CC.md") ? e.titulo.replace(/^Claude Code · /, "") : e.titulo;
let salida = `# PROMPTS_USADOS

Prompts **literales** que el Equipo A usó con herramientas de IA para construir **Ernesto Investing AI** (IHC 2026-II, FISI-UNMSM), según el entregable 5 de la guía (§6.2) y la regla de integridad de §6.3: todo lo asistido por IA se ejecutó, se verificó y se declara.

Este archivo se genera con \`node tools/compilar_prompts.mjs\` a partir de los registros que cada herramienta llevó durante el trabajo (\`docs/ia/prompts/OP.md\`, \`CC.md\` y \`CX.md\`). Cada entrada se copia sin cambios, en orden cronológico (hora de Lima). Las entradas sin hora registrada conservan su orden y se marcan así.

## Herramientas y modelos

| Herramienta | Modelo | Papel |
|---|---|---|
| Claude (claude.ai) con el conector de Figma | Claude Opus 5.5 | Mockups de Figma Make e importación al archivo de Make |
| Claude Code | Claude Fable 5.2 (16-nov) y Claude Opus 5.5 (desde el 17-nov) | Plan, sitio web (HTML, CSS y JavaScript), accesibilidad, integración, correcciones y documentación |
| Codex | GPT-6 Astra | Pipeline de datos reales en Python, pruebas E2E y de accesibilidad, CI y auditoría P08 independiente (hasta el 17-nov; desde entonces no participa, decisión D-24) |

## Cómo se usaron los prompts de la guía (Anexo A)

- **P01 (Figma Make):** se usó como **especificación** para escribir el código de los mockups con Claude Opus 5.5. Ese código se importó a Figma Make con la herramienta \`send_code_to_figma\` del conector, **sin generación de la IA de Make** (0 créditos). No se escribió ningún prompt dentro de Figma Make. Archivo: https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO · sitio publicado: https://misty-umber-07813177.figma.site/
- **P02 (descargar el src de Figma):** lo hizo Josué con «Download code» de Figma Make; el ZIP se descomprimió **sin editar** en \`figma-src/\` (prompt CC-F-00).
- **P03 a P07 (módulos e integración):** no se pegaron como mensajes. Claude Code los leyó de la guía y siguió sus **listas de tareas y restricciones** como especificación de cada módulo, más las extensiones del equipo (Modo real, accesibilidad, i18n). Las cabeceras de \`js/clasificacion.js\` (P03), \`js/regresion.js\` (P04), \`js/optimizador.js\` (P05), \`js/portafolios.js\` y \`js/backtesting.js\` (P06) lo dicen. Para P03 lo decidió Josué (D-20). El plan preveía pegarlos literalmente (D-14); en la práctica se trabajó con los prompts de coordinación que siguen.
- **P08 (auditoría):** Codex lo usó **literalmente** para la auditoría independiente; está transcrito en [docs/informe/auditoria_P08.md](docs/informe/auditoria_P08.md#prompt-p08-literal-guía-p-17).

## Prompts en orden cronológico
`;
for (const e of entradas) {
  salida += `\n### ${e.fecha} ${e.hora || "(hora no registrada)"} · ${e.f.herramienta} · ${e.f.archivo.endsWith("CC.md") ? modelo(e) : e.f.modelo}\n\n`;
  if (!e.f.archivo.endsWith("CC.md")) salida += `*${herramientaTitulo(e)}*\n\n`;
  salida += e.cuerpo + "\n";
}
writeFileSync("PROMPTS_USADOS.md", salida.replace(/\n{3,}/g, "\n\n"));
console.log(`PROMPTS_USADOS.md: ${entradas.length} entradas`);
