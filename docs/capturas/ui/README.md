# Capturas de la interfaz: antes y después de la iteración 2

Evidencia de la Spec W13 **G.1.2** (interfaz realista), **G.4** (criterios de realismo por bloque) y **G.9** (módulos completos, navegación coherente, estados, tema y móvil).

- **Antes:** la etiqueta git `ui-antes`, es decir, el sitio al cerrar el Lab 13 (13 idiomas, 10 páginas, barra de pestañas).
- **Después:** esta rama, con 16 páginas agrupadas en la barra lateral por los bloques de la G.4.

Las genera `node tools/capturas_ui.mjs` con Playwright y Microsoft Edge, en estas condiciones:
- perfil limpio en cada captura;
- «reducir movimiento» activado;
- el tema y el idioma de cada fila;
- la hora fija en el viernes 20-nov-2026 a las 10:30 de Nueva York, con el mercado abierto, para que se puedan repetir.

Las capturas con interacción (menú, buscador, confirmación, historial, perfil) la hacen con los mismos controles que usaría una persona. Por ejemplo, las dos órdenes del historial se envían y se confirman desde Trading.

## Antes y después

| Pantalla | Antes | Después |
|---|---|---|
| Dashboard, claro, 1280 px | ![](antes/dashboard.png) | ![](despues/dashboard.png) |
| Dashboard, oscuro | ![](antes/dashboard-oscuro.png) | ![](despues/dashboard-oscuro.png) |
| Dashboard, móvil (375 px) | ![](antes/dashboard-375.png) | ![](despues/dashboard-375.png) |
| Menú en el móvil | ![](antes/menu-375.png) | ![](despues/menu-375.png) |
| Dashboard en árabe (RTL) | ![](antes/dashboard-ar.png) | ![](despues/dashboard-ar.png) |
| Clasificación (NVDA) | ![](antes/clasificacion.png) | ![](despues/clasificacion.png) |
| Trading simulado | ![](antes/trading.png) | ![](despues/trading.png) |
| Configuración, oscuro | ![](antes/configuracion.png) | ![](despues/configuracion.png) |

## Pantallas nuevas (solo después)

| Pantalla | Bloque (G.4) | Captura |
|---|---|---|
| Detalle de activo: velas con volumen, KPI, qué dicen los modelos y correlaciones | Mercado | ![](despues/activo.png) |
| Detalle de activo en árabe, oscuro | Mercado | ![](despues/activo-ar.png) |
| Comparador en base 100 (NVDA, AAPL y MSFT) | Mercado | ![](despues/comparador.png) |
| Confirmación de la orden | Operación | ![](despues/confirmacion.png) |
| Historial de órdenes (tras dos órdenes confirmadas) | Vigilancia | ![](despues/ordenes.png) |
| Centro de notificaciones (tras una orden confirmada) | Vigilancia | ![](despues/notificaciones.png) |
| Buscador Ctrl+K, oscuro | Transversal | ![](despues/buscador.png) |
| Recorrido guiado, paso 1 | Transversal | ![](despues/recorrido.png) |
| Perfil con perfil de riesgo | Cuenta | ![](despues/perfil.png) |
| Perfil, móvil y oscuro | Cuenta | ![](despues/perfil-375-oscuro.png) |
| Ayuda | Cuenta | ![](despues/ayuda.png) |
| Acerca de, en japonés | Cuenta | ![](despues/acerca.png) |

## Cómo regenerarlas

```powershell
node tools/capturas_ui.mjs                 # todas; crea y borra un worktree temporal de ui-antes
node tools/capturas_ui.mjs perfil buscador # solo algunas
```

Requiere las dependencias de `tests/` (`npm ci --prefix tests --ignore-scripts`), Python (para servir las dos versiones) y Microsoft Edge. Con `MEDIR_CANAL=chromium` usa el Chromium de Playwright.
