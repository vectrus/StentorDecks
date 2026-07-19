import {
  camelotHarmonicSortRank,
  type CamelotKey,
  isCamelotKey,
} from './camelot.js';

/** Candidate row for rules-only mixmatch (V2-B). */
export type MixmatchCandidate = {
  id: number;
  bpm: number | null;
  keyCamelot: string | null;
};

export type MixmatchScore = {
  id: number;
  score: number;
  harmonicRank: number;
  bpmDelta: number | null;
};

const DEFAULT_LIMIT = 8;
/** Prefer within this many BPM of the playing pitch-fader BPM (half/double aware). */
const BPM_BAND = 6;

/**
 * Absolute BPM distance after considering half/double aliases of `candidateBpm`.
 */
export function bpmDistanceHalfDouble(refBpm: number, candidateBpm: number): number {
  if (!Number.isFinite(refBpm) || !Number.isFinite(candidateBpm) || refBpm <= 0 || candidateBpm <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  const aliases = [candidateBpm, candidateBpm * 2, candidateBpm / 2];
  let best = Number.POSITIVE_INFINITY;
  for (const a of aliases) {
    best = Math.min(best, Math.abs(refBpm - a));
  }
  return best;
}

/**
 * Rank library tracks for “Next up” (rules only — no LLM).
 * Higher score = better suggestion. Excludes `excludeIds`.
 */
export function scoreMixmatchRules(
  candidates: readonly MixmatchCandidate[],
  opts: {
    refKey: CamelotKey | null;
    refBpm: number | null;
    excludeIds?: ReadonlySet<number>;
    playedIds?: ReadonlySet<number>;
    limit?: number;
  },
): MixmatchScore[] {
  const exclude = opts.excludeIds ?? new Set<number>();
  const played = opts.playedIds ?? new Set<number>();
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const scored: MixmatchScore[] = [];

  for (const c of candidates) {
    if (exclude.has(c.id)) continue;
    const harmonicRank =
      opts.refKey != null ? camelotHarmonicSortRank(opts.refKey, c.keyCamelot) : 3;
    const bpmDelta =
      opts.refBpm != null && c.bpm != null ? bpmDistanceHalfDouble(opts.refBpm, c.bpm) : null;

    // Prefer harmonic band 0, then 1; BPM closeness; demote session-played.
    let score = 100;
    score -= harmonicRank * 25;
    if (bpmDelta != null && Number.isFinite(bpmDelta)) {
      if (bpmDelta <= BPM_BAND) score += 20 - bpmDelta;
      else score -= Math.min(40, bpmDelta);
    } else {
      score -= 5;
    }
    if (played.has(c.id)) score -= 30;
    if (opts.refKey != null && c.keyCamelot != null && isCamelotKey(c.keyCamelot)) {
      // tiny tie-break: exact same key
      if (c.keyCamelot === opts.refKey) score += 3;
    }

    scored.push({ id: c.id, score, harmonicRank, bpmDelta });
  }

  scored.sort((a, b) => b.score - a.score || a.id - b.id);
  return scored.slice(0, limit);
}
