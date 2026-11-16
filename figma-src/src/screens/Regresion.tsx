import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { D } from "../data/muestra";
import { useApp } from "../lib/ctx";
import { Aviso, Card, FichaIA, Grafico, Interruptor, Segmentado, Titulo, td, th } from "../components/ui";

const TK = ["AAPL", "NVDA", "EPU"];

export function Regresion() {
  const { t, fmt, colores, ir, ticker } = useApp();
  const [tk, setTk] = useState(ticker && TK.includes(ticker) ? ticker : "NVDA");
  const [familia, setFamilia] = useState<"todos" | "ML" | "DL">("todos");
  const [banda, setBanda] = useState(true);
  const [cono, setCono] = useState(true);
  const [ocultos, setOcultos] = useState<string[]>([]);
  const R = D.regre; const P = R.pred[tk];
  const visibles = R.modelos.map((m: any, i: number) => ({ ...m, i })).filter((m: any) => (familia === "todos" || m.familia === familia) && !ocultos.includes(m.modelo));
  const datos = useMemo(() => {
    const h = R.hist.fechas.map((f: string, i: number) => ({ f, hist: R.hist[tk][i] }));
    const last = h[h.length - 1];
    Object.assign(last, { med: P.p0, banda: [P.p0, P.p0], cono: [P.p0, P.p0] });
    R.modelos.forEach((_: any, j: number) => ((last as any)["m" + j] = P.p0));
    const fc = R.fechas.map((f: string, i: number) => {
      const o: any = { f, med: P.med[i], banda: [P.p10[i], P.p90[i]], cono: [P.ci[i], P.cs[i]] };
      P.modelos.forEach((serie: number[], j: number) => (o["m" + j] = serie[i]));
      return o;
    });
    return [...h, ...fc];
  }, [tk]);
  const up = P.ret >= 0;
  const resumen = t(`La mediana de 18 modelos proyecta ${fmt.usd(P.med[29])} para ${tk} el ${fmt.fecha(R.fechas[29])} (${fmt.pct(P.ret, 2, true)} ${up ? "▲" : "▼"}). La banda p10–p90 de los modelos va de ${fmt.usd(P.p10[29])} a ${fmt.usd(P.p90[29])}, y por volatilidad el 80 % de los escenarios cae entre ${fmt.usd(P.ci[29])} y ${fmt.usd(P.cs[29])}.`,
    `The median of 18 models projects ${fmt.usd(P.med[29])} for ${tk} on ${fmt.fecha(R.fechas[29])} (${fmt.pct(P.ret, 2, true)} ${up ? "▲" : "▼"}). The models' p10–p90 band spans ${fmt.usd(P.p10[29])}–${fmt.usd(P.p90[29])}; by volatility, 80 % of scenarios fall between ${fmt.usd(P.ci[29])} and ${fmt.usd(P.cs[29])}.`);
  return (
    <div className="space-y-3">
      <Titulo h1={t("Regresión de precios a 30 sesiones", "30-session price regression")} />
      <Aviso profesor={t("Datos sintéticos · pronóstico simulado, no es asesoría de inversión", "Synthetic data · simulated forecast, not investment advice")} />
      <FichaIA
        queHace={t("Proyecta 30 precios diarios con 18 regresores y resume su mediana y su dispersión.", "Projects 30 daily prices with 18 regressors and summarizes their median and spread.")}
        queTanBien={t("MAPE a 30 sesiones de 3 % a 5 % y R² de retornos cercano a 0: mejoran poco a «mañana igual que hoy» (persistencia).", "30-session MAPE of 3–5 % and returns R² near 0: little better than “tomorrow equals today” (persistence).")}
        porQue={t("La línea gruesa es la mediana de los modelos visibles; la banda muestra cuánto discrepan; el cono muestra la volatilidad histórica.", "The thick line is the median of visible models; the band shows disagreement; the cone shows historical volatility.")}
        controlas={t("Activo, familia, modelos visibles, banda y cono.", "Asset, family, visible models, band and cone.")}
        ignorar={t("Desmarca los modelos que no quieras ver; una línea sin banda comunicaría una certeza que no existe.", "Uncheck models you don't want; a line without a band would convey false certainty.")}
      />
      <nav aria-label={t("Migas de pan", "Breadcrumb")} className="text-sm"><button type="button" className="underline text-ac" onClick={() => ir("clasificacion", tk)}><ArrowLeft size={14} className="inline" aria-hidden /> {t("Clasificación", "Classification")}</button> › {tk} › {t("Regresión", "Regression")}</nav>
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm font-semibold">{t("Activo", "Asset")}<br /><select value={tk} onChange={(e) => setTk(e.target.value)} className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 font-normal">{TK.map((x) => <option key={x}>{x}</option>)}</select></label>
          <div><div className="text-sm font-semibold">{t("Familia", "Family")}</div><Segmentado etiqueta={t("Familia", "Family")} valor={familia} onCambio={setFamilia} opciones={[["todos", t("Todos", "All")], ["ML", t("Solo ML", "ML only")], ["DL", t("Solo DL", "DL only")]]} /></div>
          <Interruptor etiqueta={t("Banda p10–p90", "p10–p90 band")} activo={banda} onCambio={setBanda} />
          <Interruptor etiqueta={t("Cono de volatilidad (80 %)", "Volatility cone (80 %)")} activo={cono} onCambio={setCono} />
          <span className={`ml-auto text-lg font-bold border-2 rounded-full px-3 py-1 ${up ? "text-up border-up" : "text-dn border-dn"}`}>{fmt.pct(P.ret, 2, true)} {up ? "▲" : "▼"} <span className="text-sm font-normal text-fg">{t("en 30 sesiones", "in 30 sessions")}</span></span>
        </div>
        <details className="mt-2"><summary className="cursor-pointer min-h-11 flex items-center font-semibold">{t(`Modelos visibles (${visibles.length} de 18)`, `Visible models (${visibles.length} of 18)`)}</summary>
          <div className="grid gap-x-4 [grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))]">{R.modelos.map((m: any) => (
            <label key={m.modelo} className="inline-flex items-center gap-2 min-h-9 text-sm"><input type="checkbox" className="w-5 h-5" checked={!ocultos.includes(m.modelo)} onChange={(e) => setOcultos(e.target.checked ? ocultos.filter((x) => x !== m.modelo) : [...ocultos, m.modelo])} />{m.modelo} <span className="text-mut">({m.familia})</span></label>))}</div>
        </details>
      </Card>
      <Grafico titulo={t(`${tk}: 60 sesiones de historia + 30 proyectadas`, `${tk}: 60 sessions of history + 30 projected`)} resumen={resumen} alto={360}
        grafico={
          <ResponsiveContainer>
            <ComposedChart data={datos} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid stroke={colores.rejilla} vertical={false} />
              <XAxis dataKey="f" tick={{ fill: colores.ejes, fontSize: 11 }} tickFormatter={(f) => fmt.fecha(f).slice(0, 6)} minTickGap={28} />
              <YAxis domain={["auto", "auto"]} tick={{ fill: colores.ejes, fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: any) => (Array.isArray(v) ? `${fmt.n(v[0])} – ${fmt.n(v[1])}` : fmt.n(Number(v)))} labelFormatter={(f) => fmt.fecha(String(f))} />
              {cono && <Area dataKey="cono" name={t("Cono 80 %", "80 % cone")} stroke={colores.ejes} strokeDasharray="5 4" fill="none" isAnimationActive={false} />}
              {banda && <Area dataKey="banda" name="p10–p90" stroke="none" fill={colores.serie[0]} fillOpacity={0.18} isAnimationActive={false} />}
              {visibles.map((m: any) => <Line key={m.modelo} dataKey={"m" + m.i} name={m.modelo} dot={false} stroke={m.familia === "ML" ? colores.serie[4] : colores.serie[3]} strokeOpacity={0.45} strokeWidth={1} isAnimationActive={false} />)}
              <Line dataKey="hist" name={t("Historia", "History")} dot={false} stroke={colores.texto} strokeWidth={2} isAnimationActive={false} />
              <Line dataKey="med" name={t("Mediana del ensamble", "Ensemble median")} dot={{ r: 2 }} stroke={colores.serie[0]} strokeWidth={3.5} isAnimationActive={false} />
              <ReferenceLine x={D.fechaCorte} stroke={colores.ac} strokeDasharray="3 3" label={{ value: t("Corte", "Cutoff"), fill: colores.texto, fontSize: 11, position: "insideTopLeft" }} />
            </ComposedChart>
          </ResponsiveContainer>
        }
        tabla={<table className="w-full text-sm border-collapse"><caption className="sr-only">{t("30 precios proyectados", "30 projected prices")}</caption><thead><tr>{[t("Fecha", "Date"), t("Mediana", "Median"), "p10", "p90", t("Cono inf.", "Cone low"), t("Cono sup.", "Cone high")].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
          <tbody>{R.fechas.map((f: string, i: number) => <tr key={f}><th scope="row" className={td + " text-left font-normal"}>{fmt.fecha(f)}</th><td className={td + " font-semibold"}>{fmt.n(P.med[i])}</td><td className={td}>{fmt.n(P.p10[i])}</td><td className={td}>{fmt.n(P.p90[i])}</td><td className={td}>{fmt.n(P.ci[i])}</td><td className={td}>{fmt.n(P.cs[i])}</td></tr>)}</tbody></table>}
      />
      <Card titulo={t("Métricas por modelo", "Per-model metrics")}>
        <div className="overflow-auto border border-bd rounded-[8px]" tabIndex={0} role="region" aria-label={t("Métricas de regresión", "Regression metrics")}>
          <table className="w-full text-sm border-collapse"><thead><tr>{[t("Modelo", "Model"), t("Familia", "Family"), "MAPE 30 d", "MAE", "RMSE", t("R² retornos", "Returns R²"), t("Mejora vs persistencia", "Gain vs persistence")].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>{R.modelos.map((m: any) => <tr key={m.modelo}><th scope="row" className={td + " text-left"}>{m.modelo}</th><td className={td}>{m.familia}</td><td className={td}>{fmt.n(m.mape_30d_pct)} %</td><td className={td}>{fmt.n(m.mae_relativo_pct)} %</td><td className={td}>{fmt.n(m.rmse_relativo_pct)} %</td><td className={td}>{fmt.n(m.r2_retornos_30d, 3)}</td><td className={td}>{fmt.pct(m.mejora_vs_persistencia_pct, 1, true)}</td></tr>)}</tbody></table>
        </div>
        <button type="button" onClick={() => ir("optimizador", tk)} className="mt-3 bg-ac text-on-ac rounded-[8px] min-h-11 px-4 inline-flex items-center gap-2">{t(`Ver ${tk} en el optimizador`, `See ${tk} in the optimizer`)} <ArrowRight size={16} aria-hidden /></button>
      </Card>
    </div>
  );
}
