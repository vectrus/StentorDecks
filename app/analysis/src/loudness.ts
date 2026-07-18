/** Gated RMS loudness approx + true-peak (docs/05 / R6.5). */

export type LoudnessResult = {
  loudnessLufs: number;
  peakDb: number;
};

export function estimateLoudness(mono: Float32Array): LoudnessResult {
  let peak = 0;
  let sumSq = 0;
  let gated = 0;
  const gate = 1e-6; // ~ -60 dBFS power
  for (let i = 0; i < mono.length; i++) {
    const s = mono[i]!;
    const a = Math.abs(s);
    if (a > peak) peak = a;
    const p = s * s;
    if (p > gate) {
      sumSq += p;
      gated += 1;
    }
  }
  const mean = gated > 0 ? sumSq / gated : 0;
  // Integrated RMS in dBFS, shifted toward LUFS-ish scale for auto-gain (v1 approx).
  const lufs = mean > 0 ? 10 * Math.log10(mean) - 0.691 : -70;
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -120;
  return {
    loudnessLufs: Math.round(lufs * 10) / 10,
    peakDb: Math.round(peakDb * 10) / 10,
  };
}
