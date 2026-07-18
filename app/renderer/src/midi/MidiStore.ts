import { makeAutoObservable, runInAction } from 'mobx';
import {
  adoptHardwareTakeover,
  applyLearnCommit,
  armTakeover,
  cc14PairsFromMapping,
  createLearnState,
  createTakeover,
  factoryMidiMapping,
  gainKnobFromTrimDb,
  learnAcceptSteal,
  learnCancel,
  learnConfirm,
  learnEnable,
  learnFeedRaw,
  learnRejectSteal,
  learnSelectControl,
  lookupControlId,
  norm14,
  norm7,
  preserveTakeoverAfterLoad,
  processTakeoverInput,
  refreshTakeoverSoftware,
  relativeCcsFromMapping,
  trimDbFromGainKnob,
  type ControlId,
  type DecodedMidi,
  type LearnState,
  type MidiMapping,
  type TakeoverState,
  createMidiDecodeState,
  decodeMidiMessage,
  normalizeMidiBytes,
} from '@stentordeck/shared';
import { invoke } from '../ipc/client';
import type { LibraryStore } from '../stores/LibraryStore';
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
  mapping: MidiMapping = factoryMidiMapping();
  connected = false;
  portName: string | null = null;
  unknownCount = 0;
  monitor: MidiMonitorEntry[] = [];
  takeovers = new Map<ControlId, TakeoverState>();
  mappingReady = false;
  learn: LearnState = createLearnState();
  /** True while applying MIDI → store (skip re-arm on those writes). */
  private applyingFromMidi = false;

  private decodeState = createMidiDecodeState();
  private cc14Pairs: Array<{ msb: number; lsb: number }> = [];
  private relativeCcs: Set<number> = new Set();

  constructor(
    private readonly deckA: DeckStore,
    private readonly deckB: DeckStore,
    private readonly mixer: MixerStore,
    private readonly library: LibraryStore,
    private readonly getCrossfaderEnabled: () => boolean,
  ) {
    makeAutoObservable(this, {}, { autoBind: true });
    this.refreshDecodeHints();
    this.rearmAllTakeovers();
  }

  get learnActive(): boolean {
    return this.learn.phase.phase !== 'off';
  }

  startLearn(): void {
    this.learn = learnEnable(this.learn);
  }

  cancelLearn(): void {
    this.learn = learnCancel(this.learn);
  }

  selectLearnControl(id: ControlId): void {
    this.learn = learnSelectControl(this.learn, id);
  }

  async confirmLearn(): Promise<void> {
    const { state, commit } = learnConfirm(this.learn);
    this.learn = state;
    if (!commit) return;
    const next = applyLearnCommit(this.mapping, commit);
    await this.persistMapping(next);
  }

  async acceptLearnSteal(): Promise<void> {
    const { state, commit } = learnAcceptSteal(this.learn);
    this.learn = state;
    if (!commit) return;
    const next = applyLearnCommit(this.mapping, commit);
    await this.persistMapping(next);
  }

  rejectLearnSteal(): void {
    this.learn = learnRejectSteal(this.learn);
  }

  /** Load persisted map from main (SQLite). Falls back to factory on failure. */
  async hydrateMapping(): Promise<void> {
    try {
      const mapping = await invoke('midi:mapping:get');
      runInAction(() => {
        this.applyMapping(mapping);
        this.mappingReady = true;
      });
    } catch (err) {
      console.error('[midi] mapping hydrate failed — using factory', err);
      runInAction(() => {
        this.applyMapping(factoryMidiMapping());
        this.mappingReady = true;
      });
    }
  }

  applyMapping(mapping: MidiMapping): void {
    this.mapping = { ...mapping };
    this.refreshDecodeHints();
    this.rearmAllTakeovers();
  }

  private refreshDecodeHints(): void {
    this.cc14Pairs = cc14PairsFromMapping(this.mapping);
    this.relativeCcs = relativeCcsFromMapping(this.mapping);
  }

  async persistMapping(mapping: MidiMapping): Promise<void> {
    // Plain JSON for IPC — MobX proxies throw "object could not be cloned".
    const plain = JSON.parse(JSON.stringify(mapping)) as MidiMapping;
    await invoke('midi:mapping:set', plain);
    this.applyMapping(plain);
  }

  async resetMapping(): Promise<void> {
    const mapping = await invoke('midi:mapping:reset');
    this.applyMapping(mapping);
  }

  async exportMappingJson(): Promise<string> {
    return invoke('midi:mapping:export');
  }

  async importMappingJson(json: string): Promise<void> {
    const mapping = await invoke('midi:mapping:import', { json });
    this.applyMapping(mapping);
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

    const learning =
      this.learn.phase.phase === 'listen' ||
      this.learn.phase.phase === 'confirm' ||
      this.learn.phase.phase === 'steal';

    if (this.learn.phase.phase === 'listen') {
      this.learn = learnFeedRaw(this.learn, raw, this.mapping);
    }

    const { state, events } = decodeMidiMessage(this.decodeState, raw, {
      cc14Pairs: this.cc14Pairs,
      relativeCcs: this.relativeCcs,
    });
    this.decodeState = state;
    for (const ev of events) {
      this.handleDecoded(ev, timeMs, learning);
    }
  }

  private handleDecoded(ev: DecodedMidi, timeMs: number, learning: boolean): void {
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

    const learnTag =
      learning && this.learn.phase.phase === 'listen'
        ? ' [learn]'
        : learning
          ? ' [learn paused]'
          : '';
    const annotation = annotate(ev, controlId) + learnTag;
    this.pushMonitor(timeMs, annotation, controlId, false);

    if (learning) {
      // Learn owns the stream — never dispatch deck/mixer actions (docs/04).
      return;
    }

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
      let raw = ev.kind === 'cc14' ? norm14(ev.value14) : norm7(ev.value);
      // RMX2 pitch faders are MIDI-inverted vs tempo: high CC = toward −%.
      // Keep logical pitchPos: 0 = slow, 1 = fast (matches UI strip + docs/03).
      if (id === 'deckA.pitch' || id === 'deckB.pitch') {
        raw = 1 - raw;
      }
      this.dispatchContinuous(id, raw);
    }
  }

  private dispatchButton(id: ControlId, down: boolean): void {
    if (!down) {
      this.dispatchButtonUp(id);
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
        // While playing: jump+stop only. Hold-preview only when already stopped.
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
        this.deckA.toggleSync(this.deckB);
        if (this.deckA.syncArmed) this.arm('deckA.pitch');
        break;
      case 'deckB.sync':
        this.deckB.toggleSync(this.deckA);
        if (this.deckB.syncArmed) this.arm('deckB.pitch');
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
      case 'deckA.ff':
        this.deckA.startSeekHold(1);
        break;
      case 'deckA.rw':
        this.deckA.startSeekHold(-1);
        break;
      case 'deckB.ff':
        this.deckB.startSeekHold(1);
        break;
      case 'deckB.rw':
        this.deckB.startSeekHold(-1);
        break;
      case 'deckA.pitchBendPlus':
        this.deckA.setPitchBend(1);
        break;
      case 'deckA.pitchBendMinus':
        this.deckA.setPitchBend(-1);
        break;
      case 'deckB.pitchBendPlus':
        this.deckB.setPitchBend(1);
        break;
      case 'deckB.pitchBendMinus':
        this.deckB.setPitchBend(-1);
        break;
      case 'browse.up':
        this.library.up();
        break;
      case 'browse.down':
        this.library.down();
        break;
      case 'browse.right':
        this.library.enter();
        break;
      case 'browse.left':
        this.library.parent();
        break;
      case 'deckA.load':
        this.library.requestLoad(this.deckA);
        break;
      case 'deckB.load':
        this.library.requestLoad(this.deckB);
        break;
      case 'deckA.filterPad':
        this.deckA.toggleFilter();
        break;
      case 'deckA.flangerPad':
        this.deckA.toggleFlanger();
        break;
      case 'deckB.filterPad':
        this.deckB.toggleFilter();
        break;
      case 'deckB.flangerPad':
        this.deckB.toggleFlanger();
        break;
      default:
        break;
    }
  }

  private dispatchButtonUp(id: ControlId): void {
    switch (id) {
      case 'deckA.cue':
        this.deckA.cueHoldEnd();
        break;
      case 'deckB.cue':
        this.deckB.cueHoldEnd();
        break;
      case 'deckA.ff':
      case 'deckA.rw':
        this.deckA.stopSeekHold();
        break;
      case 'deckB.ff':
      case 'deckB.rw':
        this.deckB.stopSeekHold();
        break;
      case 'deckA.pitchBendPlus':
      case 'deckA.pitchBendMinus':
        this.deckA.setPitchBend(0);
        break;
      case 'deckB.pitchBendPlus':
      case 'deckB.pitchBendMinus':
        this.deckB.setPitchBend(0);
        break;
      default:
        break;
    }
  }

  private dispatchContinuous(id: ControlId, raw: number): void {
    // Compare in raw 0..1 space (docs/03): refresh software target while armed
    // so SYNC follow / load don't leave a stale pickup point.
    const soft = this.softwareRaw(id);
    const st = refreshTakeoverSoftware(
      this.takeovers.get(id) ?? createTakeover(soft),
      soft,
    );
    const result = processTakeoverInput(st, raw);
    this.takeovers.set(id, result.state);
    if (!result.apply) return;

    this.applyingFromMidi = true;
    try {
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
          this.deckA.setTrimDb(trimDbFromGainKnob(result.value));
          break;
        case 'deckB.gain':
          this.deckB.setTrimDb(trimDbFromGainKnob(result.value));
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
    } finally {
      this.applyingFromMidi = false;
    }
  }

  private arm(id: ControlId): void {
    const cur = this.takeovers.get(id) ?? createTakeover(0.5);
    this.takeovers.set(id, armTakeover(cur, this.softwareRaw(id)));
  }

  /**
   * UI / sync / load changed a continuous control — re-arm soft takeover (R2.7).
   * No-op when the write came from MIDI dispatch.
   */
  noteSoftwareChange(id: ControlId): void {
    if (this.applyingFromMidi) return;
    this.arm(id);
  }

  /**
   * After deck load — reconcile takeovers without forcing a full relearn (R2.7 / R3.3).
   * - pitch / EQ: keep live if already live (software unchanged)
   * - filter / wet: adopt last hardware position (pads already forced off); else arm at reset
   * - gain: arm after auto-gain (software moved — R2.13)
   */
  noteDeckLoaded(deckId: 'A' | 'B'): void {
    if (this.applyingFromMidi) return;
    const prefix = deckId === 'A' ? 'deckA' : 'deckB';
    for (const suffix of [
      'pitch',
      'gain',
      'eqHigh',
      'eqMid',
      'eqLow',
      'filter',
      'wet',
    ] as const) {
      const id = `${prefix}.${suffix}` as ControlId;
      const soft = this.softwareRaw(id);
      const cur = this.takeovers.get(id) ?? createTakeover(soft);

      if (suffix === 'gain') {
        this.takeovers.set(id, armTakeover(cur, soft));
        continue;
      }

      if (suffix === 'filter' || suffix === 'wet') {
        const adopted = adoptHardwareTakeover(cur);
        if (adopted) {
          this.applyContinuousSilent(id, adopted.softwareValue);
          this.takeovers.set(id, adopted);
        } else {
          this.takeovers.set(id, armTakeover(cur, soft));
        }
        continue;
      }

      // pitch + EQ — do not blanket re-arm
      this.takeovers.set(id, preserveTakeoverAfterLoad(cur, soft));
    }
  }

  /** Write a continuous control from reconcile paths without re-arming takeover. */
  private applyContinuousSilent(id: ControlId, raw: number): void {
    this.applyingFromMidi = true;
    try {
      switch (id) {
        case 'deckA.pitch':
          this.deckA.setPitchPos(raw);
          break;
        case 'deckB.pitch':
          this.deckB.setPitchPos(raw);
          break;
        case 'deckA.gain':
          this.deckA.setTrimDb(trimDbFromGainKnob(raw));
          break;
        case 'deckB.gain':
          this.deckB.setTrimDb(trimDbFromGainKnob(raw));
          break;
        case 'deckA.eqHigh':
          this.deckA.setEq('high', raw);
          break;
        case 'deckA.eqMid':
          this.deckA.setEq('mid', raw);
          break;
        case 'deckA.eqLow':
          this.deckA.setEq('low', raw);
          break;
        case 'deckB.eqHigh':
          this.deckB.setEq('high', raw);
          break;
        case 'deckB.eqMid':
          this.deckB.setEq('mid', raw);
          break;
        case 'deckB.eqLow':
          this.deckB.setEq('low', raw);
          break;
        case 'deckA.filter':
          this.deckA.setFilterAmount(raw);
          break;
        case 'deckB.filter':
          this.deckB.setFilterAmount(raw);
          break;
        case 'deckA.wet':
          this.deckA.setFlangerWet(raw);
          break;
        case 'deckB.wet':
          this.deckB.setFlangerWet(raw);
          break;
        default:
          break;
      }
    } finally {
      this.applyingFromMidi = false;
    }
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
      case 'deckA.gain':
        return gainKnobFromTrimDb(this.deckA.trimDb);
      case 'deckB.gain':
        return gainKnobFromTrimDb(this.deckB.trimDb);
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
