import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@stentordeck/shared';
import { DeckStore } from '../stores/DeckStore';
import { LibraryStore } from '../stores/LibraryStore';
import { MixerStore } from '../stores/MixerStore';
import { MidiStore } from './MidiStore';
import {
  FIXTURE_BROWSE_DOWN,
  FIXTURE_JOG_A,
  FIXTURE_PITCH_A_CC14,
  FIXTURE_PITCH_BEND_PLUS_A,
  FIXTURE_PLAY_A,
} from './MidiStore.fixture';

describe('MidiStore ingest (fixture traffic)', () => {
  function makeLibrary(): LibraryStore {
    const lib = new LibraryStore();
    lib.folders = [{ path: 'C:\\Music\\crate', name: 'crate', children: [] }];
    lib.openFolder = 'C:\\Music\\crate';
    lib.tracks = [
      {
        id: 1,
        path: 'C:\\Music\\crate\\a.mp3',
        title: 'Alpha',
        artist: 'A',
        bpm: null,
        keyCamelot: null,
        durationMs: null,
        bpmSource: null,
        lowConfidence: false,
        beatGridOffsetSec: null,
      },
      {
        id: 2,
        path: 'C:\\Music\\crate\\b.mp3',
        title: 'Beta',
        artist: 'B',
        bpm: null,
        keyCamelot: null,
        durationMs: null,
        bpmSource: null,
        lowConfidence: false,
        beatGridOffsetSec: null,
      },
    ];
    lib.cursor = 0;
    return lib;
  }

  function makeStore(library = makeLibrary()) {
    const deckA = new DeckStore('A', () => defaultSettings);
    const deckB = new DeckStore('B', () => defaultSettings);
    deckA.state = 'stopped';
    deckA.duration = 10;
    const mixer = new MixerStore(deckA, deckB);
    return { store: new MidiStore(deckA, deckB, mixer, library, () => false), library, deckA };
  }

  it('decodes pitch A cc14 into monitor with control id', () => {
    const { store } = makeStore();
    let t = 0;
    for (const msg of FIXTURE_PITCH_A_CC14) {
      store.ingest(msg, t);
      t += 5;
    }
    expect(store.monitor.some((e) => e.controlId === 'deckA.pitch')).toBe(true);
  });

  it('annotates play note', () => {
    const { store } = makeStore();
    store.ingest(FIXTURE_PLAY_A[0]!, 0);
    expect(store.monitor[0]?.controlId).toBe('deckA.play');
  });

  it('annotates jog relative', () => {
    const { store } = makeStore();
    store.ingest(FIXTURE_JOG_A[0]!, 0);
    expect(store.monitor[0]?.controlId).toBe('deckA.jog');
    expect(store.monitor[0]?.annotation).toContain('ccRel');
  });

  it('browse down moves LibraryStore cursor in the file pane', () => {
    const library = makeLibrary();
    const { store } = makeStore(library);
    expect(library.selectedTrack?.title).toBe('Alpha');
    store.ingest(FIXTURE_BROWSE_DOWN[0]!, 0);
    expect(library.selectedTrack?.title).toBe('Beta');
    expect(store.monitor[0]?.controlId).toBe('browse.down');
  });

  it('pitch bend + arms temporary +0.5% rate', () => {
    const { store, deckA } = makeStore();
    store.ingest(FIXTURE_PITCH_BEND_PLUS_A[0]!, 0);
    expect(deckA.bendFactor).toBeCloseTo(1.005, 5);
  });

  it('inverts RMX2 pitch MIDI so high CC is slow (logical 0)', () => {
    const { store, deckA } = makeStore();
    store.takeovers.set('deckA.pitch', {
      armed: false,
      softwareValue: 0.5,
      hardwareValue: 0.5,
    });
    deckA.pitchPos = 0.5;
    // MSB 0x7F + LSB 0x7F ≈ full-scale MIDI 1.0 → after invert ≈ 0 (slow)
    store.ingest([0xb0, 0x36, 0x7f], 0);
    store.ingest([0xb0, 0x37, 0x7f], 1);
    expect(deckA.pitchPos).toBeLessThan(0.05);
  });

  it('noteDeckLoaded keeps live pitch/EQ live (no full relearn)', () => {
    const { store, deckA } = makeStore();
    // Absolute filter (learned spare) — adopt path; factory FX encoder is relative.
    store.applyMapping({
      ...store.mapping,
      'deckA.filter': { kind: 'cc7', ch: 0, cc: 0x11 },
    });
    // Pick up EQ mid at 0.7
    store.takeovers.set('deckA.eqMid', {
      armed: false,
      softwareValue: 0.7,
      hardwareValue: 0.7,
    });
    deckA.eq = { ...deckA.eq, mid: 0.7 };
    // Pick up pitch
    store.takeovers.set('deckA.pitch', {
      armed: false,
      softwareValue: 0.55,
      hardwareValue: 0.55,
    });
    deckA.pitchPos = 0.55;
    // Filter HW at 0.8 while software will reset then adopt
    store.takeovers.set('deckA.filter', {
      armed: false,
      softwareValue: 0.8,
      hardwareValue: 0.8,
    });
    deckA.filterAmount = 0.8;
    deckA.filterOn = true;

    deckA.loudnessLufs = -10;
    deckA.applyAutoGain();
    deckA.resetOnLoad();
    expect(deckA.filterOn).toBe(false);
    expect(deckA.filterAmount).toBe(0.5);
    deckA.loudnessLufs = -10;
    deckA.applyAutoGain();

    store.noteDeckLoaded('A');

    expect(store.takeoverView('deckA.eqMid')?.armed).toBe(false);
    expect(store.takeoverView('deckA.pitch')?.armed).toBe(false);
    expect(store.takeoverView('deckA.filter')?.armed).toBe(false);
    expect(deckA.filterAmount).toBeCloseTo(0.8); // adopted HW
    expect(store.takeoverView('deckA.gain')?.armed).toBe(true); // auto-gain rewrote trim
  });

  it('noteDeckLoaded keeps GAIN live when auto-gain off (sticky trim)', () => {
    const deckA = new DeckStore('A', () => ({
      ...defaultSettings,
      audio: { ...defaultSettings.audio, autoGain: false },
    }));
    const deckB = new DeckStore('B', () => defaultSettings);
    deckA.state = 'stopped';
    deckA.trimDb = 4;
    const mixer = new MixerStore(deckA, deckB);
    const store = new MidiStore(deckA, deckB, mixer, makeLibrary(), () => false);
    store.takeovers.set('deckA.gain', {
      armed: false,
      softwareValue: 0.7,
      hardwareValue: 0.7,
    });
    deckA.applyAutoGain();
    expect(deckA.trimDb).toBe(4);
    store.noteDeckLoaded('A');
    expect(store.takeoverView('deckA.gain')?.armed).toBe(false);
  });

  it('FX Mode relative encoder steps filter amount (CC 54 = 1 / 127)', () => {
    const { store, deckA } = makeStore();
    deckA.filterAmount = 0.5;
    store.ingest([0xb0, 0x54, 0x01], 0); // CW +1
    expect(deckA.filterAmount).toBeCloseTo(0.51, 5);
    store.ingest([0xb0, 0x54, 0x7f], 1); // CCW −1
    expect(deckA.filterAmount).toBeCloseTo(0.5, 5);
    expect(store.monitor.some((e) => e.controlId === 'deckA.filter')).toBe(true);
  });

  it('setConnection does not re-arm takeovers when already on the same port (R2.7)', () => {
    const { store } = makeStore();
    store.setConnection(true, 'RMX2');
    store.takeovers.set('mixer.faderA', {
      armed: false,
      softwareValue: 0.8,
      hardwareValue: 0.8,
    });
    store.setConnection(true, 'RMX2'); // statechange / audio rescan
    expect(store.takeoverView('mixer.faderA')?.armed).toBe(false);
    store.setConnection(false, null);
    store.setConnection(true, 'RMX2'); // real reconnect
    expect(store.takeoverView('mixer.faderA')?.armed).toBe(true);
  });

  it('Shift+FX relative encoder steps flanger wet (CC 5C = 1 / 127)', () => {
    const { store, deckA } = makeStore();
    deckA.flangerWet = 0;
    store.ingest([0xb0, 0x5c, 0x01], 0);
    expect(deckA.flangerWet).toBeCloseTo(0.01, 5);
    expect(store.monitor.some((e) => e.controlId === 'deckA.wet')).toBe(true);
  });
});
