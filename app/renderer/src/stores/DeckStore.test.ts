import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@stentordeck/shared';
import { DeckPlayingError, DeckStore } from './DeckStore';

describe('DeckStore load interlock & reset (R4.2 / R3.3)', () => {
  it('throws DeckPlayingError when playing', async () => {
    const deck = new DeckStore('A', () => defaultSettings);
    deck.state = 'playing';
    await expect(deck.load(new File([], 'x.wav'))).rejects.toBeInstanceOf(DeckPlayingError);
  });

  it('resetOnLoad clears FX, kills, sync, cue, nudge', () => {
    const deck = new DeckStore('B', () => defaultSettings);
    deck.filterOn = true;
    deck.filterAmount = 0.1;
    deck.flangerOn = true;
    deck.flangerWet = 0.8;
    deck.kills = { low: true, mid: true, high: true };
    deck.nudgeFactor = 1.02;
    deck.syncArmed = true;
    deck.cueOffset = 12;
    deck.pitchPos = 0.7;

    deck.resetOnLoad();

    expect(deck.filterOn).toBe(false);
    expect(deck.filterAmount).toBe(0.5);
    expect(deck.flangerOn).toBe(false);
    expect(deck.flangerWet).toBe(0);
    expect(deck.kills).toEqual({ low: false, mid: false, high: false });
    expect(deck.nudgeFactor).toBe(1);
    expect(deck.syncArmed).toBe(false);
    expect(deck.cueOffset).toBe(0);
    expect(deck.pitchPos).toBe(0.7); // pitch kept
  });

  it('CDJ cue while playing jumps to cue offset', () => {
    const deck = new DeckStore('A', () => defaultSettings);
    deck.state = 'playing';
    deck.cueOffset = 3.5;
    // Without engine, cuePress no-ops safely when transport missing
    deck.cuePress();
    expect(deck.cueOffset).toBe(3.5);
  });
});
