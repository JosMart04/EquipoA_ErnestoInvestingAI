import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { BriefcaseBusiness, Shield, Scale, Rocket, X } from "lucide-react";
import { D } from "../data/muestra";
import { GRUPO, useApp } from "../lib/ctx";
import { Aviso, Card, FichaIA, Titulo, td, th } from "../components/ui";

const ICONO: Record<string, any> = { Conservador: Shield, Moderado: Scale, Agresivo: Rocket };
const NOMBRE: Record<string, [string, string]> = { Conservador: ["Conservador", "Conservative"], Moderado: ["Moderado", "Moderate"], Agresivo: ["Agresivo", "Aggressive"] };

export function Portafolios() {
  const { t, fmt, colores, idioma, ir } = useApp();
  const niveles = D.port.niveles;
  const [elegido, setElegido] = useState("Moderado");
  const [excluidos, setExcluidos] = useState<string[]>([]);
  const [dialogo, setDialogo] = useState(false);
  const n = niveles.find((x: any) => x.nivel === elegido);
  const det = n.detalle_activos.filter((d: any) => !excluidos.includes(d.ticker));
  const tot = det.reduce((a: number, d: any) => a + d.peso_pct, 0);
  const pal = [...colores.serie, colores.ac, colores.up, colores.ejes, colores.dn, "#8c6bb1"];
  return (
    <div className="space-y-3">
      <Titulo h1={t("Portafolios en 3 niveles de riesgo", "Portfolios at 3 risk levels")} sub={t(`Tomados del frente NSGA-II · ${fmt.fecha(D.port.fecha)}`, `Taken from the NSGA-II front · ${fmt.fecha(D.port.fecha)}`)} />
      <Aviso profesor={t("Datos sintéticos · resultados simulados · no es asesoría de inversión", "Synthetic data · simulated results · not investment advice")} />
      <FichaIA
        queHace={t("Propone 3 carteras del frente NSGA-II: menor volatilidad, máximo Sharpe y mayor retorno proyectado.", "Proposes 3 NSGA-II portfolios: lowest volatility, max Sharpe and highest projected return.")}
        queTanBien={t("Sus métricas son esperadas; el backtesting muestra que en estos datos no superaron al mercado.", "Metrics are expected values; backtesting shows they did not beat the market on this data.")}
        porQue={t("Cada activo trae su razón: votos de los clasificadores y proyección de la regresión.", "Each asset carries its reason: classifier votes and regression projection.")}
        controlas={t("Eliges el nivel de riesgo y puedes excluir activos.", "You pick the risk level and can exclude assets.")}
        ignorar={t("Excluye cualquier activo o no lleves la cartera a Trading.", "Exclude any asset or don't send the portfolio to Trading.")}
      />
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(17rem,1fr))]">
        {niveles.map((x: any) => {
          const Ic = ICONO[x.nivel]; const sel = x.nivel === elegido;
          const datos = Object.entries(x.pesos as Record<string, number>).map(([k, v]) => ({ k, v: v * 100 }));
          return (
            <section key={x.nivel} aria-label={NOMBRE[x.nivel][idioma === "es-PE" ? 0 : 1]} className={`bg-panel rounded-[12px] p-4 border ${sel ? "border-ac border-2" : "border-bd"}`}>
              <h2 className="text-xl font-bold m-0 inline-flex items-center gap-2"><Ic aria-hidden className="text-ac" /> {NOMBRE[x.nivel][idioma === "es-PE" ? 0 : 1]}</h2>
              <p className="text-sm text-mut my-1">{x.descripcion} <span className="block">{x.origen} · {x.restricciones}</span></p>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm m-0">
                <dt className="text-mut">{t("Retorno esperado", "Expected return")}</dt><dd className="m-0 font-bold">{fmt.n(x.retorno_esperado_anual_pct)} %</dd>
                <dt className="text-mut">{t("Volatilidad", "Volatility")}</dt><dd className="m-0 font-bold">{fmt.n(x.volatilidad_anual_pct)} %</dd>
                <dt className="text-mut">Sharpe</dt><dd className="m-0 font-bold">{fmt.n(x.sharpe, 3)}</dd>
                <dt className="text-mut">CVaR 95 %</dt><dd className="m-0 font-bold">{fmt.n(x.cvar95_diario_pct)} %</dd>
              </dl>
              <p className="text-xs text-mut my-1">{t(`En el 5 % de los peores días perderías en promedio ${fmt.n(x.cvar95_diario_pct)} %.`, `In the worst 5 % of days you'd lose ${fmt.n(x.cvar95_diario_pct)} % on average.`)}</p>
              <div style={{ height: 170 }} role="img" aria-label={t(`Dona de pesos: ${datos.map((d) => `${d.k} ${fmt.n(d.v, 1)} %`).join(", ")}`, `Weights donut: ${datos.map((d) => `${d.k} ${fmt.n(d.v, 1)} %`).join(", ")}`)}>
                <ResponsiveContainer><PieChart><Pie data={datos} dataKey="v" nameKey="k" innerRadius={42} outerRadius={70} paddingAngle={1} isAnimationActive={false} label={({ k, v }: any) => (v >= 8 ? k : "")} labelLine={false}>{datos.map((_, i) => <Cell key={i} fill={pal[i % pal.length]} stroke="var(--panel)" />)}</Pie><Tooltip formatter={(v: any) => `${fmt.n(Number(v), 1)} %`} /></PieChart></ResponsiveContainer>
              </div>
              <table className="w-full text-xs border-collapse"><caption className="sr-only">{t("Pesos", "Weights")}</caption><tbody>{datos.sort((a, b) => b.v - a.v).map((d, i) => <tr key={d.k}><th scope="row" className="text-left py-0.5 font-normal"><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: pal[i % pal.length] }} aria-hidden />{d.k}</th><td className="text-right">{fmt.n(d.v, 1)} %</td></tr>)}</tbody></table>
              <button type="button" aria-pressed={sel} onClick={() => { setElegido(x.nivel); setExcluidos([]); }} className={`mt-3 w-full rounded-[8px] min-h-11 font-semibold ${sel ? "bg-ac text-on-ac" : "border border-ac text-ac"}`}>{sel ? t("✔ Nivel elegido", "✔ Selected level") : t("Elegir este nivel", "Choose this level")}</button>
            </section>);
        })}
      </div>
      <Card titulo={t(`Por qué entró cada activo · ${NOMBRE[elegido][idioma === "es-PE" ? 0 : 1]}`, `Why each asset is in · ${NOMBRE[elegido][1]}`)}>
        <div className="overflow-auto border border-bd rounded-[8px]" tabIndex={0} role="region" aria-label={t("Razones por activo", "Per-asset reasons")}>
          <table className="w-full text-sm border-collapse"><thead><tr>{["Ticker", t("Grupo", "Group"), t("Peso", "Weight"), t("Peso sin excluidos", "Weight w/o excluded"), t("Razón", "Reason"), t("Excluir", "Exclude")].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>{n.detalle_activos.map((d: any) => { const ex = excluidos.includes(d.ticker); return (
              <tr key={d.ticker} className={ex ? "opacity-60 line-through" : ""}><th scope="row" className={td + " text-left"}>{d.ticker}</th><td className={td}>{GRUPO[d.grupo][idioma === "es-PE" ? 0 : 1]}</td><td className={td}>{fmt.n(d.peso_pct, 1)} %</td><td className={td}>{ex ? "—" : `${fmt.n((d.peso_pct / tot) * 100, 1)} %`}</td><td className={td}>{d.razon}</td>
                <td className={td}><input type="checkbox" className="w-5 h-5" aria-label={t(`Excluir ${d.ticker}`, `Exclude ${d.ticker}`)} checked={ex} onChange={(e) => setExcluidos(e.target.checked ? [...excluidos, d.ticker] : excluidos.filter((k) => k !== d.ticker))} /></td></tr>); })}</tbody></table>
        </div>
        <p className="text-xs text-mut">{t("La tabla lista los activos con peso ≥ 1 %; la dona incluye también los pesos menores.", "The table lists assets weighing ≥ 1 %; the donut also includes smaller weights.")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDialogo(true)} className="bg-ac text-on-ac rounded-[8px] min-h-11 px-4 inline-flex items-center gap-2"><BriefcaseBusiness size={16} aria-hidden /> {t("Llevar a Trading", "Send to Trading")}</button>
          <button type="button" onClick={() => ir("backtesting")} className="border border-bd rounded-[8px] min-h-11 px-4">{t("Ver su backtesting", "See its backtest")}</button>
        </div>
      </Card>
      {dialogo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-3 overflow-auto" onClick={() => setDialogo(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="t-llevar" className="bg-panel border border-bd rounded-[12px] w-full max-w-lg p-4 mt-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center"><h2 id="t-llevar" className="text-lg font-bold m-0">{t(`Llevar ${NOMBRE[elegido][0]} a Trading`, `Send ${NOMBRE[elegido][1]} to Trading`)}</h2><button type="button" onClick={() => setDialogo(false)} className="border border-bd rounded-[8px] min-h-11 min-w-11 inline-flex items-center justify-center" aria-label={t("Cerrar", "Close")}><X size={16} aria-hidden /></button></div>
            <label className="block text-sm font-semibold mt-2" htmlFor="monto">{t("Monto a invertir (US$)", "Amount to invest (US$)")}</label>
            <input id="monto" type="number" defaultValue={D.wl.portafolio_demo.efectivo} className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 w-full" aria-describedby="ayuda-monto" />
            <p id="ayuda-monto" className="text-xs text-mut">{t("Por defecto, todo tu efectivo disponible. Se compran cantidades enteras al último precio.", "Defaults to all your available cash. Whole quantities at the last price.")}</p>
            <table className="w-full text-sm border-collapse mt-2"><thead><tr>{["Ticker", t("Peso", "Weight"), t("Cantidad", "Qty"), t("Costo", "Cost")].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
              <tbody>{det.map((d: any) => { const px = D.universo.find((u: any) => u.ticker === d.ticker).ultimo; const q = Math.floor((D.wl.portafolio_demo.efectivo * d.peso_pct) / tot / px); return <tr key={d.ticker}><th scope="row" className={td + " text-left"}>{d.ticker}</th><td className={td}>{fmt.n((d.peso_pct / tot) * 100, 1)} %</td><td className={td}>{q}</td><td className={td}>{fmt.usd(q * px)}</td></tr>; })}</tbody></table>
            <div className="flex gap-2 mt-3"><button type="button" className="flex-1 bg-ac text-on-ac rounded-[8px] min-h-11 font-semibold" onClick={() => { setDialogo(false); ir("trading"); }}>{t("Confirmar órdenes", "Confirm orders")}</button><button type="button" className="flex-1 border border-bd rounded-[8px] min-h-11" onClick={() => setDialogo(false)}>{t("Cancelar", "Cancel")}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
