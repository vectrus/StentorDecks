import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const mockupsDir = path.join(process.cwd(), 'docs/mockups');
const outDir = path.join(mockupsDir, 'screenshots');

const MOCKUPS = [
  '01-performance-mode.html',
  '02-prep-mode.html',
  '03-audio-setup.html',
  '04-deck-panel-states.html',
  '05-mixer-column.html',
  '06-fader-curve-editor.html',
] as const;

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

for (const file of MOCKUPS) {
  test(`screenshot ${file}`, async ({ page }) => {
    const fileUrl = pathToFileUrl(path.join(mockupsDir, file));
    await page.goto(fileUrl);
    // Allow webfont/CDN icons a moment; layout is valid without them.
    await page.waitForTimeout(400);
    const png = path.join(outDir, file.replace(/\.html$/i, '.png'));
    await page.screenshot({ path: png, fullPage: true });
    expect(fs.existsSync(png)).toBeTruthy();
  });
}

function pathToFileUrl(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/');
  if (/^[A-Za-z]:/.test(normalized)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized}`;
}
