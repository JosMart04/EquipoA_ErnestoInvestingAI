# Guía de accesibilidad · Ernesto Investing AI

Esta guía explica cómo usar el sitio **sin ratón**, **con lector de pantalla**, **con la cabeza o la mano**, **con un solo interruptor** o **con la voz**. Todo funciona en las 9 páginas y en los dos idiomas (ES-PE y EN-US).

Sitio: <https://josmart04.github.io/EquipoA_ErnestoInvestingAI/>

---

## 1. El Centro de accesibilidad

Botón **«Accesibilidad»** en la barra superior, o el atajo **`Alt+Shift+A`** desde cualquier página. Tus preferencias se guardan solo en tu navegador y se aplican a todos los módulos.

| Sección | Qué puedes cambiar |
|---|---|
| **Visual** | Tamaño del texto (100 % a 200 %), alto contraste, reducir movimiento, más espacio en el texto, subrayar enlaces, fuente legible, cursor grande y tramas en los gráficos (para distinguir series sin color) |
| **Lectura** | Leer el resumen de la página en voz alta, velocidad de la voz y sonificación de los gráficos |
| **Control** | Comandos de voz, barrido con un interruptor, puntero con la cabeza y gestos de mano, con sus ajustes |
| **Ayuda** | Atajos y la guía de gestos con ilustraciones |

## 2. Teclado

- **`Tab`** y **`Mayús+Tab`** recorren todos los controles; el foco siempre se ve.
- El primer enlace de cada página es **«Saltar al contenido»**.
- **Pestañas** (Gráfico, Tabla, Resumen) y **controles segmentados**: flechas izquierda y derecha.
- **Tablas:** los encabezados son botones que ordenan la tabla (ascendente o descendente).
- **Diálogos:** el foco queda dentro; **`Esc`** cierra y el foco vuelve a donde estaba.

### Recorrer un gráfico con el teclado

Lleva el foco al gráfico (con `Tab`) y usa:

| Tecla | Qué hace |
|---|---|
| `←` `→` | Punto anterior o siguiente (se oye un tono y se anuncia «fecha: valor») |
| `Re Pág` `Av Pág` | Salta un décimo de la serie |
| `Inicio` `Fin` | Primer o último punto |
| `↑` `↓` | Cambia de serie (por ejemplo, de una cartera a SPY) |
| `S` | Reproduce la serie completa como sonido |

En el **Optimizador**, las flechas recorren los puntos de las fronteras y **`Enter`** muestra la composición del punto elegido.

## 3. Lector de pantalla

- Cada gráfico tiene tres pestañas: **Gráfico**, **Tabla** (todos los datos) y **Resumen** (texto generado con las cifras: tendencia, inicio, fin, variación, máximo y mínimo de cada serie).
- En **Resumen** está el botón **«Leer en voz alta»**.
- Los cambios importantes (un filtro aplicado, una orden ejecutada, una alerta disparada) se anuncian en una región viva.
- Las señales se dicen siempre con palabra y símbolo: **▲ SUBE** o **▼ BAJA**, nunca solo con color.

Se recomienda NVDA o Narrador en Windows y TalkBack en Android.

## 4. Sonido

- **Tecla `S`** sobre un gráfico enfocado (o el comando de voz «escuchar gráfico»): la serie suena de izquierda a derecha; un tono más agudo es un valor más alto.
- La sonificación se puede apagar en el Centro (sección Lectura).

## 5. Puntero con la cabeza

1. Centro de accesibilidad → **«Activar: puntero con la cabeza»** y acepta el aviso de la cámara.
2. Mira la pantalla de frente: esa posición es el centro. Gira o inclina la cabeza para mover el puntero.
3. **Clic:** quédate quieto sobre un botón (el anillo se llena) o, si lo eliges en el Centro, con un **parpadeo largo** o **abriendo la boca**.
4. En el recuadro de la cámara (abajo a la derecha):
   - **Recentrar**: tu posición actual pasa a ser el centro.
   - **Calibrar**: miras un punto en el centro y luego en las cuatro esquinas; el puntero se ajusta a tu forma de moverte. `Esc` cancela. La calibración se puede quitar desde el Centro.
   - **Pausa**, **Gestos** (guía ilustrada) y **Detener** (también con `Esc`).
5. Si el puntero va al revés, usa **«Invertir el movimiento horizontal/vertical»** en el Centro; **«Recorrido de la cabeza»** cambia cuánto hay que girar.

## 6. Gestos de mano

Centro → **«Activar: gestos de mano»**.

| Gesto | Qué hace |
|---|---|
| Mover la mano (abierta o señalando) | Mueve el puntero; no hace falta estirar el brazo |
| **Pellizco** (pulgar e índice) | Clic; mientras juntas los dedos, el puntero se queda quieto |
| **Puño cerrado** sostenido | Pausa o reanuda el control (el recuadro avisa mientras lo mantienes) |
| **«V»** con índice y medio, subiendo o bajando la mano | Desplaza la página |

## 7. Barrido con un interruptor

Centro → **«Activar el barrido con un interruptor»**. El sitio resalta por turnos **grupos** (Navegación, Controles del módulo, Contenido, Gráficos, Tablas, Pie) y luego sus **elementos**.

- **Espacio** o **Enter** elige lo resaltado. Si la cámara está activa, también un parpadeo largo, abrir la boca o un pellizco.
- Cada grupo termina en **«Salir del grupo»** y el nivel superior en **«Detener el barrido»**.
- Una lista desplegable abre sus opciones en un diálogo, que se recorre igual.
- El tiempo de cada paso se ajusta en el Centro (0,5 a 3 s). **`Esc`** detiene el barrido.

## 8. Comandos de voz

Requiere **Chrome o Edge** (Firefox no tiene reconocimiento de voz). Actívalos con **`Alt+Shift+V`** o desde el Centro y acepta el aviso: el navegador envía el audio a su servicio de reconocimiento; el sitio no graba nada por su cuenta.

| Di… | Para… |
|---|---|
| «ir a clasificación», «backtesting», «trading»… | Cambiar de módulo |
| «siguiente», «anterior», «volver», «bajar», «subir» | Moverte por la página |
| «activo NVDA», «activo Apple» o solo «Apple» | Elegir un activo |
| «tema oscuro», «modo real», «inglés», «español» | Cambiar la vista |
| «solo ML», «solo DL», «todos los modelos» | Filtrar modelos (Clasificación y Regresión) |
| «leer resumen», «escuchar gráfico» | Escuchar la página o un gráfico |
| «llevar a trading» | Abrir «Llevar a Trading» (Portafolios u Optimizador) |
| **«clic en …»** + el texto de un botón, enlace u opción | Pulsar cualquier control: «clic en elegir moderado», «clic en ETF sectoriales», «clic en tres meses» |
| «ayuda» | Ver todos los comandos |
| «detener voz» (o `Esc`) | Apagar la voz |

Si hay varios controles con el mismo nombre, aparece un **número sobre cada uno**: di **«dos»**, **«el segundo»** o **«cancelar»**. También puedes decirlo de una vez: «clic en el segundo elegir». Los números se pueden decir con palabras («treinta y siete», «tres meses»).

## 9. Atajos

| Atajo | Acción |
|---|---|
| `Alt+Shift+A` | Abrir el Centro de accesibilidad |
| `Alt+Shift+V` | Activar o detener los comandos de voz |
| `Esc` | Cerrar un diálogo; detener la cámara, el barrido o la voz |
| `Tab` / `Mayús+Tab` | Recorrer los controles |
| `←` `→` `↑` `↓` `Inicio` `Fin` `S` | Recorrer y escuchar un gráfico enfocado |

## 10. Privacidad

- **Cámara:** la imagen se analiza **solo en tu navegador** (MediaPipe); no se envía ni se guarda. El recuadro «Cámara activa» se ve mientras está encendida.
- **Voz:** Chrome y Edge envían el audio a su propio servicio de reconocimiento (Google o Microsoft). El sitio no graba ni envía audio por su cuenta.
- Las preferencias, la watchlist y la cartera de Trading se guardan solo en tu navegador.

## 11. Si algo no funciona

| Problema | Qué hacer |
|---|---|
| La cámara o la voz no arrancan | Abre el sitio por `https://` (Pages) o `http://localhost`; revisa el permiso de cámara o micrófono en el candado de la barra de direcciones |
| «No veo tu cara» o «No veo tu mano» | Más luz de frente y la cara o la mano dentro de la imagen |
| El puntero de la cabeza va al revés | Casillas «Invertir» en el Centro, o «Calibrar» |
| La voz no aparece en el Centro | Tu navegador no tiene reconocimiento de voz: usa Chrome o Edge |
| La voz no entiende una frase | El recuadro muestra «Oí: …»; repite más despacio o usa «clic en» con el texto que ves |
| Ves textos viejos tras una actualización | Recarga forzada con `Ctrl+F5` |
