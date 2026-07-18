import { settingsStore } from './SettingsStore';
import { uiStore } from './UiStore';
import { DeckStore } from './DeckStore';
import { MixerStore } from './MixerStore';
import { AudioDeviceStore } from './AudioDeviceStore';
import { audioEngine } from '../audio/AudioEngine';
import { MidiStore } from '../midi/MidiStore';
import { MidiEngine } from '../midi/MidiEngine';

export const deckA = new DeckStore('A', () => settingsStore.settings);
export const deckB = new DeckStore('B', () => settingsStore.settings);
export const mixerStore = new MixerStore(deckA, deckB);
export const midiStore = new MidiStore(
  deckA,
  deckB,
  mixerStore,
  () => settingsStore.settings.mixer.crossfader.enabled,
);
export const midiEngine = new MidiEngine(midiStore);
export const audioDeviceStore = new AudioDeviceStore(
  settingsStore,
  () => {
    deckA.adoptEngineRestore();
    deckB.adoptEngineRestore();
    mixerStore.applyToEngine();
    deckA.pushGraph();
    deckB.pushGraph();
    // Audio USB churn often drops the MIDI port — re-bind handler.
    midiEngine.rescan();
  },
  () => {
    deckA.onEngineInterrupted();
    deckB.onEngineInterrupted();
  },
);

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
  void midiEngine.start();
}

export { settingsStore, uiStore, audioEngine };
