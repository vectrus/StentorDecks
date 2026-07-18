import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

/**
 * End-user Playwright suite (no RMX2 required).
 * - mockup journeys: authoritative HTML contracts
 * - app smoke: Vite renderer + mocked window.stentor / Web Audio
 */
export default defineConfig({
  testDir: path.join(__dirname),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  outputDir: 'e2e/test-results',
  timeout: 60_000,
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mockups',
      testMatch: /mockups\.spec\.ts/,
    },
    {
      name: 'app',
      testMatch: /app\.spec\.ts/,
      use: {
        baseURL: 'http://127.0.0.1:5173',
      },
    },
  ],
  webServer: {
    command: 'npm run dev -w @stentordeck/renderer -- --host 127.0.0.1 --port 5173',
    cwd: root,
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
