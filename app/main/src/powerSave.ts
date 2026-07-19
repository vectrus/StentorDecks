/**
 * Booth display stay-awake (E7).
 * Windows otherwise dims / blanks the screen after idle minutes mid-gig.
 */

import { powerSaveBlocker } from 'electron';

let displayBlockerId: number | null = null;

/** Keep the screen on while the app is running (prep + performance). */
export function startBoothDisplayStayAwake(): void {
  if (displayBlockerId != null && powerSaveBlocker.isStarted(displayBlockerId)) {
    return;
  }
  displayBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  console.info('[power] prevent-display-sleep on', displayBlockerId);
}

export function stopBoothDisplayStayAwake(): void {
  if (displayBlockerId == null) return;
  if (powerSaveBlocker.isStarted(displayBlockerId)) {
    powerSaveBlocker.stop(displayBlockerId);
    console.info('[power] prevent-display-sleep off', displayBlockerId);
  }
  displayBlockerId = null;
}
