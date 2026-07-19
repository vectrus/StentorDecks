import { RMX2_FACTORY_MAP } from '../midiFactoryMap.js';
import type { ControllerProfile } from './types.js';

/** Factory / HW-verified — identical to RMX2_FACTORY_MAP (docs/04). */
export const RMX2_CONTROLLER_PROFILE: ControllerProfile = {
  id: 'rmx2',
  name: 'Hercules DJConsole RMX2 (factory)',
  matchPort: 'RMX|DJConsole RMX',
  status: 'factory',
  ledStyle: 'hercules-note',
  mapping: structuredClone(RMX2_FACTORY_MAP),
  notes:
    'Owner HW-verified 2026-07-18. Always the default seed and Reset target. Do not edit this pack to “help” other controllers.',
};
