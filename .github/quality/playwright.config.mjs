import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qualityDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: qualityDir,
  testMatch: 'public.spec.mjs',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 3 : 1,
  reporter: [['list'], ['json', { outputFile: path.join(qualityDir, 'results', 'public-browser-results.json') }]],
  use: {
    baseURL: process.env.STOCK_SCANNER_PUBLIC_URL,
    ignoreHTTPSErrors: false,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } }
  ],
  outputDir: path.join(qualityDir, 'results', 'playwright')
});
