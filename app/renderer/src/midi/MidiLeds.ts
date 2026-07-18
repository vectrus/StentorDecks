/**
 * LED feedback — note-on 0x7F / note-off to the button's own note (docs/04).
 * Reactive via polling from the audio clock (no spam on silent fail).
 */

import type { ControlId, MidiMapping } from '@stentordeck/shared';
import type { DeckStore } from '../stores/DeckStore';
import type { MidiEngine } from './MidiEngine';

type LedKey = string;

export class MidiLeds {
  private last = new Map<LedKey, boolean>();
  private warnedMissingOut = false;

  constructor(
    private readonly engine: MidiEngine,
    private readonly deckA: DeckStore,
    private readonly deckB: DeckStore,
    private readonly getMapping: () => MidiMapping,
    private readonly getSendLeds: () => boolean,
  ) {}

  /** Call from rAF / audio clock — throttled internally by change detection. */
  tick(): void {
    if (!this.getSendLeds()) return;
    this.setLed('deckA.play', this.deckA.state === 'playing');
    this.setLed('deckB.play', this.deckB.state === 'playing');
    this.setLed('deckA.sync', this.deckA.syncArmed);
    this.setLed('deckB.sync', this.deckB.syncArmed);
    this.setLed('deckA.pfl', this.deckA.pfl);
    this.setLed('deckB.pfl', this.deckB.pfl);
    this.setLed('deckA.killHigh', this.deckA.kills.high);
    this.setLed('deckA.killMid', this.deckA.kills.mid);
    this.setLed('deckA.killLow', this.deckA.kills.low);
    this.setLed('deckB.killHigh', this.deckB.kills.high);
    this.setLed('deckB.killMid', this.deckB.kills.mid);
    this.setLed('deckB.killLow', this.deckB.kills.low);
    // FX pads — provisional factory notes; confirm on RMX2 (E3-HW-CHECKLIST)
    this.setLed('deckA.filterPad', this.deckA.filterOn);
    this.setLed('deckA.flangerPad', this.deckA.flangerOn);
    this.setLed('deckB.filterPad', this.deckB.filterOn);
    this.setLed('deckB.flangerPad', this.deckB.flangerOn);
  }

  private setLed(id: ControlId, on: boolean): void {
    if (this.last.get(id) === on) return;
    this.last.set(id, on);
    const binding = this.getMapping()[id];
    if (!binding || binding.kind !== 'button') return;
    const ok = this.engine.sendNote(binding.ch, binding.note, on);
    if (!ok && !this.warnedMissingOut) {
      this.warnedMissingOut = true;
      console.info('[midi] LED output unavailable — continuing without LED spam');
    }
  }
}
