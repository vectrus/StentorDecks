import { reaction } from 'mobx';
import { settingsStore } from './SettingsStore';
import { uiStore } from './UiStore';
import { DeckStore } from './DeckStore';
import { MixerStore } from './MixerStore';
import { libraryStore } from './LibraryStore';
import { sessionPlayedStore } from './SessionPlayedStore';
import { AudioDeviceStore } from './AudioDeviceStore';
import { audioEngine } from '../audio/AudioEngine';
import { MidiStore } from '../midi/MidiStore';
import { MidiEngine } from '../midi/MidiEngine';
import { MidiLeds } from '../midi/MidiLeds';
import { onIpc } from '../ipc/client';
import { runFrameDraws } from '../audio/frameClock';

export const deckA = new DeckStore('A', () => settingsStore.settings);
export const deckB = new DeckStore('B', () => settingsStore.settings);
export const mixerStore = new MixerStore(deckA, deckB);
export { libraryStore, sessionPlayedStore };
export const midiStore = new MidiStore(
  deckA,
  deckB,
  mixerStore,
  libraryStore,
  () => settingsStore.settings.mixer.crossfader.enabled,
);
export const midiEngine = new MidiEngine(midiStore);
export const midiLeds = new MidiLeds(
  midiEngine,
  deckA,
  deckB,
  () => midiStore.mapping,
  () => settingsStore.settings.midi.sendLeds,
  () => settingsStore.settings.mixer.jog.dualZone,
);

// Soft takeover re-arm: UI/load/sync → same hook MIDI skips while applying (R2.7).
const takeoverNotify = (id: Parameters<typeof midiStore.noteSoftwareChange>[0]) => {
  midiStore.noteSoftwareChange(id);
};
deckA.setTakeoverHooks({
  onSoftwareChange: takeoverNotify,
  onLoaded: (id) => {
    midiStore.noteDeckLoaded(id);
    // Loading A must not yank B if B was SYNC'd to A (and vice versa).
    deckA.breakSyncFollowers(deckB);
  },
});
deckB.setTakeoverHooks({
  onSoftwareChange: takeoverNotify,
  onLoaded: (id) => {
    midiStore.noteDeckLoaded(id);
    deckB.breakSyncFollowers(deckA);
  },
});
mixerStore.setTakeoverHooks({ onSoftwareChange: takeoverNotify });

// Mixer settings → audible immediately + re-arm takeovers (E6 / docs/07).
reaction(
  () => ({
    a: settingsStore.settings.mixer.channelFaders.a.shape,
    b: settingsStore.settings.mixer.channelFaders.b.shape,
    eqMaxDb: settingsStore.settings.mixer.eq.maxDb,
    pitchRange: settingsStore.settings.mixer.pitchFaders.range,
    pitchDz: settingsStore.settings.mixer.pitchFaders.centerDeadZone,
  }),
  () => {
    deckA.pushGraph();
    deckB.pushGraph();
    // Remap transport rate from current fader pos into new pitch domain (no SYNC clear).
    audioEngine.transport('A')?.setRate(deckA.effectiveRate);
    audioEngine.transport('B')?.setRate(deckB.effectiveRate);
    midiStore.noteSoftwareChange('mixer.faderA');
    midiStore.noteSoftwareChange('mixer.faderB');
    midiStore.noteSoftwareChange('deckA.pitch');
    midiStore.noteSoftwareChange('deckB.pitch');
    midiStore.noteSoftwareChange('deckA.eqHigh');
    midiStore.noteSoftwareChange('deckA.eqMid');
    midiStore.noteSoftwareChange('deckA.eqLow');
    midiStore.noteSoftwareChange('deckB.eqHigh');
    midiStore.noteSoftwareChange('deckB.eqMid');
    midiStore.noteSoftwareChange('deckB.eqLow');
  },
);

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
    // One scheduling domain: transport → visual samples → waveforms (R7.5 / E7).
    deckA.tick(deckB);
    deckB.tick(deckA);
    sessionPlayedStore.tick(deckA, deckB);
    runFrameDraws();
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
  await libraryStore.hydrate();
  await audioDeviceStore.hydrate();
  if (!audioDeviceStore.needsSetup) {
    await audioDeviceStore.rebuildEngine();
  }
  // E6: refresh overview when analysis commits for a loaded deck.
  onIpc('analysis:progress', (p) => {
    if (p.stage === 'commit' || (p.stage === 'idle' && p.trackId > 0)) {
      deckA.refreshOverviewIf(p.trackId);
      deckB.refreshOverviewIf(p.trackId);
    }
  });
  startAudioClock();
  void midiEngine.start();
}

export { settingsStore, uiStore, audioEngine };
