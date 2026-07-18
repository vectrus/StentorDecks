/**
 * Decode audio for deck load (E2).
 *
 * Electron DedicatedWorkers do not expose `OfflineAudioContext`, so a Worker
 * decode path fails with "OfflineAudioContext is not defined". We decode on
 * the live AudioContext with async `decodeAudioData`, which yields to the
 * event loop and keeps the UI responsive (loading indicator stays honest).
 */

export async function decodeArrayBufferOffThread(
  ctx: BaseAudioContext,
  arrayBuffer: ArrayBuffer,
): Promise<AudioBuffer> {
  return ctx.decodeAudioData(arrayBuffer.slice(0));
}
