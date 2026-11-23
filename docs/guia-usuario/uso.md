# Guía de uso · Ernesto Investing AI

Esta guía explica cómo moverte por el sistema y hacer las tareas más comunes. Para el teclado, el lector de pantalla, la cámara, el barrido y la voz, consulta la [guía de accesibilidad](accesibilidad.md).

> **Importante:** es un prototipo educativo. Las predicciones tienen incertidumbre y **no son asesoría de inversión**. El Trading es una simulación: no se mueve dinero real.

## 1. La pantalla

- **Barra lateral (izquierda; derecha en árabe y hebreo):** las 16 páginas, agrupadas en seis bloques:
  - **Mercado:** Dashboard, Detalle de activo y Comparador;
  - **Vigilancia:** Watchlist y alertas, Historial de órdenes;
  - **Modelos:** Clasificación y Regresión;
  - **Cartera:** Optimizador, Portafolios y Backtesting;
  - **Operación:** Trading simulado y Leaderboard;
  - **Cuenta:** Perfil, Configuración, Ayuda y Acerca de.

  «Menú compacto» la reduce a iconos. En el celular se abre con el botón ☰ y se cierra con Esc o tocando fuera.
- **Barra superior**, de izquierda a derecha:
  - el **buscador**;
  - el **estado del mercado** de Nueva York;
  - el **modo de datos** (Profesor o Reales);
  - el idioma, el tema claro u oscuro y el Centro de accesibilidad;
  - la **campana** de notificaciones y tu **cuenta**.
- **Cinta de cotizaciones:** los 26 activos con su último precio y su variación. Se pausa con el botón ⏸, al pasar el puntero o al enfocarla. Si activas «reducir movimiento», queda quieta.

## 2. Modo de datos

- **Profesor** (por defecto): los datos sintéticos de la guía del curso, al cierre del 11-nov-2026. Es el modo que se evalúa.
- **Reales · Yahoo:** precios reales y modelos entrenados por el equipo, con su fecha de corte. Si falta algún archivo, la página lo dice y nombra cuál.

El modo se cambia en la barra superior. Todo lo que guardas (cartera, órdenes, notificaciones) se lleva por separado en cada modo.

## 3. Buscar

Pulsa **Ctrl + K** (o **/** cuando no estás escribiendo), o haz clic en «Buscar…». Escribe un ticker, una empresa, un sector, una página o una acción («tema», «recorrido»). Muévete con las flechas, abre con Enter y cierra con Esc. Si no escribes nada, el buscador muestra las páginas y las acciones, así que también funciona como menú.

## 4. Ver un activo y compararlo

1. Desde el Dashboard, una tabla, la cinta o el buscador, abre el **Detalle de activo**.
2. Elige el periodo de las velas (con el volumen debajo) y revisa los indicadores: variación a 5 días, 1 mes y 3 meses, volatilidad, beta y volumen.
3. «Qué dicen los modelos» resume el consenso **SUBE ▲ / BAJA ▼** de los clasificadores y la banda de la regresión. Siempre se muestra la incertidumbre.
4. Desde ahí puedes agregarlo a tu watchlist, crear una alerta, operarlo o **compararlo**.
5. En el **Comparador**, agrega hasta cinco activos y elige el periodo. Las curvas parten de una base común para comparar rendimientos. La dirección de la página guarda tu selección, así que puedes compartirla.

## 5. Vigilar

- **Watchlist y alertas:** sigue activos y crea alertas de precio o de variación diaria. Cuando una alerta se cumple con los datos del corte, aparece en la **campana**, en cualquier página.
- **Notificaciones (🔔):** el número indica cuántas no has leído. El panel muestra cuándo ocurrió cada una y tiene «Marcar todo como leído».

## 6. Operar (simulado)

1. En **Trading simulado**, elige el activo, compra o venta y la cantidad. La vista previa muestra el costo y el efectivo restante. Si algo no es válido, lo dice junto al campo.
2. Al enviar, **se abre una confirmación** con el activo, la operación, la cantidad, el precio, el total y el efectivo después. Nada se ejecuta hasta que confirmas.
3. La orden llega al **Historial de órdenes** y a la campana. En el historial puedes filtrar por activo, operación y fechas, ordenar las columnas y **exportar a CSV**.
4. El **Leaderboard** compara tu cartera con la liga ficticia.

## 7. Modelos y carteras

- **Clasificación:** 18 modelos dicen SUBE o BAJA a 30 sesiones, con probabilidad, consenso y métricas.
- **Regresión:** pronóstico de precio con mediana y banda de incertidumbre.
- **Optimizador → Portafolios → Backtesting:** construye carteras, elige un nivel de riesgo y mira cómo les habría ido. «Llevar a Trading» aplica una cartera a tu simulación.

Cada módulo tiene una **ficha de la IA** con el modelo, los datos y sus límites.

## 8. Tu cuenta

- **Perfil:**
  - un **alias** solo para la demo; tus iniciales aparecen en el avatar;
  - tu **actividad**: cartera, retorno, órdenes, alertas y watchlist;
  - el **perfil de riesgo**: responde cinco preguntas y el sistema sugiere Conservador, Moderado o Agresivo, con un enlace a esa cartera en Portafolios. Es **orientativo**, no una recomendación.
- **Configuración:** idioma, zona horaria de las horas, formatos y convención de color.
- **Ayuda:** primeros pasos, atajos, comandos de voz, glosario y preguntas frecuentes, con un buscador.
- **Acerca de:** qué datos son reales y cuáles sintéticos, la fecha de corte, el uso de IA y las licencias.
- **Recorrido guiado:** la primera vez, el Dashboard lo ofrece en una franja. También se abre desde el menú de tu cuenta, desde Ayuda o desde el buscador. Esc lo cierra en cualquier paso.

## 9. Privacidad

El sitio no tiene cuentas ni servidores. Tu alias, perfil de riesgo, watchlist, alertas, cartera, órdenes, notificaciones y preferencias se guardan **solo en este navegador**. Para borrarlos, usa **Perfil → Borrar mis datos locales**.

## 10. Si algo no funciona

- **Una página dice que faltan datos:** en Modo real puede faltar algún archivo. Vuelve al Modo profesor con el botón del aviso.
- **No ves cambios recientes:** recarga sin caché (Ctrl + F5).
- **El texto se ve en español en otro idioma:** algunos textos libres de los datos solo existen en español. Se marcan como tales para el lector de pantalla.
