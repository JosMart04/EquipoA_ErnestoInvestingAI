import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpDown, Coins, Star } from "lucide-react";
import { D } from "../data/muestra";
import { GRUPO, MODELO_CORTO, useApp } from "../lib/ctx";
import { Aviso, Card, FichaIA, Segmentado, Senal, Titulo, td, th } from "../components/ui";

const nivel = (p: number) => { const d = Math.abs(p - 0.5); return d >= 0.08 ? 3 : d >= 0.04 ? 2 : 1; };

export function Clasificacion() {
  const { t, fmt, idioma, ir, ticker, modo } = useApp();
  const modelos = D.clasif.modelos;
  const [familia, setFamilia] = useState<"todos" | "ML" | "DL">("todos");
  const [grupo, setGrupo] = useState("");
  const [soloWl, setSoloWl] = useState(false);
  const [sel, setSel] = useState<string>(ticker && D.clasif.pred[ticker] ? ticker : "NVDA");
  const [orden, setOrden] = useState<{ k: string; asc: boolean }>({ k: "exactitud", asc: false });
  const [mSel, setMSel] = useState("XGBoost");
  const wl = D.wl.watchlist_inicial;
  const cols = modelos.map((m: any, i: number) => ({ ...m, i })).filter((m: any) => familia === "todos" || m.familia === familia);
  const filas = D.universo.filter((d: any) => (!grupo || d.grupo === grupo) && (!soloWl || wl.includes(d.ticker)));
  const exMin = Math.min(...modelos.map((m: any) => m.exactitud)), exMax = Math.max(...modelos.map((m: any) => m.exactitud));
  const aucMin = Math.min(...modelos.map((m: any) => m.auc)), aucMax = Math.max(...modelos.map((m: any) => m.auc));
  const m0 = modelos[0].matriz_confusion; const tasaBase = (m0.VP + m0.FN) / modelos[0].n_prueba;
  const p = D.clasif.pred[sel];
  const metr = useMemo(() => [...modelos].sort((a: any, b: any) => (orden.asc ? 1 : -1) * (a[orden.k] > b[orden.k] ? 1 : a[orden.k] < b[orden.k] ? -1 : 0)), [orden, modelos]);
  const mc = modelos.find((m: any) => m.modelo === mSel).matriz_confusion;
  const confTxt: Record<string, [string, string]> = { alta: ["alta", "high"], media: ["media", "medium"], baja: ["baja", "low"] };
  return (
    <div className="space-y-3">
      <Titulo h1={t("Clasificación binaria de tendencia", "Binary trend classification")} sub={t("¿Sube o baja cada activo en 30 sesiones? Solo dos clases: SUBE o BAJA.", "Will each asset go up or down in 30 sessions? Only two classes: UP or DOWN.")} />
      <Aviso profesor={t("Datos sintéticos · clasificación simulada", "Synthetic data · simulated classification")} />
      <FichaIA
        queHace={t("Estima con 18 modelos (11 de Machine Learning y 7 de Deep Learning) si el precio dentro de 30 sesiones será mayor que hoy.", "Uses 18 models (11 ML, 7 DL) to estimate whether the price 30 sessions ahead will be higher than today.")}
        queTanBien={t(`Exactitud de ${fmt.pct(exMin * 100, 1)} a ${fmt.pct(exMax * 100, 1)} · AUC de ${fmt.n(aucMin)} a ${fmt.n(aucMax)}. Apenas mejor que lanzar una moneda. Un modelo que siempre dijera SUBE acertaría ${fmt.pct(tasaBase * 100, 1)}.`,
          `Accuracy ${fmt.pct(exMin * 100, 1)}–${fmt.pct(exMax * 100, 1)} · AUC ${fmt.n(aucMin)}–${fmt.n(aucMax)}. Barely better than a coin flip. Always saying UP would score ${fmt.pct(tasaBase * 100, 1)}.`)}
        porQue={t("Cada celda muestra la probabilidad de SUBE de un modelo; el consenso es la media de los 18.", "Each cell shows one model's probability of UP; consensus is the mean of the 18.")}
        controlas={t("Grupo de activos, familia de modelos, modelos visibles y «solo mi watchlist».", "Asset group, model family, visible models and “my watchlist only”.")}
        ignorar={t("Oculta modelos que no te convenzan; nada de esto es una orden de compra.", "Hide models you don't trust; none of this is a buy order.")}
      />
      {modo === "real" && <Card><label className="text-sm font-semibold">{t("Fecha de corte de los modelos", "Model cutoff date")}{" "}<select className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 font-normal"><option>16-nov-2026 ({t("último cierre", "last close")})</option><option>30-oct-2026</option><option>30-sep-2026</option></select></label></Card>}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm font-semibold">{t("Grupo", "Group")}<br /><select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 font-normal"><option value="">{t("Todos", "All")}</option>{Object.keys(GRUPO).map((g) => <option key={g} value={g}>{GRUPO[g][idioma === "es-PE" ? 0 : 1]}</option>)}</select></label>
          <div><div className="text-sm font-semibold">{t("Familia", "Family")}</div><Segmentado etiqueta={t("Familia", "Family")} valor={familia} onCambio={setFamilia} opciones={[["todos", t("Todos (18)", "All (18)")], ["ML", "ML (11)"], ["DL", "DL (7)"]]} /></div>
          <label className="inline-flex items-center gap-2 min-h-11 text-sm"><input type="checkbox" className="w-5 h-5" checked={soloWl} onChange={(e) => setSoloWl(e.target.checked)} /><Star size={14} className="text-warn" aria-hidden /> {t("Solo mi watchlist", "My watchlist only")}</label>
          <span className="text-sm text-mut">{t(`${filas.length} activos × ${cols.length} modelos = ${filas.length * cols.length} celdas`, `${filas.length} assets × ${cols.length} models = ${filas.length * cols.length} cells`)}</span>
        </div>
      </Card>
      <div className="grid gap-3 lg:grid-cols-[1fr_22rem]">
        <Card titulo={t("Mapa de calor: probabilidad de SUBE por activo y modelo", "Heatmap: probability of UP by asset and model")}>
          <div className="overflow-auto max-h-[560px] border border-bd rounded-[8px]" tabIndex={0} role="region" aria-label={t("Mapa de calor desplazable", "Scrollable heatmap")}>
            <table className="text-xs border-collapse">
              <caption className="sr-only">{t("Probabilidad de SUBE; cada celda indica SUBE o BAJA con símbolo", "Probability of UP; each cell says UP or DOWN with a symbol")}</caption>
              <thead><tr><th scope="col" className={th + " left-0 z-10"}>{t("Activo", "Asset")}</th>{cols.map((m: any) => <th key={m.modelo} scope="col" className={th + " text-center"}><abbr title={m.modelo} aria-label={m.modelo} className="no-underline">{MODELO_CORTO[m.modelo]}</abbr><div className="text-[10px] text-mut font-normal">{m.familia}</div></th>)}<th scope="col" className={th}>{t("Consenso", "Consensus")}</th></tr></thead>
              <tbody>{filas.map((d: any) => {
                const pr = D.clasif.pred[d.ticker];
                return (
                  <tr key={d.ticker} className={sel === d.ticker ? "outline outline-2 outline-ac -outline-offset-2" : ""}>
                    <th scope="row" className="sticky left-0 bg-panel px-2 py-1 border-b border-bd text-left whitespace-nowrap"><button type="button" className="underline text-ac min-h-8" onClick={() => setSel(d.ticker)}>{d.ticker}</button></th>
                    {cols.map((m: any) => { const pp = pr.p[m.i]; const up = pp >= 0.5; return (
                      <td key={m.modelo} className={`c-${up ? "up" : "dn"}-${nivel(pp)} px-1.5 py-1 border-b border-r border-bd text-center whitespace-nowrap font-semibold`} aria-label={`${d.ticker}, ${m.modelo}: ${up ? t("SUBE", "UP") : t("BAJA", "DOWN")}, ${fmt.pct(pp * 100, 0)}`}>
                        {up ? "▲" : "▼"} {up ? t("SUBE", "UP") : t("BAJA", "DOWN")}<div className="font-normal">{fmt.n(pp, 2)}</div></td>); })}
                    <td className="px-2 border-b border-bd"><Senal s={pr.c} chico /></td>
                  </tr>);
              })}</tbody>
            </table>
          </div>
        </Card>
        <Card titulo={t(`Consenso de ${sel}`, `${sel} consensus`)}>
          <div className="flex items-center gap-2 mb-2"><Senal s={p.c} p={p.pm} /><span className="text-sm border border-bd rounded-full px-2">{t("Confianza", "Confidence")}: <strong>{confTxt[p.conf][idioma === "es-PE" ? 0 : 1]}</strong></span></div>
          <div className="flex h-7 rounded-[6px] overflow-hidden border border-bd text-xs font-semibold" role="img" aria-label={t(`${p.vs} votos SUBE y ${p.vb} votos BAJA`, `${p.vs} UP votes and ${p.vb} DOWN votes`)}>
            <div className="c-up-3 flex items-center justify-center" style={{ width: `${(p.vs / 18) * 100}%` }}>▲ {p.vs}</div>
            <div className="c-dn-3 flex items-center justify-center" style={{ width: `${(p.vb / 18) * 100}%` }}>▼ {p.vb}</div>
          </div>
          <p className="text-sm">{t(`De 18 modelos, ${p.vs} dicen SUBE y ${p.vb} dicen BAJA; la probabilidad media de subir es ${fmt.pct(p.pm * 100, 1)}. Recuerda: estos modelos aciertan entre ${fmt.pct(exMin * 100, 0)} y ${fmt.pct(exMax * 100, 0)} de las veces.`,
            `Of 18 models, ${p.vs} say UP and ${p.vb} say DOWN; mean probability of going up is ${fmt.pct(p.pm * 100, 1)}. Remember: these models are right ${fmt.pct(exMin * 100, 0)}–${fmt.pct(exMax * 100, 0)} of the time.`)}</p>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => ir("regresion", sel)} className="bg-ac text-on-ac rounded-[8px] min-h-11 px-3 inline-flex items-center justify-between">{t("Ver su regresión", "See its regression")} <ArrowRight size={16} aria-hidden /></button>
            <button type="button" onClick={() => ir("optimizador", sel)} className="border border-ac text-ac rounded-[8px] min-h-11 px-3 inline-flex items-center justify-between">{t("Ver en el optimizador", "See in the optimizer")} <ArrowRight size={16} aria-hidden /></button>
          </div>
        </Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_22rem]">
        <Card titulo={t("Métricas por modelo (prueba fuera de muestra)", "Per-model metrics (out-of-sample test)")}>
          <div className="overflow-auto border border-bd rounded-[8px]" tabIndex={0} role="region" aria-label={t("Tabla de métricas", "Metrics table")}>
            <table className="w-full text-sm border-collapse">
              <thead><tr><th scope="col" className={th}>{t("Modelo", "Model")}</th><th scope="col" className={th}>{t("Familia", "Family")}</th>
                {[["exactitud", t("Exactitud", "Accuracy")], ["precision", t("Precisión", "Precision")], ["recall", "Recall"], ["f1", "F1"], ["auc", "AUC"]].map(([k, l]) => (
                  <th key={k} scope="col" className={th} aria-sort={orden.k === k ? (orden.asc ? "ascending" : "descending") : "none"}>
                    <button type="button" className="inline-flex items-center gap-1 font-semibold min-h-8" onClick={() => setOrden({ k, asc: orden.k === k ? !orden.asc : false })}>{l} <ArrowUpDown size={13} aria-hidden /></button></th>))}
              </tr></thead>
              <tbody>{metr.map((m: any) => (
                <tr key={m.modelo} className={mSel === m.modelo ? "bg-hl" : ""}><th scope="row" className={td + " text-left"}><button type="button" className="underline text-ac text-left min-h-8" onClick={() => setMSel(m.modelo)}>{m.modelo}</button></th><td className={td}>{m.familia}</td>
                  {["exactitud", "precision", "recall", "f1", "auc"].map((k) => <td key={k} className={td}>{fmt.n(m[k], 3)}</td>)}</tr>))}</tbody>
            </table>
          </div>
        </Card>
        <Card titulo={t(`Matriz de confusión · ${mSel}`, `Confusion matrix · ${mSel}`)}>
          <table className="w-full text-sm border-collapse text-center">
            <thead><tr><td className={td}></td><th scope="col" className={th + " text-center"}>{t("Real: SUBE", "Actual: UP")}</th><th scope="col" className={th + " text-center"}>{t("Real: BAJA", "Actual: DOWN")}</th></tr></thead>
            <tbody>
              <tr><th scope="row" className={th}>{t("Dijo ▲ SUBE", "Said ▲ UP")}</th><td className={td + " c-up-2 font-bold"}>{mc.VP} <span className="font-normal">{t("aciertos", "hits")}</span></td><td className={td}>{mc.FP} {t("errores", "misses")}</td></tr>
              <tr><th scope="row" className={th}>{t("Dijo ▼ BAJA", "Said ▼ DOWN")}</th><td className={td}>{mc.FN} {t("errores", "misses")}</td><td className={td + " c-up-2 font-bold"}>{mc.VN} <span className="font-normal">{t("aciertos", "hits")}</span></td></tr>
            </tbody>
          </table>
          <p className="text-sm mt-2">{t(`De los ${mc.VP + mc.FP} días en que dijo SUBE, acertó ${mc.VP}.`, `Of the ${mc.VP + mc.FP} days it said UP, it was right ${mc.VP} times.`)}</p>
        </Card>
      </div>
      <Card>
        <h2 className="text-lg font-semibold mt-0 inline-flex items-center gap-2"><Coins aria-hidden /> {t("¿Qué significa acertar 55 %?", "What does 55 % accuracy mean?")}</h2>
        <p className="m-0">{t("Si lanzas una moneda 100 veces, aciertas unas 50. Estos modelos aciertan entre 52 y 57: una pista débil, no una certeza. Por eso mostramos el consenso, la confianza y las métricas al lado de cada señal.",
          "Flip a coin 100 times and you'll be right about 50. These models are right 52–57 times: a weak hint, not a certainty. That's why consensus, confidence and metrics sit next to every signal.")}</p>
      </Card>
    </div>
  );
}
