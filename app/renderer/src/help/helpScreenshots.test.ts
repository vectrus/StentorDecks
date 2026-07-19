import { describe, expect, it } from 'vitest';
import { helpScreenshotCount, resolveHelpImageSrc } from './helpScreenshots';

describe('helpScreenshots', () => {
  it('bundles the docs/screenshots pack', () => {
    expect(helpScreenshotCount()).toBeGreaterThanOrEqual(8);
  });

  it('resolves relative guide paths used in markdown', () => {
    const src = resolveHelpImageSrc('../screenshots/06-settings-faders-mixer.png');
    expect(src).toBeTruthy();
    expect(src).toMatch(/06-settings-faders-mixer/);
  });

  it('resolves bare filenames', () => {
    expect(resolveHelpImageSrc('01-performance-mode.png')).toBeTruthy();
  });

  it('passes through https URLs', () => {
    expect(resolveHelpImageSrc('https://example.com/a.png')).toBe('https://example.com/a.png');
  });

  it('returns null for unknown files', () => {
    expect(resolveHelpImageSrc('../screenshots/nope-missing.png')).toBeNull();
  });
});
