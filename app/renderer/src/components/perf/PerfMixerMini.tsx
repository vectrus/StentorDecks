import { observer } from 'mobx-react-lite';
import type { ControlId } from '@stentordeck/shared';
import { deckA, deckB, midiStore, mixerStore } from '../../stores/root';
import type { DeckStore } from '../../stores/DeckStore';
import { PerfKnob } from './PerfKnob';

type EqBand = 'high' | 'mid' | 'low';

const EQ_BANDS: { band: EqBand; label: string; control: (d: 'A' | 'B') => ControlId }[] = [
  { band: 'high', label: 'HI', control: (d) => `deck${d}.eqHigh` as ControlId },
  { band: 'mid', label: 'MID', control: (d) => `deck${d}.eqMid` as ControlId },
  { band: 'low', label: 'LOW', control: (d) => `deck${d}.eqLow` as ControlId },
];

/** VU zones per mockup 05 / docs/03: green < -9, amber -9..-3, red > -3. */
function vuSegments(db: number): { ok: number; hot: number; clip: number } {
  const clip = db > -3 ? Math.min(1, (db + 3) / 3) : 0;
  const hot = db > -9 ? Math.min(1, (Math.min(db, -3) + 9) / 6) : 0;
  const ok = db > -60 ? Math.min(1, (Math.min(db, -9) + 60) / 51) : 0;
  return { ok, hot, clip };
}

function EqCell(props: {
  deck: DeckStore;
  deckId: 'A' | 'B';
  band: EqBand;
  label: string;
  controlId: ControlId;
}) {
  const { deck, band, label, controlId, deckId } = props;
  const takeover = midiStore.takeoverView(controlId);
  const killed = deck.kills[band];

  return (
    <div className="perf-eq-cell">
      <PerfKnob
        size="sm"
        ariaLabel={`Deck ${deckId} ${label}`}
        value={deck.eq[band]}
        onChange={(v) => deck.setEq(band, v)}
        pickup={takeover?.armed ? takeover.hardwareValue : null}
      />
      <button
        type="button"
        className={`perf-eq-label${killed ? ' kill' : ''}`}
        onClick={() => deck.toggleKill(band)}
        title={killed ? 'Kill on — click to release' : 'Click to kill band'}
      >
        {label}
      </button>
    </div>
  );
}

function ChannelFader(props: {
  deckId: 'A' | 'B';
  value: number;
  db: number;
  onChange: (v: number) => void;
  faderControl: ControlId;
}) {
  const { deckId, value, db, onChange, faderControl } = props;
  const segs = vuSegments(db);
  const takeover = midiStore.takeoverView(faderControl);
  const showGhost = takeover?.armed === true;
  const hw = takeover?.hardwareValue ?? value;
  const accent = deckId === 'A' ? 'a' : 'b';

  return (
    <div className="perf-ch">
      <div className="perf-fw">
        <div
          className="perf-ft"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={value}
          aria-label={`Channel fader ${deckId}`}
          tabIndex={0}
          onPointerDown={(e) => {
            e.preventDefault();
            const el = e.currentTarget;
            const setFromEvent = (clientY: number) => {
              const rect = el.getBoundingClientRect();
              const y = (clientY - rect.top) / Math.max(1, rect.height);
              onChange(Math.min(1, Math.max(0, 1 - y)));
            };
            setFromEvent(e.clientY);
            const move = (ev: PointerEvent) => setFromEvent(ev.clientY);
            const up = () => {
              window.removeEventListener('pointermove', move);
              window.removeEventListener('pointerup', up);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') onChange(Math.min(1, value + 0.02));
            if (e.key === 'ArrowDown') onChange(Math.max(0, value - 0.02));
          }}
        >
          <span className="perf-cap" style={{ top: `${(1 - value) * 86}%` }} />
          {showGhost && (
            <span className="perf-ghost" style={{ top: `${(1 - hw) * 86}%` }} aria-hidden />
          )}
        </div>
        <div className="perf-vu" title={`${db.toFixed(1)} dBFS`}>
          <div className="ok" style={{ height: `${segs.ok * 100}%` }} />
          <div className="hot" style={{ height: `${segs.hot * 100}%` }} />
          <div className="clip" style={{ height: `${segs.clip * 100}%` }} />
        </div>
      </div>
      <div className={`kl accent-${accent}`}>{deckId}</div>
    </div>
  );
}

/** Mixer: EQ pairs + channel faders/VU only. MST/CUE/PHN live in Perf header. */
export const PerfMixerMini = observer(function PerfMixerMini() {
  return (
    <div className="perf-mixer">
      <div className="perf-eqg" aria-label="EQ">
        {EQ_BANDS.map(({ band, label, control }) => (
          <div key={band} className="perf-eq-row">
            <EqCell deck={deckA} deckId="A" band={band} label={label} controlId={control('A')} />
            <EqCell deck={deckB} deckId="B" band={band} label={label} controlId={control('B')} />
          </div>
        ))}
      </div>

      <div className="perf-fads">
        <ChannelFader
          deckId="A"
          value={mixerStore.faderA}
          db={mixerStore.meters.aDb}
          onChange={(v) => mixerStore.setFaderA(v)}
          faderControl="mixer.faderA"
        />
        <ChannelFader
          deckId="B"
          value={mixerStore.faderB}
          db={mixerStore.meters.bDb}
          onChange={(v) => mixerStore.setFaderB(v)}
          faderControl="mixer.faderB"
        />
      </div>
    </div>
  );
});
