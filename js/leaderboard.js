/* Módulo Leaderboard (leaderboard.html) — heredado de la Semana 4 y ampliado (R-HER-04, PLAN_MAESTRO §8.3 M4).
   Liga FICTICIA del archivo 12 más el usuario, cuyo retorno sale de su cartera de Trading (EIA.cartera, del modo activo)
   comparada con el valor inicial de la demo. La fila del usuario se distingue con icono, texto, negrita, fondo y
   aria-current (nunca solo color). Entradas: 12 (liga), 10 (precios) y 11 (cartera demo). */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const ARCHIVO_LIGA = "12_leaderboard_liga.json", ARCHIVO_MERCADO = "10_dashboard_mercado.json", ARCHIVO_DEMO = "11_watchlist_alertas_portafolio_demo.json";
  const CLAVE_USUARIO = "__usted__";

  /** Ranking de la liga con el usuario incluido, de mayor a menor retorno. Pura.
      usuario = {retorno_liga_pct, operaciones}. La posición se recalcula con el usuario dentro. */
  function ranking(liga, usuario) {
    const filas = liga.map(x => Object.assign({ clave: x.alias, usted: false }, x));
    filas.push({ clave: CLAVE_USUARIO, usted: true, alias: null, equipo: null, retorno_liga_pct: usuario.retorno_liga_pct, operaciones: usuario.operaciones, sharpe: null });
    filas.sort((a, b) => b.retorno_liga_pct - a.retorno_liga_pct);
    filas.forEach((f, i) => { f.posicion = i + 1; });
    return filas;
  }

  const Leaderboard = { ranking, CLAVE_USUARIO };
  if (typeof module !== "undefined" && module.exports) module.exports = Leaderboard;
  if (typeof document === "undefined") return;
  global.Leaderboard = Leaderboard;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p), usd = x => EIA.fmt.usd(x);

  function pintar(D) {
    const precio = tk => { const a = D.c10.find(x => x.ticker === tk); return a ? a.ultimo : NaN; };
    const c = EIA.estado.get(EIA.cartera.clave()) || EIA.cartera.copia(D.c11.portafolio_demo);
    const valor = EIA.cartera.valor(c, precio), inicial = EIA.cartera.valorInicial(D.c11.portafolio_demo);
    const ops = (EIA.estado.get(EIA.cartera.claveOrdenes()) || []).length;
    const filas = ranking(D.c12, { retorno_liga_pct: (valor / inicial - 1) * 100, operaciones: ops });
    const yo = filas.find(f => f.usted);
    $("#mi-posicion").innerHTML = `<p class="mi-posicion"><span aria-hidden="true">◆</span> ${esc(t("leaderboard.mi_posicion", { pos: yo.posicion, total: filas.length }))}</p>
<p class="mut">${esc(t("leaderboard.como_se_calcula", { valor: usd(valor), inicial: usd(inicial) }))}</p>`;
    EIA.ui.tabla($("#liga"), {
      id: "tabla-liga", titulo: t("leaderboard.caption"),
      columnas: [
        { clave: "posicion", titulo: t("leaderboard.col_posicion"), tipo: "num", fmt: v => esc(EIA.fmt.ent(v)) },
        { clave: "alias", titulo: t("leaderboard.col_alias"), tipo: "texto",
          fmt: (v, f) => (f.usted ? `<span aria-hidden="true">◆</span> <strong>${esc(t("leaderboard.usted"))}</strong>` : esc(v)) },
        { clave: "equipo", titulo: t("leaderboard.col_equipo"), tipo: "texto", fmt: (v, f) => esc(f.usted ? t("leaderboard.no_aplica") : v) },
        { clave: "retorno_liga_pct", titulo: t("leaderboard.col_retorno"), tipo: "num", fmt: v => EIA.ui.variacion(v) },
        { clave: "operaciones", titulo: t("leaderboard.col_operaciones"), tipo: "num", fmt: v => esc(EIA.fmt.ent(v)) },
        { clave: "sharpe", titulo: t("leaderboard.col_sharpe"), tipo: "num", fmt: (v, f) => (f.usted ? `<span aria-label="${esc(t("leaderboard.sin_sharpe"))}">—</span>` : esc(EIA.fmt.num(v))) }
      ],
      filas, claveFila: f => f.clave, elegida: CLAVE_USUARIO
    });
  }

  EIA.modulo({
    id: "leaderboard",
    async cargar() {
      const [c12, c10, c11] = await EIA.todos([EIA.datos(ARCHIVO_LIGA), EIA.datos(ARCHIVO_MERCADO), EIA.datos(ARCHIVO_DEMO)]);
      return { c12, c10, c11 };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
