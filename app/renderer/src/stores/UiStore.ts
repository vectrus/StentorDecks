import { makeAutoObservable, runInAction } from 'mobx';
import type { AppModeState } from '@stentordeck/shared';
import { invoke, onIpc } from '../ipc/client';

export class UiStore {
  mode: AppModeState['mode'] = 'performance';
  fullscreen = true;
  /** Settings → Developer: E2–E4 harness overlay (not a booth mode). */
  showDevMode = false;
  /** Settings → Developer: live MIDI decode strip. */
  showMidiMonitor = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setDevMode(on: boolean): void {
    this.showDevMode = on;
  }

  setMidiMonitor(on: boolean): void {
    this.showMidiMonitor = on;
  }

  async hydrate(): Promise<void> {
    const state = await invoke('app:mode:get');
    runInAction(() => {
      this.mode = state.mode;
      this.fullscreen = state.fullscreen;
    });
    onIpc('app:mode:changed', (next) => {
      runInAction(() => {
        this.mode = next.mode;
        this.fullscreen = next.fullscreen;
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        void this.toggleFullscreen();
      }
    });
  }

  async setMode(mode: AppModeState['mode']): Promise<void> {
    // Leaving Library stops phones-only Prep preview (fixer XOR normalize).
    if (this.mode === 'prep' && mode !== 'prep') {
      const { phonesPreviewPlayer } = await import('../audio/PhonesPreviewPlayer');
      await phonesPreviewPlayer.stop();
    }
    const next = await invoke('app:mode:set', { mode });
    runInAction(() => {
      this.mode = next.mode;
      this.fullscreen = next.fullscreen;
      // Leaving Dev mode when switching Performance / Library.
      this.showDevMode = false;
    });
  }

  async toggleFullscreen(): Promise<void> {
    const { fullscreen } = await invoke('app:fullscreen:toggle');
    runInAction(() => {
      this.fullscreen = fullscreen;
    });
  }
}

export const uiStore = new UiStore();
