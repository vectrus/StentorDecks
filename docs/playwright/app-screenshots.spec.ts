import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
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
  // ?docShot=1 exposes stores for seeding a playing deck (Next up / harmonic shots).
  await page.goto('/?docShot=1');
  await expect(page.getByRole('button', { name: 'Performance' })).toBeVisible({
    timeout: 60_000,
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

/** Fake a playing deck A (8A / 132) so Next up + harmonic soft-rank light up. */
async function seedPlayingDeckA(page: Page): Promise<void> {
  await page.evaluate(() => {
    const shot = (
      window as unknown as {
        __stentorDocShot?: {
          deckA: {
            state: string;
            keyCamelot: string | null;
            fileBpm: number | null;
            libraryTrackId: number | null;
            title: string;
            artist: string;
          };
          mixmatchStore: { recompute: () => Promise<void> };
        };
      }
    ).__stentorDocShot;
    if (!shot) throw new Error('__stentorDocShot missing — boot with ?docShot=1');
    const d = shot.deckA;
    d.state = 'playing';
    d.keyCamelot = '8A';
    d.fileBpm = 132;
    d.libraryTrackId = 1;
    d.title = 'Night Drive';
    d.artist = 'Vector Line';
    return shot.mixmatchStore.recompute();
  });
}

async function openFolder(page: Page, name: string): Promise<void> {
  const tree = page.getByRole('navigation', { name: /folder/i });
  // Native DOM click — Perf strip overlays block Playwright's pointer hit-test even with force.
  await tree
    .getByRole('button', { name: new RegExp(name, 'i') })
    .first()
    .evaluate((el) => (el as HTMLButtonElement).click());
  await expect(
    page
      .locator('.prep-col.track, .perf-col.track')
      .filter({ hasText: /Night Drive|Afterhours|Warehouse/i })
      .first(),
  ).toBeVisible({ timeout: 10_000 });
}

async function shot(page: Page, file: string): Promise<void> {
  const png = path.join(outDir, file);
  await page.waitForTimeout(350);
  await page.screenshot({ path: png, fullPage: false });
  expect(fs.existsSync(png)).toBeTruthy();
}

async function shotLocator(locator: Locator, file: string): Promise<void> {
  const png = path.join(outDir, file);
  await expect(locator).toBeVisible();
  await pageWait(locator);
  await locator.screenshot({ path: png });
  expect(fs.existsSync(png)).toBeTruthy();
}

async function pageWait(locator: Locator): Promise<void> {
  await locator.page().waitForTimeout(350);
}

async function openSettingsSection(page: Page, section: RegExp): Promise<Locator> {
  // Taller viewport so Faders (curve + EQ) fits without scroll for website crops.
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name: section }).click();
  return page.locator('.settings-panel');
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
    await seedPlayingDeckA(page);
    await openFolder(page, 'Techno');
    await expect(page.getByLabel('Next up suggestions')).toBeVisible();
    await expect(page.locator('.next-up-item').first()).toBeVisible({ timeout: 15_000 });
    await shot(page, '02-prep-mode.png');
  });

  test('03 audio setup', async ({ page }) => {
    await bootApp(page);
    await page.getByRole('button', { name: 'Audio', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Audio setup' })).toBeVisible();
    await shot(page, '03-audio-setup.png');
  });

  test('04 help panel', async ({ page }) => {
    await bootApp(page);
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    const panel = page.locator('.help-panel');
    await expect(page.getByRole('dialog', { name: 'Help' })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Help', exact: true })).toBeVisible();
    await shotLocator(panel, '04-help-panel.png');
  });

  test('05 mixer column', async ({ page }) => {
    await bootApp(page);
    await page.getByRole('button', { name: 'Performance' }).click();
    const mixer = page.locator('.perf-mixer');
    await shotLocator(mixer, '05-mixer-column.png');
  });

  test('06 settings faders & mixer', async ({ page }) => {
    await bootApp(page);
    const panel = await openSettingsSection(page, /Faders & mixer/i);
    await expect(panel.getByText(/Channel faders|Curve shape/i).first()).toBeVisible();
    await shotLocator(panel, '06-fader-curve-editor.png');
    // Stable website alias (same PNG).
    fs.copyFileSync(
      path.join(outDir, '06-fader-curve-editor.png'),
      path.join(outDir, '06-settings-faders-mixer.png'),
    );
  });

  test('07 settings jog feel', async ({ page }) => {
    await bootApp(page);
    const panel = await openSettingsSection(page, /Jog feel/i);
    await expect(panel.getByText(/Vinyl|CDJ|Chunk|preset/i).first()).toBeVisible();
    await shotLocator(panel, '07-settings-jog.png');
  });

  test('08 settings library', async ({ page }) => {
    await bootApp(page);
    const panel = await openSettingsSection(page, /^Library/i);
    await expect(panel.getByText(/Harmonic neighbours first/i)).toBeVisible();
    await expect(panel.getByText(/Next up \(mixmatch\)/i)).toBeVisible();
    // Scroll new controls into the crop if the panel is tall.
    await panel.getByText(/Harmonic neighbours first/i).scrollIntoViewIfNeeded();
    await shotLocator(panel, '08-settings-library.png');
  });

  test('09 settings display', async ({ page }) => {
    await bootApp(page);
    const panel = await openSettingsSection(page, /Display/i);
    await expect(panel.getByText(/Scale|tick/i).first()).toBeVisible();
    await shotLocator(panel, '09-settings-display.png');
  });

  test('10 settings midi', async ({ page }) => {
    await bootApp(page);
    const panel = await openSettingsSection(page, /^MIDI/i);
    await expect(panel.getByText(/RMX2|controller|profile|Learn/i).first()).toBeVisible();
    await shotLocator(panel, '10-settings-midi.png');
  });

  test('11 settings updates', async ({ page }) => {
    await bootApp(page);
    const panel = await openSettingsSection(page, /Updates/i);
    await expect(panel.getByText(/Check for updates|GitHub|version/i).first()).toBeVisible();
    await shotLocator(panel, '11-settings-updates.png');
  });

  test('12 next up strip', async ({ page }) => {
    await bootApp(page);
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    await seedPlayingDeckA(page);
    await openFolder(page, 'Techno');
    const strip = page.getByLabel('Next up suggestions');
    await expect(strip.locator('.next-up-item').first()).toBeVisible({ timeout: 15_000 });
    await shotLocator(strip, '12-next-up.png');
  });
});
