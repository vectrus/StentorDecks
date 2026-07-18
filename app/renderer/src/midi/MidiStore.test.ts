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
    lib.folders = [
      { path: 'C:\\Music\\a', name: 'a', children: [] },
      { path: 'C:\\Music\\b', name: 'b', children: [] },
    ];
    lib.tracks = [];
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

  it('browse down moves LibraryStore cursor', () => {
    const library = makeLibrary();
    const { store } = makeStore(library);
    expect(library.selected?.name).toBe('a');
    store.ingest(FIXTURE_BROWSE_DOWN[0]!, 0);
    expect(library.selected?.name).toBe('b');
    expect(store.monitor[0]?.controlId).toBe('browse.down');
  });

  it('pitch bend + arms temporary +0.5% rate', () => {
    const { store, deckA } = makeStore();
    store.ingest(FIXTURE_PITCH_BEND_PLUS_A[0]!, 0);
    expect(deckA.bendFactor).toBeCloseTo(1.005, 5);
  });

  it('noteDeckLoaded keeps live pitch/EQ live (no full relearn)', () => {
    const { store, deckA } = makeStore();
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

    deckA.resetOnLoad();
    expect(deckA.filterOn).toBe(false);
    expect(deckA.filterAmount).toBe(0.5);

    store.noteDeckLoaded('A');

    expect(store.takeoverView('deckA.eqMid')?.armed).toBe(false);
    expect(store.takeoverView('deckA.pitch')?.armed).toBe(false);
    expect(store.takeoverView('deckA.filter')?.armed).toBe(false);
    expect(deckA.filterAmount).toBeCloseTo(0.8); // adopted HW
    expect(store.takeoverView('deckA.gain')?.armed).toBe(true); // auto-gain path
  });
});
