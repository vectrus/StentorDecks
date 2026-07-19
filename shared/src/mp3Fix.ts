/**
 * Prep MP3 health-check + sibling fix naming (R5.9).
 * Original files are never modified — fixed output is always a new `.wav`.
 */

export const FIXED_BY_SD_MARK = ' (Fixed by SD)';
/** Loudness-normalized sibling WAV (separate from click/squeak fix). Never overwrites source. */
export const NORMALIZED_BY_SD_MARK = ' (Normalized by SD)';

export type SiblingWavKind = 'fixed' | 'normalized';

export type Mp3InspectResult = {
  trackId: number;
  path: string;
  isMp3: boolean;
  expectedSec: number | null;
  decodedSec: number;
  /** Chromium truncated vs Xing/tag — candidate for sibling fix. */
  needsFix: boolean;
  detail: string;
};

/** Append " (Fixed by SD)" before extension; force `.wav`. */
export function fixedSiblingWavPath(originalPath: string): string {
  const { dir, base } = splitPath(originalPath);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const cleaned = stem.endsWith(FIXED_BY_SD_MARK)
    ? stem
    : `${stem}${FIXED_BY_SD_MARK}`;
  return joinPath(dir, `${cleaned}.wav`);
}

/** If path exists, try `name 2.wav`, `name 3.wav`, … */
export function uniqueFixedSiblingWavPath(
  originalPath: string,
  exists: (p: string) => boolean,
): string {
  const first = fixedSiblingWavPath(originalPath);
  if (!exists(first)) return first;
  const { dir, base } = splitPath(first);
  const stem = base.endsWith('.wav') ? base.slice(0, -4) : base;
  for (let n = 2; n < 1000; n++) {
    const candidate = joinPath(dir, `${stem} ${n}.wav`);
    if (!exists(candidate)) return candidate;
  }
  throw new Error('Could not find a free sibling path for Fixed by SD');
}

export function withFixedBySdTitle(title: string | null, fallbackStem: string): string {
  const base = (title?.trim() || fallbackStem).trim() || 'Track';
  if (base.includes(FIXED_BY_SD_MARK.trim())) return base;
  return `${base}${FIXED_BY_SD_MARK}`;
}

export function normalizedSiblingWavPath(originalPath: string): string {
  const { dir, base } = splitPath(originalPath);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const cleaned = stem.includes(NORMALIZED_BY_SD_MARK.trim())
    ? stem
    : `${stem}${NORMALIZED_BY_SD_MARK}`;
  return joinPath(dir, `${cleaned}.wav`);
}

export function uniqueNormalizedSiblingWavPath(
  originalPath: string,
  exists: (p: string) => boolean,
): string {
  const first = normalizedSiblingWavPath(originalPath);
  if (!exists(first)) return first;
  const { dir, base } = splitPath(first);
  const stem = base.endsWith('.wav') ? base.slice(0, -4) : base;
  for (let n = 2; n < 1000; n++) {
    const candidate = joinPath(dir, `${stem} ${n}.wav`);
    if (!exists(candidate)) return candidate;
  }
  throw new Error('Could not find a free sibling path for Normalized by SD');
}

export function withNormalizedBySdTitle(title: string | null, fallbackStem: string): string {
  const base = (title?.trim() || fallbackStem).trim() || 'Track';
  if (base.includes(NORMALIZED_BY_SD_MARK.trim())) return base;
  return `${base}${NORMALIZED_BY_SD_MARK}`;
}

/** True for StentorDeck-created sibling WAVs only (safe to delete per R5.1 exception). */
export function isSdSiblingWavPath(filePath: string): boolean {
  const base = splitPath(filePath).base;
  if (!/\.wav$/i.test(base)) return false;
  return base.includes(FIXED_BY_SD_MARK) || base.includes(NORMALIZED_BY_SD_MARK);
}

/**
 * Strip `(Fixed|Normalized by SD)` (+ optional ` 2` bump) from a sibling WAV basename.
 * Returns original stem for guessing the source file, or null if not an SD sibling.
 */
export function sourceStemFromSdSiblingPath(filePath: string): string | null {
  if (!isSdSiblingWavPath(filePath)) return null;
  const base = splitPath(filePath).base;
  let stem = base.replace(/\.wav$/i, '');
  stem = stem.replace(/ \d+$/, '');
  if (stem.endsWith(FIXED_BY_SD_MARK)) {
    return stem.slice(0, -FIXED_BY_SD_MARK.length);
  }
  if (stem.endsWith(NORMALIZED_BY_SD_MARK)) {
    return stem.slice(0, -NORMALIZED_BY_SD_MARK.length);
  }
  const fi = stem.indexOf(FIXED_BY_SD_MARK);
  if (fi >= 0) return stem.slice(0, fi);
  const ni = stem.indexOf(NORMALIZED_BY_SD_MARK);
  if (ni >= 0) return stem.slice(0, ni);
  return null;
}

/** Candidate source paths next to an SD sibling (existence checked by caller). */
export function sourcePathCandidatesFromSdSibling(sdPath: string): string[] {
  const stem = sourceStemFromSdSiblingPath(sdPath);
  if (stem == null) return [];
  const { dir } = splitPath(sdPath);
  const exts = ['.mp3', '.MP3', '.flac', '.FLAC', '.wav', '.WAV'];
  return exts.map((ext) => joinPath(dir, `${stem}${ext}`));
}

/**
 * Destination for overwrite rewrite: prefer existing sibling (canonical, then ` 2`…),
 * else canonical path (will be created).
 */
export function overwriteSiblingWavPath(
  originalPath: string,
  kind: SiblingWavKind,
  exists: (p: string) => boolean,
): string {
  const canonical =
    kind === 'normalized'
      ? normalizedSiblingWavPath(originalPath)
      : fixedSiblingWavPath(originalPath);
  if (exists(canonical)) return canonical;
  const { dir, base } = splitPath(canonical);
  const stem = base.endsWith('.wav') ? base.slice(0, -4) : base;
  for (let n = 2; n < 1000; n++) {
    const candidate = joinPath(dir, `${stem} ${n}.wav`);
    if (exists(candidate)) return candidate;
  }
  return canonical;
}

/** Peak of |samples| across channels. */
export function peakAbsChannels(channelData: Float32Array[]): number {
  let peak = 0;
  for (const ch of channelData) {
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]!);
      if (a > peak) peak = a;
    }
  }
  return peak;
}

/** Multiply channels in place; returns the linear gain applied. */
export function applyLinearGainInPlace(
  channelData: Float32Array[],
  linear: number,
): number {
  const g = Number.isFinite(linear) ? linear : 1;
  for (const ch of channelData) {
    for (let i = 0; i < ch.length; i++) {
      ch[i]! *= g;
    }
  }
  return g;
}

/**
 * Gain toward target LUFS, then peak-limit so true peak stays ≤ 0.99.
 * Returns linear gain actually applied.
 */
export function normalizeChannelsTowardLufs(
  channelData: Float32Array[],
  loudnessLufs: number,
  targetLufs: number,
  trimDbToGain: (db: number) => number,
  autoGainTrimDb: (loudness: number, target: number) => number,
): number {
  const wanted = trimDbToGain(autoGainTrimDb(loudnessLufs, targetLufs));
  const peak = peakAbsChannels(channelData);
  const maxGain = peak > 1e-8 ? 0.99 / peak : wanted;
  const g = Math.min(wanted, maxGain);
  return applyLinearGainInPlace(channelData, g);
}

/**
 * Encode interleaved PCM16 LE WAV (no compression — booth-safe sibling of a bad MP3).
 */
export function encodeWavPcm16le(opts: {
  sampleRate: number;
  numberOfChannels: number;
  /** Per-channel float −1..1 */
  channelData: Float32Array[];
}): Uint8Array {
  const { sampleRate, numberOfChannels, channelData } = opts;
  if (numberOfChannels < 1 || channelData.length < numberOfChannels) {
    throw new Error('encodeWavPcm16le: bad channel layout');
  }
  const frames = channelData[0]!.length;
  for (let c = 1; c < numberOfChannels; c++) {
    if (channelData[c]!.length !== frames) {
      throw new Error('encodeWavPcm16le: channel length mismatch');
    }
  }

  const dataBytes = frames * numberOfChannels * 2;
  // RIFF header 12 + fmt 24 + data 8 + samples (+ optional LIST later)
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  writeStr(u8, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(u8, 8, 'WAVE');
  writeStr(u8, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(u8, 36, 'data');
  view.setUint32(40, dataBytes, true);

  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numberOfChannels; c++) {
      const s = Math.max(-1, Math.min(1, channelData[c]![i]!));
      const i16 = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
      view.setInt16(o, i16, true);
      o += 2;
    }
  }
  return u8;
}

function writeStr(u8: Uint8Array, at: number, s: string): void {
  for (let i = 0; i < s.length; i++) u8[at + i] = s.charCodeAt(i);
}

function splitPath(p: string): { dir: string; base: string } {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  if (i < 0) return { dir: '', base: p };
  return { dir: p.slice(0, i), base: p.slice(i + 1) };
}

function joinPath(dir: string, base: string): string {
  if (!dir) return base;
  const sep = dir.includes('\\') ? '\\' : '/';
  return `${dir}${sep}${base}`;
}
