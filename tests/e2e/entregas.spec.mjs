import { test, expect, leerJSON } from './soporte.mjs';

// Criterios de entrega CC: MSG-20261117-1916, 1924 y 1932.
for (const [modulo, opciones] of [['backtesting', 13], ['optimizador', 4]]) {
  test('T-26: recalcular y volver al archivo en ' + modulo, async ({ page }) => {
    await page.goto('/' + modulo + '.html?modo=real&lang=es-PE');
    await expect(page.locator('#recalculo-opcion option')).toHaveCount(opciones);
    if (modulo === 'optimizador') {
      const ix = await leerJSON('data_real/cortes/index.json');
      await expect(page.locator('#corte')).toHaveValue(ix.ultimo);
      await expect(page.locator('#corte option').first()).toHaveAttribute('value', ix.ultimo);
    }
    await page.locator('#recalcular').click();
    await expect(page.locator('.recalculado')).toBeVisible({ timeout: 40_000 });
    if (modulo === 'backtesting') await expect(page.locator('#verificacion')).toContainText('7 de 7');
    await page.locator('#recalculo-volver').click();
    await expect(page.locator('.recalculado')).toHaveCount(0);
    await expect(page.locator('#recalcular')).toBeEnabled();
  });
}
test('T-29: casilla QQQ sincroniza los dos gráficos por teclado', async ({ page }) => {
  await page.goto('/backtesting.html?modo=profesor&lang=es-PE');
  const casilla = page.locator('#series-visibles input[data-serie="QQQ"]');
  await expect(casilla).toBeChecked();
  await casilla.focus();
  await page.keyboard.press('Space');
  await expect(casilla).not.toBeChecked();
  for (const id of ['capital', 'drawdown']) {
    await expect.poll(() => page.locator('#' + id + ' .chart').evaluate(el => echarts.getInstanceByDom(el).getOption().legend[0].selected.QQQ)).toBe(false);
  }
  await page.keyboard.press('Space');
  for (const id of ['capital', 'drawdown']) {
    await expect.poll(() => page.locator('#' + id + ' .chart').evaluate(el => echarts.getInstanceByDom(el).getOption().legend[0].selected.QQQ)).toBe(true);
  }
});

test('T-28: cámara falsa permite cancelar calibración y consultar ocho gestos', async ({ page }) => {
  await page.goto('/clasificacion.html?modo=profesor&lang=es-PE');
  await page.locator('#btn-a11y').click();
  await page.locator('dialog[open] button[data-camara="cabeza"]').click();
  await page.locator('dialog[open] button[value="si"]').click();
  await expect.poll(() => page.evaluate(() => EIA.camara.estado().estado), { timeout: 30_000 }).toBe('activa');
  try {
    await page.locator('#eia-hud [data-accion="calibrar"]').click();
    await expect(page.locator('.calibracion')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.calibracion')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => EIA.camara.estado().estado)).toBe('activa');
    await page.locator('#eia-hud [data-accion="ayuda"]').click();
    await expect(page.locator('dialog[open] .gesto')).toHaveCount(8);
  } finally { await page.evaluate(() => EIA.camara.detener()); }
});
