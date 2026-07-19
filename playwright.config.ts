import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const root = path.resolve(__dirname);

/**
 * Documentation screenshots from the live Vite renderer (mocked IPC).
 * Run: npm run docs:screenshots
 */
export default defineConfig({
  testDir: 'docs/playwright',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'docs/playwright/report' }]],
  outputDir: 'docs/playwright/test-results',
  timeout: 90_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -w @stentordeck/renderer -- --host 127.0.0.1 --port 5173',
    cwd: root,
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
