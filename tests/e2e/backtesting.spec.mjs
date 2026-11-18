import { test, expect, leerJSON, sinDesborde } from './soporte.mjs';

// Oráculo: R-BT-01…07, contrato I-06/N-3 y entrega de CC del 17-nov.
// Se leen los JSON originales; no se importan cálculos del módulo probado.
const datos = await leerJSON('data/09_backtesting_portafolios.json');
const series = { ...datos.carteras, ...datos.referencias };
const numero = texto => Number(texto.replace(/[^\d.+-]/g, ''));

test('Backtesting profesor: siete series, métricas y resultados sin corregir', async ({ page, registro }) => {
  await page.goto('/backtesting.html?modo=profesor&lang=es-PE');
  for (const id of ['capital', 'drawdown']) {
    await expect(page.locator('#' + id)).toBeVisible();
    await expect(page.locator('#' + id + ' canvas').first()).toBeVisible();
  }
  const graficos = await page.evaluate(() => ['capital', 'drawdown'].map(id => {
    const opcion = window.echarts.getInstanceByDom(document.querySelector('#' + id + ' .chart')).getOption();
    return { fechas: opcion.xAxis[0].data, series: opcion.series.map(s => ({ nombre: s.name, valores: s.data })) };
  }));
  for (const grafico of graficos) {
    expect(grafico.fechas).toEqual(datos.fechas);
    expect(grafico.series).toHaveLength(7);
  }
  for (const [nombre, serie] of Object.entries(series)) {
    expect(graficos[0].series.find(s => s.nombre === nombre)?.valores).toEqual(serie.curva);
    const caidas = graficos[1].series.find(s => s.nombre === nombre)?.valores;
    expect(caidas).toHaveLength(datos.fechas.length);
    let maximo = datos.base;
    for (let i = 0; i < caidas.length; i++) {
      maximo = Math.max(maximo, serie.curva[i]);
      // Las curvas publicadas están redondeadas: tolerancia 0,01 pp.
      expect(Math.abs(caidas[i] - (serie.curva[i] / maximo - 1) * 100)).toBeLessThanOrEqual(0.01);
    }
    const fila = page.locator('#tabla-metricas tbody tr').filter({ has: page.getByRole('rowheader', { name: nombre, exact: true }) });
    const celdas = await fila.locator('td').allTextContents();
    const campos = ['retorno_total_pct', 'cagr_pct', 'volatilidad_anual_pct', 'sharpe', 'max_drawdown_pct', 'calmar', 'meses_positivos_pct'];
    expect(celdas).toHaveLength(8);
    campos.forEach((campo, i) => expect(numero(celdas[i + 1])).toBeCloseTo(serie.metricas[campo], 3));
  }
  await expect(page.locator('#tabla-metricas tr.fila-cartera')).toHaveCount(3);
  await expect(page.locator('#verificacion')).toContainText('7 de 7 series');
  await expect(page.locator('#verificacion')).toContainText('✓');
  const nota = page.locator('#nota-tope:not([hidden])');
  await expect(nota).toBeVisible();
  await expect(nota).toContainText(/Agresivo.*35\s*%.*25\s*%/);
  await expect(page.locator('#interpretacion .interp[data-cartera]')).toHaveCount(3);
  for (const nombre of Object.keys(datos.carteras)) {
    await expect(page.locator('#interpretacion .interp[data-cartera="' + nombre + '"] h3')).toContainText('no superó a SPY');
  }
  await expect(page.locator('#recalcular')).toBeDisabled();
  await page.locator('#tabla-metricas button[data-ordenar="retorno_total_pct"]').click();
  await expect(page.locator('#tabla-metricas th[data-col="retorno_total_pct"]')).toHaveAttribute('aria-sort', 'ascending');
  const orden = await page.locator('#tabla-metricas tbody th').allTextContents();
  expect(orden).toEqual(Object.keys(series).sort((a, b) => series[a].metricas.retorno_total_pct - series[b].metricas.retorno_total_pct));
  await sinDesborde(page);
  expect(registro.http).toEqual([]);
});

test('Portafolios → Agresivo: selección y pesos de los doce rebalanceos', async ({ page, registro }) => {
  await page.goto('/portafolios.html?modo=profesor&lang=es-PE');
  await page.locator('#niveles article[data-nivel="Agresivo"]').getByRole('link', { name: 'Ver su backtesting' }).click();
  await expect(page).toHaveURL(/backtesting\.html\?nivel=Agresivo$/);
  const migas = page.locator('nav.migas');
  await expect(migas.locator('li')).toHaveCount(3);
  await expect(migas.locator('.migas-contexto')).toHaveText('Agresivo');
  await expect(migas.locator('[aria-current="page"]')).toHaveText('Backtesting');
  await expect(page.locator('#tl-cartera [data-valor="Agresivo"]')).toHaveAttribute('aria-pressed', 'true');
  const botones = page.locator('#tl-fechas button[data-rebalanceo]');
  await expect(botones).toHaveCount(12);
  const seleccionados = page.locator('#tl-fechas button[aria-pressed="true"]');
  await expect(seleccionados).toHaveCount(1);
  for (const [i, rebalanceo] of datos.carteras.Agresivo.rebalanceos.entries()) {
    await botones.nth(i).click();
    await expect(seleccionados).toHaveCount(1);
    await expect(botones.nth(i)).toHaveAttribute('aria-pressed', 'true');
    const detalle = page.locator('#tl-detalle');
    const fecha = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(rebalanceo.fecha + 'T12:00:00Z'));
    await expect(detalle.locator('h3')).toContainText('Agresivo');
    await expect(detalle.locator('h3')).toContainText(fecha);
    const filas = await detalle.locator('tbody tr').evaluateAll(rows => rows.map(row => ({ ticker: row.querySelector('th').textContent, peso: row.querySelector('td').textContent })));
    expect(filas.map(f => f.ticker).sort()).toEqual(Object.keys(rebalanceo.pesos).sort());
    for (const fila of filas) {
      expect(Math.abs(numero(fila.peso) - rebalanceo.pesos[fila.ticker] * 100)).toBeLessThanOrEqual(0.051);
    }
  }
  await sinDesborde(page);
  expect(registro.http).toEqual([]);
});
