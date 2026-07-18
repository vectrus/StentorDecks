import { makeAutoObservable, runInAction } from 'mobx';
import type { AppModeState } from '@stentordeck/shared';
import { invoke, onIpc } from '../ipc/client';

export class UiStore {
  mode: AppModeState['mode'] = 'performance';
  fullscreen = true;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
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
    const next = await invoke('app:mode:set', { mode });
    runInAction(() => {
      this.mode = next.mode;
      this.fullscreen = next.fullscreen;
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
