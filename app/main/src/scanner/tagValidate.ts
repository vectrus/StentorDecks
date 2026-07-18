/**
 * Tag BPM / key trust rules (docs/05 / R6.1 / R6.2).
 * Pure — unit-tested without music-metadata.
 */

const BPM_MIN = 60;
const BPM_MAX = 220;

/** Camelot wheel codes we accept from tags (e.g. 8A, 12B). */
const CAMELOT_RE = /^(1[0-2]|[1-9])[ABab]$/;

/** Common open-key / note names → Camelot (subset for tags). */
const NOTE_TO_CAMELOT: Record<string, { camelot: string; name: string }> = {
  am: { camelot: '8A', name: 'A minor' },
  'a minor': { camelot: '8A', name: 'A minor' },
  amin: { camelot: '8A', name: 'A minor' },
  c: { camelot: '8B', name: 'C major' },
  'c major': { camelot: '8B', name: 'C major' },
  cmaj: { camelot: '8B', name: 'C major' },
  em: { camelot: '9A', name: 'E minor' },
  'e minor': { camelot: '9A', name: 'E minor' },
  g: { camelot: '9B', name: 'G major' },
  'g major': { camelot: '9B', name: 'G major' },
  bm: { camelot: '10A', name: 'B minor' },
  'b minor': { camelot: '10A', name: 'B minor' },
  d: { camelot: '10B', name: 'D major' },
  'd major': { camelot: '10B', name: 'D major' },
  'f#m': { camelot: '11A', name: 'F# minor' },
  'gbm': { camelot: '11A', name: 'F# minor' },
  a: { camelot: '11B', name: 'A major' },
  'a major': { camelot: '11B', name: 'A major' },
  'c#m': { camelot: '12A', name: 'C# minor' },
  'dbm': { camelot: '12A', name: 'C# minor' },
  e: { camelot: '12B', name: 'E major' },
  'e major': { camelot: '12B', name: 'E major' },
  'g#m': { camelot: '1A', name: 'G# minor' },
  'abm': { camelot: '1A', name: 'G# minor' },
  b: { camelot: '1B', name: 'B major' },
  'b major': { camelot: '1B', name: 'B major' },
  'd#m': { camelot: '2A', name: 'D# minor' },
  'ebm': { camelot: '2A', name: 'D# minor' },
  'f#': { camelot: '2B', name: 'F# major' },
  gb: { camelot: '2B', name: 'F# major' },
  'a#m': { camelot: '3A', name: 'A# minor' },
  bbm: { camelot: '3A', name: 'A# minor' },
  'c#': { camelot: '3B', name: 'C# major' },
  db: { camelot: '3B', name: 'C# major' },
  fm: { camelot: '4A', name: 'F minor' },
  'f minor': { camelot: '4A', name: 'F minor' },
  'g#': { camelot: '4B', name: 'G# major' },
  ab: { camelot: '4B', name: 'G# major' },
  cm: { camelot: '5A', name: 'C minor' },
  'c minor': { camelot: '5A', name: 'C minor' },
  'd#': { camelot: '5B', name: 'D# major' },
  eb: { camelot: '5B', name: 'D# major' },
  gm: { camelot: '6A', name: 'G minor' },
  'g minor': { camelot: '6A', name: 'G minor' },
  'a#': { camelot: '6B', name: 'A# major' },
  bb: { camelot: '6B', name: 'A# major' },
  dm: { camelot: '7A', name: 'D minor' },
  'd minor': { camelot: '7A', name: 'D minor' },
  f: { camelot: '7B', name: 'F major' },
  'f major': { camelot: '7B', name: 'F major' },
};

export function validateTagBpm(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw).trim());
  if (!Number.isFinite(n)) return null;
  if (n < BPM_MIN || n > BPM_MAX) return null;
  return Math.round(n * 10) / 10;
}

export function parseTagKey(raw: unknown): { camelot: string; name: string } | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (CAMELOT_RE.test(s)) {
    const camelot = s.toUpperCase();
    return { camelot, name: camelot };
  }
  const hit = NOTE_TO_CAMELOT[s.toLowerCase()];
  return hit ?? null;
}
