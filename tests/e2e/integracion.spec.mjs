import { test, expect, sinDesborde } from './soporte.mjs';

test('R-INT-05: migas encadenadas y navegación principal sin migas', async ({ page, registro }) => {
  await page.goto('/clasificacion.html?t=NVDA');
  await page.locator('#enlace-regresion').click();
  const migas = page.locator('nav.migas');
  await expect(migas).toHaveAttribute('aria-label', 'Migas de pan');
  await expect(migas.locator('li')).toHaveCount(3);
  await expect(migas.locator('a').first()).toHaveAttribute('href', 'clasificacion.html?t=NVDA');
  await expect(migas.locator('.migas-contexto')).toHaveText('NVDA');
  await expect(migas.locator('[aria-current="page"]')).toHaveText('Regresión 30 días');
  await page.locator('#enlace-optimizador').click();
  await expect(migas.locator('li')).toHaveCount(4);
  await expect(migas.locator('.migas-contexto')).toHaveText('NVDA');
  await expect(migas.locator('[aria-current="page"]')).toHaveText('Optimizador');
  await page.reload();
  await expect(migas.locator('li')).toHaveCount(4);
  if (page.viewportSize().width < 1180) await page.locator('#btn-modulos').click();
  await page.locator('#nav-modulos a[href="regresion.html"]').click();
  await expect(page.locator('#pronostico .chart canvas').first()).toBeVisible();
  await expect(migas).toHaveCount(0);
  await sinDesborde(page);
  expect(registro.http).toEqual([]);
});
