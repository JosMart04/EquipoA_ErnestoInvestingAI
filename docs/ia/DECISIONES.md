# DECISIONES

Las decisiones **D-01 a D-15** están en `docs/contexto/PLAN_MAESTRO.md` §1.4 y no se reabren sin Josué.
Las nuevas van aquí, numeradas desde D-16.

| ID | Fecha | Autor | Decisión | Motivo | Afecta a |
|---|---|---|---|---|---|
| D-16 | 2026-11-16 | Josué (JM) | Codex trabaja en un clon separado (`EquipoA_ErnestoInvestingAI-codex`) para no compartir el directorio de trabajo con Claude Code | Dos IAs en el mismo directorio se pisan la rama activa y los cambios sin commitear | CX, CC |
| D-17 | 2026-11-16 | CC-F | Las rutas sin dueño en PLAN_MAESTRO §13.2 (`.nojekyll`, `tools/descargar_modelos.*`) las mantiene CC | Son parte del sitio y de `assets/` | CC |
| D-18 | 2026-11-16 | Josué (JM) | Orden de trabajo de Fable hoy: plan + contrato → núcleo → **Clasificación** → `js/lib` + Workers → núcleo de accesibilidad. Cambia el orden del prompt CC-F-01 | El módulo de referencia prueba la API del núcleo mientras Fable sigue disponible y asegura el Modo profesor | CC |
| D-19 | 2026-11-16 | Josué (JM) | Los modelos de MediaPipe (`face_landmarker.task` 3,76 MB y `hand_landmarker.task` 7,82 MB) se guardan en `assets/mediapipe/` | Mismo origen; no depende del bucket de Google el día de la demo (PLAN_MAESTRO §9.5) | CC |
| D-20 | 2026-11-16 | Josué (JM) | Clasificación se construye bajo el prompt CC-F-01, sin pegar P03; sigue la lista de tareas y restricciones de P03 | No frenar el trabajo de hoy. **CX lo declara así en `PROMPTS_USADOS.md`** | CC, CX |
| D-21 | 2026-11-16 | CC-F | El sitio usa **scripts clásicos** (sin módulos ES) y «formato dual» en `js/lib`; el menú se colapsa bajo **1180 px** (como el export de Figma, no 900); los formatos son los de `Intl` tal cual | `python -m http.server` en Windows puede servir `.js` con un MIME que rompe los módulos; la guía manda seguir el Figma. Detalle: PLAN_IMPLEMENTACION §2 (H-05, H-08, H-11) | CC, CX (pruebas) |
| D-22 | 2026-11-17 | CC-O | Gestos de mano: el puntero sigue el **medio de los nudillos del índice y del medio** (no la punta del índice), se **congela mientras se cierra el pellizco**, y la pausa es **puño cerrado 1,5 s** (antes «palma abierta 1 s»). Se agrega «Recorrido de la cabeza» (10°–30°) al Centro de accesibilidad | Prueba de Josué: mover el puntero con la mano abierta pausaba el control al segundo, y la punta del índice se desplaza al pellizcar. Cambia el detalle de PLAN_MAESTRO §9.6, no la decisión D-07 | CC, CX (E2E) |
