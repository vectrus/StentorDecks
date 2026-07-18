import { settingsStore } from './SettingsStore';
import { uiStore } from './UiStore';
import { DeckStore } from './DeckStore';
import { MixerStore } from './MixerStore';
import { BrowseStore } from './BrowseStore';
import { AudioDeviceStore } from './AudioDeviceStore';
import { audioEngine } from '../audio/AudioEngine';
import { MidiStore } from '../midi/MidiStore';
import { MidiEngine } from '../midi/MidiEngine';
import { MidiLeds } from '../midi/MidiLeds';

export const deckA = new DeckStore('A', () => settingsStore.settings);
export const deckB = new DeckStore('B', () => settingsStore.settings);
export const mixerStore = new MixerStore(deckA, deckB);
export const browseStore = new BrowseStore();
export const midiStore = new MidiStore(
  deckA,
  deckB,
  mixerStore,
  browseStore,
  () => settingsStore.settings.mixer.crossfader.enabled,
);
export const midiEngine = new MidiEngine(midiStore);
export const midiLeds = new MidiLeds(
  midiEngine,
  deckA,
  deckB,
  () => midiStore.mapping,
  () => settingsStore.settings.midi.sendLeds,
);

// Soft takeover re-arm: UI/load/sync → same hook MIDI skips while applying (R2.7).
const takeoverNotify = (id: Parameters<typeof midiStore.noteSoftwareChange>[0]) => {
  midiStore.noteSoftwareChange(id);
};
deckA.setTakeoverHooks({
  onSoftwareChange: takeoverNotify,
  onLoaded: (id) => midiStore.noteDeckLoaded(id),
});
deckB.setTakeoverHooks({
  onSoftwareChange: takeoverNotify,
  onLoaded: (id) => midiStore.noteDeckLoaded(id),
});
mixerStore.setTakeoverHooks({ onSoftwareChange: takeoverNotify });
export const audioDeviceStore = new AudioDeviceStore(
  settingsStore,
  async () => {
    // Re-decode stashed file bytes into the new AudioContext (R1.6 / USB path).
    await Promise.all([deckA.adoptEngineRestore(), deckB.adoptEngineRestore()]);
    mixerStore.applyToEngine();
    deckA.pushGraph();
    deckB.pushGraph();
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
    deckA.tick(deckB);
    deckB.tick(deckA);
    mixerStore.tickMeters();
    midiLeds.tick();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

export function stopAudioClock(): void {
  cancelAnimationFrame(raf);
}

export async function bootAudio(): Promise<void> {
  await midiStore.hydrateMapping();
  await audioDeviceStore.hydrate();
  if (!audioDeviceStore.needsSetup) {
    await audioDeviceStore.rebuildEngine();
  }
  startAudioClock();
  void midiEngine.start();
}

export { settingsStore, uiStore, audioEngine };
