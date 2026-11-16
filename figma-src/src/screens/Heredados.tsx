import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { Star, Trash2, BellRing, Bell, Trophy, BriefcaseBusiness } from "lucide-react";
import { D } from "../data/muestra";
import { GRUPO, useApp } from "../lib/ctx";
import { Aviso, Card, Grafico, Segmentado, Titulo, Variacion, td, th } from "../components/ui";

const TICKERS_VELAS = ["AAPL", "NVDA", "EPU"];

function Vela(props: any) {
  const { x, y, width, height, payload, up, dn } = props;
  const [l, h] = payload.rango;
  const k = height / Math.max(h - l, 1e-9);
  const top = y + (h - Math.max(payload.o, payload.c)) * k;
  const bot = y + (h - Math.min(payload.o, payload.c)) * k;
  const color = payload.c >= payload.o ? up : dn;
  const cx = x + width / 2;
  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1.2} />
      <rect x={x + width * 0.15} y={top} width={width * 0.7} height={Math.max(bot - top, 1)} fill={payload.c >= payload.o ? color : "none"} stroke={color} strokeWidth={1.2} />
    </g>
  );
}

export function Dashboard() {
  const { t, fmt, colores, idioma, ir } = useApp();
  const [tk, setTk] = useState("NVDA");
  const [grupo, setGrupo] = useState("");
  const [rango, setRango] = useState<"1M" | "3M" | "6M" | "1A" | "Máx">("3M");
  const s = D.velas.series[tk];
  const datos = D.velas.fechas.map((f: string, i: number) => ({ f, o: s.o[i], h: s.h[i], l: s.l[i], c: s.c[i], rango: [s.l[i], s.h[i]] })).slice(rango === "1M" ? -21 : 0);
  const filas = D.universo.filter((d: any) => !grupo || d.grupo === grupo);
  const ultimo = datos[datos.length - 1], primero = datos[0];
  const resumen = t(`${tk}: último cierre ${fmt.usd(ultimo.c)}; en las ${datos.length} sesiones mostradas pasó de ${fmt.usd(primero.c)} a ${fmt.usd(ultimo.c)} (${fmt.pct((ultimo.c / primero.c - 1) * 100, 2, true)}).`,
    `${tk}: last close ${fmt.usd(ultimo.c)}; over the ${datos.length} sessions shown it went from ${fmt.usd(primero.c)} to ${fmt.usd(ultimo.c)} (${fmt.pct((ultimo.c / primero.c - 1) * 100, 2, true)}).`);
  return (
    <div className="space-y-3">
      <Titulo h1={t("Dashboard de mercado", "Market dashboard")} sub={t("26 activos · cierre del 11-nov-2026 (datos sintéticos)", "26 assets · close of Nov 11, 2026 (synthetic data)")} />
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]" aria-live="polite">
        {["SPY", "QQQ", "EPU"].map((k) => {
          const d = D.universo.find((x: any) => x.ticker === k);
          return (
            <Card key={k}><div className="text-mut text-sm">{k} · {d.nombre}</div><div className="text-2xl font-bold">{fmt.usd(d.ultimo)}</div><div><Variacion v={d.var_1d_pct} /> {t("hoy", "today")}</div></Card>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">{t("Activo", "Asset")}<br />
          <select value={tk} onChange={(e) => setTk(e.target.value)} className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 font-normal">{TICKERS_VELAS.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <Segmentado etiqueta={t("Rango", "Range")} valor={rango} onCambio={setRango} opciones={[["1M", "1M"], ["3M", "3M"], ["6M", "6M"], ["1A", t("1A", "1Y")], ["Máx", t("Máx", "Max")]]} />
        <span className="text-sm text-mut">{t("o fechas:", "or dates:")} <input type="date" aria-label={t("Desde", "From")} className="border border-bd rounded-[8px] bg-panel min-h-11 px-2" defaultValue="2026-08-14" /> – <input type="date" aria-label={t("Hasta", "To")} className="border border-bd rounded-[8px] bg-panel min-h-11 px-2" defaultValue="2026-11-11" /></span>
      </div>
      <Grafico titulo={t(`Velas de ${tk}`, `${tk} candles`)} resumen={resumen}
        grafico={
          <ResponsiveContainer>
            <ComposedChart data={datos} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid stroke={colores.rejilla} vertical={false} />
              <XAxis dataKey="f" tick={{ fill: colores.ejes, fontSize: 11 }} tickFormatter={(f) => fmt.fecha(f).slice(0, 6)} minTickGap={24} />
              <YAxis domain={["auto", "auto"]} tick={{ fill: colores.ejes, fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: any) => (Array.isArray(v) ? `${fmt.n(v[0])} – ${fmt.n(v[1])}` : v)} labelFormatter={(f) => fmt.fecha(String(f))} />
              <Bar dataKey="rango" name={t("Mín–máx", "Low–high")} shape={(p: any) => <Vela {...p} up={colores.up} dn={colores.dn} />} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        }
        tabla={<table className="w-full text-sm border-collapse"><caption className="sr-only">OHLC {tk}</caption><thead><tr>{[t("Fecha", "Date"), t("Apertura", "Open"), t("Máximo", "High"), t("Mínimo", "Low"), t("Cierre", "Close")].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
          <tbody>{datos.slice(-15).map((d: any) => <tr key={d.f}><th scope="row" className={td + " font-normal text-left"}>{fmt.fecha(d.f)}</th><td className={td}>{fmt.n(d.o)}</td><td className={td}>{fmt.n(d.h)}</td><td className={td}>{fmt.n(d.l)}</td><td className={td}>{fmt.n(d.c)}</td></tr>)}</tbody></table>}
      />
      <Card titulo={t("Universo de 26 activos", "26-asset universe")}>
        <label className="text-sm font-semibold block mb-2">{t("Filtrar por grupo", "Filter by group")}{" "}
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 font-normal">
            <option value="">{t("Todos", "All")}</option>{Object.keys(GRUPO).map((g) => <option key={g} value={g}>{GRUPO[g][idioma === "es-PE" ? 0 : 1]}</option>)}
          </select>
        </label>
        <div className="overflow-auto max-h-[420px] border border-bd rounded-[8px]" tabIndex={0} role="region" aria-label={t("Tabla del universo", "Universe table")}>
          <table className="w-full text-sm border-collapse">
            <thead><tr>{["Ticker", t("Grupo", "Group"), t("Último", "Last"), "1 d", "5 d", "1 m", "3 m", t("Vol. anual", "Ann. vol."), "Beta", ""].map((h, i) => <th key={i} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>{filas.map((d: any) => (
              <tr key={d.ticker}><th scope="row" className={td + " text-left"}>{["NVDA", "SPY", "EPU", "SCCO", "XLK"].includes(d.ticker) && <Star size={14} className="inline text-warn mr-1" aria-label={t("En tu watchlist", "In your watchlist")} />}{d.ticker}</th>
                <td className={td}>{GRUPO[d.grupo][idioma === "es-PE" ? 0 : 1]}</td><td className={td}>{fmt.n(d.ultimo)}</td>
                {["var_1d_pct", "var_5d_pct", "var_1m_pct", "var_3m_pct"].map((k) => <td key={k} className={td}><Variacion v={d[k]} /></td>)}
                <td className={td}>{fmt.n(d.volatilidad_anual_pct, 1)} %</td><td className={td}>{fmt.n(d.beta_vs_SPY)}</td>
                <td className={td}><button type="button" className="text-ac underline whitespace-nowrap min-h-9" onClick={() => ir("clasificacion", d.ticker)}>{t("Ver clasificación", "See classification")}</button></td></tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function Watchlist() {
  const { t, fmt, colores } = useApp();
  const [w, setW] = useState<string[]>(D.wl.watchlist_inicial);
  const disparada = (a: any, d: any) => (a.tipo === "precio_sobre" ? d.ultimo >= a.umbral : a.tipo === "precio_bajo" ? d.ultimo <= a.umbral : a.tipo === "var_1d_menor_a_pct" ? d.var_1d_pct <= a.umbral : d.var_1d_pct >= a.umbral);
  const nombreTipo: Record<string, [string, string]> = { precio_sobre: ["Precio sobre", "Price above"], precio_bajo: ["Precio bajo", "Price below"], var_1d_menor_a_pct: ["Var. 1 d menor a", "1-d change below"], var_1d_mayor_a_pct: ["Var. 1 d mayor a", "1-d change above"] };
  const nDisp = D.wl.alertas.filter((a: any) => a.activa && disparada(a, D.universo.find((x: any) => x.ticker === a.ticker))).length;
  return (
    <div className="space-y-3">
      <Titulo h1={t("Watchlist y alertas", "Watchlist & alerts")} />
      <p role="status" className="font-semibold inline-flex items-center gap-2"><BellRing size={18} className="text-warn" aria-hidden /> {t(`${nDisp} alertas disparadas`, `${nDisp} alerts triggered`)}</p>
      <Card>
        <div className="flex flex-wrap gap-2 items-end mb-3">
          <label className="text-sm font-semibold">{t("Agregar activo", "Add asset")}<br /><input list="tks" className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 font-normal" placeholder={t("Busca: AAPL, cobre…", "Search: AAPL, copper…")} /></label>
          <datalist id="tks">{D.universo.map((d: any) => <option key={d.ticker} value={d.ticker}>{d.nombre}</option>)}</datalist>
          <button type="button" className="bg-ac text-on-ac rounded-[8px] min-h-11 px-4">{t("Agregar", "Add")}</button>
        </div>
        <div className="overflow-auto border border-bd rounded-[8px]" tabIndex={0} role="region" aria-label="Watchlist">
          <table className="w-full text-sm border-collapse">
            <thead><tr>{["Ticker", t("Último", "Last"), "1 d", t("Últimas 60 sesiones", "Last 60 sessions"), t("Alertas", "Alerts"), t("Quitar", "Remove")].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>{w.map((tk) => {
              const d = D.universo.find((x: any) => x.ticker === tk);
              const al = D.wl.alertas.filter((a: any) => a.ticker === tk);
              const serie = (D.regre.hist[tk] || D.velas.series[tk]?.c || []).map((v: number, i: number) => ({ i, v }));
              const dispara = al.some((a: any) => a.activa && disparada(a, d));
              return (
                <tr key={tk} className={dispara ? "outline outline-2 outline-warn -outline-offset-2" : ""}>
                  <th scope="row" className={td + " text-left"}>{tk}</th><td className={td}>{fmt.n(d.ultimo)}</td><td className={td}><Variacion v={d.var_1d_pct} /></td>
                  <td className={td}>{serie.length ? <div style={{ width: 160, height: 30 }} role="img" aria-label={t(`Minigráfico de ${tk}`, `${tk} sparkline`)}><ResponsiveContainer><LineChart data={serie}><Line dataKey="v" dot={false} stroke={colores.ac} strokeWidth={1.6} isAnimationActive={false} /></LineChart></ResponsiveContainer></div> : <span className="text-mut">—</span>}</td>
                  <td className={td}>{al.length ? al.map((a: any, i: number) => (
                    <span key={i} className={`inline-flex items-center gap-1 rounded-full border px-2 text-xs mr-1 ${a.activa && disparada(a, d) ? "border-warn font-bold" : "border-bd"}`}>
                      {a.activa && disparada(a, d) ? <><BellRing size={12} aria-hidden /> ⚠ {t("DISPARADA", "TRIGGERED")}:</> : <Bell size={12} aria-hidden />} {nombreTipo[a.tipo][0]} {a.umbral}{!a.activa && ` (${t("inactiva", "inactive")})`}
                    </span>)) : <span className="text-mut">—</span>}</td>
                  <td className={td}><button type="button" aria-label={t(`Quitar ${tk}`, `Remove ${tk}`)} onClick={() => setW(w.filter((x) => x !== tk))} className="border border-bd rounded-[8px] min-h-9 min-w-9 inline-flex items-center justify-center"><Trash2 size={16} aria-hidden /></button></td>
                </tr>);
            })}</tbody>
          </table>
        </div>
      </Card>
      <Card titulo={t("Gestor de alertas", "Alert manager")}>
        <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => e.preventDefault()}>
          <label className="text-sm font-semibold">{t("Activo", "Asset")}<br /><select className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 font-normal">{w.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="text-sm font-semibold">{t("Condición", "Condition")}<br /><select className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 font-normal">{Object.values(nombreTipo).map(([es, en]) => <option key={es}>{t(es, en)}</option>)}</select></label>
          <label className="text-sm font-semibold">{t("Umbral", "Threshold")}<br /><input type="number" className="border border-bd rounded-[8px] bg-panel min-h-11 px-2 w-32 font-normal" defaultValue={180} /></label>
          <button type="submit" className="bg-ac text-on-ac rounded-[8px] min-h-11 px-4">{t("Crear alerta", "Create alert")}</button>
        </form>
      </Card>
    </div>
  );
}

export function Trading() {
  const { t, fmt, modo } = useApp();
  const [tk, setTk] = useState("NVDA");
  const [q, setQ] = useState("500");
  const p = D.universo.find((x: any) => x.ticker === tk).ultimo;
  const port = D.wl.portafolio_demo;
  const costo = Number(q) * p;
  const err = !(Number(q) >= 1) ? t("Ingresa una cantidad entera mayor o igual a 1.", "Enter a whole quantity of at least 1.") : costo > port.efectivo ? t(`Efectivo insuficiente: la orden cuesta ${fmt.usd(costo)} y tienes ${fmt.usd(port.efectivo)}.`, `Insufficient cash: the order costs ${fmt.usd(costo)} and you have ${fmt.usd(port.efectivo)}.`) : "";
  const nav = port.efectivo + port.posiciones.reduce((a: number, x: any) => a + x.cantidad * D.universo.find((u: any) => u.ticker === x.ticker).ultimo, 0);
  return (
    <div className="space-y-3">
      <Titulo h1={t("Trading simulado", "Paper trading")} sub={t("Órdenes a mercado al último precio. Todo se guarda en este navegador.", "Market orders at the last price. Everything is stored in this browser.")} />
      {modo === "real" && <Aviso profesor="" />}
      <div className="bg-hl border border-ac rounded-[12px] p-3 flex flex-wrap items-center gap-2"><BriefcaseBusiness size={18} className="text-ac" aria-hidden /><strong>{t("Portafolio aplicado:", "Applied portfolio:")}</strong> {t("Moderado (NSGA-II N2-37, simulado) · 8 activos · desde Portafolios", "Moderate (NSGA-II N2-37, simulated) · 8 assets · from Portfolios")}</div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(18rem,1fr))]">
        <Card titulo={t("Orden", "Order")}>
          <form noValidate onSubmit={(e) => e.preventDefault()} className="space-y-2">
            <label className="block text-sm font-semibold">{t("Activo", "Asset")}<select value={tk} onChange={(e) => setTk(e.target.value)} className="block w-full max-w-xs border border-bd rounded-[8px] bg-panel min-h-11 px-2 font-normal">{D.universo.map((d: any) => <option key={d.ticker}>{d.ticker}</option>)}</select></label>
            <fieldset className="border-0 p-0 m-0"><legend className="text-sm font-semibold">{t("Lado", "Side")}</legend>
              <label className="mr-4 inline-flex items-center gap-1 min-h-11"><input type="radio" name="lado" defaultChecked className="w-5 h-5" /> {t("Comprar", "Buy")}</label>
              <label className="inline-flex items-center gap-1 min-h-11"><input type="radio" name="lado" className="w-5 h-5" /> {t("Vender", "Sell")}</label></fieldset>
            <label className="block text-sm font-semibold" htmlFor="cant">{t("Cantidad", "Quantity")}</label>
            <input id="cant" type="number" min={1} step={1} value={q} onChange={(e) => setQ(e.target.value)} aria-invalid={!!err} aria-describedby="err-cant prev" className={`block w-full max-w-xs border rounded-[8px] bg-panel min-h-11 px-2 ${err ? "border-dn border-2" : "border-bd"}`} />
            {err && <p id="err-cant" className="text-dn font-semibold m-0 text-sm">✖ {err}</p>}
            <p id="prev" className="text-sm text-mut m-0">{t("Costo estimado:", "Estimated cost:")} {fmt.usd(costo)} · {t("efectivo restante:", "cash left:")} {fmt.usd(port.efectivo - costo)}</p>
            <button type="submit" className="bg-ac text-on-ac rounded-[8px] min-h-11 px-4">{t("Enviar orden", "Place order")}</button>{" "}
            <button type="button" className="border border-bd rounded-[8px] min-h-11 px-4">{t("Reiniciar demo", "Reset demo")}</button>
          </form>
        </Card>
        <Card><div className="text-mut">{t("Efectivo", "Cash")}</div><div className="text-2xl font-bold">{fmt.usd(port.efectivo)}</div><div className="text-mut mt-3">{t("Valor del portafolio", "Portfolio value")}</div><div className="text-2xl font-bold">{fmt.usd(nav)}</div></Card>
      </div>
      <Card titulo={t("Posiciones", "Positions")}>
        <div className="overflow-auto"><table className="w-full text-sm border-collapse"><thead><tr>{["Ticker", t("Cant.", "Qty"), t("Costo prom.", "Avg. cost"), t("Último", "Last"), "P&L"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
          <tbody>{port.posiciones.map((x: any) => { const u = D.universo.find((d: any) => d.ticker === x.ticker).ultimo; const pl = (u - x.costo) * x.cantidad; return <tr key={x.ticker}><th scope="row" className={td + " text-left"}>{x.ticker}</th><td className={td}>{x.cantidad}</td><td className={td}>{fmt.n(x.costo)}</td><td className={td}>{fmt.n(u)}</td><td className={td + (pl >= 0 ? " text-up" : " text-dn")}>{pl >= 0 ? "▲ " : "▼ "}{fmt.usd(pl)}</td></tr>; })}</tbody></table></div>
      </Card>
    </div>
  );
}

export function Leaderboard() {
  const { t, fmt } = useApp();
  const base = D.wl.portafolio_demo.efectivo + D.wl.portafolio_demo.posiciones.reduce((a: number, p: any) => a + p.cantidad * p.costo, 0);
  const nav = D.wl.portafolio_demo.efectivo + D.wl.portafolio_demo.posiciones.reduce((a: number, p: any) => a + p.cantidad * D.universo.find((u: any) => u.ticker === p.ticker).ultimo, 0);
  const filas = useMemo(() => [...D.lb, { alias: t("Usted (su portafolio de Trading)", "You (your Trading portfolio)"), equipo: "A", retorno_liga_pct: (nav / base - 1) * 100, operaciones: "—", sharpe: "—", yo: true }].sort((a: any, b: any) => b.retorno_liga_pct - a.retorno_liga_pct), [nav, base, t]);
  return (
    <div className="space-y-3">
      <Titulo h1={t("Leaderboard de la liga", "League leaderboard")} sub={t("Liga ficticia de ejemplo. Su retorno sale de su portafolio de Trading.", "Fictional sample league. Your return comes from your Trading portfolio.")} />
      <Card>
        <div className="overflow-auto"><table className="w-full text-sm border-collapse"><caption className="text-left text-mut pb-2">{t("Ranking por retorno de la liga", "Ranking by league return")}</caption>
          <thead><tr>{["#", "Alias", t("Equipo", "Team"), t("Retorno", "Return"), t("Operaciones", "Trades"), "Sharpe"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
          <tbody>{filas.map((x: any, i: number) => (
            <tr key={x.alias} aria-current={x.yo ? "true" : undefined} className={x.yo ? "bg-hl font-bold outline outline-2 outline-ac -outline-offset-2" : ""}>
              <td className={td}>{i + 1}</td><th scope="row" className={td + " text-left"}>{x.yo && <Trophy size={14} className="inline mr-1 text-ac" aria-hidden />}{x.alias}</th><td className={td}>{x.equipo}</td><td className={td}><Variacion v={x.retorno_liga_pct} /></td><td className={td}>{x.operaciones}</td><td className={td}>{typeof x.sharpe === "number" ? fmt.n(x.sharpe) : x.sharpe}</td>
            </tr>))}</tbody></table></div>
      </Card>
    </div>
  );
}
