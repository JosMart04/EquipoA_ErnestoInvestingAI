// Barra superior (T-115): con la barra lateral abierta y el texto agrandado, la parte superior no se distorsiona.
// Antes, a 1862 px con texto al 120 % y Modo real, «Mercado cerrado» se partía en dos líneas encima de «Datos:» y el
// avatar quedaba solo en una segunda fila. Ahora js/common.js (ajustarBarra) oculta textos secundarios por niveles
// hasta que todo cabe en una fila, y se reajusta al plegar o abrir la barra lateral.
import { test, expect } from './soporte.mjs';

/** Estado de la barra: niveles activos, alto frente a una fila, textos partidos y si la cuenta quedó sola abajo. */
const estado = page => page.evaluate(() => {
  const cab = document.querySelector('header.top'), bar = cab.querySelector('.bar');
  const raiz = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const fila = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) * raiz;
  const partidos = [...cab.querySelectorAll('.mercado, .seg-rot, .seg button, .ctl-ico, .buscar-disparador')]
    .filter(el => el.offsetParent !== null && getComputedStyle(el).clipPath === 'none' && el.getClientRects().length > 1).map(el => el.className || el.id);
  const controles = cab.querySelector('.controles').getBoundingClientRect(), cuenta = cab.querySelector('.cuenta').getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const fuera = [...cab.querySelectorAll('button, select, a, .mercado')].filter(el => {
    if (el.closest('[hidden], .menu-cuenta, .panel-notif') || getComputedStyle(el).clipPath !== 'none') return false;
    const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 1 || r.left < -1);
  }).map(el => el.id || el.className);
  return { niveles: (cab.dataset.barra || '').split(' ').filter(Boolean), alto: bar.getBoundingClientRect().height, fila, partidos, fuera,
    cuentaSola: cuenta.top >= controles.bottom - 2 };
});

test('T-115: a 1862 px con texto al 120 % y la barra lateral abierta, la barra superior cabe en una fila', async ({ page, registro }, info) => {
  test.skip(!info.project.name.startsWith('escritorio'), 'caso de escritorio');
  await page.setViewportSize({ width: 1862, height: 900 });
  await page.addInitScript(() => localStorage.setItem('eia_a11y', JSON.stringify({ texto: 120 })));
  await page.goto('/acerca.html?modo=real&lang=es-PE');
  await expect(page.locator('#estado-mercado')).not.toBeEmpty();
  const e = await estado(page);
  expect(e.partidos, 'ningún texto de la barra se parte en dos líneas').toEqual([]);
  expect(e.cuentaSola, 'la cuenta no queda sola en otra fila').toBe(false);
  expect(e.niveles).not.toContain('6');
  expect(e.alto).toBeLessThanOrEqual(e.fila * 1.25);
  expect(e.fuera).toEqual([]);
  expect(registro.http).toEqual([]);
});

test('T-115: al plegar y abrir la barra lateral, la barra superior se reajusta sola', async ({ page, registro }, info) => {
  test.skip(!info.project.name.startsWith('escritorio'), 'caso de escritorio');
  await page.goto('/index.html?modo=profesor&lang=de-DE');
  await expect(page.locator('#estado-mercado')).not.toBeEmpty();
  const abierta = await estado(page);
  await page.locator('#btn-plegar').click();
  await expect(page.locator('html')).toHaveAttribute('data-lateral', 'plegado');
  await expect.poll(async () => (await estado(page)).niveles.length).toBeLessThanOrEqual(abierta.niveles.length);
  for (const e of [abierta, await estado(page)]) {
    expect(e.partidos).toEqual([]);
    expect(e.alto).toBeLessThanOrEqual(e.fila * 1.25);
  }
  await page.locator('#btn-plegar').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-lateral', 'plegado');
  await expect.poll(async () => (await estado(page)).niveles.join(' ')).toBe(abierta.niveles.join(' '));
  expect(registro.http).toEqual([]);
});

test('T-115: en el celular, ☰, buscar, campana y cuenta comparten la primera fila', async ({ page, registro }, info) => {
  test.skip(!info.project.name.startsWith('movil'), 'caso del celular');
  await page.goto('/index.html?modo=real&lang=es-PE');
  await expect(page.locator('#btn-modulos')).toBeVisible();
  // Antes, la campana y la cuenta quedaban solas en una segunda línea: ahora la marca queda solo con el logo
  const tops = await page.evaluate(() => ['#btn-modulos', '#btn-buscar', '#btn-notif', '#btn-cuenta'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().top)));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(24);
  expect((await estado(page)).fuera).toEqual([]);
  expect(registro.http).toEqual([]);
});

test('T-115: en el celular, con texto al 200 %, nada de la barra superior sale de la pantalla', async ({ page, registro }, info) => {
  test.skip(!info.project.name.startsWith('movil'), 'caso del celular');
  await page.addInitScript(() => localStorage.setItem('eia_a11y', JSON.stringify({ texto: 200 })));
  await page.goto('/index.html?modo=real&lang=es-PE');
  await expect(page.locator('#btn-modulos')).toBeVisible();
  expect((await estado(page)).fuera).toEqual([]);
  expect(registro.http).toEqual([]);
});
