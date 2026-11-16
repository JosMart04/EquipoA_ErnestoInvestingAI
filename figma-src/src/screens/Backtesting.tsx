import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpDown, Lightbulb } from "lucide-react";
import { D } from "../data/muestra";
import { useApp } from "../lib/ctx";
import { Aviso, Card, FichaIA, Grafico, Interruptor, Titulo, td, th } from "../components/ui";

const CARTERAS = ["Conservador", "Moderado", "Agresivo"];
const REFS = ["SPY", "QQQ", "EPU", "Igual ponderado (1/N)"];
const DASH = ["", "8 4", "2 3 8 3", "4 4", "1 4", "6 2", "10 3 2 3"];
const METR: [string, string, string][] = [["retorno_total_pct", "Retorno total", "Total return"], ["cagr_pct", "CAGR", "CAGR"], ["volatilidad_anual_pct", "Volatilidad", "Volatility"], ["sharpe", "Sharpe", "Sharpe"], ["max_drawdown_pct", "Máx. drawdown", "Max drawdown"], ["calmar", "Calmar", "Calmar"], ["meses_positivos_pct", "% meses +", "% positive months"]];

export function Backtesting() {
  const { t, fmt, colores } = useApp();
  const B = D.bt;
  const todas = [...CARTERAS, ...REFS];
  const [vis, setVis] = useState<string[]>(todas);
  const [orden, setOrden] = useState({ k: "retorno_total_pct", asc: false });
  const [reb, setReb] = useState(0);
  const m = (k: string) => (B.carteras[k] || B.refs[k]).m;
  const datos = B.fechas.map((f: string, i: number) => { const o: any = { f }; todas.forEach((k) => (o[k] = (B.carteras[k] || B.refs[k]).curva[i])); CARTERAS.forEach((k) => (o["dd_" + k] = B.carteras[k].dd[i])); return o; });
  const filas = useMemo(() => [...todas].sort((a, b) => (orden.asc ? 1 : -1) * (m(a)[orden.k] - m(b)[orden.k])), [orden]);
  const spy = m("SPY");
  // Interpretación generada por reglas a partir de las métricas (nunca texto fijo)
  const interp = CARTERAS.map((k) => {
    const x = m(k); const gana = x.retorno_total_pct > spy.retorno_total_pct; const turn = B.carteras[k].turn;
    const causas: string[] = [];
    if (!gana) causas.push(t("poca persistencia en los datos: lo que subió en los últimos 63 días no siguió subiendo", "little persistence in the data: what rose over the last 63 days did not keep rising"));
    if (turn > 1) causas.push(t(`rotación alta (turnover medio ${fmt.n(turn)}), que suma comisiones`, `high turnover (mean ${fmt.n(turn)}), which adds commissions`));
    if (x.max_drawdown_pct < spy.max_drawdown_pct) causas.push(t("caídas más profundas que el mercado", "deeper drawdowns than the market"));
    return t(`${k}: ${fmt.pct(x.retorno_total_pct, 2, true)} frente a ${fmt.pct(spy.retorno_total_pct, 2, true)} de SPY → ${gana ? "superó" : "no superó"} al mercado (Sharpe ${fmt.n(x.sharpe)} vs ${fmt.n(spy.sharpe)}; máx. drawdown ${fmt.pct(x.max_drawdown_pct)}; ${fmt.n(x.meses_positivos_pct, 1)} % de meses positivos).${causas.length ? " Podría deberse a " + causas.join("; ") + "." : ""}`,
      `${k}: ${fmt.pct(x.retorno_total_pct, 2, true)} vs ${fmt.pct(spy.retorno_total_pct, 2, true)} for SPY → ${gana ? "beat" : "did not beat"} the market (Sharpe ${fmt.n(x.sharpe)} vs ${fmt.n(spy.sharpe)}; max drawdown ${fmt.pct(x.max_drawdown_pct)}; ${fmt.n(x.meses_positivos_pct, 1)} % positive months).${causas.length ? " Possible reasons: " + causas.join("; ") + "." : ""}`);
  });
  const r = B.carteras.Moderado.reb[reb];
  return (
    <div className="space-y-3">
      <Titulo h1={t("Backtesting de portafolios", "Portfolio backtesting")} sub={B.metodo} />
      <Aviso profesor={t("Backtesting sobre historia sintética · el desempeño pasado no garantiza resultados futuros", "Backtest on synthetic history · past performance does not guarantee future results")} />
      <FichaIA
        queHace={t("Simula cómo habrían rendido las 3 carteras en 252 sesiones, rebalanceando cada mes sin mirar el futuro.", "Simulates how the 3 portfolios would have performed over 252 sessions, rebalancing monthly without looking ahead.")}
        queTanBien={t(`Resultado tal como salió: ninguna cartera superó a SPY (${fmt.pct(spy.retorno_total_pct, 2, true)}).`, `Result as it came out: no portfolio beat SPY (${fmt.pct(spy.retorno_total_pct, 2, true)}).`)}
        porQue={t("La interpretación de abajo se genera a partir de las métricas.", "The interpretation below is generated from the metrics.")}
        controlas={t("Series visibles y fecha de rebalanceo a inspeccionar.", "Visible series and rebalance date to inspect.")}
        ignorar={t("Úsalo como evidencia histórica, no como predicción.", "Use it as historical evidence, not as a prediction.")}
      />
      <Card><div className="flex flex-wrap gap-x-4">{todas.map((k, i) => <Interruptor key={k} etiqueta={`${i < 3 ? "━" : "┄"} ${k}`} activo={vis.includes(k)} onCambio={(v) => setVis(v ? [...vis, k] : vis.filter((x) => x !== k))} />)}</div></Card>
      <Grafico titulo={t("Curvas de capital (base 100)", "Equity curves (base 100)")} alto={340}
        resumen={t(`En ${B.fechas.length} puntos: ${todas.map((k) => `${k} ${fmt.n((B.carteras[k] || B.refs[k]).curva.at(-1), 1)}`).join("; ")}.`, `Final values: ${todas.map((k) => `${k} ${fmt.n((B.carteras[k] || B.refs[k]).curva.at(-1), 1)}`).join("; ")}.`)}
        grafico={<ResponsiveContainer><LineChart data={datos} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}><CartesianGrid stroke={colores.rejilla} vertical={false} /><XAxis dataKey="f" tick={{ fill: colores.ejes, fontSize: 11 }} tickFormatter={(f) => fmt.fecha(f).slice(0, 6)} minTickGap={30} /><YAxis domain={["auto", "auto"]} tick={{ fill: colores.ejes, fontSize: 11 }} width={48} /><Tooltip labelFormatter={(f) => fmt.fecha(String(f))} formatter={(v: any) => fmt.n(Number(v), 1)} /><ReferenceLine y={100} stroke={colores.ejes} />
          {todas.filter((k) => vis.includes(k)).map((k) => { const i = todas.indexOf(k); return <Line key={k} dataKey={k} dot={false} stroke={colores.serie[i % 6]} strokeWidth={i < 3 ? 2.6 : 1.6} strokeDasharray={DASH[i]} isAnimationActive={false} />; })}</LineChart></ResponsiveContainer>}
        tabla={<table className="w-full text-sm border-collapse"><thead><tr><th scope="col" className={th}>{t("Fecha", "Date")}</th>{todas.map((k) => <th key={k} scope="col" className={th}>{k}</th>)}</tr></thead><tbody>{datos.filter((_: any, i: number) => i % 7 === 0).map((d: any) => <tr key={d.f}><th scope="row" className={td + " text-left font-normal"}>{fmt.fecha(d.f)}</th>{todas.map((k) => <td key={k} className={td}>{fmt.n(d[k], 1)}</td>)}</tr>)}</tbody></table>}
      />
      <Grafico titulo={t("Drawdown de las carteras (%)", "Portfolio drawdown (%)")} alto={200}
        resumen={t(`Máximo drawdown: ${CARTERAS.map((k) => `${k} ${fmt.pct(m(k).max_drawdown_pct)}`).join("; ")}.`, `Max drawdown: ${CARTERAS.map((k) => `${k} ${fmt.pct(m(k).max_drawdown_pct)}`).join("; ")}.`)}
        grafico={<ResponsiveContainer><AreaChart data={datos} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}><CartesianGrid stroke={colores.rejilla} vertical={false} /><XAxis dataKey="f" tick={{ fill: colores.ejes, fontSize: 11 }} tickFormatter={(f) => fmt.fecha(f).slice(0, 6)} minTickGap={30} /><YAxis tick={{ fill: colores.ejes, fontSize: 11 }} width={48} /><Tooltip formatter={(v: any) => `${fmt.n(Number(v), 1)} %`} />{CARTERAS.map((k, i) => <Area key={k} dataKey={"dd_" + k} name={k} stroke={colores.serie[i]} strokeDasharray={DASH[i]} fill={colores.serie[i]} fillOpacity={0.12} isAnimationActive={false} />)}</AreaChart></ResponsiveContainer>}
        tabla={<p className="p-2">{t("Ver la columna «Máx. drawdown» de la tabla de métricas.", "See the “Max drawdown” column of the metrics table.")}</p>}
      />
      <Card titulo={t("Métricas", "Metrics")}>
        <div className="overflow-auto border border-bd rounded-[8px]" tabIndex={0} role="region" aria-label={t("Tabla de métricas", "Metrics table")}>
          <table className="w-full text-sm border-collapse"><thead><tr><th scope="col" className={th}>{t("Serie", "Series")}</th>{METR.map(([k, es, en]) => <th key={k} scope="col" className={th} aria-sort={orden.k === k ? (orden.asc ? "ascending" : "descending") : "none"}><button type="button" className="inline-flex items-center gap-1 font-semibold min-h-8" onClick={() => setOrden({ k, asc: orden.k === k ? !orden.asc : false })}>{t(es, en)} <ArrowUpDown size={13} aria-hidden /></button></th>)}</tr></thead>
            <tbody>{filas.map((k) => <tr key={k} className={CARTERAS.includes(k) ? "font-semibold" : ""}><th scope="row" className={td + " text-left"}>{k}</th>{METR.map(([mk]) => <td key={mk} className={td}>{mk.endsWith("pct") ? `${fmt.n(m(k)[mk], 2)} %` : fmt.n(m(k)[mk], 3)}</td>)}</tr>)}</tbody></table>
        </div>
      </Card>
      <Card titulo={t("Línea de tiempo de rebalanceos · Moderado", "Rebalance timeline · Moderate")}>
        <ol className="flex flex-wrap gap-1 list-none p-0 m-0" aria-label={t("Fechas de rebalanceo", "Rebalance dates")}>{B.carteras.Moderado.reb.map((x: any, i: number) => <li key={x.fecha}><button type="button" aria-pressed={reb === i} onClick={() => setReb(i)} className={`rounded-[8px] border min-h-11 px-2 text-sm ${reb === i ? "bg-ac text-on-ac border-ac" : "border-bd"}`}>{fmt.fecha(x.fecha)}</button></li>)}</ol>
        <ul className="list-none p-0 mt-3 space-y-1 max-w-xl">{Object.entries(r.pesos as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([k, w]) => <li key={k} className="text-sm"><div className="flex justify-between"><span>{k}</span><span>{fmt.pct(w * 100, 1)}</span></div><div className="h-2.5 bg-hl rounded-full overflow-hidden" aria-hidden><div className="h-full bg-ac" style={{ width: `${w * 100 * 3}%` }} /></div></li>)}</ul>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold mt-0 inline-flex items-center gap-2"><Lightbulb aria-hidden /> {t("Interpretación (generada a partir de las métricas)", "Interpretation (generated from the metrics)")}</h2>
        <ul className="m-0 pl-4 space-y-2">{interp.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <p className="mb-0">{t("El desempeño pasado no garantiza resultados futuros. Este backtesting usa historia sintética.", "Past performance does not guarantee future results. This backtest uses synthetic history.")}</p>
      </Card>
    </div>
  );
}
