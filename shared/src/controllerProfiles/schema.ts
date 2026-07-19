import { z } from 'zod';
import { parseMidiMapping } from '../midiMappingSchema.js';
import type { ControllerProfile } from './types.js';

const profileObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  matchPort: z.string().min(1),
  status: z.enum(['factory', 'community']),
  ledStyle: z.enum(['hercules-note', 'none']),
  mapping: z.record(z.string(), z.unknown()),
  notes: z.string(),
});

export class ControllerProfileParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ControllerProfileParseError';
  }
}

/** Validate a profile pack (mapping via existing MIDI schema). */
export function parseControllerProfile(raw: unknown): ControllerProfile {
  const parsed = profileObjectSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ControllerProfileParseError(
      `Controller profile invalid: ${parsed.error.issues[0]?.message ?? 'schema error'}`,
    );
  }
  const data = parsed.data;
  try {
    // Validate matchPort compiles.
    new RegExp(data.matchPort, 'i');
  } catch {
    throw new ControllerProfileParseError(
      `Controller profile “${data.id}”: matchPort is not a valid RegExp.`,
    );
  }
  let mapping;
  try {
    mapping = parseMidiMapping(data.mapping);
  } catch (err) {
    throw new ControllerProfileParseError(
      `Controller profile “${data.id}” mapping: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  if (data.status === 'factory' && data.id !== 'rmx2') {
    throw new ControllerProfileParseError(
      'Only profile id “rmx2” may use status “factory”.',
    );
  }
  if (data.id === 'rmx2' && data.status !== 'factory') {
    throw new ControllerProfileParseError('Profile “rmx2” must have status “factory”.');
  }
  if (data.id === 'rmx2' && data.ledStyle !== 'hercules-note') {
    throw new ControllerProfileParseError(
      'Profile “rmx2” must use ledStyle “hercules-note”.',
    );
  }
  if (data.status === 'community' && data.ledStyle !== 'none') {
    throw new ControllerProfileParseError(
      `Community profile “${data.id}” must use ledStyle “none” until HW-verified.`,
    );
  }
  return {
    id: data.id,
    name: data.name,
    matchPort: data.matchPort,
    status: data.status,
    ledStyle: data.ledStyle,
    mapping,
    notes: data.notes,
  };
}

/** True if portName matches the profile’s matchPort (never used to auto-apply). */
export function profileMatchesPort(
  profile: ControllerProfile,
  portName: string | null | undefined,
): boolean {
  if (!portName) return false;
  try {
    return new RegExp(profile.matchPort, 'i').test(portName);
  } catch {
    return false;
  }
}
