import { test, expect } from './soporte.mjs';

// MSG-20261117-1031: el HUD debe conservar el vídeo y procesar nuevos cuadros
// durante diez segundos, no basta con que el primer cuadro llegue.
test('cabeza: cámara falsa de Chrome + MediaPipe real sigue activa durante 10 s', async ({ page, registro }, testInfo) => {
  await page.goto('/clasificacion.html?modo=profesor&lang=es-PE');
  await expect(page.locator('#btn-a11y')).toBeVisible();
  await page.locator('#btn-a11y').click();
  await page.locator('dialog[open] button[data-camara="cabeza"]').click();
  await page.locator('dialog[open] button[value="si"]').click();
  await expect.poll(() => page.evaluate(() => window.EIA?.camara?.estado().estado), { timeout: 30_000 }).toBe('activa');
  await expect.poll(() => page.evaluate(() => EIA.camara.estado().cuadros)).toBeGreaterThan(0);

  const video = page.locator('#eia-hud .hud-vista video');
  await expect(video).toHaveCount(1);
  const flujo = await video.evaluateHandle(v => v.srcObject);
  try {
    const muestras = await page.evaluate(async () => {
      const inicio = performance.now();
      const original = document.querySelector('#eia-hud .hud-vista video');
      const salida = [];
      do {
        const estado = EIA.camara.estado();
        salida.push({
          ms: performance.now() - inicio, ...estado,
          dom: {
            mismoVideo: document.querySelector('#eia-hud .hud-vista video') === original,
            pausado: original.paused, enDocumento: original.isConnected,
            tiempo: original.currentTime,
            pistas: original.srcObject.getVideoTracks().map(t => t.readyState),
          },
        });
        if (salida.at(-1).ms >= 10_000) break;
        await new Promise(resolve => setTimeout(resolve, 250));
      } while (true);
      return salida;
    });
    await testInfo.attach('camara-10-segundos', { body: JSON.stringify(muestras, null, 2), contentType: 'application/json' });
    expect(muestras.at(-1).ms).toBeGreaterThanOrEqual(10_000);
    expect(muestras.length).toBeGreaterThanOrEqual(11);
    for (const m of muestras) {
      expect(m.estado).toBe('activa');
      expect(m.simulada, 'Debe ejecutar detectForVideo, sin guion sintético').toBe(false);
      expect(m.video).toEqual({ pausado: false, enDocumento: true });
      expect(m.dom.mismoVideo).toBe(true);
      expect(m.dom.pausado).toBe(false);
      expect(m.dom.enDocumento).toBe(true);
      expect(m.dom.pistas).toEqual(['live']);
    }
    let anterior = muestras[0];
    for (const m of muestras.slice(1)) {
      if (m.ms - anterior.ms >= 1000) {
        expect(m.cuadros, 'Cuadros procesados en cada ventana de un segundo').toBeGreaterThan(anterior.cuadros);
        expect(m.dom.tiempo, 'El vídeo recibe imágenes nuevas').toBeGreaterThan(anterior.dom.tiempo);
        anterior = m;
      }
    }
    expect(registro.http).toEqual([]);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => EIA.camara.estado().estado)).toBe('apagada');
    await expect(page.locator('#eia-hud')).toHaveCount(0);
    expect(await flujo.evaluate(s => s.getTracks().map(t => t.readyState))).toEqual(['ended']);
  } finally {
    await page.evaluate(() => EIA.camara.detener());
    await flujo.dispose();
  }
});
