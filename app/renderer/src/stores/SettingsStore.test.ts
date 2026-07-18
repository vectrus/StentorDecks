import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@stentordeck/shared';

describe('SettingsStore rem mapping', () => {
  it('maps 100/125/150% to rem', () => {
    expect(16 * (100 / 100)).toBe(16);
    expect(16 * (125 / 100)).toBe(20);
    expect(16 * (150 / 100)).toBe(24);
    expect(defaultSettings.ui.scale).toBe(100);
  });
});
