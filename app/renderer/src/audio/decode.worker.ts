/**
 * Off-main-thread decode when the worker has Web Audio (not always true in Electron).
 */

export type DecodeWorkerRequest = {
  id: number;
  arrayBuffer: ArrayBuffer;
  sampleRateHint: number;
};

export type DecodeWorkerResponse =
  | {
      id: number;
      ok: true;
      sampleRate: number;
      length: number;
      numberOfChannels: number;
      duration: number;
      channels: Float32Array[];
    }
  | { id: number; ok: false; error: string };

function offlineCtor(): typeof OfflineAudioContext | null {
  const g = self as unknown as {
    OfflineAudioContext?: typeof OfflineAudioContext;
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
  };
  return g.OfflineAudioContext ?? g.webkitOfflineAudioContext ?? null;
}

self.onmessage = async (ev: MessageEvent<DecodeWorkerRequest>) => {
  const { id, arrayBuffer, sampleRateHint } = ev.data;
  const Offline = offlineCtor();
  if (!Offline) {
    const res: DecodeWorkerResponse = {
      id,
      ok: false,
      error: 'OfflineAudioContext unavailable in worker',
    };
    (self as unknown as Worker).postMessage(res);
    return;
  }

  try {
    const probe = new Offline(2, 1, sampleRateHint || 44100);
    const audioBuffer = await probe.decodeAudioData(arrayBuffer.slice(0));
    const channels: Float32Array[] = [];
    const transfers: ArrayBuffer[] = [];
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const copy = new Float32Array(audioBuffer.getChannelData(c));
      channels.push(copy);
      transfers.push(copy.buffer);
    }
    const res: DecodeWorkerResponse = {
      id,
      ok: true,
      sampleRate: audioBuffer.sampleRate,
      length: audioBuffer.length,
      numberOfChannels: audioBuffer.numberOfChannels,
      duration: audioBuffer.duration,
      channels,
    };
    (self as unknown as Worker).postMessage(res, transfers);
  } catch (err) {
    const res: DecodeWorkerResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(res);
  }
};
