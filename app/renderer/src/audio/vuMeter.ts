/**
 * Channel VU mapping (docs/03 / R7.6).
 * Scale −60…0 dBFS → bar 0…1. Zones: green < −9, amber −9…−3, red > −3.
 * Segment heights are fractions of the full bar and stack (mockup 05).
 */

export const VU_FLOOR_DB = -60;
export const VU_HOT_DB = -9;
export const VU_CLIP_DB = -3;
export const VU_CEIL_DB = 0;

export function dbToVuNorm(db: number): number {
  if (db <= VU_FLOOR_DB) return 0;
  if (db >= VU_CEIL_DB) return 1;
  return (db - VU_FLOOR_DB) / (VU_CEIL_DB - VU_FLOOR_DB);
}

/** Stacked fill fractions (sum = filled portion of the bar). */
export function vuSegments(db: number): { ok: number; hot: number; clip: number } {
  const level = dbToVuNorm(db);
  const okEnd = dbToVuNorm(VU_HOT_DB);
  const hotEnd = dbToVuNorm(VU_CLIP_DB);
  const ok = Math.min(level, okEnd);
  const hot = Math.max(0, Math.min(level, hotEnd) - okEnd);
  const clip = Math.max(0, level - hotEnd);
  return { ok, hot, clip };
}

export function isPeaking(db: number): boolean {
  return db > VU_CLIP_DB;
}
