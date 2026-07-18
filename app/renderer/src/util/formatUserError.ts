/**
 * Turn thrown values into owner-facing copy: what failed + what to try.
 * Raw platform messages are never shown alone (.cursorrules §5b).
 */

export function formatUserError(err: unknown, context: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('offlineaudiocontext') || lower.includes('decode')) {
    return [
      `${context} — couldn’t decode this audio file.`,
      'Try: restart StentorDeck and load again. If it keeps failing, convert to WAV or FLAC.',
      `Detail: ${raw}`,
    ].join('\n');
  }

  if (lower.includes('audio engine not ready') || lower.includes('no transport')) {
    return [
      `${context} — the audio engine isn’t ready yet.`,
      'Try: open Audio setup, confirm Plan A/B devices, then load the track again.',
      `Detail: ${raw}`,
    ].join('\n');
  }

  if (lower.includes('deckplayingerror') || lower.includes('is playing')) {
    return [
      `${context} — can’t load while this deck is playing.`,
      'Try: pause the deck, then load the new track.',
      `Detail: ${raw}`,
    ].join('\n');
  }

  if (lower.includes('node_module_version') || lower.includes('better-sqlite3')) {
    return [
      `${context} — a native module doesn’t match this Electron build.`,
      'Try: run npm run rebuild:native, then Start StentorDeck.bat again.',
      `Detail: ${raw}`,
    ].join('\n');
  }

  if (lower.includes('midi map') || lower.includes('midimapping')) {
    return [
      `${context} — the MIDI map couldn’t be read or saved.`,
      'Try: Reset to RMX2 defaults in the E2 harness, or import a map exported from this app.',
      `Detail: ${raw}`,
    ].join('\n');
  }

  return [
    `${context}.`,
    'Try: retry the action. If it keeps failing, note what you clicked and the detail below.',
    `Detail: ${raw}`,
  ].join('\n');
}
