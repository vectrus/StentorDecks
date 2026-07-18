/**
 * Decode audio for deck load (E2 / E5 follow-up).
 *
 * Electron DedicatedWorkers do not expose `OfflineAudioContext`, so a Worker
 * decode path fails. We decode on the live AudioContext with async
 * `decodeAudioData`. For MP3s Chromium truncates at the first bad frame
 * (~32s of an 8-minute track) — `decodeMpegResilient` resumes and concatenates.
 */

import {
  concatPcmBuffers,
  decodeMpegResilient,
  type PcmBuffer,
} from '@stentordeck/shared';

export type DecodeAudioOpts = {
  /** From library row / Xing — triggers resilient path when Chromium truncates. */
  expectedDurationSec?: number | null;
};

function asPcm(buf: AudioBuffer): PcmBuffer {
  return buf;
}

function concatToAudioBuffer(ctx: BaseAudioContext, parts: PcmBuffer[]): AudioBuffer {
  const merged = concatPcmBuffers(parts);
  const out = ctx.createBuffer(merged.numberOfChannels, merged.length, merged.sampleRate);
  for (let c = 0; c < merged.numberOfChannels; c++) {
    out.getChannelData(c).set(merged.getChannelData(c));
  }
  return out;
}

export async function decodeArrayBufferOffThread(
  ctx: BaseAudioContext,
  arrayBuffer: ArrayBuffer,
  opts?: DecodeAudioOpts,
): Promise<AudioBuffer> {
  const result = await decodeMpegResilient(
    arrayBuffer,
    {
      decode: async (ab) => asPcm(await ctx.decodeAudioData(ab.slice(0))),
      concat: (parts) => concatToAudioBuffer(ctx, parts),
    },
    { expectedDurationSec: opts?.expectedDurationSec ?? null },
  );
  // decodeMpegResilient may return a native AudioBuffer from the naive path.
  if (result instanceof AudioBuffer) return result;
  return concatToAudioBuffer(ctx, [result]);
}
