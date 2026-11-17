import AxeBuilder from '@axe-core/playwright';
import { test, expect, paginas } from '../e2e/soporte.mjs';

// Se ejecuta en ambos temas y anchos definidos en Playwright. Sin exclusiones.
for (const modo of ['profesor', 'real']) for (const pagina of paginas) {
  test('axe WCAG 2.2 AA: ' + pagina + ' / ' + modo, async ({ page }, testInfo) => {
    await page.goto('/' + pagina + '.html?modo=' + modo + '&lang=es-PE');
    await page.waitForFunction(() => document.querySelector('.estado-error') || (window.EIA && document.querySelector('main .card')));
    await page.waitForLoadState('networkidle');
    const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    await testInfo.attach('axe', { body: JSON.stringify(resultado, null, 2), contentType: 'application/json' });
    await expect(page.locator('[aria-label*="This is a chart"]')).toHaveCount(0);
    expect(resultado.violations).toEqual([]);
  });
}
