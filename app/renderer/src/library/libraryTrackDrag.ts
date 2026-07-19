/**
 * Library track drag → deck load (R1.5 / R4.1).
 *
 * Chromium/Electron often omits custom MIME types from `dataTransfer.types`
 * during dragover (getData is empty until drop). We keep an in-process
 * session id so drop targets can accept the gesture reliably.
 */

export const LIBRARY_TRACK_MIME = 'application/x-stentordeck-track-id';

let activeTrackId: number | null = null;

export function setLibraryTrackDragData(
  dt: DataTransfer,
  trackId: number,
): void {
  activeTrackId = trackId;
  try {
    dt.setData(LIBRARY_TRACK_MIME, String(trackId));
  } catch {
    /* some hosts reject custom types */
  }
  dt.setData('text/plain', `stentordeck-track:${trackId}`);
  dt.effectAllowed = 'copy';
}

export function clearLibraryTrackDrag(): void {
  activeTrackId = null;
}

/** True while a library-row drag is in progress (dragover-safe). */
export function isLibraryTrackDrag(_dt?: DataTransfer): boolean {
  return activeTrackId != null;
}

export function parseLibraryTrackId(dt: DataTransfer): number | null {
  let raw = '';
  try {
    raw = dt.getData(LIBRARY_TRACK_MIME);
  } catch {
    raw = '';
  }
  if (!raw) {
    try {
      const plain = dt.getData('text/plain');
      if (plain.startsWith('stentordeck-track:')) {
        raw = plain.slice('stentordeck-track:'.length);
      }
    } catch {
      /* ignore */
    }
  }
  if (raw) {
    const id = Number.parseInt(raw, 10);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return activeTrackId;
}
