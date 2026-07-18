import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@stentordeck/shared';
import { BrowseStore } from '../stores/BrowseStore';
import { DeckStore } from '../stores/DeckStore';
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
  function makeStore() {
    const deckA = new DeckStore('A', () => defaultSettings);
    const deckB = new DeckStore('B', () => defaultSettings);
    deckA.state = 'stopped';
    deckA.duration = 10;
    const mixer = new MixerStore(deckA, deckB);
    const browse = new BrowseStore();
    return new MidiStore(deckA, deckB, mixer, browse, () => false);
  }

  it('decodes pitch A cc14 into monitor with control id', () => {
    const store = makeStore();
    let t = 0;
    for (const msg of FIXTURE_PITCH_A_CC14) {
      store.ingest(msg, t);
      t += 5;
    }
    expect(store.monitor.some((e) => e.controlId === 'deckA.pitch')).toBe(true);
  });

  it('annotates play note', () => {
    const store = makeStore();
    store.ingest(FIXTURE_PLAY_A[0]!, 0);
    expect(store.monitor[0]?.controlId).toBe('deckA.play');
  });

  it('annotates jog relative', () => {
    const store = makeStore();
    store.ingest(FIXTURE_JOG_A[0]!, 0);
    expect(store.monitor[0]?.controlId).toBe('deckA.jog');
    expect(store.monitor[0]?.annotation).toContain('ccRel');
  });

  it('browse down moves fixture cursor', () => {
    const deckA = new DeckStore('A', () => defaultSettings);
    const deckB = new DeckStore('B', () => defaultSettings);
    const mixer = new MixerStore(deckA, deckB);
    const browse = new BrowseStore();
    const store = new MidiStore(deckA, deckB, mixer, browse, () => false);
    const before = browse.selected?.name;
    store.ingest(FIXTURE_BROWSE_DOWN[0]!, 0);
    expect(browse.selected?.name).not.toBe(before);
    expect(store.monitor[0]?.controlId).toBe('browse.down');
  });

  it('pitch bend + arms temporary +0.5% rate', () => {
    const deckA = new DeckStore('A', () => defaultSettings);
    const deckB = new DeckStore('B', () => defaultSettings);
    deckA.state = 'stopped';
    const mixer = new MixerStore(deckA, deckB);
    const store = new MidiStore(deckA, deckB, mixer, new BrowseStore(), () => false);
    store.ingest(FIXTURE_PITCH_BEND_PLUS_A[0]!, 0);
    expect(deckA.bendFactor).toBeCloseTo(1.005, 5);
  });
});
