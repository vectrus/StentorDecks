/**
 * Chromium decodeAudioData often stops at the first bad MPEG frame and returns
 * a short buffer (owner saw ~32s of an 8-minute 320kbps MP3). HTMLMediaElement
 * plays the same files fully. This helper resumes from the next frame sync and
 * concatenates segments until Xing/Info (or size/bitrate) duration is covered.
 *
 * Pure orchestration — caller supplies decode + concat (DOM Offline/AudioContext).
 */

export type PcmBuffer = {
  duration: number;
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
};

export type MpegDecodeApi = {
  decode(ab: ArrayBuffer): Promise<PcmBuffer>;
  concat(parts: PcmBuffer[]): PcmBuffer;
};

export type XingInfo = {
  at: number;
  tag: 'Info' | 'Xing';
  frames: number | null;
  bytes: number | null;
  /** Duration at 44.1 kHz / 1152 samples per MPEG1 layer III frame. */
  durationSec: number | null;
};

export function findMpegSync(u8: Uint8Array, from: number): number {
  for (let i = Math.max(0, from); i < u8.length - 1; i++) {
    if (u8[i] === 0xff && (u8[i + 1]! & 0xe0) === 0xe0) return i;
  }
  return -1;
}

/** Parse first Xing/Info header in the first 200 KiB (after ID3). */
export function parseXingInfo(u8: Uint8Array): XingInfo | null {
  const limit = Math.min(u8.length - 12, 200_000);
  for (let i = 0; i < limit; i++) {
    const a = u8[i];
    const b = u8[i + 1];
    const c = u8[i + 2];
    const d = u8[i + 3];
    const isInfo = a === 0x49 && b === 0x6e && c === 0x66 && d === 0x6f; // Info
    const isXing = a === 0x58 && b === 0x69 && c === 0x6e && d === 0x67; // Xing
    if (!isInfo && !isXing) continue;
    const flags = readU32(u8, i + 4);
    let o = i + 8;
    let frames: number | null = null;
    let bytes: number | null = null;
    if (flags & 1) {
      frames = readU32(u8, o);
      o += 4;
    }
    if (flags & 2) {
      bytes = readU32(u8, o);
    }
    return {
      at: i,
      tag: isInfo ? 'Info' : 'Xing',
      frames,
      bytes,
      durationSec: frames != null ? (frames * 1152) / 44100 : null,
    };
  }
  return null;
}

function readU32(u8: Uint8Array, at: number): number {
  return (
    ((u8[at]! << 24) | (u8[at + 1]! << 16) | (u8[at + 2]! << 8) | u8[at + 3]!) >>> 0
  );
}

export function estimateBitrateBps(u8: Uint8Array, durationSec: number | null): number {
  if (durationSec != null && durationSec > 1) {
    return Math.round((u8.length * 8) / durationSec);
  }
  const info = parseXingInfo(u8);
  if (info?.durationSec != null && info.durationSec > 1) {
    return Math.round((u8.length * 8) / info.durationSec);
  }
  return 320_000;
}

export function expectedMpegDurationSec(
  u8: Uint8Array,
  hintSec?: number | null,
): number | null {
  const info = parseXingInfo(u8);
  const fromXing = info?.durationSec != null && info.durationSec > 0 ? info.durationSec : null;
  const hint =
    hintSec != null && Number.isFinite(hintSec) && hintSec > 0 ? hintSec : null;
  // Stale DB durations from truncated Chromium decode (~32s) must not mask Xing.
  if (fromXing != null && hint != null) {
    return fromXing > hint * 1.2 ? fromXing : hint;
  }
  return fromXing ?? hint;
}

/** True when Chromium likely truncated (common ~tens of seconds on long MP3s). */
export function isLikelyTruncatedDecode(
  decodedSec: number,
  expectedSec: number | null,
): boolean {
  if (expectedSec == null || expectedSec < 45) return false;
  if (decodedSec <= 0) return true;
  // Short by >15% and by >5s — covers the ~32s-of-8min case without false positives.
  return decodedSec < expectedSec * 0.85 && expectedSec - decodedSec > 5;
}

/**
 * Decode MPEG (and other formats): one-shot first; if truncated vs Xing/hint,
 * resume at subsequent frame syncs and concatenate.
 */
export async function decodeMpegResilient(
  arrayBuffer: ArrayBuffer,
  api: MpegDecodeApi,
  opts?: { expectedDurationSec?: number | null; bitrateHint?: number },
): Promise<PcmBuffer> {
  const u8 = new Uint8Array(arrayBuffer);
  const expected =
    expectedMpegDurationSec(u8, opts?.expectedDurationSec ?? null) ??
    (u8.length * 8) / (opts?.bitrateHint ?? 320_000);
  const bitrate = opts?.bitrateHint ?? estimateBitrateBps(u8, expected);

  const naive = await api.decode(arrayBuffer.slice(0));
  if (!isLikelyTruncatedDecode(naive.duration, expected)) {
    return naive;
  }

  const parts: PcmBuffer[] = [];
  let offset = findMpegSync(u8, 0);
  let total = 0;
  let guard = 0;
  let stagnant = 0;

  while (offset >= 0 && total < expected * 0.98 && guard++ < 200) {
    let buf: PcmBuffer;
    try {
      buf = await api.decode(arrayBuffer.slice(offset));
    } catch {
      const next = findMpegSync(u8, offset + 1);
      if (next < 0) break;
      offset = next;
      stagnant += 1;
      if (stagnant > 50) break;
      continue;
    }

    const remainEst = ((u8.length - offset) * 8) / bitrate;
    if (buf.duration >= 1.0 || (buf.duration >= 0.2 && buf.duration >= remainEst * 0.5)) {
      parts.push(buf);
      total += buf.duration;
      stagnant = 0;
      if (buf.duration >= remainEst * 0.9) break;
      const advance = Math.floor((buf.duration * bitrate) / 8);
      let next = findMpegSync(u8, offset + Math.max(417, advance - 417));
      if (next < 0 || next <= offset) {
        next = findMpegSync(u8, offset + advance + 417);
      }
      if (next < 0) break;
      offset = next;
    } else {
      const next = findMpegSync(u8, offset + 417);
      if (next < 0) break;
      offset = next;
      stagnant += 1;
      if (stagnant > 80) break;
    }
  }

  if (parts.length === 0) return naive;
  const merged = api.concat(parts);
  // Prefer resilient if it recovered substantially more audio.
  if (merged.duration > naive.duration * 1.2) return merged;
  return naive;
}

/** Concatenate PCM channel data (used by decodeMpegResilient callers / tests). */
export function concatPcmBuffers(parts: PcmBuffer[]): PcmBuffer {
  if (parts.length === 0) throw new Error('concatPcmBuffers: empty');
  if (parts.length === 1) return parts[0]!;
  const sampleRate = parts[0]!.sampleRate;
  const numberOfChannels = Math.max(...parts.map((p) => p.numberOfChannels));
  let length = 0;
  for (const p of parts) length += p.length;
  const channels: Float32Array[] = Array.from(
    { length: numberOfChannels },
    () => new Float32Array(length),
  );
  let o = 0;
  for (const p of parts) {
    for (let c = 0; c < numberOfChannels; c++) {
      const src = p.getChannelData(Math.min(c, p.numberOfChannels - 1));
      channels[c]!.set(src, o);
    }
    o += p.length;
  }
  return {
    duration: length / sampleRate,
    length,
    numberOfChannels,
    sampleRate,
    getChannelData: (c: number) => channels[c]!,
  };
}
