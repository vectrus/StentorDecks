import { makeAutoObservable, runInAction } from 'mobx';
import {
  defaultSettings,
  type DeepPartial,
  type Settings,
} from '@stentordeck/shared';
import { invoke, onIpc } from '../ipc/client';

export class SettingsStore {
  settings: Settings = structuredClone(defaultSettings);
  corruptionNotice: string | null = null;
  ready = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get scale(): Settings['ui']['scale'] {
    return this.settings.ui.scale;
  }

  get remPx(): number {
    return 16 * (this.scale / 100);
  }

  async hydrate(): Promise<void> {
    const result = await invoke('settings:get');
    runInAction(() => {
      this.settings = result.settings;
      this.corruptionNotice = result.corruptionNotice;
      this.ready = true;
      this.applyCssVars();
    });
    onIpc('settings:changed', (settings) => {
      runInAction(() => {
        this.settings = settings;
        this.applyCssVars();
      });
    });
  }

  async set(patch: DeepPartial<Settings>): Promise<void> {
    const next = await invoke('settings:set', patch);
    runInAction(() => {
      this.settings = next;
      this.corruptionNotice = null;
      this.applyCssVars();
    });
  }

  async setScale(scale: Settings['ui']['scale']): Promise<void> {
    await this.set({ ui: { scale } });
  }

  dismissCorruptionNotice(): void {
    this.corruptionNotice = null;
  }

  applyCssVars(): void {
    document.documentElement.style.fontSize = `${this.remPx}px`;
    document.documentElement.style.setProperty('--deck-a', this.settings.ui.deckAColor);
    document.documentElement.style.setProperty('--deck-b', this.settings.ui.deckBColor);
  }
}

export const settingsStore = new SettingsStore();
