// Evidencia P08 independiente; no convierte los defectos observados en expectativas de CI.
// Ejecutar: node tests/a11y/p08-evidencia.mjs (Chrome mediante E2E_CHROME_PATH).
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
const raiz = new URL('../../', import.meta.url);
const leer = async p => JSON.parse(await readFile(new URL(p, raiz), 'utf8'));
await mkdir(new URL('docs/capturas/p08/', raiz), { recursive: true });
const servidor = spawn('python', ['-m', 'http.server', '8766', '--bind', '127.0.0.1'], { cwd: raiz, windowsHide: true, stdio: 'ignore' });
let browser;
try {
  for (let i=0;i<100;i++) { try { if ((await fetch('http://127.0.0.1:8766/')).ok) break; } catch {} await new Promise(r=>setTimeout(r,100)); }
  browser = await chromium.launch({ executablePath: process.env.E2E_CHROME_PATH, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js', r=>r.fulfill({path:fileURLToPath(new URL('../node_modules/echarts/dist/echarts.min.js',import.meta.url)),contentType:'text/javascript'}));
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  const evidencia={revision:execFileSync('git',['rev-parse','HEAD'],{cwd:raiz}).toString().trim(),errores};
  const ix=await leer('data_real/cortes/index.json'), corte=ix.cortes[0];
  await page.goto('http://127.0.0.1:8766/regresion.html?modo=real&lang=es-PE&t=AAPL');
  await page.locator('#corte').selectOption(corte);
  await page.waitForFunction(c=>window.EIA?.corte()===c && document.querySelector('main')?.getAttribute('aria-busy')!=='true',corte);
  await page.waitForFunction(()=>!!window.echarts?.getInstanceByDom(document.querySelector('#pronostico .chart')));
  evidencia.regresion=await page.evaluate(()=>{
    const op=echarts.getInstanceByDom(document.querySelector('#pronostico .chart')).getOption();
    const historia=op.series.find(s=>s.name==='Historia');
    const ultimo=historia.data.findLastIndex(x=>x!==null);
    return {corte:EIA.corte(),historiaFinal:op.xAxis[0].data[ultimo],pronosticoPrimero:op.xAxis[0].data[ultimo+1],precioHistoria:historia.data[ultimo],aviso:document.querySelector('main > [data-aviso]').textContent,eje:op.xAxis[0].data};
  });
  const snap=await leer('data_real/cortes/'+corte+'/06_regresores_precio_30d.json');
  evidencia.regresion.precioAnclaSnapshot=snap.predicciones.AAPL.precio_ultimo;
  await page.locator('#pronostico').screenshot({path:fileURLToPath(new URL('docs/capturas/p08/regresion-corte-historico.png',raiz))});
  await page.evaluate(() => localStorage.removeItem('eia_corte'));
  await page.goto('http://127.0.0.1:8766/clasificacion.html?modo=real&lang=es-PE');
  await page.locator('#ficha dl').waitFor();
  evidencia.clasificacion={ficha:await page.locator('#ficha').innerText(),modelos:(await leer('data_real/05_clasificadores_binarios.json')).modelos.map(m=>({modelo:m.modelo,exactitud:m.exactitud,n_prueba:m.n_prueba}))};
  await page.locator('#ficha').screenshot({path:fileURLToPath(new URL('docs/capturas/p08/clasificacion-calidad.png',raiz))});
  await page.goto('http://127.0.0.1:8766/optimizador.html?modo=profesor&lang=es-PE');
  await page.locator('#ficha dl').waitFor();
  evidencia.optimizador={ficha:await page.locator('#ficha').innerText()};
  await page.locator('#ficha').screenshot({path:fileURLToPath(new URL('docs/capturas/p08/optimizador-ficha.png',raiz))});
  await writeFile(new URL('docs/informe/evidencias-P08.json',raiz),JSON.stringify(evidencia,null,2)+'\n');
  console.log(JSON.stringify({regresion:{...evidencia.regresion,eje:undefined},clasificacion:evidencia.clasificacion.ficha,optimizador:evidencia.optimizador,errores},null,2));
} finally { if(browser)await browser.close(); servidor.kill(); }
