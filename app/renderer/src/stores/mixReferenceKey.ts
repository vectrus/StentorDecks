import { isCamelotKey, type CamelotKey } from '@stentordeck/shared';
import type { DeckStore } from './DeckStore';

/**
 * Key to suggest “what fits next” against — prefer a playing deck, else a loaded one.
 * If both play, prefer A (outgoing often stays on A in two-deck sets).
 */
export function mixReferenceKey(deckA: DeckStore, deckB: DeckStore): CamelotKey | null {
  const pick = (d: DeckStore): CamelotKey | null => {
    if (d.state === 'empty') return null;
    const k = d.keyCamelot;
    return k != null && isCamelotKey(k) ? k : null;
  };
  if (deckA.state === 'playing') {
    const k = pick(deckA);
    if (k) return k;
  }
  if (deckB.state === 'playing') {
    const k = pick(deckB);
    if (k) return k;
  }
  return pick(deckA) ?? pick(deckB);
}
