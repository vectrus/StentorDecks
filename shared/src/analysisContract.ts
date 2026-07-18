/** Internal main ↔ analysis-window contract (not UI StentorApi). E5 / docs/05. */

export const ANALYSIS_VERSION = 1;

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
