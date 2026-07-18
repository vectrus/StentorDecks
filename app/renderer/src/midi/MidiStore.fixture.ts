/**
 * Recorded-style RMX2 traffic for MidiStore ingest (no hardware in CI).
 * Values are synthetic but follow docs/04 channel/CC layout.
 */
export const FIXTURE_PITCH_A_CC14: number[][] = [
  [0xb0, 0x36, 0x40], // MSB
  [0xb0, 0x37, 0x00], // LSB
];

export const FIXTURE_PLAY_A: number[][] = [[0x90, 0x21, 0x7f]];

export const FIXTURE_JOG_A: number[][] = [[0xb0, 0x30, 0x01]];
