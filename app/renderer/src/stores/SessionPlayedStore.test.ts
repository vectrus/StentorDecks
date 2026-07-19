import { describe, expect, it } from 'vitest';
import {
  SESSION_PLAYED_THRESHOLD_SEC,
  SessionPlayedStore,
} from './SessionPlayedStore';

type FakeDeck = {
  libraryTrackId: number | null;
  state: 'empty' | 'stopped' | 'playing';
};

function advance(
  store: SessionPlayedStore,
  a: FakeDeck,
  b: FakeDeck,
  clock: { now: number },
  totalSec: number,
  stepSec = 0.1,
): void {
  const steps = Math.round(totalSec / stepSec);
  for (let i = 0; i < steps; i++) {
    clock.now += stepSec * 1000;
    store.tick(a as never, b as never);
  }
}

describe('SessionPlayedStore (R5.8)', () => {
  it('marks after cumulative ≥ 30 s play; pause does not erase progress', () => {
    const store = new SessionPlayedStore();
    const a: FakeDeck = { libraryTrackId: 7, state: 'playing' };
    const b: FakeDeck = { libraryTrackId: null, state: 'empty' };
    const clock = { now: 1000 };
    const orig = performance.now;
    performance.now = () => clock.now;

    store.tick(a as never, b as never);
    advance(store, a, b, clock, 20);
    expect(store.isPlayed(7)).toBe(false);

    a.state = 'stopped';
    advance(store, a, b, clock, 1);

    a.state = 'playing';
    advance(store, a, b, clock, 15);
    expect(store.isPlayed(7)).toBe(true);
    expect(store.playedCount).toBe(1);

    performance.now = orig;
  });

  it('does not mark load-only or short play', () => {
    const store = new SessionPlayedStore();
    const a: FakeDeck = { libraryTrackId: 3, state: 'stopped' };
    const b: FakeDeck = { libraryTrackId: null, state: 'empty' };
    const clock = { now: 0 };
    const orig = performance.now;
    performance.now = () => clock.now;
    store.tick(a as never, b as never);
    a.state = 'playing';
    advance(store, a, b, clock, 10);
    expect(store.isPlayed(3)).toBe(false);
    expect(SESSION_PLAYED_THRESHOLD_SEC).toBe(30);
    performance.now = orig;
  });

  it('clear removes marks and requires another 30 s', () => {
    const store = new SessionPlayedStore();
    const a: FakeDeck = { libraryTrackId: 9, state: 'playing' };
    const b: FakeDeck = { libraryTrackId: null, state: 'empty' };
    const clock = { now: 0 };
    const orig = performance.now;
    performance.now = () => clock.now;
    store.tick(a as never, b as never);
    advance(store, a, b, clock, 35);
    expect(store.isPlayed(9)).toBe(true);
    store.clear();
    expect(store.isPlayed(9)).toBe(false);
    advance(store, a, b, clock, 10);
    expect(store.isPlayed(9)).toBe(false);
    advance(store, a, b, clock, 25);
    expect(store.isPlayed(9)).toBe(true);
    performance.now = orig;
  });

  it('ignores large dt gaps (sleep / background)', () => {
    const store = new SessionPlayedStore();
    const a: FakeDeck = { libraryTrackId: 1, state: 'playing' };
    const b: FakeDeck = { libraryTrackId: null, state: 'empty' };
    let now = 0;
    const orig = performance.now;
    performance.now = () => now;
    store.tick(a as never, b as never);
    now += 60_000;
    store.tick(a as never, b as never);
    expect(store.isPlayed(1)).toBe(false);
    performance.now = orig;
  });
});
