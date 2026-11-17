import { test, expect, leerJSON, sinDesborde } from './soporte.mjs';

test('R-OPT-03: clic real sobre NSGA-II cambia la composición', async ({ page, registro }, testInfo) => {
  const datos = await leerJSON('data/07_optimizador_markowitz_nsga.json');
  await page.goto('/optimizador.html?modo=profesor&lang=es-PE');
  const titulo = page.locator('#h-composicion');
  await expect(titulo).toBeVisible();
  // A 390 px las series se superponen: el usuario puede aislar NSGA-II con
  // los controles R-OPT-02 antes de seleccionar un círculo con el ratón.
  if (page.viewportSize().width === 390) {
    await page.locator('#ver-markowitz').uncheck();
    await page.locator('#ver-nsga3').uncheck();
  }
  const anterior = await titulo.textContent();
  const grafico = page.locator('#frontera .chart');
  await grafico.scrollIntoViewIfNeeded();
  await expect.poll(() => grafico.evaluate(el => !!window.echarts?.getInstanceByDom(el))).toBe(true);
  // API pública de ECharts: solo obtiene coordenadas, nunca selecciona el punto.
  // Elegimos el punto menos superpuesto a otras series y distinto del inicial.
  const destino = await grafico.evaluate((el, { puntos, anterior }) => {
    const chart = echarts.getInstanceByDom(el);
    const series = chart.getOption().series;
    const nsga = series.find(s => s.id === 'nsga2');
    const otros = series.filter(s => s.id !== 'seleccion').flatMap(s => s.data.map((p, i) => ({
      serie: s.id, indice: i, xy: chart.convertToPixel({ seriesId: s.id }, p),
    })));
    return puntos.map((p, i) => {
      const xy = chart.convertToPixel({ seriesId: 'nsga2' }, nsga.data[i]);
      const distancia = Math.min(...otros.filter(q => q.serie !== 'nsga2' || q.indice !== i)
        .map(q => Math.hypot(xy[0] - q.xy[0], xy[1] - q.xy[1])));
      return { id: p.id, xy, distancia };
    }).filter(p => !anterior.includes(p.id)).sort((a, b) => b.distancia - a.distancia)[0];
  }, { puntos: datos.nsga2_elegibles, anterior });
  expect(destino.distancia, 'Punto separable de los símbolos vecinos').toBeGreaterThan(7);
  const caja = await grafico.boundingBox();
  expect(caja).not.toBeNull();
  await page.mouse.click(caja.x + destino.xy[0], caja.y + destino.xy[1]);
  await expect(titulo).not.toHaveText(anterior);
  await expect(titulo).toContainText(destino.id);
  await expect(page.locator('#composicion .comprobacion')).toContainText('✓');
  await expect(page.locator('#recalcular')).toBeDisabled();
  await sinDesborde(page);
  expect(registro.http).toEqual([]);
  await testInfo.attach('punto-seleccionado', { body: JSON.stringify({ anterior, destino, despues: await titulo.textContent() }, null, 2), contentType: 'application/json' });
});
