import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@stentordeck/shared';
import { DeckStore } from './DeckStore';
import { mixReferenceKey, playingReferenceKey } from './mixReferenceKey';

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

describe('playingReferenceKey', () => {
  it('returns null when nothing is playing', () => {
    const a = new DeckStore('A', () => defaultSettings);
    const b = new DeckStore('B', () => defaultSettings);
    a.state = 'stopped';
    a.keyCamelot = '8A';
    expect(playingReferenceKey(a, b)).toBeNull();
  });

  it('prefers playing A over playing B', () => {
    const a = new DeckStore('A', () => defaultSettings);
    const b = new DeckStore('B', () => defaultSettings);
    a.state = 'playing';
    a.keyCamelot = '8A';
    b.state = 'playing';
    b.keyCamelot = '5A';
    expect(playingReferenceKey(a, b)).toBe('8A');
  });
});
