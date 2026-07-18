import { describe, expect, it } from 'vitest';
import { migrateItchyJogSettings } from './jogFeel.js';
import {
  defaultSettings,
  mergeSettings,
  parseSettings,
  type Settings,
} from './settings.js';

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

  it('fills mixer.jog when missing from older settings files', () => {
    const legacy = structuredClone(defaultSettings);
    const { jog: _removed, ...mixerWithoutJog } = legacy.mixer;
    void _removed;
    const merged = mergeSettings(defaultSettings, {
      ...legacy,
      mixer: mixerWithoutJog as Settings['mixer'],
    });
    // When patch.mixer omits jog, deepMerge keeps base.jog
    const result = parseSettings(merged);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.mixer.jog.dualZone).toBe(false);
      expect(result.settings.mixer.jog.fineSeekMs).toBe(defaultSettings.mixer.jog.fineSeekMs);
    }
  });

  it('accepts jog patch', () => {
    const next = mergeSettings(defaultSettings, {
      mixer: { jog: { fineSeekMs: 3, spinSeekMs: 40 } },
    });
    expect(next.mixer.jog.fineSeekMs).toBe(3);
    expect(next.mixer.jog.spinSeekMs).toBe(40);
    expect(next.mixer.jog.dualZone).toBe(false);
    expect(parseSettings(next).ok).toBe(true);
  });

  it('migrates legacy itchy jog defaults to subtle factory', () => {
    const itchy = {
      dualZone: true,
      fineSeekMs: 2,
      spinSeekMs: 32,
      fineRatePercent: 0.3,
      spinRatePercent: 12,
      rateDecayMs: 380,
      pausedFineSeekMs: 5,
      pausedSpinSeekMs: 40,
      spinStartsAtTps: 18,
      spinFullAtTps: 85,
    };
    const next = migrateItchyJogSettings(itchy);
    expect(next.fineSeekMs).toBe(defaultSettings.mixer.jog.fineSeekMs);
    expect(next.dualZone).toBe(false);
    expect(next.spinStartsAtTps).toBe(defaultSettings.mixer.jog.spinStartsAtTps);
  });
});
