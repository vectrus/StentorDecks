import { HERCULES_INPULSE_500_PROFILE } from './herculesInpulse500.js';
import { PIONEER_DDJ_FLX4_PROFILE } from './pioneerDdjFlx4.js';
import { parseControllerProfile, profileMatchesPort } from './schema.js';
import { RMX2_CONTROLLER_PROFILE } from './rmx2.js';
import type { ControllerProfile } from './types.js';

/** RMX2 always first. Never reorder for “detected” hardware. */
const RAW_PROFILES: ControllerProfile[] = [
  RMX2_CONTROLLER_PROFILE,
  PIONEER_DDJ_FLX4_PROFILE,
  HERCULES_INPULSE_500_PROFILE,
];

/** Validated at module load — fail fast in tests / boot. */
export const CONTROLLER_PROFILES: readonly ControllerProfile[] = RAW_PROFILES.map((p) =>
  parseControllerProfile(p),
);

export function listControllerProfiles(): readonly ControllerProfile[] {
  return CONTROLLER_PROFILES;
}

export function getControllerProfile(id: string): ControllerProfile | undefined {
  return CONTROLLER_PROFILES.find((p) => p.id === id);
}

/**
 * Suggest a community profile for a port name — UI may offer Apply with confirm.
 * Never call this to mutate the map automatically.
 */
export function suggestControllerProfile(
  portName: string | null | undefined,
): ControllerProfile | undefined {
  if (!portName) return undefined;
  // Prefer non-factory matches; RMX2 match is informational only.
  for (const p of CONTROLLER_PROFILES) {
    if (p.status === 'factory') continue;
    if (profileMatchesPort(p, portName)) return p;
  }
  for (const p of CONTROLLER_PROFILES) {
    if (p.status === 'factory' && profileMatchesPort(p, portName)) return p;
  }
  return undefined;
}

export { profileMatchesPort };
