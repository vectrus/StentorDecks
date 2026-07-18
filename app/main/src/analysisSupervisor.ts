/**
 * Analysis window supervisor + priority queue (E5 / docs/05).
 */

import { BrowserWindow, app, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import {
  ANALYSIS_VERSION,
  type AnalysisJob,
  type AnalysisJobOutcome,
  type AnalysisPriority,
  type AnalysisStage,
} from '@stentordeck/shared';
import { getDb } from './db/database';
import { commitAnalysis, getTrackAnalysisHints } from './db/tracksRepo';

export type AnalysisSupervisor = {
  ensureAnalysisWindow: () => void;
  enqueue: (trackIds: number[], priority: AnalysisPriority) => number;
  destroy: () => void;
};

type QueueItem = AnalysisJob & { seq: number };

type ProgressBroadcast = (payload: {
  trackId: number;
  stage: AnalysisStage;
  queueDepth: number;
}) => void;

let broadcastProgress: ProgressBroadcast = () => undefined;

export function setAnalysisProgressBroadcast(fn: ProgressBroadcast): void {
  broadcastProgress = fn;
}

export function createAnalysisSupervisor(): AnalysisSupervisor {
  let win: BrowserWindow | null = null;
  let ready = false;
  let busy = false;
  let seq = 0;
  const queue: QueueItem[] = [];
  let current: QueueItem | null = null;

  const priorityRank = (p: AnalysisPriority): number => {
    if (p === 'deck') return 0;
    if (p === 'new') return 1;
    return 2;
  };

  function queueDepth(): number {
    return queue.length + (busy ? 1 : 0);
  }

  function emit(trackId: number, stage: AnalysisStage): void {
    broadcastProgress({ trackId, stage, queueDepth: queueDepth() });
  }

  function sortQueue(): void {
    queue.sort((a, b) => {
      const d = priorityRank(a.priority) - priorityRank(b.priority);
      return d !== 0 ? d : a.seq - b.seq;
    });
  }

  function analysisHtmlPath(): string {
    const candidates = [
      path.join(__dirname, '../../analysis/dist/index.html'),
      path.join(app.getAppPath(), 'app/analysis/dist/index.html'),
      path.join(process.cwd(), 'app/analysis/dist/index.html'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    throw new Error('analysis dist/index.html not found — run npm run build -w @stentordeck/analysis');
  }

  function ensureAnalysisWindow(): void {
    if (win && !win.isDestroyed()) return;

    ready = false;
    win = new BrowserWindow({
      show: false,
      width: 400,
      height: 300,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: false,
        backgroundThrottling: false,
      },
    });

    win.webContents.on('render-process-gone', (_e, details) => {
      console.error('[analysis] renderer gone', details);
      if (current) {
        queue.unshift({ ...current, seq: seq++ });
        sortQueue();
      }
      win = null;
      ready = false;
      busy = false;
      current = null;
      ensureAnalysisWindow();
      pump();
    });

    win.on('closed', () => {
      win = null;
      ready = false;
    });

    void win.loadFile(analysisHtmlPath());
  }

  function enqueue(trackIds: number[], priority: AnalysisPriority): number {
    ensureAnalysisWindow();
    const db = getDb();
    for (const id of trackIds) {
      const hints = getTrackAnalysisHints(db, id);
      if (!hints) continue;
      // Skip backfill if already analyzed at current version (Detect/deck forces).
      if (
        priority === 'backfill' &&
        hints.analyzed_at != null &&
        hints.analysis_version != null &&
        hints.analysis_version >= ANALYSIS_VERSION
      ) {
        continue;
      }
      // Dedupe: remove existing same id
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i]!.trackId === id) queue.splice(i, 1);
      }
      if (current?.trackId === id && busy) {
        // already running
        continue;
      }
      // Keep tag/manual BPM/key (R6.1 / R6.6); still compute waveform + loudness.
      const skipBpm = hints.bpm_source === 'tag' || hints.bpm_source === 'manual';
      const skipKey = hints.key_source === 'tag' || hints.key_source === 'manual';
      queue.push({
        trackId: id,
        path: hints.path,
        priority,
        skipBpm,
        skipKey,
        seq: seq++,
      });
    }
    sortQueue();
    emit(trackIds[0] ?? 0, 'idle');
    pump();
    return queueDepth();
  }

  function pump(): void {
    if (busy || !ready || !win || win.isDestroyed()) return;
    const next = queue.shift();
    if (!next) {
      emit(0, 'idle');
      return;
    }
    busy = true;
    current = next;
    emit(next.trackId, 'decode');
    win.webContents.send('analysis:run', next as AnalysisJob);
  }

  function onReady(): void {
    ready = true;
    console.info('[analysis] window ready');
    pump();
  }

  function onStage(_e: Electron.IpcMainEvent, payload: { trackId: number; stage: AnalysisStage }): void {
    emit(payload.trackId, payload.stage);
  }

  function onResult(_e: Electron.IpcMainEvent, outcome: AnalysisJobOutcome): void {
    try {
      if (outcome.ok) {
        emit(outcome.trackId, 'commit');
        commitAnalysis(getDb(), outcome);
      } else {
        console.warn('[analysis] job failed', outcome.trackId, outcome.error);
      }
    } catch (err) {
      console.error('[analysis] commit failed', err);
    } finally {
      busy = false;
      current = null;
      emit(outcome.trackId, 'idle');
      pump();
    }
  }

  ipcMain.removeAllListeners('analysis:ready');
  ipcMain.removeAllListeners('analysis:stage');
  ipcMain.removeAllListeners('analysis:result');
  ipcMain.on('analysis:ready', onReady);
  ipcMain.on('analysis:stage', onStage);
  ipcMain.on('analysis:result', onResult);

  return {
    ensureAnalysisWindow,
    enqueue,
    destroy() {
      ipcMain.removeListener('analysis:ready', onReady);
      ipcMain.removeListener('analysis:stage', onStage);
      ipcMain.removeListener('analysis:result', onResult);
      if (win && !win.isDestroyed()) win.destroy();
      win = null;
      ready = false;
      busy = false;
      queue.length = 0;
    },
  };
}
