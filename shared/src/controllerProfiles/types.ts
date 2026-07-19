import type { MidiMapping } from '../ipc.js';

/** Only `rmx2` may use factory / HW-verified. */
export type ControllerProfileStatus = 'factory' | 'community';

/**
 * LED out style. Hercules note-echo is RMX2-only until another device is verified.
 * Community packs use `none` so Apply turns `settings.midi.sendLeds` off.
 */
export type ControllerLedStyle = 'hercules-note' | 'none';

export type ControllerProfile = {
  id: string;
  name: string;
  /** RegExp source matched against MIDI port name (case-insensitive). */
  matchPort: string;
  status: ControllerProfileStatus;
  ledStyle: ControllerLedStyle;
  mapping: MidiMapping;
  notes: string;
};
