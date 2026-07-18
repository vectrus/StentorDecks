import { settingsStore } from './SettingsStore';
import { uiStore } from './UiStore';
import { DeckStore } from './DeckStore';
import { MixerStore } from './MixerStore';
import { AudioDeviceStore } from './AudioDeviceStore';
import { audioEngine } from '../audio/AudioEngine';

export const deckA = new DeckStore('A', () => settingsStore.settings);
export const deckB = new DeckStore('B', () => settingsStore.settings);
export const mixerStore = new MixerStore(deckA, deckB);
export const audioDeviceStore = new AudioDeviceStore(settingsStore, () => {
  mixerStore.applyToEngine();
  deckA.pushGraph();
  deckB.pushGraph();
});

let raf = 0;

export function startAudioClock(): void {
  const loop = () => {
    deckA.tick();
    deckB.tick();
    mixerStore.tickMeters();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

export function stopAudioClock(): void {
  cancelAnimationFrame(raf);
}

export async function bootAudio(): Promise<void> {
  await audioDeviceStore.hydrate();
  if (!audioDeviceStore.needsSetup) {
    await audioDeviceStore.rebuildEngine();
  }
  startAudioClock();
}

export { settingsStore, uiStore, audioEngine };
