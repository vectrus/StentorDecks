import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@stentordeck/shared';
import { DeckStore } from './DeckStore';
import { mixReferenceKey } from './mixReferenceKey';

describe('mixReferenceKey', () => {
  it('prefers playing deck key', () => {
    const a = new DeckStore('A', () => defaultSettings);
    const b = new DeckStore('B', () => defaultSettings);
    a.state = 'stopped';
    a.keyCamelot = '8A';
    b.state = 'playing';
    b.keyCamelot = '5A';
    expect(mixReferenceKey(a, b)).toBe('5A');
  });

  it('falls back to loaded deck A', () => {
    const a = new DeckStore('A', () => defaultSettings);
    const b = new DeckStore('B', () => defaultSettings);
    a.state = 'stopped';
    a.keyCamelot = '9B';
    expect(mixReferenceKey(a, b)).toBe('9B');
  });
});
