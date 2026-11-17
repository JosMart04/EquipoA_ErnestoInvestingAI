import { test as base, expect } from '@playwright/test';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export { expect };
export const raiz = fileURLToPath(new URL('../..', import.meta.url));
export const leerJSON = async nombre => JSON.parse(await readFile(path.join(raiz, nombre), 'utf8'));
const modulos = fileURLToPath(new URL('../node_modules/', import.meta.url));
export const paginas = [
  'index', 'watchlist', 'trading', 'leaderboard', 'clasificacion',
  'regresion', 'optimizador', 'portafolios', 'backtesting',
];

export async function faltaArchivo(nombre) {
  try { await access(path.join(raiz, 'data_real', nombre)); return false; }
  catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}

export const test = base.extend({
  page: async ({ page }, use) => {
    // Bibliotecas originales de las mismas versiones del sitio, desde npm.
    // No se sustituyen ECharts, MediaPipe, detectForVideo ni getUserMedia.
    await page.route('https://cdn.jsdelivr.net/npm/**', async route => {
      const url = new URL(route.request().url());
      let archivo;
      if (url.pathname === '/npm/echarts@5.5.1/dist/echarts.min.js') {
        archivo = path.join(modulos, 'echarts/dist/echarts.min.js');
      } else if (url.pathname.startsWith('/npm/@mediapipe/tasks-vision@1.2.3/')) {
        const relative = url.pathname.slice('/npm/@mediapipe/tasks-vision@1.2.3/'.length);
        if (!/^(vision_bundle\.mjs|wasm\/vision_wasm(?:_module)?_internal\.(?:js|wasm))$/.test(relative)) {
          throw new Error('Recurso MediaPipe inesperado: ' + relative);
        }
        archivo = path.join(modulos, '@mediapipe/tasks-vision', relative);
      } else {
        throw new Error('Dependencia CDN no fijada por las pruebas: ' + url);
      }
      await route.fulfill({
        body: await readFile(archivo),
        contentType: archivo.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
        headers: { 'access-control-allow-origin': '*' },
      });
    });
    await use(page);
  },
  registro: [async ({ page }, use, testInfo) => {
    const datos = { navegador: page.context().browser().version(), excepciones: [], fallosRed: [], http: [], consola: [] };
    page.on('pageerror', error => datos.excepciones.push(error.message));
    page.on('requestfailed', request => datos.fallosRed.push({ url: request.url(), error: request.failure()?.errorText }));
    page.on('response', response => {
      if (response.status() >= 400) datos.http.push({ url: response.url(), estado: response.status() });
    });
    page.on('console', message => {
      if (['error', 'warning'].includes(message.type())) datos.consola.push({ tipo: message.type(), texto: message.text() });
    });
    await use(datos);
    await testInfo.attach('diagnostico-navegador', {
      body: JSON.stringify(datos, null, 2), contentType: 'application/json',
    });
    expect(datos.excepciones, 'Excepciones JS no controladas').toEqual([]);
    expect(datos.fallosRed, 'Solicitudes fallidas').toEqual([]);
  }, { auto: true }],
});

export async function sinDesborde(page) {
  const ancho = await page.evaluate(() => ({
    contenido: document.documentElement.scrollWidth,
    ventana: document.documentElement.clientWidth,
  }));
  expect(ancho.contenido).toBeLessThanOrEqual(ancho.ventana);
}
