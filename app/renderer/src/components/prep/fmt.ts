export function fmtDur(ms: number | null): string {
  if (ms == null) return '…';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function fmtBpm(bpm: number | null, lowConfidence: boolean): string {
  if (bpm == null) return '…';
  const n = Number.isInteger(bpm) ? String(bpm) : bpm.toFixed(1);
  return lowConfidence ? `≈${n}` : n;
}

export function fmtRemaining(position: number, duration: number): string {
  if (duration <= 0) return '—';
  const left = Math.max(0, duration - position);
  const s = Math.floor(left);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `-${m}:${r.toString().padStart(2, '0')}`;
}
