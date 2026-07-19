/**
 * Light de-click for Prep MP3 fix (R5.9) — after resilient stitch.
 * Detects sample-to-sample jumps over a threshold and short-fades them.
 * Pure PCM; no allocations beyond output channels when mutating in place.
 */

export type DeclickLevel = 'off' | 'light' | 'strong';

/** Jump threshold (linear) and half-window samples for replace. */
export function declickParams(level: DeclickLevel): { threshold: number; halfWin: number } | null {
  if (level === 'off') return null;
  if (level === 'light') return { threshold: 0.35, halfWin: 8 };
  return { threshold: 0.22, halfWin: 16 }; // strong
}

/**
 * In-place de-click. Returns number of clicks healed.
 */
export function declickChannelsInPlace(
  channelData: Float32Array[],
  level: DeclickLevel,
): number {
  const p = declickParams(level);
  if (!p || channelData.length === 0) return 0;
  const { threshold, halfWin } = p;
  const n = channelData[0]!.length;
  if (n < halfWin * 2 + 2) return 0;

  let hits = 0;
  // Use max abs jump across channels at each sample.
  for (let i = 1; i < n; i++) {
    let jump = 0;
    for (const ch of channelData) {
      const d = Math.abs(ch[i]! - ch[i - 1]!);
      if (d > jump) jump = d;
    }
    if (jump < threshold) continue;
    hits += 1;
    const a = Math.max(0, i - halfWin);
    const b = Math.min(n - 1, i + halfWin);
    const span = b - a;
    if (span < 1) continue;
    for (const ch of channelData) {
      const y0 = ch[a]!;
      const y1 = ch[b]!;
      for (let k = a; k <= b; k++) {
        const t = (k - a) / span;
        ch[k] = y0 + (y1 - y0) * t;
      }
    }
    // Skip past the healed window to avoid re-triggering.
    i = b;
  }
  return hits;
}
