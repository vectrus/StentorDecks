import { DEFAULT_MASTER_GAIN, equalPowerCrossfade, type Settings } from '@stentordeck/shared';
import {
  type AudioDeviceInfo,
  type RoutingPlan,
  isVirtualDeviceId,
  resolveRoutingPlan,
} from './devices';
import { DeckGraph, DeckTransport, type DeckId } from './DeckGraph';
import { setVisualLatencySec } from './frameClock';
import { linearRampParam } from './ramp';
import { playStereoTestTone } from './testTone';

/**
 * Connect a stereo source to a specific output channel pair of a context's
 * destination (Plan B on a multi-channel device — e.g. cue on RMX2 outs 3-4
 * while master runs over USB to another interface). Falls back to a plain
 * stereo connect for [0,1], invalid pairs, or devices without enough
 * channels. Returns true when a non-default pair was applied.
 */
export function connectStereoToChannelPair(
  ctx: AudioContext,
  source: AudioNode,
  pair: [number, number],
): boolean {
  const [l, r] = pair;
  const needed = Math.max(l, r) + 1;
  const supported =
    Number.isInteger(l) &&
    Number.isInteger(r) &&
    l >= 0 &&
    r >= 0 &&
    l !== r &&
    needed <= ctx.destination.maxChannelCount;
  if ((l === 0 && r === 1) || !supported) {
    source.connect(ctx.destination);
    return false;
  }
  ctx.destination.channelCount = needed;
  ctx.destination.channelCountMode = 'explicit';
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(needed);
  source.connect(splitter);
  splitter.connect(merger, 0, l);
  splitter.connect(merger, 1, r);
  merger.connect(ctx.destination);
  return true;
}

export type MeterLevels = {
  aDb: number;
  bDb: number;
  masterDb: number;
};

export type EngineTransportState = {
  playing: boolean;
  position: number;
  duration: number;
};

/**
 * Master AudioEngine — Plan A (4-ch) or Plan B (dual stereo + MediaStream bridge).
 */
export class AudioEngine {
  masterCtx: AudioContext | null = null;
  cueCtx: AudioContext | null = null;
  plan: RoutingPlan = 'B';
  planReason = '';
  deviceLost = false;
  /** Human-readable sink binding problem from the last rebuild (UI banner). */
  sinkWarning: string | null = null;
  /** Bumps on every rebuild — load/decode paths must re-check after await. */
  epoch = 0;

  private deckA: DeckGraph | null = null;
  private deckB: DeckGraph | null = null;
  private transportA: DeckTransport | null = null;
  private transportB: DeckTransport | null = null;
  private decodeInFlight = 0;
  private decodeIdleWaiters: Array<() => void> = [];
  private rebuildGate: Promise<void> | null = null;
  private rebuildGateResolve: (() => void) | null = null;

  private masterBus: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private masterMeter: AnalyserNode | null = null;
  private cueSum: GainNode | null = null;
  private cueFromMaster: GainNode | null = null;
  private cueFromPfl: GainNode | null = null;
  private headGain: GainNode | null = null;
  private merger: ChannelMergerNode | null = null;

  private cueBridgeDest: MediaStreamAudioDestinationNode | null = null;
  private cueBridgeSrc: MediaStreamAudioSourceNode | null = null;

  private meterBuf = new Float32Array(2048);

  async ensureRunning(): Promise<void> {
    if (this.masterCtx?.state === 'suspended') {
      await this.masterCtx.resume();
    }
    if (this.cueCtx?.state === 'suspended') {
      await this.cueCtx.resume();
    }
  }

  /** Call around every decodeAudioData so rebuild cannot tear down mid-decode. */
  beginDecode(): void {
    this.decodeInFlight += 1;
  }

  endDecode(): void {
    this.decodeInFlight = Math.max(0, this.decodeInFlight - 1);
    if (this.decodeInFlight === 0) {
      const waiters = this.decodeIdleWaiters;
      this.decodeIdleWaiters = [];
      for (const w of waiters) w();
    }
  }

  /**
   * Atomically wait for rebuild gate then take a decode slot (closes TOCTOU
   * between waitUntilDecodeReady and beginDecode that truncated buffers).
   */
  async acquireDecode(): Promise<void> {
    for (;;) {
      await this.waitUntilDecodeReady();
      this.beginDecode();
      if (!this.rebuildGate) return;
      this.endDecode();
    }
  }

  private waitForDecodes(): Promise<void> {
    if (this.decodeInFlight === 0) return Promise.resolve();
    return new Promise((resolve) => {
      this.decodeIdleWaiters.push(resolve);
    });
  }

  /** Load/restore waits here so they never decode into a mid-teardown context. */
  async waitUntilDecodeReady(): Promise<void> {
    while (this.rebuildGate) {
      await this.rebuildGate;
    }
    if (!this.masterCtx) {
      throw new Error('Audio engine not ready');
    }
  }

  /** Serializes rebuilds — concurrent rebuilds (rapid device switching in
   *  Audio setup) clobbered each other's contexts and wedged the engine. */
  private rebuildQueue: Promise<void> = Promise.resolve();

  rebuild(opts: {
    settings: Settings;
    devices: AudioDeviceInfo[];
  }): Promise<void> {
    const run = this.rebuildQueue.then(() => this.rebuildImpl(opts));
    this.rebuildQueue = run.catch(() => undefined);
    return run;
  }

  private async rebuildImpl(opts: {
    settings: Settings;
    devices: AudioDeviceInfo[];
  }): Promise<void> {
    // Wait for in-flight loads — closing a context under decodeAudioData was
    // the ~25–28s truncated-buffer bug (dying-context PCM).
    await this.waitForDecodes();
    this.rebuildGate = new Promise<void>((resolve) => {
      this.rebuildGateResolve = resolve;
    });
    this.epoch += 1;
    try {
      // Decks re-decode stashed file bytes in afterRebuild — never clone PCM
      // from a context that is about to close.
      await this.teardown();
      await this.buildGraph(opts);
    } finally {
      this.rebuildGateResolve?.();
      this.rebuildGateResolve = null;
      this.rebuildGate = null;
    }
  }

  private async buildGraph(opts: {
    settings: Settings;
    devices: AudioDeviceInfo[];
  }): Promise<void> {
    const { settings, devices } = opts;
    const resolved = resolveRoutingPlan({
      preference: settings.audio.routingPlan,
      masterDeviceId: settings.audio.masterDevice,
      cueDeviceId: settings.audio.cueDevice,
      masterChannels: settings.audio.masterChannels,
      cueChannels: settings.audio.cueChannels,
      devices,
    });
    this.plan = resolved.plan;
    this.planReason = resolved.reason;

    const latencyHint = Math.max(0.005, settings.audio.bufferHintMs / 1000);
    this.sinkWarning = null;
    const masterCtx = new AudioContext({ latencyHint });
    this.masterCtx = masterCtx;
    await this.setSink(masterCtx, settings.audio.masterDevice, 'master');

    this.masterBus = masterCtx.createGain();
    this.masterGain = masterCtx.createGain();
    // Safety brickwall (docs/03) — not a loudness maximizer; catches overs after MST.
    this.limiter = masterCtx.createDynamicsCompressor();
    this.limiter.threshold.value = -3; // dB — leave a little PA headroom
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.25;
    this.masterMeter = masterCtx.createAnalyser();
    this.masterMeter.fftSize = 2048;

    this.deckA = new DeckGraph(masterCtx);
    this.deckB = new DeckGraph(masterCtx);
    this.transportA = new DeckTransport(masterCtx, this.deckA.input);
    this.transportB = new DeckTransport(masterCtx, this.deckB.input);

    this.deckA.masterOut.connect(this.masterBus);
    this.deckB.masterOut.connect(this.masterBus);
    this.masterBus.connect(this.masterGain);
    this.masterGain.connect(this.masterMeter);
    this.masterGain.connect(this.limiter);

    this.cueSum = masterCtx.createGain();
    this.cueFromPfl = masterCtx.createGain();
    this.cueFromMaster = masterCtx.createGain();
    this.headGain = masterCtx.createGain();
    this.deckA.pflOut.connect(this.cueFromPfl);
    this.deckB.pflOut.connect(this.cueFromPfl);
    this.cueFromPfl.connect(this.cueSum);
    this.masterBus.connect(this.cueFromMaster);
    this.cueFromMaster.connect(this.cueSum);
    this.cueSum.connect(this.headGain);

    // Default cue-only so PFL isn't drowned by the master bus (HeadMix 0 = cue, 1 = master).
    // Master starts booth-safe — MixerStore.applyToEngine() re-applies after hydrate.
    this.setHeadMix(0);
    this.setMasterGain(DEFAULT_MASTER_GAIN);
    this.setPhonesGain(1);

    // Live sink channel count after setSinkId — enumerate probes can lie.
    // Plan A with destination.channelCount=2 downmixes merger ch 2/3 into outs 1-2
    // → PFL appears on the PA (the "phones go to 1/2" booth bug).
    const liveMasterCh = masterCtx.destination.maxChannelCount || 0;
    if (this.plan === 'A' && liveMasterCh < 4) {
      this.plan = 'B';
      this.planReason =
        `Plan A needs ≥4 live channels; sink reports ${liveMasterCh || '?'} — falling back to Plan B`;
      this.sinkWarning =
        `PFL cannot use outs 3-4: the bound master device only exposes ${liveMasterCh || 2} channel(s). ` +
        `In Audio setup pick the Hercules / RMX2 entry that shows "(4 ch)" for both Master and Cue, ` +
        `Master outs 1-2 / Cue outs 3-4. Avoid Windows "Default" endpoints.`;
    }

    if (this.plan === 'A') {
      masterCtx.destination.channelCount = 4;
      masterCtx.destination.channelCountMode = 'explicit';
      this.merger = masterCtx.createChannelMerger(4);
      const masterSplit = masterCtx.createChannelSplitter(2);
      const headSplit = masterCtx.createChannelSplitter(2);
      this.limiter.connect(masterSplit);
      this.headGain.connect(headSplit);
      masterSplit.connect(this.merger, 0, 0);
      masterSplit.connect(this.merger, 1, 1);
      headSplit.connect(this.merger, 0, 2);
      headSplit.connect(this.merger, 1, 3);
      this.merger.connect(masterCtx.destination);
      this.planReason += ` · live ${liveMasterCh} ch · master 1-2 / cue 3-4`;
    } else {
      const mCh = settings.audio.masterChannels;
      if (connectStereoToChannelPair(masterCtx, this.limiter, mCh)) {
        this.planReason += ` · master → outs ${mCh[0] + 1}-${mCh[1] + 1}`;
      } else if (mCh[0] !== 0 || mCh[1] !== 1) {
        this.sinkWarning =
          (this.sinkWarning ? `${this.sinkWarning} ` : '') +
          `Master pair ${mCh[0] + 1}-${mCh[1] + 1} unavailable on this sink (max ${liveMasterCh || '?'} ch) — using outs 1-2.`;
      }
      // Cue on second context
      const cueCtx = new AudioContext({ latencyHint });
      this.cueCtx = cueCtx;
      await this.setSink(cueCtx, settings.audio.cueDevice, 'cue');
      this.cueBridgeDest = masterCtx.createMediaStreamDestination();
      this.headGain.connect(this.cueBridgeDest);
      this.cueBridgeSrc = cueCtx.createMediaStreamSource(this.cueBridgeDest.stream);
      // Honor cueChannels on multi-channel cue devices — e.g. RMX2 phones
      // (outs 3-4) while master is a different USB interface.
      const cCh = settings.audio.cueChannels;
      const liveCueCh = cueCtx.destination.maxChannelCount || 0;
      if (connectStereoToChannelPair(cueCtx, this.cueBridgeSrc, cCh)) {
        this.planReason += ` · cue → outs ${cCh[0] + 1}-${cCh[1] + 1}`;
      } else {
        // Plain stereo connect — cue lands on 1-2 of the cue device.
        if (cCh[0] !== 0 || cCh[1] !== 1) {
          this.sinkWarning =
            (this.sinkWarning ? `${this.sinkWarning} ` : '') +
            `Cue pair ${cCh[0] + 1}-${cCh[1] + 1} unavailable (cue sink ${liveCueCh || '?'} ch) — ` +
            `PFL is on outs 1-2 of the cue device, not headphones 3-4.`;
        }
        this.planReason += ` · cue → outs 1-2 (pair ${cCh[0] + 1}-${cCh[1] + 1} unavailable)`;
      }
    }

    this.deviceLost = false;
    await this.ensureRunning();
    this.refreshVisualLatency();
  }

  /** Draw-only playhead offset (transport clock unchanged). */
  refreshVisualLatency(): void {
    const ctx = this.masterCtx;
    if (!ctx) {
      setVisualLatencySec(0);
      return;
    }
    const base = typeof ctx.baseLatency === 'number' ? ctx.baseLatency : 0;
    const out =
      typeof (ctx as AudioContext & { outputLatency?: number }).outputLatency === 'number'
        ? (ctx as AudioContext & { outputLatency: number }).outputLatency
        : 0;
    setVisualLatencySec(base + out);
  }

  private async setSink(
    ctx: AudioContext,
    deviceId: string | null,
    which: 'master' | 'cue',
  ): Promise<void> {
    // Virtual ids ("default"/"communications") reject in AudioContext.setSinkId
    // (NotFoundError). System default IS the context's default sink — skip.
    if (isVirtualDeviceId(deviceId)) return;
    const setSinkId = (ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> }).setSinkId;
    if (!setSinkId || !deviceId) return;
    try {
      await setSinkId.call(ctx, deviceId);
    } catch (err) {
      console.warn('[audio] setSinkId failed', deviceId, err);
      // Never silent — audio is now going to the system default device.
      this.sinkWarning =
        `${which === 'master' ? 'Master' : 'Cue'} output device could not be bound — ` +
        `audio is playing to the Windows default device instead. ` +
        `Open Audio setup and re-select the ${which} device.`;
    }
  }

  async teardown(): Promise<void> {
    this.transportA?.stopImmediate();
    this.transportB?.stopImmediate();
    this.deckA?.disconnect();
    this.deckB?.disconnect();
    const closes: Promise<void>[] = [];
    // close() rejects if the context already died (device yanked) — must not
    // abort the rebuild that follows teardown.
    if (this.masterCtx) closes.push(this.masterCtx.close().catch(() => undefined));
    if (this.cueCtx) closes.push(this.cueCtx.close().catch(() => undefined));
    this.masterCtx = null;
    this.cueCtx = null;
    this.deckA = null;
    this.deckB = null;
    this.transportA = null;
    this.transportB = null;
    this.merger = null;
    this.cueBridgeDest = null;
    this.cueBridgeSrc = null;
    setVisualLatencySec(0);
    await Promise.all(closes);
  }

  graph(id: DeckId): DeckGraph | null {
    return id === 'A' ? this.deckA : this.deckB;
  }

  transport(id: DeckId): DeckTransport | null {
    return id === 'A' ? this.transportA : this.transportB;
  }

  setMasterGain(linear: number): void {
    if (this.masterGain && this.masterCtx) {
      linearRampParam(this.masterGain.gain, clamp01(linear), this.masterCtx, 0.02);
    }
  }

  setPhonesGain(linear: number): void {
    if (this.headGain && this.masterCtx) {
      const g = clamp01(linear);
      linearRampParam(this.headGain.gain, g, this.masterCtx, 0.02);
      // setTarget-style ramps never hit exact 0 — force mute at the bottom.
      if (g <= 0.001) {
        const t = this.masterCtx.currentTime;
        this.headGain.gain.setValueAtTime(0, t + 0.025);
      }
    }
  }

  /** headMix 0 = full cue (PFL), 1 = full master (equal-power). */
  setHeadMix(t: number): void {
    if (!this.cueFromPfl || !this.cueFromMaster || !this.masterCtx) return;
    const { a, b } = equalPowerCrossfade(t);
    linearRampParam(this.cueFromPfl.gain, a, this.masterCtx, 0.02);
    linearRampParam(this.cueFromMaster.gain, b, this.masterCtx, 0.02);
  }

  readMeters(): MeterLevels {
    return {
      aDb: this.readAnalyser(this.deckA?.channelMeter ?? null),
      bDb: this.readAnalyser(this.deckB?.channelMeter ?? null),
      masterDb: this.readAnalyser(this.masterMeter),
    };
  }

  private readAnalyser(node: AnalyserNode | null): number {
    if (!node) return -120;
    node.getFloatTimeDomainData(this.meterBuf);
    let sum = 0;
    for (let i = 0; i < this.meterBuf.length; i++) {
      const v = this.meterBuf[i]!;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.meterBuf.length);
    if (rms < 1e-8) return -120;
    return 20 * Math.log10(rms);
  }

  async testMaster(): Promise<void> {
    if (!this.masterCtx || !this.limiter) return;
    await this.ensureRunning();
    await playStereoTestTone(this.masterCtx, this.limiter);
  }

  async testCue(): Promise<void> {
    if (!this.masterCtx || !this.headGain) return;
    await this.ensureRunning();
    await playStereoTestTone(this.masterCtx, this.headGain);
  }

  markDeviceLost(): void {
    this.deviceLost = true;
    this.transportA?.pause();
    this.transportB?.pause();
  }
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export const audioEngine = new AudioEngine();
