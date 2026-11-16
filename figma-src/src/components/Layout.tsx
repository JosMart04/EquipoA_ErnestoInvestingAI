import { useState, type ReactNode } from "react";
import { Accessibility, Camera, Hand, LayoutGrid, Menu, Moon, Sun, X, ScanLine, Type, Volume2, Mic, Contrast } from "lucide-react";
import { MODULOS, useApp } from "../lib/ctx";

function ControlModo() {
  const { modo, setModo, t } = useApp();
  return (
    <div role="group" aria-label={t("Datos", "Data")} className="inline-flex items-center gap-1 text-sm">
      <span className="text-mut">{t("Datos:", "Data:")}</span>
      <span className="inline-flex rounded-[8px] border border-bd overflow-hidden">
        <button type="button" aria-pressed={modo === "profesor"} onClick={() => setModo("profesor")} className={`px-2.5 min-h-11 md:min-h-9 ${modo === "profesor" ? "bg-ac text-on-ac" : "bg-panel"}`}>
          {t("Profesor · 11-nov-2026", "Course · Nov 11, 2026")}
        </button>
        <button type="button" aria-pressed={modo === "real"} onClick={() => setModo("real")} className={`px-2.5 min-h-11 md:min-h-9 border-l border-bd ${modo === "real" ? "bg-ac text-on-ac" : "bg-panel"}`}>
          {t("Reales · Yahoo", "Real · Yahoo")}
        </button>
      </span>
    </div>
  );
}

export function BarraSuperior() {
  const { ruta, ir, tema, setTema, idioma, setIdioma, setA11yAbierto, t } = useApp();
  const [menu, setMenu] = useState(false);
  const enlaces = MODULOS.map((m) => (
    <li key={m.id}>
      <a href={`#/${m.id}`} aria-current={ruta === m.id ? "page" : undefined} onClick={() => setMenu(false)}
        className={`block px-2.5 py-2 rounded-[8px] text-[0.92rem] no-underline whitespace-nowrap ${ruta === m.id ? "bg-ac text-on-ac" : "text-fg hover:bg-hl"}`}>
        {idioma === "es-PE" ? m.es : m.en}{m.nuevo && <span className={ruta === m.id ? "text-on-ac" : "text-warn"} aria-hidden> ★</span>}
      </a>
    </li>
  ));
  return (
    <>
      <a className="skip" href="#contenido">{t("Saltar al contenido", "Skip to content")}</a>
      <header className="bg-panel border-b border-bd sticky top-0 z-20">
        <div className="max-w-[86rem] mx-auto px-3 py-2 flex flex-wrap items-center gap-2">
          <a href="#/galeria" className="font-bold text-lg text-fg no-underline mr-1 inline-flex items-center gap-1">
            Ernesto <span className="text-ac">Investing AI</span>
          </a>
          <button type="button" className="min-[1180px]:hidden ml-auto inline-flex items-center gap-1 border border-bd rounded-[8px] px-3 min-h-11" aria-expanded={menu} aria-controls="menu-modulos" onClick={() => setMenu(!menu)}>
            {menu ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />} {t("Módulos", "Modules")}
          </button>
          <nav aria-label={t("Módulos del sistema", "System modules")} className="hidden min-[1180px]:block">
            <ul className="flex flex-wrap gap-0.5 list-none m-0 p-0">{enlaces}</ul>
          </nav>
          <div className="flex flex-wrap items-center gap-2 w-full min-[1180px]:w-auto min-[1180px]:ml-auto">
            <ControlModo />
            <label className="inline-flex items-center gap-1 text-sm">
              <span className="sr-only">{t("Idioma", "Language")}</span>
              <select value={idioma} onChange={(e) => setIdioma(e.target.value as "es-PE" | "en-US")} className="border border-bd rounded-[8px] bg-panel min-h-11 md:min-h-9 px-2">
                <option value="es-PE">ES-PE</option>
                <option value="en-US">EN-US</option>
              </select>
            </label>
            <button type="button" aria-pressed={tema === "oscuro"} onClick={() => setTema(tema === "oscuro" ? "claro" : "oscuro")} className="inline-flex items-center gap-1 border border-bd rounded-[8px] px-2.5 min-h-11 md:min-h-9 text-sm">
              {tema === "oscuro" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />} {t("Tema", "Theme")}
            </button>
            <button type="button" onClick={() => setA11yAbierto(true)} className="inline-flex items-center gap-1 border border-ac text-ac rounded-[8px] px-2.5 min-h-11 md:min-h-9 text-sm font-semibold">
              <Accessibility size={16} aria-hidden /> {t("Accesibilidad", "Accessibility")}
            </button>
          </div>
          {menu && (
            <nav id="menu-modulos" aria-label={t("Módulos del sistema", "System modules")} className="w-full min-[1180px]:hidden">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 list-none m-0 p-0">{enlaces}</ul>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}

export function Pie() {
  const { t } = useApp();
  return (
    <footer className="max-w-[86rem] mx-auto px-3 pb-8 text-sm text-mut">
      <p className="border-t border-bd pt-3">
        {t("Mockups del Equipo A (IHC 2026-II, FISI-UNMSM). Datos de muestra tomados de los JSON sintéticos del profesor (CC BY 4.0, E. D. Cancho-Rodríguez). No son precios reales ni asesoría de inversión.",
           "Team A mockups (HCI 2026-II, FISI-UNMSM). Sample data from the professor's synthetic JSON (CC BY 4.0, E. D. Cancho-Rodríguez). Not real prices nor investment advice.")}
      </p>
    </footer>
  );
}

/** Centro de accesibilidad (PLAN_MAESTRO §9.1) — maqueta del diálogo */
export function CentroAccesibilidad() {
  const { a11yAbierto, setA11yAbierto, setCamara, camara, t } = useApp();
  if (!a11yAbierto) return null;
  const Fila = ({ icono, titulo, desc, control }: { icono: ReactNode; titulo: string; desc: string; control: ReactNode }) => (
    <div className="flex items-start gap-3 py-2 border-b border-bd last:border-b-0">
      <span className="mt-1 text-ac" aria-hidden>{icono}</span>
      <div className="flex-1 min-w-0"><div className="font-semibold">{titulo}</div><div className="text-sm text-mut">{desc}</div></div>
      <div className="shrink-0">{control}</div>
    </div>
  );
  const Sw = ({ on = false, onClick }: { on?: boolean; onClick?: () => void }) => (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className={`w-14 h-8 rounded-full border border-bd relative ${on ? "bg-ac" : "bg-hl"}`}>
      <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
      <span className="sr-only">{on ? t("Activado", "On") : t("Desactivado", "Off")}</span>
    </button>
  );
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-3 overflow-auto" onClick={() => setA11yAbierto(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="t-a11y" className="bg-panel border border-bd rounded-[12px] w-full max-w-2xl p-4 mt-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <h2 id="t-a11y" className="text-xl font-bold m-0 inline-flex items-center gap-2"><Accessibility aria-hidden /> {t("Centro de accesibilidad", "Accessibility center")}</h2>
          <button type="button" onClick={() => setA11yAbierto(false)} className="border border-bd rounded-[8px] min-h-11 px-3 inline-flex items-center gap-1"><X size={16} aria-hidden /> {t("Cerrar", "Close")}</button>
        </div>
        <p className="text-sm text-mut">{t("Atajo: Alt+Mayús+A. Tus preferencias se guardan en este navegador.", "Shortcut: Alt+Shift+A. Preferences are saved in this browser.")}</p>
        <h3 className="font-semibold mt-3 mb-1">{t("Visual", "Visual")}</h3>
        <Fila icono={<Type />} titulo={t("Tamaño de texto", "Text size")} desc="100 % – 200 %" control={<input type="range" min={100} max={200} step={10} defaultValue={100} aria-label={t("Tamaño de texto", "Text size")} />} />
        <Fila icono={<Contrast />} titulo={t("Alto contraste", "High contrast")} desc={t("Paleta con contraste ≥ 7:1", "Palette with ≥ 7:1 contrast")} control={<Sw />} />
        <Fila icono={<Type />} titulo={t("Fuente legible y espaciado", "Readable font & spacing")} desc="Atkinson Hyperlegible · WCAG 1.4.12" control={<Sw />} />
        <h3 className="font-semibold mt-3 mb-1">{t("Lectura", "Reading")}</h3>
        <Fila icono={<Volume2 />} titulo={t("Leer resumen y sonificar gráficos", "Read summary & sonify charts")} desc={t("Voz del navegador; tonos por valor; ←/→ punto a punto", "Browser voice; pitch by value; ←/→ point by point")} control={<Sw on />} />
        <h3 className="font-semibold mt-3 mb-1">{t("Control", "Control")}</h3>
        <Fila icono={<ScanLine />} titulo={t("Barrido con un interruptor", "Single-switch scanning")} desc={t("Grupos → elementos cada 1,2 s; Espacio, parpadeo largo o pellizco para elegir", "Groups → items every 1.2 s; Space, long blink or pinch to select")} control={<Sw />} />
        <Fila icono={<Camera />} titulo={t("Cabeza / mirada (MediaPipe)", "Head / gaze (MediaPipe)")} desc={t("Puntero con la cabeza + clic por permanencia, parpadeo largo o boca abierta. Todo local: ninguna imagen sale de tu equipo.", "Head pointer + dwell, long-blink or open-mouth click. All local: no image leaves your device.")} control={<Sw on={camara === "cabeza"} onClick={() => setCamara(camara === "cabeza" ? "apagada" : "cabeza")} />} />
        <Fila icono={<Hand />} titulo={t("Gestos de mano (MediaPipe)", "Hand gestures (MediaPipe)")} desc={t("Índice = puntero · pellizco = clic · palma = pausa · deslizar = cambiar de módulo", "Index = pointer · pinch = click · palm = pause · swipe = change module")} control={<Sw on={camara === "manos"} onClick={() => setCamara(camara === "manos" ? "apagada" : "manos")} />} />
        <Fila icono={<Mic />} titulo={t("Comandos de voz (fase final)", "Voice commands (final phase)")} desc={t("«ir a clasificación», «activo NVDA», «leer resumen»…", "“go to classification”, “asset NVDA”, “read summary”…")} control={<Sw />} />
      </div>
    </div>
  );
}

/** HUD de cámara + puntero virtual con permanencia (PLAN_MAESTRO §9.5 y §9.6) */
export function HUDCamara() {
  const { camara, setCamara, t } = useApp();
  if (camara === "apagada") return null;
  return (
    <>
      <div className="dwell fixed z-40 pointer-events-none" style={{ left: "58%", top: "46%" }} aria-hidden>
        <svg width="56" height="56" viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="var(--ac)" strokeWidth="3" opacity=".35" /><circle className="prog" cx="22" cy="22" r="18" fill="none" stroke="var(--ac)" strokeWidth="4" transform="rotate(-90 22 22)" /><circle cx="22" cy="22" r="4" fill="var(--ac)" /></svg>
      </div>
      <div role="status" className="fixed z-40 right-3 bottom-3 bg-panel border-2 border-ac rounded-[12px] p-3 w-72 shadow-lg text-sm">
        <div className="flex items-center gap-2 font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-dn inline-block" aria-hidden /> {t("Cámara activa", "Camera on")} · {camara === "cabeza" ? t("cabeza/mirada", "head/gaze") : t("manos", "hands")}</div>
        <div className="mt-2 h-24 rounded-[8px] bg-hl border border-bd flex items-center justify-center text-mut">{camara === "cabeza" ? <Camera aria-hidden /> : <Hand aria-hidden />}<span className="ml-2">{t("Vista previa (ocultable)", "Preview (can hide)")}</span></div>
        <p className="my-2">{camara === "cabeza" ? t("Seguimiento: bueno · 30 fps · clic por permanencia 900 ms", "Tracking: good · 30 fps · dwell click 900 ms") : t("Mano detectada · pellizca para hacer clic", "Hand detected · pinch to click")}</p>
        <div className="flex gap-2">
          <button type="button" className="flex-1 border border-bd rounded-[8px] min-h-11">{t("Recalibrar", "Recalibrate")}</button>
          <button type="button" className="flex-1 bg-dn text-on-ac rounded-[8px] min-h-11 font-semibold" onClick={() => setCamara("apagada")}>{t("Detener (Esc)", "Stop (Esc)")}</button>
        </div>
      </div>
    </>
  );
}

export function Galeria() {
  const { t, idioma } = useApp();
  return (
    <div>
      <h1 className="text-3xl font-bold mb-1"><LayoutGrid className="inline mr-2" aria-hidden />{t("Galería de pantallas", "Screen gallery")}</h1>
      <p className="text-mut mt-0">{t("Prototipo navegable del sistema Ernesto Investing AI (Equipo A). Usa la barra superior para recorrer los 9 módulos; cambia tema, idioma y modo de datos; abre «Accesibilidad» para ver el centro de accesibilidad y el HUD de cámara.",
        "Clickable prototype of Ernesto Investing AI (Team A). Use the top bar to visit the 9 modules; switch theme, language and data mode; open “Accessibility” for the accessibility center and camera HUD.")}</p>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))]">
        {MODULOS.map((m, i) => (
          <a key={m.id} href={`#/${m.id}`} className="block bg-panel border border-bd rounded-[12px] p-4 no-underline text-fg hover:border-ac">
            <div className="text-mut text-sm">{t("Pantalla", "Screen")} {i + 1} {m.nuevo ? t("· módulo nuevo ★", "· new module ★") : t("· heredado (ampliado)", "· inherited (extended)")}</div>
            <div className="text-lg font-semibold">{idioma === "es-PE" ? m.es : m.en}</div>
          </a>
        ))}
      </div>
      <h2 className="text-xl font-semibold mt-6">{t("Variantes que pide la guía", "Variants required by the brief")}</h2>
      <ul className="leading-8">
        <li>{t("Tema oscuro de cualquier pantalla:", "Dark theme of any screen:")} <a href="?tema=oscuro#/clasificacion">?tema=oscuro</a></li>
        <li>{t("Inglés (bonificación i18n):", "English (i18n bonus):")} <a href="?lang=en#/regresion">?lang=en</a></li>
        <li>{t("Modo real (vista de diseño):", "Real mode (design view):")} <a href="?modo=real#/optimizador">?modo=real</a></li>
        <li><a href="#/portafolios">{t("Portafolios", "Portfolios")}</a> {t("a 390 px: vista móvil abajo", "at 390 px: mobile view below")}</li>
      </ul>
      <h2 className="text-xl font-semibold mt-6">{t("Portafolios · vista móvil (390 × 844 px)", "Portfolios · mobile view (390 × 844 px)")}</h2>
      <div className="inline-block rounded-[36px] border-[10px] border-fg p-1 bg-fg">
        <iframe title={t("Portafolios en un teléfono de 390 px", "Portfolios on a 390 px phone")} src={window.location.pathname + window.location.search + "#/portafolios"} width={390} height={844} className="block rounded-[26px] bg-bg border-0" />
      </div>
    </div>
  );
}
