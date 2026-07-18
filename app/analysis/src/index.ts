/**
 * Analysis renderer entry (hidden BrowserWindow, nodeIntegration).
 * Receives jobs from main, runs OfflineAudioContext pipeline, returns results.
 */

import type { AnalysisJob, AnalysisJobOutcome, AnalysisStage } from '@stentordeck/shared';
import { runAnalysisPipeline } from './pipeline';

type ElectronIpc = {
  on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
  send: (channel: string, ...args: unknown[]) => void;
};

function ipc(): ElectronIpc {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ipcRenderer } = require('electron') as { ipcRenderer: ElectronIpc };
  return ipcRenderer;
}

function readFileBuffer(filePath: string): ArrayBuffer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs');
  const buf = fs.readFileSync(filePath) as Buffer;
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  return copy.buffer;
}

const bus = ipc();

bus.on('analysis:run', (_e, raw) => {
  void handleJob(raw as AnalysisJob);
});

bus.send('analysis:ready', {});

async function handleJob(job: AnalysisJob): Promise<void> {
  const report = (stage: AnalysisStage) => {
    bus.send('analysis:stage', { trackId: job.trackId, stage });
  };

  try {
    report('decode');
    const ab = readFileBuffer(job.path);
    const outcome: AnalysisJobOutcome = await runAnalysisPipeline(job, ab, report);
    // Structured clone: ensure Uint8Array transfers
    bus.send('analysis:result', outcome);
  } catch (err) {
    const failure: AnalysisJobOutcome = {
      trackId: job.trackId,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    bus.send('analysis:result', failure);
  }
}

console.info('[analysis] window ready');
