import { makeAutoObservable } from 'mobx';
import {
  armTakeover,
  createTakeover,
  factoryCc14Pairs,
  factoryRelativeCcs,
  lookupControlId,
  norm14,
  norm7,
  processTakeoverInput,
  RMX2_FACTORY_MAP,
  type ControlId,
  type DecodedMidi,
  type MidiMapping,
  type TakeoverState,
  createMidiDecodeState,
  decodeMidiMessage,
  normalizeMidiBytes,
} from '@stentordeck/shared';
import type { DeckStore } from '../stores/DeckStore';
import type { MixerStore } from '../stores/MixerStore';

export type MidiMonitorEntry = {
  t: number;
  annotation: string;
  controlId: ControlId | null;
  unknown: boolean;
};

const MONITOR_CAP = 200;

export class MidiStore {
  mapping: MidiMapping = { ...RMX2_FACTORY_MAP };
  connected = false;
  portName: string | null = null;
  unknownCount = 0;
  monitor: MidiMonitorEntry[] = [];
  takeovers = new Map<ControlId, TakeoverState>();

  private decodeState = createMidiDecodeState();
  private readonly cc14Pairs = factoryCc14Pairs();
  private readonly relativeCcs = factoryRelativeCcs();

  constructor(
    private readonly deckA: DeckStore,
    private readonly deckB: DeckStore,
    private readonly mixer: MixerStore,
    private readonly getCrossfaderEnabled: () => boolean,
  ) {
    makeAutoObservable(this, {}, { autoBind: true });
    this.rearmAllTakeovers();
  }

  setConnection(connected: boolean, portName: string | null): void {
    this.connected = connected;
    this.portName = portName;
    if (connected) this.rearmAllTakeovers();
  }

  rearmAllTakeovers(): void {
    const continuous: ControlId[] = [
      'mixer.faderA',
      'mixer.faderB',
      'mixer.master',
      'mixer.headMix',
      'deckA.pitch',
      'deckB.pitch',
      'deckA.gain',
      'deckB.gain',
      'deckA.eqHigh',
      'deckA.eqMid',
      'deckA.eqLow',
      'deckB.eqHigh',
      'deckB.eqMid',
      'deckB.eqLow',
      'deckA.filter',
      'deckB.filter',
      'deckA.wet',
      'deckB.wet',
    ];
    for (const id of continuous) {
      this.takeovers.set(id, createTakeover(this.softwareRaw(id)));
    }
  }

  takeoverView(id: ControlId): TakeoverState | null {
    return this.takeovers.get(id) ?? null;
  }

  /** Feed raw MIDI bytes (from Web MIDI or fixtures). */
  ingest(data: Uint8Array | number[], timeMs: number): void {
    const raw = normalizeMidiBytes(data, timeMs);
    if (!raw) return;
    const { state, events } = decodeMidiMessage(this.decodeState, raw, {
      cc14Pairs: this.cc14Pairs,
      relativeCcs: this.relativeCcs,
    });
    this.decodeState = state;
    for (const ev of events) {
      this.handleDecoded(ev, timeMs);
    }
  }

  private handleDecoded(ev: DecodedMidi, timeMs: number): void {
    if (ev.kind === 'unknown') {
      this.unknownCount += 1;
      this.pushMonitor(timeMs, `unknown ${ev.status.toString(16)}`, null, true);
      return;
    }

    const controlId = lookupControlId(this.mapping, {
      kind: ev.kind,
      channel: ev.channel,
      note: 'note' in ev ? ev.note : undefined,
      cc: 'cc' in ev ? ev.cc : undefined,
      msb: 'msb' in ev ? ev.msb : undefined,
    });

    const annotation = annotate(ev, controlId);
    this.pushMonitor(timeMs, annotation, controlId, false);

    if (!controlId) {
      this.unknownCount += 1;
      return;
    }

    if (controlId === 'mixer.crossfader' && !this.getCrossfaderEnabled()) {
      return; // R2.4
    }

    this.dispatch(controlId, ev);
  }

  private dispatch(id: ControlId, ev: DecodedMidi): void {
    if (ev.kind === 'noteOn') {
      this.dispatchButton(id, true);
      return;
    }
    if (ev.kind === 'noteOff') {
      this.dispatchButton(id, false);
      return;
    }
    if (ev.kind === 'ccRel' && (id === 'deckA.jog' || id === 'deckB.jog')) {
      const deck = id === 'deckA.jog' ? this.deckA : this.deckB;
      deck.nudge(ev.delta);
      return;
    }
    if (ev.kind === 'cc14' || ev.kind === 'cc7') {
      const raw = ev.kind === 'cc14' ? norm14(ev.value14) : norm7(ev.value);
      this.dispatchContinuous(id, raw);
    }
  }

  private dispatchButton(id: ControlId, down: boolean): void {
    if (!down) {
      if (id === 'deckA.cue') this.deckA.cueHoldEnd();
      if (id === 'deckB.cue') this.deckB.cueHoldEnd();
      return;
    }
    switch (id) {
      case 'deckA.play':
        this.deckA.togglePlay();
        break;
      case 'deckB.play':
        this.deckB.togglePlay();
        break;
      case 'deckA.cue':
        // While playing: jump+stop only. Hold-preview only when already stopped
        // (otherwise noteOn would stop then immediately start cue preview).
        if (this.deckA.state === 'playing') {
          this.deckA.cuePress();
        } else {
          this.deckA.cuePress();
          this.deckA.cueHoldStart();
        }
        break;
      case 'deckB.cue':
        if (this.deckB.state === 'playing') {
          this.deckB.cuePress();
        } else {
          this.deckB.cuePress();
          this.deckB.cueHoldStart();
        }
        break;
      case 'deckA.sync':
        this.deckA.syncTo(this.deckB);
        this.arm('deckA.pitch');
        break;
      case 'deckB.sync':
        this.deckB.syncTo(this.deckA);
        this.arm('deckB.pitch');
        break;
      case 'deckA.pfl':
        this.deckA.togglePfl();
        break;
      case 'deckB.pfl':
        this.deckB.togglePfl();
        break;
      case 'deckA.killHigh':
        this.deckA.toggleKill('high');
        break;
      case 'deckA.killMid':
        this.deckA.toggleKill('mid');
        break;
      case 'deckA.killLow':
        this.deckA.toggleKill('low');
        break;
      case 'deckB.killHigh':
        this.deckB.toggleKill('high');
        break;
      case 'deckB.killMid':
        this.deckB.toggleKill('mid');
        break;
      case 'deckB.killLow':
        this.deckB.toggleKill('low');
        break;
      // FX pad notes: assign after HW verification (docs/04) — filter/flanger toggles.
      default:
        break;
    }
  }

  private dispatchContinuous(id: ControlId, raw: number): void {
    const st = this.takeovers.get(id) ?? createTakeover(this.softwareRaw(id));
    const result = processTakeoverInput(st, raw);
    this.takeovers.set(id, result.state);
    if (!result.apply) return;

    switch (id) {
      case 'mixer.faderA':
        this.mixer.setFaderA(result.value);
        break;
      case 'mixer.faderB':
        this.mixer.setFaderB(result.value);
        break;
      case 'mixer.master':
        this.mixer.setMaster(result.value);
        break;
      case 'mixer.headMix':
        this.mixer.setHeadMix(result.value);
        break;
      case 'deckA.pitch':
        this.deckA.setPitchPos(result.value);
        break;
      case 'deckB.pitch':
        this.deckB.setPitchPos(result.value);
        break;
      case 'deckA.gain':
        this.deckA.setTrimDb((result.value - 0.5) * 24);
        break;
      case 'deckB.gain':
        this.deckB.setTrimDb((result.value - 0.5) * 24);
        break;
      case 'deckA.eqHigh':
        this.deckA.setEq('high', result.value);
        break;
      case 'deckA.eqMid':
        this.deckA.setEq('mid', result.value);
        break;
      case 'deckA.eqLow':
        this.deckA.setEq('low', result.value);
        break;
      case 'deckB.eqHigh':
        this.deckB.setEq('high', result.value);
        break;
      case 'deckB.eqMid':
        this.deckB.setEq('mid', result.value);
        break;
      case 'deckB.eqLow':
        this.deckB.setEq('low', result.value);
        break;
      case 'deckA.filter':
        this.deckA.setFilterAmount(result.value);
        break;
      case 'deckB.filter':
        this.deckB.setFilterAmount(result.value);
        break;
      case 'deckA.wet':
        this.deckA.setFlangerWet(result.value);
        break;
      case 'deckB.wet':
        this.deckB.setFlangerWet(result.value);
        break;
      default:
        break;
    }
  }

  private arm(id: ControlId): void {
    const cur = this.takeovers.get(id) ?? createTakeover(0.5);
    this.takeovers.set(id, armTakeover(cur, this.softwareRaw(id)));
  }

  private softwareRaw(id: ControlId): number {
    switch (id) {
      case 'mixer.faderA':
        return this.mixer.faderA;
      case 'mixer.faderB':
        return this.mixer.faderB;
      case 'mixer.master':
        return this.mixer.master;
      case 'mixer.headMix':
        return this.mixer.headMix;
      case 'deckA.pitch':
        return this.deckA.pitchPos;
      case 'deckB.pitch':
        return this.deckB.pitchPos;
      case 'deckA.filter':
        return this.deckA.filterAmount;
      case 'deckB.filter':
        return this.deckB.filterAmount;
      case 'deckA.wet':
        return this.deckA.flangerWet;
      case 'deckB.wet':
        return this.deckB.flangerWet;
      case 'deckA.eqHigh':
        return this.deckA.eq.high;
      case 'deckA.eqMid':
        return this.deckA.eq.mid;
      case 'deckA.eqLow':
        return this.deckA.eq.low;
      case 'deckB.eqHigh':
        return this.deckB.eq.high;
      case 'deckB.eqMid':
        return this.deckB.eq.mid;
      case 'deckB.eqLow':
        return this.deckB.eq.low;
      default:
        return 0.5;
    }
  }

  private pushMonitor(
    t: number,
    annotation: string,
    controlId: ControlId | null,
    unknown: boolean,
  ): void {
    this.monitor.unshift({ t, annotation, controlId, unknown });
    if (this.monitor.length > MONITOR_CAP) this.monitor.length = MONITOR_CAP;
  }
}

function annotate(ev: DecodedMidi, controlId: ControlId | null): string {
  const tag = controlId ? ` → ${controlId}` : '';
  switch (ev.kind) {
    case 'noteOn':
      return `noteOn ${ev.note.toString(16)} v${ev.velocity}${tag}`;
    case 'noteOff':
      return `noteOff ${ev.note.toString(16)}${tag}`;
    case 'cc7':
      return `cc7 ${ev.cc.toString(16)}=${ev.value}${tag}`;
    case 'cc14':
      return `cc14 ${ev.msb.toString(16)}/${ev.lsb.toString(16)}=${ev.value14}${tag}`;
    case 'ccRel':
      return `ccRel ${ev.cc.toString(16)} Δ${ev.delta}${tag}`;
    case 'unknown':
      return `unknown ${ev.status.toString(16)}`;
  }
}
