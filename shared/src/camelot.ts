/** Camelot wheel keys for Prep picker (R6.6). */

export const CAMELOT_KEYS = [
  '1A',
  '2A',
  '3A',
  '4A',
  '5A',
  '6A',
  '7A',
  '8A',
  '9A',
  '10A',
  '11A',
  '12A',
  '1B',
  '2B',
  '3B',
  '4B',
  '5B',
  '6B',
  '7B',
  '8B',
  '9B',
  '10B',
  '11B',
  '12B',
] as const;

export type CamelotKey = (typeof CAMELOT_KEYS)[number];

const CAMELOT_TO_NAME: Record<CamelotKey, string> = {
  '1A': 'Ab minor',
  '2A': 'Eb minor',
  '3A': 'Bb minor',
  '4A': 'F minor',
  '5A': 'C minor',
  '6A': 'G minor',
  '7A': 'D minor',
  '8A': 'A minor',
  '9A': 'E minor',
  '10A': 'B minor',
  '11A': 'F# minor',
  '12A': 'Db minor',
  '1B': 'B major',
  '2B': 'F# major',
  '3B': 'Db major',
  '4B': 'Ab major',
  '5B': 'Eb major',
  '6B': 'Bb major',
  '7B': 'F major',
  '8B': 'C major',
  '9B': 'G major',
  '10B': 'D major',
  '11B': 'A major',
  '12B': 'E major',
};

export function camelotDisplayName(key: CamelotKey): string {
  return CAMELOT_TO_NAME[key];
}

export function isCamelotKey(s: string): s is CamelotKey {
  return (CAMELOT_KEYS as readonly string[]).includes(s);
}

/** Classic Mixed-in-Key / Camelot “safe” next-track relations. */
export type CamelotRelation = 'same' | 'adjacent' | 'relative';

function parseCamelotParts(key: CamelotKey): { n: number; letter: 'A' | 'B' } {
  const m = /^(\d{1,2})([AB])$/.exec(key);
  if (!m) return { n: 0, letter: 'A' };
  return { n: Number(m[1]), letter: m[2] as 'A' | 'B' };
}

/**
 * Harmonic distance on the Camelot wheel (for “play next” hints).
 * Compatible = same key, ±1 number same letter, or relative major/minor (same number).
 */
export function camelotRelation(a: string, b: string): CamelotRelation | null {
  if (!isCamelotKey(a) || !isCamelotKey(b)) return null;
  if (a === b) return 'same';
  const pa = parseCamelotParts(a);
  const pb = parseCamelotParts(b);
  if (pa.n === pb.n && pa.letter !== pb.letter) return 'relative';
  if (pa.letter === pb.letter) {
    const d = Math.min((pa.n - pb.n + 12) % 12, (pb.n - pa.n + 12) % 12);
    if (d === 1) return 'adjacent';
  }
  return null;
}

export function isCamelotCompatible(a: string, b: string): boolean {
  return camelotRelation(a, b) != null;
}

/**
 * Tap-tempo average (R6.6): need ≥ minTaps timestamps; BPM from mean inter-onset.
 * Returns null until enough taps; clamps to 60–220.
 */
export function averageTapBpm(timestampsMs: number[], minTaps = 4): number | null {
  if (timestampsMs.length < minTaps) return null;
  const recent = timestampsMs.slice(-(minTaps + 2));
  if (recent.length < 2) return null;
  let sum = 0;
  let n = 0;
  for (let i = 1; i < recent.length; i++) {
    const dt = recent[i]! - recent[i - 1]!;
    if (dt <= 0 || dt > 2000) continue; // ignore gaps > 2s
    sum += dt;
    n += 1;
  }
  if (n === 0) return null;
  const bpm = 60000 / (sum / n);
  if (!Number.isFinite(bpm)) return null;
  return Math.round(Math.min(220, Math.max(60, bpm)) * 10) / 10;
}
