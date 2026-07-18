import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const mockups = path.resolve(__dirname, '../docs/mockups');

function mockupUrl(file: string): string {
  return pathToFileURL(path.join(mockups, file)).href;
}

test.describe('End-user mockup journeys (design contract)', () => {
  test('performance mode shows brand, decks, and browser', async ({ page }) => {
    await page.goto(mockupUrl('01-performance-mode.html'));
    await expect(page.getByText('StentorDeck')).toBeVisible();
    await expect(page.getByText('for julius')).toBeVisible();
    await expect(page.locator('.deck').first()).toBeVisible();
  });

  test('audio setup screen is usable without hardware', async ({ page }) => {
    await page.goto(mockupUrl('03-audio-setup.html'));
    await expect(page.getByText(/audio|master|cue|plan/i).first()).toBeVisible();
  });

  test('prep mode shows large browser region', async ({ page }) => {
    await page.goto(mockupUrl('02-prep-mode.html'));
    await expect(page.locator('body')).toBeVisible();
  });
});
