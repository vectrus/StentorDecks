import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { mockStentorInitScript } from '../../e2e/fixtures/mockStentor';
import { docScreenshotMockOptions, docScreenshotSettings } from './docLibraryFixture';

const outDir = path.join(process.cwd(), 'docs/screenshots');

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    mockStentorInitScript(docScreenshotSettings(), docScreenshotMockOptions()),
  );
});

async function bootApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Performance' })).toBeVisible({
    timeout: 45_000,
  });
  // Settings only auto-opens when roots are empty; dismiss if somehow open.
  const settings = page.getByRole('dialog', { name: 'Settings' });
  if (await settings.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
  }
  // Cue bind fails in headless Chromium — hide the banner so README shots stay clean.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('.banner')) {
      (el as HTMLElement).style.display = 'none';
    }
  });
}

async function openFolder(page: Page, name: string): Promise<void> {
  const tree = page.getByRole('navigation', { name: /folder/i });
  // Native DOM click — Perf strip overlays block Playwright's pointer hit-test even with force.
  await tree
    .getByRole('button', { name: new RegExp(name, 'i') })
    .first()
    .evaluate((el) => (el as HTMLButtonElement).click());
  await expect(page.getByText('Night Drive').or(page.getByText('Afterhours'))).toBeVisible({
    timeout: 10_000,
  });
}

async function shot(page: Page, file: string): Promise<void> {
  const png = path.join(outDir, file);
  await page.waitForTimeout(350);
  await page.screenshot({ path: png, fullPage: false });
  expect(fs.existsSync(png)).toBeTruthy();
}

test.describe('Live app documentation screenshots', () => {
  test('01 performance mode', async ({ page }) => {
    await bootApp(page);
    await page.getByRole('button', { name: 'Performance' }).click();
    await openFolder(page, 'Techno');
    await shot(page, '01-performance-mode.png');
  });

  test('02 library mode', async ({ page }) => {
    await bootApp(page);
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Folder tree' })).toBeVisible();
    await openFolder(page, 'House');
    await shot(page, '02-prep-mode.png');
  });

  test('03 audio setup', async ({ page }) => {
    await bootApp(page);
    await page.getByRole('button', { name: 'Audio', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Audio setup' })).toBeVisible();
    await shot(page, '03-audio-setup.png');
  });

  test('05 mixer column', async ({ page }) => {
    await bootApp(page);
    await page.getByRole('button', { name: 'Performance' }).click();
    const mixer = page.locator('.perf-mixer');
    await expect(mixer).toBeVisible();
    await page.waitForTimeout(350);
    await mixer.screenshot({ path: path.join(outDir, '05-mixer-column.png') });
    expect(fs.existsSync(path.join(outDir, '05-mixer-column.png'))).toBeTruthy();
  });

  test('06 fader curve editor', async ({ page }) => {
    await bootApp(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await page.getByRole('button', { name: /Faders & mixer/i }).click();
    await expect(page.getByText(/Channel fader curve|curve|Linear|Smooth/i).first()).toBeVisible();
    await shot(page, '06-fader-curve-editor.png');
  });
});
