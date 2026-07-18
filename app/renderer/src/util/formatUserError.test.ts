import { describe, expect, it } from 'vitest';
import { formatUserError } from './formatUserError';

describe('formatUserError', () => {
  it('explains decode failures with a next step', () => {
    const msg = formatUserError(new Error('OfflineAudioContext is not defined'), 'Couldn’t load');
    expect(msg).toMatch(/decode/i);
    expect(msg).toMatch(/Try:/i);
    expect(msg).toMatch(/Detail:/);
  });

  it('explains playing-deck load interlock', () => {
    const msg = formatUserError(new Error('Deck A is playing'), 'Couldn’t load');
    expect(msg).toMatch(/playing/i);
    expect(msg).toMatch(/pause/i);
  });
});
