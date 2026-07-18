import { makeAutoObservable } from 'mobx';
import { DEFAULT_MASTER_GAIN, type ControlId } from '@stentordeck/shared';
import { audioEngine } from '../audio/AudioEngine';
import { setMixerFaderPositions, type DeckStore } from './DeckStore';

export class MixerStore {
  faderA = 1;
  faderB = 1;
  /** Linear 0..1 — default 30% so cold-start isn't PA-wide open. */
  master = DEFAULT_MASTER_GAIN;
  /** 0 = cue/PFL only, 1 = master only. Default cue-only for headphone pre-listen. */
  headMix = 0;
  phones = 1;

  takeoverSoftwareChange: ((id: ControlId) => void) | null = null;

  applyToEngine(): void {
    audioEngine.setMasterGain(this.master);
    audioEngine.setHeadMix(this.headMix);
    audioEngine.setPhonesGain(this.phones);
  }
  meters = { aDb: -120, bDb: -120, masterDb: -120 };

  constructor(
    private readonly deckA: DeckStore,
    private readonly deckB: DeckStore,
  ) {
    makeAutoObservable(this, { takeoverSoftwareChange: false }, { autoBind: true });
  }

  setTakeoverHooks(opts: { onSoftwareChange?: (id: ControlId) => void }): void {
    this.takeoverSoftwareChange = opts.onSoftwareChange ?? null;
  }

  setFaderA(pos: number): void {
    this.faderA = pos;
    setMixerFaderPositions(this.faderA, this.faderB);
    this.deckA.pushGraph();
    this.takeoverSoftwareChange?.('mixer.faderA');
  }

  setFaderB(pos: number): void {
    this.faderB = pos;
    setMixerFaderPositions(this.faderA, this.faderB);
    this.deckB.pushGraph();
    this.takeoverSoftwareChange?.('mixer.faderB');
  }

  setMaster(v: number): void {
    this.master = v;
    audioEngine.setMasterGain(v);
    this.takeoverSoftwareChange?.('mixer.master');
  }

  setHeadMix(v: number): void {
    this.headMix = v;
    audioEngine.setHeadMix(v);
    this.takeoverSoftwareChange?.('mixer.headMix');
  }

  setPhones(v: number): void {
    this.phones = v;
    audioEngine.setPhonesGain(v);
  }

  tickMeters(): void {
    this.meters = audioEngine.readMeters();
  }
}
