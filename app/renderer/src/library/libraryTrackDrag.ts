/** Internal MIME for dragging a library track onto a deck waveform (R1.5 / R4.1). */
export const LIBRARY_TRACK_MIME = 'application/x-stentordeck-track-id';

export function setLibraryTrackDragData(
  dt: DataTransfer,
  trackId: number,
): void {
  dt.setData(LIBRARY_TRACK_MIME, String(trackId));
  dt.setData('text/plain', `stentordeck-track:${trackId}`);
  dt.effectAllowed = 'copy';
}

export function parseLibraryTrackId(dt: DataTransfer): number | null {
  const raw =
    dt.getData(LIBRARY_TRACK_MIME) ||
    (dt.getData('text/plain').startsWith('stentordeck-track:')
      ? dt.getData('text/plain').slice('stentordeck-track:'.length)
      : '');
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** True if this drag payload looks like a library track (for dragover). */
export function isLibraryTrackDrag(dt: DataTransfer): boolean {
  // Custom MIME is listed in `types` during dragover even when getData is empty.
  return dt.types.includes(LIBRARY_TRACK_MIME);
}
