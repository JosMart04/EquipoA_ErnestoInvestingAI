import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Info, Volume2, AlertTriangle } from "lucide-react";
import { useApp } from "../lib/ctx";

export function Card({ children, className = "", titulo }: { children: ReactNode; className?: string; titulo?: string }) {
  return (
    <section className={`bg-panel border border-bd rounded-[12px] p-4 min-w-0 ${className}`} aria-label={titulo}>
      {titulo && <h2 className="text-lg font-semibold mb-3 mt-0">{titulo}</h2>}
      {children}
    </section>
  );
}

/** Chip de señal binaria: color + símbolo + palabra (nunca solo color) */
export function Senal({ s, p, chico }: { s: "SUBE" | "BAJA"; p?: number; chico?: boolean }) {
  const { t, fmt } = useApp();
  const up = s === "SUBE";
  const etiqueta = up ? t("SUBE", "UP") : t("BAJA", "DOWN");
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 ${chico ? "text-xs py-0" : "text-sm py-0.5"} font-semibold ${up ? "text-up border-up" : "text-dn border-dn"}`}>
      {up ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />}
      {up ? "▲" : "▼"} {etiqueta}
      {p !== undefined && <span className="font-normal">· {fmt.n(p, 2)}</span>}
    </span>
  );
}

export function Variacion({ v }: { v: number }) {
  const { fmt } = useApp();
  const c = v > 0 ? "text-up" : v < 0 ? "text-dn" : "text-mut";
  return <span className={`${c} font-medium whitespace-nowrap`}>{v > 0 ? "▲ " : v < 0 ? "▼ " : ""}{fmt.pct(v, 2, true)}</span>;
}

/** Aviso según el modo (PLAN_MAESTRO §4.2). En modo real los mockups usan datos de ejemplo. */
export function Aviso({ profesor }: { profesor: string }) {
  const { modo, t } = useApp();
  return (
    <p data-aviso className="flex gap-2 items-start bg-aviso border border-bd border-l-4 border-l-warn rounded-[8px] px-3 py-2 text-sm text-fg my-3">
      <AlertTriangle size={18} className="text-warn shrink-0 mt-0.5" aria-hidden />
      <span>
        {modo === "profesor"
          ? profesor
          : t("Modo real (vista de diseño): en el sitio, datos de Yahoo Finance al último cierre, descargados con yfinance con fines educativos; modelos entrenados por el Equipo A. No es asesoría de inversión. En este mockup las cifras son de ejemplo.",
              "Real mode (design view): on the site, Yahoo Finance data at the last close, downloaded with yfinance for educational purposes; models trained by Team A. Not investment advice. Figures in this mockup are examples.")}
      </span>
    </p>
  );
}

/** Ficha IA (Amershi G1, G2, G11, G17, G10) */
export function FichaIA({ queHace, queTanBien, porQue, controlas, ignorar }: { queHace: string; queTanBien: string; porQue: string; controlas: string; ignorar: string }) {
  const { t } = useApp();
  const [abierta, setAbierta] = useState(true);
  const filas: [string, string, string][] = [
    ["G1", t("Qué hace", "What it does"), queHace],
    ["G2", t("Qué tan bien lo hace", "How well it does it"), queTanBien],
    ["G11", t("Por qué dice lo que dice", "Why it says so"), porQue],
    ["G17", t("Qué controlas", "What you control"), controlas],
    ["G10", t("Cómo ignorarlo", "How to dismiss it"), ignorar],
  ];
  return (
    <div className="bg-hl border border-bd rounded-[12px] my-3">
      <button type="button" aria-expanded={abierta} onClick={() => setAbierta(!abierta)} className="w-full flex items-center justify-between gap-2 px-4 py-2 font-semibold text-left min-h-11">
        <span className="flex items-center gap-2"><Info size={18} aria-hidden /> {t("Ficha de la IA", "AI fact sheet")}</span>
        <ChevronDown size={18} className={abierta ? "rotate-180" : ""} aria-hidden />
      </button>
      {abierta && (
        <dl className="grid grid-cols-1 md:grid-cols-[13rem_1fr] gap-x-4 gap-y-1 px-4 pb-3 m-0 text-sm">
          {filas.map(([g, k, v]) => (
            <div key={g} className="contents">
              <dt className="font-semibold"><span className="text-mut font-normal mr-1">{g}</span>{k}</dt>
              <dd className="m-0 mb-1">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Contenedor de gráfico con alternativas accesibles (PLAN_MAESTRO §8.1 y §9.2) */
export function Grafico({ titulo, grafico, tabla, resumen, alto = 320 }: { titulo: string; grafico: ReactNode; tabla: ReactNode; resumen: string; alto?: number }) {
  const { t } = useApp();
  const [tab, setTab] = useState<"g" | "t" | "r">("g");
  const tabs: ["g" | "t" | "r", string][] = [["g", t("Gráfico", "Chart")], ["t", t("Tabla", "Table")], ["r", t("Resumen", "Summary")]];
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="text-lg font-semibold m-0">{titulo}</h2>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("Vista del gráfico", "Chart view")}>
          {tabs.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`px-3 min-h-11 md:min-h-9 rounded-[8px] border border-bd text-sm ${tab === k ? "bg-ac text-on-ac border-ac" : "bg-panel"}`}>{l}</button>
          ))}
          <button type="button" className="px-3 min-h-11 md:min-h-9 rounded-[8px] border border-bd text-sm inline-flex items-center gap-1" title={t("Sonificación: escuchar la serie", "Sonification: listen to the series")}>
            <Volume2 size={16} aria-hidden /> {t("Escuchar", "Listen")}
          </button>
        </div>
      </div>
      <div role="tabpanel">
        {tab === "g" && <div role="img" aria-label={resumen} style={{ height: alto }} className="w-full">{grafico}</div>}
        {tab === "t" && <div className="overflow-auto max-h-[360px] border border-bd rounded-[8px]" tabIndex={0} role="region" aria-label={titulo}>{tabla}</div>}
        {tab === "r" && <p className="text-base leading-relaxed m-0">{resumen}</p>}
      </div>
    </Card>
  );
}

export function Segmentado<T extends string>({ etiqueta, opciones, valor, onCambio }: { etiqueta: string; opciones: [T, string][]; valor: T; onCambio: (v: T) => void }) {
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex flex-wrap rounded-[8px] border border-bd overflow-hidden">
      {opciones.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={valor === v} onClick={() => onCambio(v)} className={`px-3 min-h-11 md:min-h-9 text-sm border-r last:border-r-0 border-bd ${valor === v ? "bg-ac text-on-ac" : "bg-panel"}`}>{l}</button>
      ))}
    </div>
  );
}

export function Interruptor({ etiqueta, activo, onCambio }: { etiqueta: string; activo: boolean; onCambio: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm min-h-11 md:min-h-9 cursor-pointer">
      <input type="checkbox" checked={activo} onChange={(e) => onCambio(e.target.checked)} className="w-5 h-5 accent-[var(--ac)]" />
      {etiqueta}
    </label>
  );
}

export function Titulo({ h1, sub }: { h1: string; sub?: string }) {
  return (
    <header className="mb-2">
      <h1 className="text-2xl md:text-[1.75rem] font-bold m-0">{h1}</h1>
      {sub && <p className="text-mut m-0 mt-1">{sub}</p>}
    </header>
  );
}

export const th = "bg-hl text-left font-semibold px-2 py-1.5 border-b border-bd sticky top-0 whitespace-nowrap";
export const td = "px-2 py-1.5 border-b border-bd";
