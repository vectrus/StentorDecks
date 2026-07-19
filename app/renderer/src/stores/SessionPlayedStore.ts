import { makeAutoObservable } from 'mobx';
import type { DeckStore } from './DeckStore';

/** Cumulative play wall-clock before a track counts as session-played (R5.8). */
export const SESSION_PLAYED_THRESHOLD_SEC = 30;

type DeckAccum = {
  trackId: number | null;
  sec: number;
};

/**
 * In-memory “played this session” set (R5.8).
 * Marks after ≥ 30 s cumulative transport play on either deck.
 */
export class SessionPlayedStore {
  /** Observable membership — mutated only via actions. */
  private readonly played = new Set<number>();
  /** Revision so MobX observers re-render when the Set mutates. */
  version = 0;

  private accumA: DeckAccum = { trackId: null, sec: 0 };
  private accumB: DeckAccum = { trackId: null, sec: 0 };
  private lastTickMs = 0;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get playedCount(): number {
    void this.version;
    return this.played.size;
  }

  isPlayed(trackId: number | null | undefined): boolean {
    void this.version;
    if (trackId == null || trackId <= 0) return false;
    return this.played.has(trackId);
  }

  clear(): void {
    this.played.clear();
    this.accumA = { trackId: null, sec: 0 };
    this.accumB = { trackId: null, sec: 0 };
    this.version += 1;
  }

  /**
   * Call once per audio frame with both decks.
   * Large dt gaps (tab background / sleep) are ignored so we don't jump-mark.
   */
  tick(deckA: DeckStore, deckB: DeckStore): void {
    const now =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const dtSec = this.lastTickMs > 0 ? (now - this.lastTickMs) / 1000 : 0;
    this.lastTickMs = now;
    if (dtSec <= 0 || dtSec > 0.5) return;
    this.step(deckA, this.accumA, dtSec);
    this.step(deckB, this.accumB, dtSec);
  }

  private step(deck: DeckStore, accum: DeckAccum, dtSec: number): void {
    const id = deck.libraryTrackId;
    // Pause keeps accum so cumulative play can reach 30 s across gaps.
    if (id == null || id <= 0 || deck.state !== 'playing') return;
    if (accum.trackId !== id) {
      accum.trackId = id;
      accum.sec = 0;
    }
    if (this.played.has(id)) return;
    accum.sec += dtSec;
    if (accum.sec >= SESSION_PLAYED_THRESHOLD_SEC) {
      this.played.add(id);
      this.version += 1;
    }
  }
}

export const sessionPlayedStore = new SessionPlayedStore();
