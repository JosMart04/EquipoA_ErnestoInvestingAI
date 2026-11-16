import { useState } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Cell } from "recharts";
import { BriefcaseBusiness, Cpu, ArrowLeft } from "lucide-react";
import { D } from "../data/muestra";
import { useApp } from "../lib/ctx";
import { Aviso, Card, FichaIA, Grafico, Interruptor, Segmentado, Senal, Titulo, td, th } from "../components/ui";

type Serie = "mk" | "n2" | "n3";

export function Optimizador() {
  const { t, fmt, colores, ticker, ir, modo } = useApp();
  const O = D.opt;
  const [universo, setUniverso] = useState<"eleg" | "todo">("eleg");
  const [ver, setVer] = useState<Record<Serie, boolean>>({ mk: true, n2: true, n3: true });
  const [act, setAct] = useState<{ s: Serie; i: number }>({ s: "n2", i: 12 });
  const [anuncio, setAnuncio] = useState("");
  const series: Record<Serie, any[]> = { mk: universo === "eleg" ? O.markowitz_elegibles : O.markowitz_universo_completo, n2: O.nsga2_elegibles, n3: O.nsga3_elegibles };
  const nombre: Record<Serie, string> = { mk: t(`Markowitz (${universo === "eleg" ? "elegibles" : "universo completo"})`, `Markowitz (${universo === "eleg" ? "eligible" : "full universe"})`), n2: "NSGA-II", n3: "NSGA-III" };
  const punto = series[act.s][Math.min(act.i, series[act.s].length - 1)];
  const cvars = O.nsga3_elegibles.map((p: any) => p.cvar95_diario_pct); const cMin = Math.min(...cvars), cMax = Math.max(...cvars);
  const colorCvar = (c: number) => { const k = (c - cMin) / (cMax - cMin || 1); const a = [0, 158, 115], b = [213, 94, 0]; return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`; };
  const desc = (s: Serie, p: any) => `${nombre[s]} ${p.id || ""}: ${t("retorno", "return")} ${fmt.n(p.retorno_esperado_anual_pct, 1)} %, ${t("volatilidad", "volatility")} ${fmt.n(p.volatilidad_anual_pct, 1)} %, Sharpe ${fmt.n(p.sharpe, 2)}, CVaR ${fmt.n(p.cvar95_diario_pct, 2)} %`;
  const mover = (e: React.KeyboardEvent) => {
    const orden: Serie[] = (["mk", "n2", "n3"] as Serie[]).filter((s) => ver[s]);
    let { s, i } = act;
    if (e.key === "ArrowRight") i = Math.min(i + 1, series[s].length - 1);
    else if (e.key === "ArrowLeft") i = Math.max(i - 1, 0);
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { const k = orden.indexOf(s); s = orden[(k + (e.key === "ArrowDown" ? 1 : orden.length - 1)) % orden.length]; i = Math.min(i, series[s].length - 1); }
    else if (e.key !== "Enter") return;
    e.preventDefault(); setAct({ s, i }); setAnuncio(desc(s, series[s][i]));
  };
  const pesos = Object.entries(punto.pesos as Record<string, number>).sort((a, b) => b[1] - a[1]);
  const suma = pesos.reduce((a, [, w]) => a + w, 0); const maxw = Math.max(...pesos.map(([, w]) => w));
  const elegible = ticker ? O.elegibles.includes(ticker) : null;
  const pc = ticker ? D.clasif.pred[ticker] : null;
  return (
    <div className="space-y-3">
      <Titulo h1={t("Optimizador: Markowitz, NSGA-II y NSGA-III", "Optimizer: Markowitz, NSGA-II and NSGA-III")} />
      <Aviso profesor={t("NSGA-II y NSGA-III simulados: no se ejecutó ningún algoritmo evolutivo · datos sintéticos", "NSGA-II and NSGA-III simulated: no evolutionary algorithm was run · synthetic data")} />
      <FichaIA
        queHace={t("Busca carteras con el mejor equilibrio entre retorno y riesgo entre los activos elegibles (consenso SUBE y proyección positiva), con un tope de 25 % por activo y tasa libre de riesgo de 4 %.", "Finds portfolios with the best return/risk balance among eligible assets (UP consensus and positive projection), 25 % cap per asset, 4 % risk-free rate.")}
        queTanBien={t("Las cifras son esperanzas, no promesas: dependen de proyecciones que aciertan poco (ver Clasificación y Regresión).", "Figures are expectations, not promises: they rely on weak projections (see Classification and Regression).")}
        porQue={t("Markowitz resuelve el óptimo exacto; NSGA-II (2 objetivos) y NSGA-III (3 objetivos, con CVaR) son heurísticas evolutivas y quedan algo por debajo.", "Markowitz solves the exact optimum; NSGA-II (2 objectives) and NSGA-III (3 objectives, with CVaR) are evolutionary heuristics and land slightly below.")}
        controlas={t("Series visibles, universo completo o solo elegibles, y el punto que eliges.", "Visible series, full universe or eligible only, and the point you pick.")}
        ignorar={t("Ninguna cartera se aplica sola: tú decides si la llevas a Trading.", "No portfolio is applied automatically: you decide whether to take it to Trading.")}
      />
      {ticker && pc && (
        <div className="bg-hl border border-ac rounded-[12px] p-3 text-sm"><button type="button" className="underline text-ac mr-2" onClick={() => ir("regresion", ticker)}><ArrowLeft size={14} className="inline" aria-hidden /> {t("Regresión", "Regression")}</button>
          <strong>{ticker}</strong> {elegible ? t(`es elegible: ${pc.vs}/18 clasificadores dicen SUBE y su proyección es positiva.`, `is eligible: ${pc.vs}/18 classifiers say UP and its projection is positive.`) : t(`no es elegible: su consenso es ${pc.c} (${pc.vs}/18 SUBE) o su proyección no es positiva.`, `is not eligible: consensus is ${pc.c} (${pc.vs}/18 UP) or its projection is not positive.`)} <Senal s={pc.c} chico /></div>
      )}
      {modo === "real" && (
        <Card><div className="flex flex-wrap gap-3 items-end">
          <span className="text-sm font-semibold">{t("Ventana de estimación", "Estimation window")}<br /><input type="date" aria-label={t("Desde", "From")} defaultValue="2025-11-17" className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 font-normal" /> – <input type="date" aria-label={t("Hasta", "To")} defaultValue="2026-11-16" className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 font-normal" /></span>
          <button type="button" className="bg-ac text-on-ac rounded-[8px] min-h-11 px-4 inline-flex items-center gap-2"><Cpu size={16} aria-hidden /> {t("Recalcular en mi navegador", "Recompute in my browser")}</button>
          <div className="min-w-56 flex-1"><div className="text-sm">{t("NSGA-III · generación 96 de 150", "NSGA-III · generation 96 of 150")}</div><div role="progressbar" aria-valuenow={64} aria-valuemin={0} aria-valuemax={100} aria-label={t("Progreso del cálculo", "Computation progress")} className="h-3 rounded-full bg-hl border border-bd overflow-hidden"><div className="h-full bg-ac" style={{ width: "64%" }} /></div></div>
          <button type="button" className="border border-bd rounded-[8px] min-h-11 px-4">{t("Cancelar", "Cancel")}</button>
        </div></Card>
      )}
      <Card>
        <div className="flex flex-wrap gap-4 items-center">
          <Segmentado etiqueta={t("Universo de Markowitz", "Markowitz universe")} valor={universo} onCambio={setUniverso} opciones={[["eleg", t("Solo elegibles (12)", "Eligible only (12)")], ["todo", t("Universo completo (26)", "Full universe (26)")]]} />
          <Interruptor etiqueta={t("— Markowitz (línea)", "— Markowitz (line)")} activo={ver.mk} onCambio={(v) => setVer({ ...ver, mk: v })} />
          <Interruptor etiqueta={t("● NSGA-II (círculos)", "● NSGA-II (circles)")} activo={ver.n2} onCambio={(v) => setVer({ ...ver, n2: v })} />
          <Interruptor etiqueta={t("▲ NSGA-III (triángulos, color = CVaR)", "▲ NSGA-III (triangles, color = CVaR)")} activo={ver.n3} onCambio={(v) => setVer({ ...ver, n3: v })} />
        </div>
      </Card>
      <div className="grid gap-3 lg:grid-cols-[1fr_24rem]">
        <div tabIndex={0} onKeyDown={mover} aria-label={t("Gráfico riesgo–retorno. Flechas izquierda y derecha recorren los puntos; arriba y abajo cambian de serie; Enter selecciona.", "Risk–return chart. Left/right arrows move through points; up/down switch series; Enter selects.")} className="rounded-[12px]">
          <Grafico titulo={t("Riesgo (volatilidad anual, %) vs retorno esperado anual (%)", "Risk (annual volatility, %) vs expected annual return (%)")} alto={380}
            resumen={t(`Frontera de Markowitz con ${series.mk.length} puntos, frente NSGA-II con ${O.nsga2_elegibles.length} y frente NSGA-III con ${O.nsga3_elegibles.length}. Seleccionado: ${desc(act.s, punto)}.`, `Markowitz frontier with ${series.mk.length} points, NSGA-II front with ${O.nsga2_elegibles.length} and NSGA-III front with ${O.nsga3_elegibles.length}. Selected: ${desc(act.s, punto)}.`)}
            grafico={
              <ResponsiveContainer>
                <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 20 }}>
                  <CartesianGrid stroke={colores.rejilla} />
                  <XAxis type="number" dataKey="volatilidad_anual_pct" name={t("Volatilidad", "Volatility")} unit=" %" domain={["auto", "auto"]} tick={{ fill: colores.ejes, fontSize: 11 }} label={{ value: t("Volatilidad anual (%)", "Annual volatility (%)"), position: "insideBottom", offset: -12, fill: colores.ejes, fontSize: 12 }} />
                  <YAxis type="number" dataKey="retorno_esperado_anual_pct" name={t("Retorno", "Return")} unit=" %" domain={["auto", "auto"]} tick={{ fill: colores.ejes, fontSize: 11 }} width={58} />
                  <ZAxis range={[46, 46]} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  {ver.mk && <Scatter name="Markowitz" data={series.mk} line={{ stroke: colores.serie[0], strokeWidth: 2.5 }} fill={colores.serie[0]} shape="circle" isAnimationActive={false} onClick={(_, i) => setAct({ s: "mk", i })} />}
                  {ver.n2 && <Scatter name="NSGA-II" data={series.n2} fill={colores.serie[1]} shape="circle" isAnimationActive={false} onClick={(_, i) => setAct({ s: "n2", i })} />}
                  {ver.n3 && <Scatter name="NSGA-III" data={series.n3} shape="triangle" isAnimationActive={false} onClick={(_, i) => setAct({ s: "n3", i })}>{series.n3.map((p: any, i: number) => <Cell key={i} fill={colorCvar(p.cvar95_diario_pct)} />)}</Scatter>}
                  <Scatter name={t("Seleccionado", "Selected")} data={[punto]} shape="star" fill={colores.texto} isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
            }
            tabla={<table className="w-full text-sm border-collapse"><thead><tr>{[t("Serie", "Series"), "Id", t("Retorno", "Return"), t("Volatilidad", "Volatility"), "Sharpe", "CVaR 95 %", ""].map((h, i) => <th key={i} scope="col" className={th}>{h}</th>)}</tr></thead>
              <tbody>{(["mk", "n2", "n3"] as Serie[]).flatMap((s) => series[s].slice(0, s === "mk" ? 35 : 12).map((p: any, i: number) => (
                <tr key={s + i} className={act.s === s && act.i === i ? "bg-hl" : ""}><th scope="row" className={td + " text-left font-normal"}>{nombre[s]}</th><td className={td}>{p.id || i + 1}</td><td className={td}>{fmt.n(p.retorno_esperado_anual_pct, 2)} %</td><td className={td}>{fmt.n(p.volatilidad_anual_pct, 2)} %</td><td className={td}>{fmt.n(p.sharpe, 3)}</td><td className={td}>{fmt.n(p.cvar95_diario_pct, 2)} %</td><td className={td}><button type="button" className="underline text-ac min-h-8" onClick={() => setAct({ s, i })}>{t("Seleccionar", "Select")}</button></td></tr>)))}</tbody></table>}
          />
          <p aria-live="polite" className="sr-only">{anuncio}</p>
          <p className="text-xs text-mut mt-1">{t("CVaR 95 % de NSGA-III:", "NSGA-III CVaR 95 %:")} <span style={{ color: colorCvar(cMin) }}>▲</span> {fmt.n(cMin)} % ({t("menor pérdida", "lower loss")}) → <span style={{ color: colorCvar(cMax) }}>▲</span> {fmt.n(cMax)} % ({t("mayor pérdida", "higher loss")}). {t("El valor exacto está en la tabla y en la información emergente.", "Exact values are in the table and tooltip.")}</p>
        </div>
        <Card titulo={t("Composición del punto seleccionado", "Selected point composition")}>
          <p className="text-sm m-0 mb-2"><strong>{nombre[act.s]} {punto.id || `#${act.i + 1}`}</strong></p>
          <dl className="grid grid-cols-2 gap-1 text-sm m-0 mb-3">
            <dt className="text-mut">{t("Retorno esperado", "Expected return")}</dt><dd className="m-0 font-semibold">{fmt.n(punto.retorno_esperado_anual_pct)} %</dd>
            <dt className="text-mut">{t("Volatilidad", "Volatility")}</dt><dd className="m-0 font-semibold">{fmt.n(punto.volatilidad_anual_pct)} %</dd>
            <dt className="text-mut">Sharpe</dt><dd className="m-0 font-semibold">{fmt.n(punto.sharpe, 3)}</dd>
            <dt className="text-mut">CVaR 95 % {t("diario", "daily")}</dt><dd className="m-0 font-semibold">{fmt.n(punto.cvar95_diario_pct)} %</dd>
          </dl>
          <ul className="list-none p-0 m-0 space-y-1">{pesos.map(([k, w]) => (
            <li key={k} className="text-sm"><div className="flex justify-between"><span className={k === ticker ? "font-bold text-ac" : ""}>{k}</span><span>{fmt.pct(w * 100, 1)}</span></div>
              <div className="h-2.5 bg-hl rounded-full overflow-hidden" aria-hidden><div className="h-full bg-ac" style={{ width: `${(w / 0.25) * 100}%` }} /></div></li>))}</ul>
          <p className="text-sm mt-2 border border-bd rounded-[8px] px-2 py-1">✔ {t(`Suma de pesos ${fmt.pct(suma * 100, 1)} · peso máximo ${fmt.pct(maxw * 100, 1)} (tope 25 %)`, `Weights sum ${fmt.pct(suma * 100, 1)} · max weight ${fmt.pct(maxw * 100, 1)} (cap 25 %)`)}</p>
          <button type="button" className="w-full bg-ac text-on-ac rounded-[8px] min-h-11 inline-flex items-center justify-center gap-2" onClick={() => ir("trading")}><BriefcaseBusiness size={16} aria-hidden /> {t("Llevar a Trading", "Send to Trading")}</button>
        </Card>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card titulo={t("Activos elegibles", "Eligible assets")}>
          <p className="text-sm text-mut mt-0">{t("Criterio: consenso binario = SUBE y proyección mediana de los regresores a 30 sesiones > 0.", "Criterion: binary consensus = UP and median 30-session regressor projection > 0.")}</p>
          <ul className="flex flex-wrap gap-1 list-none p-0 m-0">{O.elegibles.map((x: string) => <li key={x} className={`border rounded-full px-2 text-sm ${x === ticker ? "border-ac border-2 font-bold" : "border-bd"}`}>{x} · {D.clasif.pred[x].vs}/18 ▲</li>)}</ul>
        </Card>
        <Card titulo={t("¿Qué optimiza cada método?", "What does each method optimize?")}>
          <ul className="text-sm m-0 pl-4 space-y-1">
            <li><strong>Markowitz</strong>: {t("mínima varianza para cada retorno objetivo; es el óptimo matemático exacto.", "minimum variance for each target return; the exact mathematical optimum.")}</li>
            <li><strong>NSGA-II</strong>: {t("algoritmo evolutivo con 2 objetivos (más retorno, menos volatilidad).", "evolutionary algorithm with 2 objectives (more return, less volatility).")}</li>
            <li><strong>NSGA-III</strong>: {t("agrega un 3.er objetivo, el CVaR 95 % (pérdida media en el 5 % de peores días), con puntos de referencia.", "adds a 3rd objective, CVaR 95 % (average loss in the worst 5 % of days), with reference points.")}</li>
            <li>{t("Los frentes NSGA quedan algo por debajo porque son búsquedas aproximadas con generaciones finitas; Markowitz resuelve el problema exacto.", "NSGA fronts sit slightly below because they are approximate searches with finite generations; Markowitz solves the exact problem.")}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
