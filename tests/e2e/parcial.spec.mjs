import { test, expect, paginas, leerJSON, faltaArchivo, sinDesborde } from './soporte.mjs';

// Contrato §7 y MSG-20261117-1035: se prueba la publicación real presente,
// sin inventar JSON 01–13 ni sustituir la respuesta del servidor.
for (const idioma of ['es-PE', 'en-US']) {
  for (const pagina of paginas) {
    test(pagina + ': publicación real parcial (' + idioma + ')', async ({ page, registro }) => {
      const meta = await leerJSON('data_real/meta.json');
      const diccionario = await leerJSON('i18n/' + idioma + '.json');
      const fecha = new Intl.DateTimeFormat(idioma, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(meta.fecha_corte + 'T12:00:00Z'));
      const aviso = diccionario.aviso.real.parcial.replace('{fecha}', fecha);
      await page.goto('/' + pagina + '.html?modo=real&lang=' + idioma);
      const error = page.locator('.estado-error[role="alert"]');
      await expect(error).toBeVisible();
      await expect(page.locator('main > [data-aviso]')).toContainText(aviso);
      await expect(page.locator('footer [data-aviso="global"]')).toContainText(aviso);
      await expect(page.locator('#ctl-modo [data-modo="real"]')).toHaveAttribute('aria-pressed', 'true');
      const nombre = (await error.locator('p').innerText()).match(/\b(?:0[1-9]|1[0-3])_[A-Za-z0-9_]+\.json\b/)?.[0];
      expect(nombre, 'El error nombra el archivo del módulo ausente').toBeTruthy();
      expect(await faltaArchivo(nombre)).toBe(true);
      expect(registro.http.some(r => new URL(r.url).pathname === '/data_real/' + nombre && r.estado === 404)).toBe(true);
      for (const respuesta of registro.http) {
        const url = new URL(respuesta.url);
        expect(respuesta.estado).toBe(404);
        expect(url.pathname).toMatch(/^\/data_real\/(?:0[1-9]|1[0-3])_[A-Za-z0-9_]+\.json$/);
        expect(await faltaArchivo(url.pathname.split('/').at(-1))).toBe(true);
      }
      await sinDesborde(page);
      if ((page.viewportSize()?.width || 0) < 1180) {
        await page.locator('#btn-modulos').click();
        await expect(page.locator('#btn-modulos')).toHaveAttribute('aria-expanded', 'true');
      }
      await expect(page.locator('#nav-modulos a:visible')).toHaveCount(9);
    });
  }
}
