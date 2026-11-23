# Internacionalización: medición de calidad

Evidencia para el Lab 13 (L.4, pasos 2 y 3) y la Spec W13 (G.5.5): **truncados y desbordes antes y después** de internacionalizar.

## Qué se mide

La función `medir()` de [`js/lib/i18n-calidad.js`](../../js/lib/i18n-calidad.js) reproduce el «Auditar DOM» del ejercicio 13.2 del profesor. Las 12 primeras columnas del CSV son las suyas, así que su notebook (`ejercicio_13_3_analisis_internacionalizacion.ipynb`) lee nuestros archivos sin cambios.

| Columna | Qué es |
|---|---|
| `truncados` | Elementos visibles que **recortan texto**: `overflow` hidden o clip, o `text-overflow: ellipsis`, con `scrollWidth > clientWidth + 1` |
| `desbordes` | Elementos que salen del ancho visible de la página |
| `fechas_fijas` · `dinero_fijo` | Fechas `dd/mm/aaaa` y montos `$123.45` escritos con un formato fijo en el texto visible |
| `lang_ok` · `dir_ok` | Si `<html lang>` coincide con el idioma medido y si la dirección calculada es la que corresponde (rtl en árabe y hebreo) |
| `expansion` | Caracteres visibles frente a es-PE, en %, en la misma versión, página, ancho y pseudolocalización |
| `pagina`, `ancho`, `desplazables`, `scroll_horizontal` | Columnas nuestras: la página, el ancho de la ventana, las regiones con desplazamiento propio (tablas anchas) y si la página entera se desplaza en horizontal |

**Diferencias declaradas con la versión del profesor:**
- `truncados` no cuenta las regiones con `overflow: auto` (una tabla ancha que se desplaza no recorta texto); esas van en `desplazables`.
- `desbordes` no cuenta lo que está dentro de un contenedor que recorta o desplaza, ni lo oculto a propósito: el enlace «Saltar al contenido» y el texto solo para lectores de pantalla (`.sr`).

## Versiones A y B

- **A (antes):** el sitio en la etiqueta git [`i18n-antes`](https://github.com/JosMart04/EquipoA_ErnestoInvestingAI/releases/tag/i18n-antes), antes de los cambios de este laboratorio.
  - Esa versión solo carga `i18n/es-PE.json`, así que la herramienta le entrega el diccionario del idioma medido en su lugar.
  - El `<html>` queda en `lang="es-PE"` y sin `dir`, como en la versión A del ejercicio 13.2.
- **B (después):** el sitio actual, con `?lang=<locale>`.
- **Pseudolocalización:** el algoritmo del kit del profesor (tildes y unos 40 % más de texto, entre corchetes). Se aplica igual en las dos versiones, transformando el diccionario que pide la página.

## Cómo se ejecuta

Requiere las dependencias de `tests/` (`npm ci --prefix tests --ignore-scripts`) y Microsoft Edge. Con `MEDIR_CANAL=chromium` usa el Chromium de Playwright.

```powershell
git worktree add ..\eia-i18n-antes i18n-antes
node tools/i18n/medir_i18n.mjs --version A --raiz ..\eia-i18n-antes --locales es-PE,en-US --salida docs/i18n/ejercicio_13_2_auditoria_investing_ai_PRUEBA_TECNICA_BOT.csv
node tools/i18n/medir_i18n.mjs --version B --anexar --salida docs/i18n/ejercicio_13_2_auditoria_investing_ai_PRUEBA_TECNICA_BOT.csv
```

Cada combinación (página × idioma × pseudolocalización × ancho) usa un contexto limpio de Chromium con `locale es-PE`, la zona `America/Lima` y movimiento reducido.

> **PRUEBA_TECNICA_BOT:** estas filas las genera un robot para medir la interfaz. **No son datos de personas** (Spec W13, G.10.2).
