import { test, expect, leerJSON, sinDesborde } from './soporte.mjs';

test('T-27: End anuncia la última vela y el barrido responde a Espacio y Esc', async ({ page, registro }) => {
  const velas = await leerJSON('data/03_ohlcv_sintetico_120d.json');
  await page.goto('/index.html?modo=profesor&lang=es-PE&t=AAPL');
  const chart = page.locator('#velas .chart');
  await expect(chart).toHaveAttribute('role', 'application');
  await chart.focus();
  await chart.press('End');
  const precio = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(velas.series.AAPL.c.at(-1));
  await expect(page.locator('#eia-vivo')).toContainText(precio);
  await expect(page.locator('#eia-vivo')).toContainText('120 de 120');
  await page.goto('/index.html?modo=profesor&lang=es-PE&barrido=1');
  const rotulo = page.locator('.barrido-rotulo');
  await expect(rotulo).toContainText(/Grupo \d+ de \d+/);
  await page.keyboard.press('Space');
  await expect(rotulo).toContainText('›');
  await page.keyboard.press('Escape');
  await expect(page.locator('.barrido-capa')).toHaveCount(0);
  expect(registro.http).toEqual([]);
});

for (const [pagina, graficos] of [
  ['index', [['velas', 1]]], ['regresion', [['pronostico', 2]]],
  ['backtesting', [['capital', 7], ['drawdown', 7]]], ['portafolios', [['composicion', 3]]],
]) {
  test('T-27: resúmenes de series y etiquetas traducidas en ' + pagina, async ({ page, registro }) => {
    await page.goto('/' + pagina + '.html?modo=profesor&lang=es-PE');
    for (const [id, n] of graficos) {
      const grafico = page.locator('#' + id);
      await expect(grafico.locator('.chart canvas').first()).toBeVisible();
      const etiqueta = await grafico.locator('.chart').getAttribute('aria-label');
      expect(etiqueta).toBeTruthy();
      expect(etiqueta).not.toContain('This is a chart');
      await grafico.locator('[data-pest="r"]').click();
      await expect(grafico.locator('.resumen-series li')).toHaveCount(n);
      await expect(grafico.locator('.resumen-series')).toBeVisible();
    }
    await expect(page.locator('[aria-label*="This is a chart"]')).toHaveCount(0);
    await sinDesborde(page);
    expect(registro.http).toEqual([]);
  });
}
