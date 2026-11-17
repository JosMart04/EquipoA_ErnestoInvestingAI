import { test, expect, leerJSON, sinDesborde } from './soporte.mjs';

const selectores = {
  index: '#tabla-universo', watchlist: '#tabla-watch', trading: '#tabla-posiciones',
  leaderboard: '#tabla-liga', clasificacion: '#tabla-metricas', regresion: '#pronostico',
  optimizador: '#h-composicion', portafolios: '#niveles article[data-nivel]', backtesting: '#tabla-metricas',
};
for (const [pagina, selector] of Object.entries(selectores)) {
  test('Publicación real completa: ' + pagina, async ({ page, registro }) => {
    const meta = await leerJSON('data_real/meta.json');
    const avisos = (await leerJSON('i18n/es-PE.json')).aviso.real;
    const fecha = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(meta.fecha_corte + 'T12:00:00Z'));
    const aviso = (avisos[pagina] || avisos.generico).replace('{fecha}', fecha);
    await page.goto('/' + pagina + '.html?modo=real&lang=es-PE');
    await expect(page.locator(selector).first()).toBeVisible();
    await expect(page.locator('.estado-error')).toHaveCount(0);
    await expect(page.locator('#ctl-modo [data-modo="real"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('main > [data-aviso]')).toContainText(aviso);
    // PLAN_MAESTRO §4.2: fuente real, liga ficticia y órdenes simuladas.
    await expect(page.locator('main > [data-aviso]')).toContainText(pagina === 'leaderboard' ? 'Liga ficticia' : 'Yahoo Finance');
    if (pagina === 'trading') await expect(page.locator('main > [data-aviso]')).toContainText('órdenes son simuladas');
    await expect(page.locator('footer [data-aviso="global"]')).toContainText('yfinance');
    await expect(page.locator('footer [data-aviso="global"]')).toContainText('No es asesoría de inversión');
    await expect(page.locator('footer [data-aviso="global"]')).toContainText(avisos.global.replace('{fecha}', fecha));
    await expect(page.locator('footer [data-aviso="global"]')).not.toContainText('publicación parcial');
    expect(meta.fecha_corte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await sinDesborde(page);
    expect(registro.http).toEqual([]);
  });
}
