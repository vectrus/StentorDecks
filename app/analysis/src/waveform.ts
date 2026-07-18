/** Overview (800) + detail (50 pps) min/max/RMS u8 triplets (docs/05). */

export type WaveformBlobs = {
  overview: Uint8Array;
  detail: Uint8Array;
  detailPps: number;
};

function packBuckets(mono: Float32Array, bucketCount: number): Uint8Array {
  const out = new Uint8Array(bucketCount * 3);
  const n = mono.length;
  if (n === 0 || bucketCount <= 0) return out;
  for (let b = 0; b < bucketCount; b++) {
    const start = Math.floor((b * n) / bucketCount);
    const end = Math.floor(((b + 1) * n) / bucketCount);
    let min = 1;
    let max = -1;
    let sumSq = 0;
    let count = 0;
    for (let i = start; i < end; i++) {
      const s = mono[i]!;
      if (s < min) min = s;
      if (s > max) max = s;
      sumSq += s * s;
      count += 1;
    }
    if (count === 0) {
      min = 0;
      max = 0;
    }
    const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
    const o = b * 3;
    out[o] = u8fromSigned(min);
    out[o + 1] = u8fromSigned(max);
    out[o + 2] = u8fromUnsigned(rms);
  }
  return out;
}

function u8fromSigned(x: number): number {
  const v = Math.max(-1, Math.min(1, x));
  return Math.round(((v + 1) / 2) * 255);
}

function u8fromUnsigned(x: number): number {
  const v = Math.max(0, Math.min(1, x));
  return Math.round(v * 255);
}

export function computeWaveforms(mono: Float32Array, sampleRate: number): WaveformBlobs {
  const detailPps = 50;
  const duration = mono.length / sampleRate;
  const detailBuckets = Math.max(1, Math.round(duration * detailPps));
  return {
    overview: packBuckets(mono, 800),
    detail: packBuckets(mono, detailBuckets),
    detailPps,
  };
}
