import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  AnalysisBridge,
  AnalysisJob,
  AnalysisJobOutcome,
  AnalysisStage,
} from '@stentordeck/shared';

/**
 * Minimal bridge for the sandboxed analysis window (docs/05). The renderer
 * decodes untrusted media files, so it runs with contextIsolation + sandbox;
 * file bytes arrive from main with the job — no fs access here.
 */
const bridge: AnalysisBridge = {
  onRun(listener) {
    ipcRenderer.on(
      'analysis:run',
      (_event: IpcRendererEvent, job: AnalysisJob, bytes: ArrayBuffer) => {
        listener(job, bytes);
      },
    );
  },
  sendReady() {
    ipcRenderer.send('analysis:ready', {});
  },
  sendStage(payload: { trackId: number; stage: AnalysisStage }) {
    ipcRenderer.send('analysis:stage', payload);
  },
  sendResult(outcome: AnalysisJobOutcome) {
    ipcRenderer.send('analysis:result', outcome);
  },
};

contextBridge.exposeInMainWorld('stentorAnalysis', bridge);
