/**
 * Web MIDI access — prefer port name containing "RMX" (docs/04).
 * Hot-plug via statechange; surfaces connection to MidiStore.
 */

import type { MidiStore } from './MidiStore';

export class MidiEngine {
  private access: MIDIAccess | null = null;
  private input: MIDIInput | null = null;
  private output: MIDIOutput | null = null;
  private started = false;

  constructor(private readonly store: MidiStore) {}

  async start(): Promise<void> {
    if (this.started) return;
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      this.store.setConnection(false, null);
      return;
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.started = true;
      this.access.onstatechange = () => this.selectPort();
      this.selectPort();
    } catch {
      this.store.setConnection(false, null);
    }
  }

  stop(): void {
    this.detach();
    this.started = false;
    this.access = null;
    this.store.setConnection(false, null);
  }

  /** Re-select after USB audio churn — safe to call often. */
  rescan(): void {
    this.selectPort();
  }

  /**
   * LED note out. Returns false if no output (caller should log once, never spam).
   */
  sendNote(channel: number, note: number, on: boolean): boolean {
    if (!this.output || this.output.state !== 'connected') return false;
    try {
      const status = (on ? 0x90 : 0x80) | (channel & 0x0f);
      this.output.send([status, note & 0x7f, on ? 0x7f : 0x00]);
      return true;
    } catch {
      return false;
    }
  }

  private selectPort(): void {
    if (!this.access) return;
    const inputs = [...this.access.inputs.values()].filter(
      (i) => i.state === 'connected',
    );
    const preferredIn =
      inputs.find((i) => /RMX/i.test(i.name ?? '')) ?? inputs[0] ?? null;

    const outputs = [...this.access.outputs.values()].filter(
      (o) => o.state === 'connected',
    );
    this.output =
      outputs.find((o) => /RMX/i.test(o.name ?? '')) ?? outputs[0] ?? null;

    if (!preferredIn) {
      this.detachInput();
      this.store.setConnection(false, null);
      return;
    }

    if (this.input?.id === preferredIn.id) {
      // Same port: keep handler fresh, but do not force soft-takeover re-arm
      // (setConnection is idempotent for takeover when already connected).
      this.bindHandler(this.input);
      this.store.setConnection(true, preferredIn.name ?? null);
      return;
    }

    this.detachInput();
    this.input = preferredIn;
    this.bindHandler(preferredIn);
    // setConnection rearms takeovers on port change / reconnect (R2.7).
    this.store.setConnection(true, preferredIn.name ?? null);
  }

  private bindHandler(input: MIDIInput): void {
    input.onmidimessage = (ev) => {
      const data = ev.data;
      if (!data) return;
      this.store.ingest(data, ev.timeStamp);
    };
  }

  private detachInput(): void {
    if (this.input) {
      this.input.onmidimessage = null;
      this.input = null;
    }
  }

  private detach(): void {
    this.detachInput();
    this.output = null;
  }
}
