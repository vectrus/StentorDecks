import { describe, expect, it } from 'vitest';
import {
  concatPcmBuffers,
  expectedMpegDurationSec,
  findMpegSync,
  isLikelyTruncatedDecode,
  MPEG_CONTINUATION_TRIM_SAMPLES,
  MPEG_SEAM_CROSSFADE_SAMPLES,
  parseXingInfo,
  type PcmBuffer,
} from './mp3ResilientDecode.js';

function pcm(duration: number, sr = 44100, chans = 2): PcmBuffer {
  const length = Math.round(duration * sr);
  const channels = Array.from({ length: chans }, () => new Float32Array(length));
  return {
    duration: length / sr,
    length,
    numberOfChannels: chans,
    sampleRate: sr,
    getChannelData: (c) => channels[c]!,
  };
}

describe('mp3ResilientDecode helpers', () => {
  it('findMpegSync finds FFEx', () => {
    const u8 = new Uint8Array([0, 1, 0xff, 0xfb, 0x10]);
    expect(findMpegSync(u8, 0)).toBe(2);
    expect(findMpegSync(u8, 3)).toBe(-1);
  });

  it('parseXingInfo reads Info frames/duration', () => {
    // Minimal synthetic: pad + "Info" + flags(frames|bytes)=3 + frames + bytes
    const u8 = new Uint8Array(64);
    u8[10] = 0x49;
    u8[11] = 0x6e;
    u8[12] = 0x66;
    u8[13] = 0x6f;
    // flags = 3 (frames + bytes)
    u8[14] = 0;
    u8[15] = 0;
    u8[16] = 0;
    u8[17] = 3;
    // frames = 18687 = 0x000048FF
    u8[18] = 0;
    u8[19] = 0;
    u8[20] = 0x48;
    u8[21] = 0xff;
    // bytes
    u8[22] = 0x01;
    u8[23] = 0x2a;
    u8[24] = 0x05;
    u8[25] = 0xcc;
    const info = parseXingInfo(u8);
    expect(info?.tag).toBe('Info');
    expect(info?.frames).toBe(18687);
    expect(info?.durationSec).toBeCloseTo((18687 * 1152) / 44100, 5);
  });

  it('isLikelyTruncatedDecode catches 32s of 8min', () => {
    expect(isLikelyTruncatedDecode(32.26, 488.15)).toBe(true);
    expect(isLikelyTruncatedDecode(512.3, 512.4)).toBe(false);
    expect(isLikelyTruncatedDecode(30, 40)).toBe(false); // short track, under 45s expected gate
  });

  it('expectedMpegDurationSec prefers Xing over stale short hint', () => {
    const u8 = new Uint8Array(64);
    u8[10] = 0x49;
    u8[11] = 0x6e;
    u8[12] = 0x66;
    u8[13] = 0x6f;
    u8[17] = 3;
    u8[20] = 0x48;
    u8[21] = 0xff; // frames 18687 → ~488s
    expect(expectedMpegDurationSec(u8, 32.26)).toBeCloseTo((18687 * 1152) / 44100, 5);
    expect(expectedMpegDurationSec(new Uint8Array(8), 123.4)).toBe(123.4);
  });

  it('concatPcmBuffers hard-abut when fade/trim disabled', () => {
    const a = pcm(1, 44100, 2);
    const b = pcm(0.5, 44100, 2);
    a.getChannelData(0).fill(0.25);
    b.getChannelData(0).fill(0.5);
    const out = concatPcmBuffers([a, b], {
      crossfadeSamples: 0,
      continuationTrimSamples: 0,
    });
    expect(out.duration).toBeCloseTo(1.5, 5);
    expect(out.getChannelData(0)[0]).toBe(0.25);
    expect(out.getChannelData(0)[44100]).toBe(0.5);
  });

  it('concatPcmBuffers seam-heals: trims continuation + blends discontinuity', () => {
    const sr = 44100;
    const a = pcm(1, sr, 1);
    const b = pcm(1, sr, 1);
    a.getChannelData(0).fill(1);
    b.getChannelData(0).fill(-1);
    const fade = 64;
    const trim = 100;
    const out = concatPcmBuffers([a, b], {
      crossfadeSamples: fade,
      continuationTrimSamples: trim,
    });
    // length = 1s + (1s - trim) - fade
    expect(out.length).toBe(sr + (sr - trim) - fade);
    expect(out.getChannelData(0)[0]).toBe(1);
    // Mid-seam (equal-power of +1 and -1) should be near 0, not a hard step.
    const seamMid = sr - fade + Math.floor(fade / 2);
    const mid = out.getChannelData(0)[seamMid]!;
    expect(Math.abs(mid)).toBeLessThan(0.25);
    // After seam, continuation body is still -1.
    expect(out.getChannelData(0)[sr]!).toBe(-1);
    expect(MPEG_SEAM_CROSSFADE_SAMPLES).toBe(256);
    expect(MPEG_CONTINUATION_TRIM_SAMPLES).toBe(576);
  });
});
