import { observer } from 'mobx-react-lite';
import { deckA, deckB, libraryStore, mixmatchStore } from '../../stores/root';

function fmtBpm(n: number | null): string {
  return n != null && Number.isFinite(n) ? n.toFixed(1) : '…';
}

function fmtDur(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return '–';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function loadDeck(deck: typeof deckA, id: number): void {
  void libraryStore.loadTrackId(deck, id).catch((err: unknown) => {
    console.warn('[next-up] load rejected', err);
  });
}

/** V2-B rules mixmatch — suggest-only strip in Library mode. */
export const NextUpStrip = observer(function NextUpStrip() {
  if (!mixmatchStore.enabled) return null;

  const rows = mixmatchStore.suggestions;

  return (
    <div className="next-up" aria-label="Next up suggestions">
      <div className="next-up-hd">
        <span className="next-up-title">Next up</span>
        <span className="next-up-sub">Camelot + BPM · load by hand (never auto)</span>
      </div>
      {mixmatchStore.status ? (
        <p className="next-up-status">{mixmatchStore.status}</p>
      ) : (
        <ul className="next-up-list">
          {rows.map((t, i) => {
            const name =
              [t.artist, t.title].filter(Boolean).join(' — ') || t.path.split(/[/\\]/).pop();
            return (
              <li key={t.id} className="next-up-item">
                <button
                  type="button"
                  className="next-up-row"
                  onClick={() => {
                    const idx = libraryStore.tracksForDisplay.findIndex((x) => x.id === t.id);
                    if (idx >= 0) libraryStore.selectIndex(idx);
                  }}
                  onDoubleClick={() => loadDeck(deckA, t.id)}
                  title="Click to highlight in list · double-click → load A"
                >
                  <span className="next-up-n">{i + 1}</span>
                  <span className="next-up-name">{name}</span>
                  <span className="next-up-bpm mono">{fmtBpm(t.bpm)}</span>
                  <span className="next-up-key mono">{t.keyCamelot ?? '…'}</span>
                  <span className="next-up-time mono">{fmtDur(t.durationMs)}</span>
                </button>
                <div className="next-up-loads">
                  <button
                    type="button"
                    className="next-up-load"
                    disabled={deckA.state === 'playing'}
                    onClick={() => loadDeck(deckA, t.id)}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    className="next-up-load"
                    disabled={deckB.state === 'playing'}
                    onClick={() => loadDeck(deckB, t.id)}
                  >
                    B
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
