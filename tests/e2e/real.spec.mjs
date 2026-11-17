import { test, expect, leerJSON, sinDesborde } from './soporte.mjs';

const selectores = {
  index: '#tabla-universo', watchlist: '#tabla-watch', trading: '#tabla-posiciones',
  leaderboard: '#tabla-liga', clasificacion: '#tabla-metricas', regresion: '#pronostico',
  optimizador: '#h-composicion', portafolios: '#niveles article[data-nivel]', backtesting: '#tabla-metricas',
};
for (const [pagina, selector] of Object.entries(selectores)) {
  test('Publicación real completa: ' + pagina, async ({ page, registro }) => {
    const meta = await leerJSON('data_real/meta.json');
    await page.goto('/' + pagina + '.html?modo=real&lang=es-PE');
    await expect(page.locator(selector).first()).toBeVisible();
    await expect(page.locator('.estado-error')).toHaveCount(0);
    await expect(page.locator('#ctl-modo [data-modo="real"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('main > [data-aviso]')).toContainText('Yahoo Finance');
    await expect(page.locator('footer [data-aviso="global"]')).not.toContainText('publicación parcial');
    expect(meta.fecha_corte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await sinDesborde(page);
    expect(registro.http).toEqual([]);
  });
}
