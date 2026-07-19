/** Internal main ↔ analysis-window contract (not UI StentorApi). E5 / docs/05. */

/** Bump when decode/analysis output must be recomputed (v3: beat-grid offset for SYNC). */
export const ANALYSIS_VERSION = 3;

export type AnalysisPriority = 'deck' | 'new' | 'backfill';

export type AnalysisJob = {
  trackId: number;
  path: string;
  priority: AnalysisPriority;
  /** Skip BPM stage — keep existing tag/manual value. */
  skipBpm: boolean;
  skipKey: boolean;
};

export type AnalysisStage =
  | 'decode'
  | 'waveform'
  | 'bpm'
  | 'key'
  | 'loudness'
  | 'commit'
  | 'idle';

export type AnalysisResult = {
  trackId: number;
  ok: true;
  durationMs: number;
  overview: Uint8Array;
  detail: Uint8Array;
  detailPps: number;
  bpm: number | null;
  bpmSource: 'analysis' | null;
  /** First-beat offset seconds; null when BPM skipped / unknown. */
  beatGridOffsetSec: number | null;
  keyCamelot: string | null;
  keyName: string | null;
  keySource: 'analysis' | null;
  loudnessLufs: number | null;
  peakDb: number | null;
  lowConfidence: boolean;
  analysisVersion: number;
};

export type AnalysisFailure = {
  trackId: number;
  ok: false;
  error: string;
};

export type AnalysisJobOutcome = AnalysisResult | AnalysisFailure;

/**
 * `window.stentorAnalysis` bridge exposed by the sandboxed analysis preload.
 * File bytes are read in main and shipped with the job — the analysis renderer
 * decodes untrusted media, so it must never have Node access itself.
 */
export type AnalysisBridge = {
  onRun: (listener: (job: AnalysisJob, bytes: ArrayBuffer) => void) => void;
  sendReady: () => void;
  sendStage: (payload: { trackId: number; stage: AnalysisStage }) => void;
  sendResult: (outcome: AnalysisJobOutcome) => void;
};
