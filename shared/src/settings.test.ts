import { describe, expect, it } from 'vitest';
import { defaultSettings, mergeSettings, parseSettings } from './settings.js';

describe('settings schema', () => {
  it('accepts defaults', () => {
    const result = parseSettings(defaultSettings);
    expect(result.ok).toBe(true);
  });

  it('rejects bad scale', () => {
    const result = parseSettings({
      ...defaultSettings,
      ui: { ...defaultSettings.ui, scale: 110 },
    });
    expect(result.ok).toBe(false);
  });

  it('merges nested patch', () => {
    const next = mergeSettings(defaultSettings, { ui: { scale: 150 } });
    expect(next.ui.scale).toBe(150);
    expect(next.ui.deckAColor).toBe(defaultSettings.ui.deckAColor);
  });
});
