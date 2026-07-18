import { makeAutoObservable } from 'mobx';
import { audioEngine } from '../audio/AudioEngine';
import { setMixerFaderPositions, type DeckStore } from './DeckStore';

export class MixerStore {
  faderA = 1;
  faderB = 1;
  master = 1;
  /** 0 = cue/PFL only, 1 = master only. Default cue-only for headphone pre-listen. */
  headMix = 0;
  phones = 1;

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
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setFaderA(pos: number): void {
    this.faderA = pos;
    setMixerFaderPositions(this.faderA, this.faderB);
    this.deckA.pushGraph();
  }

  setFaderB(pos: number): void {
    this.faderB = pos;
    setMixerFaderPositions(this.faderA, this.faderB);
    this.deckB.pushGraph();
  }

  setMaster(v: number): void {
    this.master = v;
    audioEngine.setMasterGain(v);
  }

  setHeadMix(v: number): void {
    this.headMix = v;
    audioEngine.setHeadMix(v);
  }

  setPhones(v: number): void {
    this.phones = v;
    audioEngine.setPhonesGain(v);
  }

  tickMeters(): void {
    this.meters = audioEngine.readMeters();
  }
}
