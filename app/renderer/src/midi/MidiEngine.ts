/**
 * Web MIDI access — prefer port name containing "RMX" (docs/04).
 * Hot-plug via statechange; surfaces connection to MidiStore.
 */

import type { MidiStore } from './MidiStore';

export class MidiEngine {
  private access: MIDIAccess | null = null;
  private input: MIDIInput | null = null;
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

  private selectPort(): void {
    if (!this.access) return;
    const inputs = [...this.access.inputs.values()].filter(
      (i) => i.state === 'connected',
    );
    const preferred =
      inputs.find((i) => /RMX/i.test(i.name ?? '')) ?? inputs[0] ?? null;

    if (!preferred) {
      this.detach();
      this.store.setConnection(false, null);
      return;
    }

    if (this.input?.id === preferred.id) {
      // Same port — still re-bind handler (disconnect can clear it).
      this.bindHandler(this.input);
      this.store.setConnection(true, preferred.name ?? null);
      return;
    }

    this.detach();
    this.input = preferred;
    this.bindHandler(preferred);
    this.store.setConnection(true, preferred.name ?? null);
    this.store.rearmAllTakeovers();
  }

  private bindHandler(input: MIDIInput): void {
    input.onmidimessage = (ev) => {
      const data = ev.data;
      if (!data) return;
      this.store.ingest(data, ev.timeStamp);
    };
  }

  private detach(): void {
    if (this.input) {
      this.input.onmidimessage = null;
      this.input = null;
    }
  }
}
