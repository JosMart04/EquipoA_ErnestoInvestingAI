# Glosario de traducción

Criterios comunes a los 13 idiomas de `locales/`. Los términos de la tabla se leen de los diccionarios; si cambian allí, este archivo se regenera con el fragmento de `node` de la sección final.

## Términos clave por idioma

| Idioma | Señal SUBE | Señal BAJA | Conservador | Moderado | Agresivo | Modo profesor | Modo real | Borrador | Configuración |
|---|---|---|---|---|---|---|---|---|---|
| es-PE | SUBE | BAJA | Conservador | Moderado | Agresivo | Profesor | Reales · Yahoo | Borrador | Configuración |
| en-US | UP | DOWN | Conservative | Moderate | Aggressive | Course | Real · Yahoo | Draft | Settings |
| ar-EG | صعود | هبوط | متحفظ | معتدل | جريء | الأستاذ | حقيقية · Yahoo | مسودة | الإعدادات |
| he-IL | עולה | יורד | זהיר | מאוזן | נועז | קורס | אמיתי · Yahoo | טיוטה | הגדרות |
| ja-JP | 上昇 | 下落 | 保守型 | 中庸型 | 積極型 | 教員 | 実データ · Yahoo | 下書き | 設定 |
| zh-CN | 上涨 | 下跌 | 稳健 | 平衡 | 进取 | 课程 | 真实 · Yahoo | 草稿 | 设置 |
| ko-KR | 상승 | 하락 | 안정형 | 중립형 | 적극형 | 강의 | 실제 · Yahoo | 초안 | 설정 |
| hi-IN | बढ़त | गिरावट | सतर्क | संतुलित | आक्रामक | पाठ्यक्रम | वास्तविक · Yahoo | मसौदा | सेटिंग |
| ru-RU | РОСТ | ПАДЕНИЕ | Осторожный | Умеренный | Динамичный | Курс | Реальные · Yahoo | Черновик | Настройки |
| pt-BR | SOBE | DESCE | Conservador | Moderado | Agressivo | Professor | Reais · Yahoo | Rascunho | Configurações |
| fr-FR | HAUSSE | BAISSE | Prudent | Modéré | Dynamique | Professeur | Réelles · Yahoo | Brouillon | Paramètres |
| de-DE | STEIGT | FÄLLT | Vorsichtig | Moderat | Dynamisch | Kurs | Real · Yahoo | Entwurf | Einstellungen |
| qu-PE | WICHAY | URAY | Waqaychaq | Chawpi | Kallpasapa | Yachachiq | Cheqaq · Yahoo | Ñawpaq qillqa | Allichana |

## Reglas

1. **Solo dos clases.** Las claves de `datos.senal` son exactamente `SUBE` y `BAJA`; el valor es la palabra del idioma. Nunca aparece una tercera clase. Las pruebas rechazan el equivalente de «mantener» o *hold* de cada idioma: החזק, 持有, 보유/유지, होल्ड, Держать, Manter, Conserver, Halten, 保有/ホールド, احتفاظ, Waqaychay. En coreano, las posiciones de Trading se dicen «포지션» para no usar 보유.
2. **Palabra y símbolo.** La señal va siempre con ▲ o ▼ y su signo; el color nunca va solo. En ja, zh y ko, el modo automático de colores usa «rojo sube», como en sus mercados.
3. **Sin traducir:**
   - los tickers (NVDA, EPU…);
   - los nombres técnicos de modelos (XGBoost, LSTM, Transformer…), aunque los genéricos sí se traducen (por ejemplo, «Árbol de decisión»);
   - Sharpe, CVaR, Calmar, AUC, F1, MAPE, MAE, RMSE y R²;
   - NSGA-II, NSGA-III y Markowitz;
   - Yahoo Finance, yfinance, GitHub Pages;
   - el nombre del producto, «Ernesto Investing AI».
4. **Sin cifras en los textos.** Los números entran como `{parámetros}` y salen de `Intl`, con los dígitos del idioma (por ejemplo, arábigo-índicos en ar-EG, o latinos si la persona lo elige). Solo se permiten siglas fijas: IHC 2026-II, CC BY 4.0, 1/N, p10–p90, CVaR 95, WCAG 2.2, 390 px y Alt+Shift+…
5. **Moneda:** siempre USD. Cambiar el idioma cambia el **formato** (`US$123.45`, `123,45 $`), nunca el monto ni la divisa (Lab 13, L.2 y L.8).
6. **Endónimos sin banderas.** Cada idioma se presenta con su nombre en su propia lengua («Deutsch (Deutschland)», «한국어(대한민국)»).
7. **Plurales CLDR.** Cada clave plural tiene exactamente las categorías de `Intl.PluralRules` del idioma:
   - es, en, hi, pt, fr y de: one y other (en es, fr y pt, la categoría many de CLDR solo aplica a millones abreviados y no se usa);
   - he: one, two y other;
   - ru: one, few, many y other;
   - ar: zero, one, two, few, many y other;
   - ja, zh y ko: solo other.
8. **Registro:** trato formal o neutro (usted, Sie, vous, आप, 합니다체, 您), e imperativo plural neutro en hebreo.
9. **Tipografía del idioma:**
   - comillas «…» (es, fr, ru, he), “…” (en, zh, hi, ko), „…“ (de) y 「…」 (ja);
   - espacio antes de «:» en francés;
   - signos de ancho completo en chino y japonés.

## Estado de cada traducción

- **es-PE** es la fuente y **en-US** está completa.
- **Los otros 11 son borradores generados con IA**, con `_meta.estado = "borrador"` y `revisado_por = null`. El sitio lo dice en el propio idioma: «· borrador» en el selector y una franja arriba de la página.
- **qu-PE** es un borrador **parcial**: navegación, controles, señales, niveles y Configuración básica. El resto cae a es-PE, y el reconocimiento de voz usa es-PE.
- La revisión por hablantes competentes queda pendiente (Spec W13, G.10.4).

## Regenerar la tabla

```powershell
node -e "const m=require('./locales/index.json');const g=(d,k)=>k.split('.').reduce((o,p)=>o&&o[p],d);const c=['datos.senal.SUBE','datos.senal.BAJA','datos.nivel.Conservador','datos.nivel.Moderado','datos.nivel.Agresivo','shell.modo_profesor_sin_fecha','shell.modo_real_sin_fecha','config.estado_borrador','config.titulo'];for(const i of m.idiomas){const d=require('./locales/'+i.tag+'.json');console.log('| '+i.tag+' | '+c.map(k=>g(d,k)).join(' | ')+' |')}"
```
