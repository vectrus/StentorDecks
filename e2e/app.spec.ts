import { expect, test } from '@playwright/test';
import { defaultSettings } from '../shared/src/settings';
import { mockStentorInitScript } from './fixtures/mockStentor';

test.describe('App smoke (Vite + mocked IPC)', () => {
  test.beforeEach(async ({ page }) => {
    const settings = structuredClone(defaultSettings);
    // Skip first-run gate so Performance/Prep are reachable
    settings.audio.masterDevice = 'fake-out';
    settings.audio.cueDevice = 'fake-out';
    settings.library.roots = ['C:\\Music'];
    await page.addInitScript(
      mockStentorInitScript(settings, {
        library: {
          folders: [{ path: 'C:\\Music', name: 'Music', children: [] }],
          tracks: [],
          trackCount: 0,
        },
      }),
    );
  });

  test('boots shell with brand and mode controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('StentorDeck')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('for julius')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Performance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Library', exact: true })).toBeVisible();
  });

  test('Performance and Library modes switch', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Performance' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Folder tree' })).toBeVisible();
    await page.getByRole('button', { name: 'Performance' }).click();
    await expect(page.getByRole('button', { name: 'Load A' })).toBeVisible();
  });

  test('SYNC control is present on decks', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('StentorDeck')).toBeVisible({ timeout: 30_000 });
    const syncButtons = page.getByRole('button', { name: /^SYNC/ });
    await expect(syncButtons.first()).toBeVisible();
    // Empty decks keep SYNC disabled (needs a loaded partner) — still must render.
    await expect(syncButtons.first()).toBeDisabled();
  });
});
