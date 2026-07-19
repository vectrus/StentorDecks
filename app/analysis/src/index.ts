/**
 * Analysis renderer entry (hidden sandboxed BrowserWindow).
 * Receives jobs + file bytes from main via the preload bridge, runs the
 * OfflineAudioContext pipeline, returns results. No Node access here —
 * this window decodes untrusted media files.
 */

import type {
  AnalysisBridge,
  AnalysisJob,
  AnalysisJobOutcome,
  AnalysisStage,
} from '@stentordeck/shared';
import { runAnalysisPipeline } from './pipeline';

const bridge = (globalThis as { stentorAnalysis?: AnalysisBridge }).stentorAnalysis;
if (!bridge) {
  throw new Error('stentorAnalysis bridge missing — analysisPreload not loaded');
}
const bus: AnalysisBridge = bridge;

bus.onRun((job, bytes) => {
  void handleJob(job, bytes);
});

bus.sendReady();

async function handleJob(job: AnalysisJob, bytes: ArrayBuffer): Promise<void> {
  const report = (stage: AnalysisStage) => {
    bus.sendStage({ trackId: job.trackId, stage });
  };

  try {
    report('decode');
    const outcome: AnalysisJobOutcome = await runAnalysisPipeline(job, bytes, report);
    // Structured clone: ensure Uint8Array transfers
    bus.sendResult(outcome);
  } catch (err) {
    const failure: AnalysisJobOutcome = {
      trackId: job.trackId,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    bus.sendResult(failure);
  }
}

console.info('[analysis] window ready');
