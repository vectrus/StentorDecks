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

/** Browse down note 0x46 */
export const FIXTURE_BROWSE_DOWN: number[][] = [[0x90, 0x46, 0x7f]];

/** Pitch bend + A note 0x2d */
export const FIXTURE_PITCH_BEND_PLUS_A: number[][] = [[0x90, 0x2d, 0x7f]];
