import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../..', import.meta.url));
export default defineConfig({
  testDir: '..',
  testMatch: ['e2e/*.spec.mjs', 'a11y/*.spec.mjs'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: '../test-results',
  reporter: [['list'], ['json', { outputFile: '../test-results/resumen.json' }], ['html', { outputFolder: '../playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8765',
    browserName: 'chromium',
    channel: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.E2E_CHROME_PATH || undefined,
      args: [
        '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
        '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      ],
    },
  },
  projects: ['light', 'dark'].flatMap(colorScheme => [
    { name: 'escritorio-1280-' + colorScheme, use: { viewport: { width: 1280, height: 900 }, colorScheme } },
    { name: 'movil-390-' + colorScheme, use: { viewport: { width: 390, height: 844 }, colorScheme } },
  ]),
  webServer: {
    command: 'python -m http.server 8765 --bind 127.0.0.1',
    cwd: raiz,
    url: 'http://127.0.0.1:8765/',
    reuseExistingServer: false,
    timeout: 20_000,
    stderr: 'ignore',
  },
});
