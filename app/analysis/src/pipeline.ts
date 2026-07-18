import {
  ANALYSIS_VERSION,
  concatPcmBuffers,
  decodeMpegResilient,
  type AnalysisJob,
  type AnalysisJobOutcome,
  type AnalysisStage,
  type PcmBuffer,
} from '@stentordeck/shared';
import { detectBpm } from './bpm';
import { detectKey } from './key';
import { estimateLoudness } from './loudness';
import { computeWaveforms } from './waveform';

export type StageFn = (stage: AnalysisStage) => void;

export async function runAnalysisPipeline(
  job: AnalysisJob,
  fileBytes: ArrayBuffer,
  onStage?: StageFn,
): Promise<AnalysisJobOutcome> {
  try {
    onStage?.('decode');
    const { mono, sampleRate, durationMs } = await decodeToMono(fileBytes);

    onStage?.('waveform');
    const waves = computeWaveforms(mono, sampleRate);

    let bpm: number | null = null;
    let bpmSource: 'analysis' | null = null;
    let beatGridOffsetSec: number | null = null;
    let lowConfidence = false;

    if (!job.skipBpm) {
      onStage?.('bpm');
      const b = detectBpm(mono, sampleRate);
      if (b) {
        bpm = b.bpm;
        bpmSource = 'analysis';
        beatGridOffsetSec = b.beatGridOffsetSec;
        lowConfidence = lowConfidence || b.lowConfidence;
      }
    }

    let keyCamelot: string | null = null;
    let keyName: string | null = null;
    let keySource: 'analysis' | null = null;

    if (!job.skipKey) {
      onStage?.('key');
      const k = detectKey(mono, sampleRate);
      if (k) {
        keyCamelot = k.keyCamelot;
        keyName = k.keyName;
        keySource = 'analysis';
        lowConfidence = lowConfidence || k.lowConfidence;
      }
    }

    onStage?.('loudness');
    const loud = estimateLoudness(mono);

    return {
      trackId: job.trackId,
      ok: true,
      durationMs,
      overview: waves.overview,
      detail: waves.detail,
      detailPps: waves.detailPps,
      bpm,
      bpmSource,
      beatGridOffsetSec,
      keyCamelot,
      keyName,
      keySource,
      loudnessLufs: loud.loudnessLufs,
      peakDb: loud.peakDb,
      lowConfidence,
      analysisVersion: ANALYSIS_VERSION,
    };
  } catch (err) {
    return {
      trackId: job.trackId,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function decodeToMono(
  fileBytes: ArrayBuffer,
): Promise<{ mono: Float32Array; sampleRate: number; durationMs: number }> {
  const Offline =
    typeof OfflineAudioContext !== 'undefined'
      ? OfflineAudioContext
      : (globalThis as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
          .webkitOfflineAudioContext;
  if (!Offline) throw new Error('OfflineAudioContext unavailable');

  const decodeCtx = new Offline(2, 128, 44100);
  const pcm = await decodeMpegResilient(
    fileBytes,
    {
      decode: async (ab) => decodeCtx.decodeAudioData(ab.slice(0)),
      concat: (parts) => concatPcmToAudioBuffer(decodeCtx, parts),
    },
    {},
  );

  const chans = pcm.numberOfChannels;
  const n = pcm.length;
  const mono = new Float32Array(n);
  if (chans === 1) {
    mono.set(pcm.getChannelData(0));
  } else {
    const left = pcm.getChannelData(0);
    const right = pcm.getChannelData(1);
    for (let i = 0; i < n; i++) {
      mono[i] = ((left[i] ?? 0) + (right[i] ?? 0)) * 0.5;
    }
  }

  return {
    mono,
    sampleRate: pcm.sampleRate,
    durationMs: Math.round(pcm.duration * 1000),
  };
}

function concatPcmToAudioBuffer(ctx: BaseAudioContext, parts: PcmBuffer[]): AudioBuffer {
  const merged = concatPcmBuffers(parts);
  const out = ctx.createBuffer(merged.numberOfChannels, merged.length, merged.sampleRate);
  for (let c = 0; c < merged.numberOfChannels; c++) {
    out.getChannelData(c).set(merged.getChannelData(c));
  }
  return out;
}
