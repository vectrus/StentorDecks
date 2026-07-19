import { isCamelotKey, type CamelotKey } from '@stentordeck/shared';
import type { DeckStore } from './DeckStore';

function keyIfPresent(d: DeckStore): CamelotKey | null {
  if (d.state === 'empty') return null;
  const k = d.keyCamelot;
  return k != null && isCamelotKey(k) ? k : null;
}

/**
 * Key to suggest “what fits next” against — prefer a playing deck, else a loaded one.
 * If both play, prefer A (outgoing often stays on A in two-deck sets).
 * Used by `~` row hints (not the harmonic soft-rank sort).
 */
export function mixReferenceKey(deckA: DeckStore, deckB: DeckStore): CamelotKey | null {
  if (deckA.state === 'playing') {
    const k = keyIfPresent(deckA);
    if (k) return k;
  }
  if (deckB.state === 'playing') {
    const k = keyIfPresent(deckB);
    if (k) return k;
  }
  return keyIfPresent(deckA) ?? keyIfPresent(deckB);
}

/**
 * Harmonic soft-rank / mixmatch reference — **playing deck only**.
 * If both play, prefer A. Null when nothing is playing (boost is a no-op).
 */
export function playingReferenceKey(deckA: DeckStore, deckB: DeckStore): CamelotKey | null {
  if (deckA.state === 'playing') {
    const k = keyIfPresent(deckA);
    if (k) return k;
  }
  if (deckB.state === 'playing') {
    const k = keyIfPresent(deckB);
    if (k) return k;
  }
  return null;
}

/** Pitch-fader BPM of the playing reference deck (A preferred if both play). */
export function playingReferenceBpm(deckA: DeckStore, deckB: DeckStore): number | null {
  if (deckA.state === 'playing' && deckA.pitchOnlyBpm != null) return deckA.pitchOnlyBpm;
  if (deckB.state === 'playing' && deckB.pitchOnlyBpm != null) return deckB.pitchOnlyBpm;
  return null;
}

/** Track ids loaded on either deck (exclude from Next up). */
export function loadedTrackIds(deckA: DeckStore, deckB: DeckStore): Set<number> {
  const ids = new Set<number>();
  if (deckA.libraryTrackId != null) ids.add(deckA.libraryTrackId);
  if (deckB.libraryTrackId != null) ids.add(deckB.libraryTrackId);
  return ids;
}
