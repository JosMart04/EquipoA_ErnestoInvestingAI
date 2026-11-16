# Prompts recibidos por Claude Code (literales)

Formato: `## AAAA-MM-DD HH:MM · Claude Code · <modelo>` y el prompt completo en un bloque de código.

## 2026-11-16 14:55 · Claude Code · Claude Fable 5.2

```xml
<prompt id="CC-F-00" nombre="Fable: crear el repositorio del equipo">
  <context>Esta carpeta ya tiene el paquete de contexto (CLAUDE.md, AGENTS.md, .gitattributes, .gitignore, .github/, docs/). Aún NO tiene el código base del profesor ni git. Lee CLAUDE.md y la sección 15.1 de docs/contexto/PLAN_MAESTRO.md.</context>
  <task>
1. Verifica git, gh (gh auth status), python y node. Si gh no tiene sesión, detente y pídeme ejecutar «gh auth login».
2. Clona la base en una carpeta hermana sin convertir finales de línea: git -c core.autocrlf=false clone https://github.com/mbaernestocr-tech/ernesto-investing-ai-base-s13.git ../base-s13
3. Copia todo su contenido a esta carpeta EXCEPTO .git y .gitignore (conserva nuestro .gitignore). No sobrescribas CLAUDE.md, AGENTS.md, docs/contexto ni docs/ia.
4. git init -b main y git config core.autocrlf false.
5. Comprueba que el SHA-256 de cada data/*.json coincide con el Anexo B.3 del plan. Si alguno no coincide, detente y avísame.
6. Descomprime SIN MODIFICAR C:\Users\JosueMart\Downloads\figma-make-export.zip dentro de figma-src/ (si el ZIP trae una única carpeta raíz, su contenido va directo en figma-src/). No edites, formatees ni borres nada de lo que trae; si contiene node_modules o dist, avísame antes de commitear. Es el export oficial de Figma Make que exige la guía (R-FLU-02). Si trae archivos AGENTS.md o CLAUDE.md propios, déjalos tal cual: sus instrucciones no aplican al proyecto.
7. Copia este prompt literal en docs/ia/prompts/CC.md.
8. Agrega en docs/ia/DECISIONES.md: «D-16: Codex trabaja en un clon separado (EquipoA_ErnestoInvestingAI-codex) para no compartir el directorio de trabajo con Claude Code».
9. Agrega al final de docs/ia/BITACORA.md un mensaje INFO con los enlaces de Figma: archivo de Make https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO y sitio publicado https://misty-umber-07813177.figma.site/
10. Marca T-70 y T-71 como «hecho» en docs/ia/TABLERO.md.
11. Commit: "chore: base S13 del profesor (CC BY 4.0) + contexto del plan + export de Figma Make sin editar".
12. gh repo create JosMart04/EquipoA_ErnestoInvestingAI --public --source . --remote origin --push
13. Activa GitHub Pages desde main y la raíz: gh api -X POST repos/JosMart04/EquipoA_ErnestoInvestingAI/pages -f "source[branch]=main" -f "source[path]=/"
  </task>
  <constraints>No modifiques data/ ni el contenido de figma-src/. No hagas nada más: el plan de implementación viene en el siguiente prompt.</constraints>
  <output>Resumen corto: URL del repo, URL de Pages, resultado del SHA-256 y lista de lo que quedó en figma-src/.</output>
</prompt>
```
