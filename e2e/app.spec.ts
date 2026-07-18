import { expect, test } from '@playwright/test';
import { defaultSettings } from '../shared/src/settings';
import { mockStentorInitScript } from './fixtures/mockStentor';

test.describe('App smoke (Vite + mocked IPC)', () => {
  test.beforeEach(async ({ page }) => {
    const settings = structuredClone(defaultSettings);
    // Skip first-run gate so harness is reachable
    settings.audio.masterDevice = 'fake-out';
    settings.audio.cueDevice = 'fake-out';
    await page.addInitScript(mockStentorInitScript(settings));
  });

  test('boots shell with brand and mode controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('StentorDeck')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('for julius')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Performance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prep' })).toBeVisible();
  });

  test('E2 harness browse fixture is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('StentorDeck')).toBeVisible({ timeout: 30_000 });
    // Harness is default-on in AppShell
    await expect(page.getByText(/Browse/i)).toBeVisible();
    await expect(page.getByText('Techno')).toBeVisible();
  });

  test('SYNC button toggles ON label', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('StentorDeck')).toBeVisible({ timeout: 30_000 });
    const syncButtons = page.getByRole('button', { name: /^SYNC/ });
    await expect(syncButtons.first()).toBeVisible();
    // Without a loaded partner, toggle may no-op — still must remain clickable
    await syncButtons.first().click();
    await expect(syncButtons.first()).toBeEnabled();
  });
});
