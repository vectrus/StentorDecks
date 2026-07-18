/**
 * AudioBuffers are bound to the AudioContext that created them.
 * After teardown/close they cannot be played on a new context — copy PCM out first.
 */

export type BufferSnapshot = {
  sampleRate: number;
  length: number;
  numberOfChannels: number;
  channels: Float32Array[];
};

export function snapshotAudioBuffer(buffer: AudioBuffer): BufferSnapshot {
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(new Float32Array(buffer.getChannelData(c)));
  }
  return {
    sampleRate: buffer.sampleRate,
    length: buffer.length,
    numberOfChannels: buffer.numberOfChannels,
    channels,
  };
}

export function bufferFromSnapshot(ctx: BaseAudioContext, snap: BufferSnapshot): AudioBuffer {
  const out = ctx.createBuffer(snap.numberOfChannels, snap.length, snap.sampleRate);
  for (let c = 0; c < snap.numberOfChannels; c++) {
    out.copyToChannel(new Float32Array(snap.channels[c]!), c);
  }
  return out;
}
