import { makeAutoObservable, runInAction } from 'mobx';
import type { Settings } from '@stentordeck/shared';
import { audioEngine } from '../audio/AudioEngine';
import {
  enumerateAudioDevices,
  suggestRmxDefaults,
  type AudioDeviceInfo,
  type RoutingPlan,
} from '../audio/devices';
import type { SettingsStore } from './SettingsStore';

export class AudioDeviceStore {
  devices: AudioDeviceInfo[] = [];
  ready = false;
  enumerating = false;
  banner: string | null = null;
  activePlan: RoutingPlan = 'B';
  planReason = '';
  engineReady = false;
  testing: 'master' | 'cue' | null = null;

  private deviceChangeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly settingsStore: SettingsStore,
    private readonly afterRebuild?: () => void,
    private readonly onDeviceLost?: () => void,
  ) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get outputs(): AudioDeviceInfo[] {
    return this.devices.filter((d) => d.kind === 'audiooutput');
  }

  get inputs(): AudioDeviceInfo[] {
    return this.devices.filter((d) => d.kind === 'audioinput');
  }

  get needsSetup(): boolean {
    return this.settingsStore.settings.audio.masterDevice === null;
  }

  get detectedSummary(): string {
    const rmx = this.outputs.find((d) => /rmx|hercules|djconsole/i.test(d.label));
    if (rmx) {
      const ch = rmx.maxChannelCount ?? '?';
      return `Detected: ${rmx.label} · ${ch} ch out · WASAPI · Plan ${this.activePlan} active`;
    }
    if (this.outputs.length === 0) return 'No audio outputs detected yet';
    return `Detected: ${this.outputs.length} output(s) · Plan ${this.activePlan} active`;
  }

  async hydrate(): Promise<void> {
    await this.refreshDevices();
    await this.ensureValidDeviceSelection();
    if (typeof navigator.mediaDevices?.addEventListener === 'function') {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.scheduleDeviceChange();
      });
    }
    this.ready = true;
  }

  /**
   * After reboot, WASAPI deviceIds often change. If saved ids are missing,
   * re-suggest RMX2 (or clear to force Audio setup).
   */
  async ensureValidDeviceSelection(): Promise<void> {
    const { masterDevice, cueDevice } = this.settingsStore.settings.audio;
    const ids = new Set(this.outputs.map((d) => d.deviceId));
    const masterOk = masterDevice != null && ids.has(masterDevice);
    const cueOk = cueDevice != null && ids.has(cueDevice);

    if (masterOk && cueOk) return;

    if (this.outputs.some((d) => /rmx|hercules|djconsole/i.test(d.label))) {
      await this.applySuggestions();
      return;
    }

    if (masterDevice != null || cueDevice != null) {
      await this.settingsStore.set({
        audio: { masterDevice: null, cueDevice: null },
      });
      this.banner = 'Audio devices changed — open Audio setup and re-select the RMX2.';
    }
  }

  async refreshDevices(): Promise<void> {
    this.enumerating = true;
    try {
      const devices = await enumerateAudioDevices();
      runInAction(() => {
        this.devices = devices;
        this.enumerating = false;
      });
    } catch (err) {
      console.error('[audio] enumerate failed', err);
      runInAction(() => {
        this.enumerating = false;
      });
    }
  }

  async applySuggestions(): Promise<void> {
    const suggestion = suggestRmxDefaults(this.devices);
    await this.settingsStore.set({
      audio: {
        masterDevice: suggestion.masterDevice,
        cueDevice: suggestion.cueDevice,
        masterChannels: suggestion.masterChannels,
        cueChannels: suggestion.cueChannels,
      },
    });
  }

  async rebuildEngine(): Promise<void> {
    await audioEngine.rebuild({
      settings: this.settingsStore.settings,
      devices: this.devices,
    });
    runInAction(() => {
      this.activePlan = audioEngine.plan;
      this.planReason = audioEngine.planReason;
      this.engineReady = true;
    });
    this.afterRebuild?.();
  }

  async saveAndRebuild(patch: Partial<Settings['audio']>): Promise<void> {
    await this.settingsStore.set({ audio: patch });
    await this.rebuildEngine();
  }

  async testTone(which: 'master' | 'cue'): Promise<void> {
    this.testing = which;
    try {
      if (!this.engineReady) await this.rebuildEngine();
      if (which === 'master') await audioEngine.testMaster();
      else await audioEngine.testCue();
    } finally {
      runInAction(() => {
        this.testing = null;
      });
    }
  }

  private scheduleDeviceChange(): void {
    if (this.deviceChangeTimer != null) clearTimeout(this.deviceChangeTimer);
    this.deviceChangeTimer = setTimeout(() => {
      this.deviceChangeTimer = null;
      void this.handleDeviceChange();
    }, 350);
  }

  /**
   * USB unplug/replug: WASAPI deviceIds usually change on return.
   * Only rebuild on real loss/recovery — NOT on every devicechange (that was
   * killing playback, truncating buffers, and stranding MIDI).
   */
  private async handleDeviceChange(): Promise<void> {
    await this.refreshDevices();

    const masterId = this.settingsStore.settings.audio.masterDevice;
    const masterOk =
      masterId != null && this.outputs.some((d) => d.deviceId === masterId);
    const rmxPresent = this.outputs.some((d) =>
      /rmx|hercules|djconsole/i.test(d.label),
    );

    if (!masterOk) {
      if (rmxPresent) {
        // Replugged with a new deviceId — rebind + rebuild (docs/02).
        try {
          await this.applySuggestions();
          await this.rebuildEngine();
          runInAction(() => {
            this.banner =
              'Audio device reconnected — decks paused at the same position. Press Play to continue.';
          });
        } catch (err) {
          console.error('[audio] rebuild after replug failed', err);
          runInAction(() => {
            this.banner =
              'Audio device came back but the engine failed to rebuild. Try: open Audio setup → Continue.';
            this.engineReady = false;
          });
        }
        return;
      }

      // Truly gone — only mark once
      if (this.engineReady || !audioEngine.deviceLost) {
        audioEngine.markDeviceLost();
        this.onDeviceLost?.();
        runInAction(() => {
          this.banner =
            'Audio device lost — decks paused. Reconnect the RMX2 USB; playback will be restorable.';
          this.engineReady = false;
        });
      }
      return;
    }

    // Master id still valid. Rebuild only if we were down.
    if (!this.engineReady || audioEngine.deviceLost) {
      try {
        await this.rebuildEngine();
        runInAction(() => {
          this.banner =
            'Audio device reconnected — decks paused at the same position. Press Play to continue.';
        });
      } catch (err) {
        console.error('[audio] rebuild after devicechange failed', err);
        runInAction(() => {
          this.banner =
            'Audio device changed but rebuild failed. Try: open Audio setup → Continue.';
          this.engineReady = false;
        });
      }
    }
  }
}
