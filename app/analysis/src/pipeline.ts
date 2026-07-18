import {
  ANALYSIS_VERSION,
  type AnalysisJob,
  type AnalysisJobOutcome,
  type AnalysisStage,
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
    let lowConfidence = false;

    if (!job.skipBpm) {
      onStage?.('bpm');
      const b = detectBpm(mono, sampleRate);
      if (b) {
        bpm = b.bpm;
        bpmSource = 'analysis';
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

  // Probe length via a tiny context decode
  const probe = new Offline(1, 128, 44100);
  const decoded = await probe.decodeAudioData(fileBytes.slice(0));
  const sampleRate = 44100;
  const length = Math.ceil(decoded.duration * sampleRate);
  const offline = new Offline(decoded.numberOfChannels, Math.max(1, length), sampleRate);

  // Re-decode into target rate context when possible
  let buffer: AudioBuffer;
  try {
    buffer = await offline.decodeAudioData(fileBytes.slice(0));
  } catch {
    buffer = decoded;
  }

  const chans = buffer.numberOfChannels;
  const n = buffer.length;
  const mono = new Float32Array(n);
  if (chans === 1) {
    mono.set(buffer.getChannelData(0));
  } else {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < n; i++) {
      mono[i] = ((left[i] ?? 0) + (right[i] ?? 0)) * 0.5;
    }
  }

  return {
    mono,
    sampleRate: buffer.sampleRate,
    durationMs: Math.round(buffer.duration * 1000),
  };
}
