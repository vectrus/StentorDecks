import { defineConfig, devices } from '@playwright/test';

/**
 * Doc / mockup screenshot suite — not the vitest unit suite.
 * Run: npm run docs:screenshots
 */
export default defineConfig({
  testDir: 'docs/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'docs/playwright/report' }]],
  outputDir: 'docs/playwright/test-results',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
