import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import {
  gainKnobFromTrimDb,
  trimDbFromGainKnob,
  type ControlId,
} from '@stentordeck/shared';
import { dbToVuNorm, vuSegments } from '../../audio/vuMeter';
import { useWheelNudge01 } from '../../hooks/useWheelNudge01';
import { deckA, deckB, midiStore, mixerStore } from '../../stores/root';
import type { DeckStore } from '../../stores/DeckStore';
import { PerfKnob } from './PerfKnob';

type EqBand = 'high' | 'mid' | 'low';

const EQ_BANDS: { band: EqBand; label: string; control: (d: 'A' | 'B') => ControlId }[] = [
  { band: 'high', label: 'HI', control: (d) => `deck${d}.eqHigh` as ControlId },
  { band: 'mid', label: 'MID', control: (d) => `deck${d}.eqMid` as ControlId },
  { band: 'low', label: 'LOW', control: (d) => `deck${d}.eqLow` as ControlId },
];

function GainCol(props: { deck: DeckStore; deckId: 'A' | 'B' }) {
  const { deck, deckId } = props;
  const empty = deck.state === 'empty';
  const gainRaw = gainKnobFromTrimDb(deck.trimDb);
  const gainId = `deck${deckId}.gain` as ControlId;
  const gainPickup = midiStore.takeoverView(gainId);

  return (
    <div className="perf-mx-col perf-mx-gain">
      <PerfKnob
        size="sm"
        label="GAIN"
        ariaLabel={`Deck ${deckId} gain`}
        value={gainRaw}
        disabled={empty}
        pickup={gainPickup?.armed ? gainPickup.hardwareValue : null}
        onChange={(v) => deck.setTrimDb(trimDbFromGainKnob(v))}
        reset={0.5}
      />
      <div className="perf-mx-spacer" aria-hidden />
      <div className="perf-mx-spacer" aria-hidden />
      <div className="perf-mx-spacer" aria-hidden />
      <div className="perf-mx-foot" aria-hidden />
    </div>
  );
}

function LedCol(props: { deck: DeckStore; deckId: 'A' | 'B' }) {
  const { deck, deckId } = props;
  const side = deckId === 'A' ? 'a' : 'b';
  return (
    <div
      className={`perf-mx-col perf-mx-leds side-${side}`}
      aria-label={`Deck ${deckId} EQ kills`}
    >
      {EQ_BANDS.map(({ band, label }) => {
        const killed = deck.kills[band];
        return (
          <button
            key={band}
            type="button"
            className={`perf-eq-led-btn${killed ? ' on' : ''}`}
            onClick={() => deck.toggleKill(band)}
            title={killed ? `${label} kill on` : `${label} kill off`}
            aria-pressed={killed}
            aria-label={`Deck ${deckId} ${label} kill`}
          >
            <span className="perf-eq-led" aria-hidden />
          </button>
        );
      })}
      <div className="perf-mx-spacer" aria-hidden />
      <div className="perf-mx-foot" aria-hidden />
    </div>
  );
}

function KnobFaderCol(props: {
  deck: DeckStore;
  deckId: 'A' | 'B';
  fader: number;
  db: number;
  peakDb: number;
  peaking: boolean;
  pflMeter: boolean;
  onFader: (v: number) => void;
  faderControl: ControlId;
}) {
  const { deck, deckId, fader, db, peakDb, peaking, pflMeter, onFader, faderControl } = props;
  const accent = deckId === 'A' ? 'a' : 'b';
  const segs = vuSegments(db);
  const peakNorm = dbToVuNorm(peakDb);
  const takeover = midiStore.takeoverView(faderControl);
  const showGhost = takeover?.armed === true;
  const hw = takeover?.hardwareValue ?? fader;
  /** Cap rides the lane centerline; inset matches .perf-ft groove/padding. */
  const capTop = `calc(0.55rem + (100% - 1.1rem) * ${1 - fader})`;
  const ghostTop = `calc(0.55rem + (100% - 1.1rem) * ${1 - hw})`;
  const tip = pflMeter ? 'PFL / pre-fader' : 'post-fader';
  const faderRef = useRef<HTMLDivElement>(null);
  // Whole fader+VU cell — easier to hit than the thin lane alone.
  useWheelNudge01(faderRef, fader, onFader, true);

  return (
    <div className={`perf-mx-col perf-mx-ch accent-${accent}`}>
      {EQ_BANDS.map(({ band, label, control }) => {
        const controlId = control(deckId);
        const t = midiStore.takeoverView(controlId);
        return (
          <PerfKnob
            key={band}
            size="sm"
            ariaLabel={`Deck ${deckId} ${label}`}
            value={deck.eq[band]}
            onChange={(v) => deck.setEq(band, v)}
            pickup={t?.armed ? t.hardwareValue : null}
          />
        );
      })}

      <div
        ref={faderRef}
        className={`perf-fw vu-out-${deckId === 'A' ? 'left' : 'right'}`}
        title={`Channel fader ${deckId} — drag or scroll`}
      >
        <div
          className="perf-ft"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={fader}
          aria-label={`Channel fader ${deckId}`}
          tabIndex={0}
          onPointerDown={(e) => {
            e.preventDefault();
            const el = e.currentTarget;
            const setFromEvent = (clientY: number) => {
              const rect = el.getBoundingClientRect();
              const pad = 8; /* match half-cap visual travel inset */
              const usable = Math.max(1, rect.height - pad * 2);
              const y = (clientY - rect.top - pad) / usable;
              onFader(Math.min(1, Math.max(0, 1 - y)));
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
            if (e.key === 'ArrowUp') onFader(Math.min(1, fader + 0.02));
            if (e.key === 'ArrowDown') onFader(Math.max(0, fader - 0.02));
          }}
        >
          <span className="perf-ft-groove" aria-hidden />
          <span className="perf-cap" style={{ top: capTop }} />
          {showGhost && <span className="perf-ghost" style={{ top: ghostTop }} aria-hidden />}
        </div>
        <div
          className={`perf-vu${peaking ? ' peaking' : ''}${pflMeter ? ' pfl' : ''}`}
          title={`${db.toFixed(1)} dBFS (${tip}) · peak ${peakDb.toFixed(1)}`}
        >
          <div className="ok" style={{ height: `${segs.ok * 100}%` }} />
          <div className="hot" style={{ height: `${segs.hot * 100}%` }} />
          <div className="clip" style={{ height: `${segs.clip * 100}%` }} />
          {peakNorm > 0.02 ? (
            <span
              className="perf-vu-peak"
              style={{ bottom: `${peakNorm * 100}%` }}
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      <div className={`perf-mx-foot kl accent-${accent}`}>{deckId}</div>
    </div>
  );
}

function LabelsCol() {
  return (
    <div className="perf-mx-col perf-mx-labs" aria-hidden>
      {EQ_BANDS.map(({ label }) => (
        <div key={label} className="perf-mx-lab">
          {label}
        </div>
      ))}
      <div className="perf-mx-spacer" />
      <div className="perf-mx-foot" />
    </div>
  );
}

/**
 * 7-column mixer (L→R):
 * GAIN A · LEDs A · knobs+fader A · labels · knobs+fader B · LEDs B · GAIN B
 */
export const PerfMixerMini = observer(function PerfMixerMini() {
  return (
    <div className="perf-mixer">
      <GainCol deck={deckA} deckId="A" />
      <LedCol deck={deckA} deckId="A" />
      <KnobFaderCol
        deck={deckA}
        deckId="A"
        fader={mixerStore.faderA}
        db={mixerStore.meters.aDb}
        peakDb={mixerStore.meters.aPeakDb}
        peaking={mixerStore.meters.aPeaking}
        pflMeter={mixerStore.meters.aPflMeter}
        onFader={(v) => mixerStore.setFaderA(v)}
        faderControl="mixer.faderA"
      />
      <LabelsCol />
      <KnobFaderCol
        deck={deckB}
        deckId="B"
        fader={mixerStore.faderB}
        db={mixerStore.meters.bDb}
        peakDb={mixerStore.meters.bPeakDb}
        peaking={mixerStore.meters.bPeaking}
        pflMeter={mixerStore.meters.bPflMeter}
        onFader={(v) => mixerStore.setFaderB(v)}
        faderControl="mixer.faderB"
      />
      <LedCol deck={deckB} deckId="B" />
      <GainCol deck={deckB} deckId="B" />
    </div>
  );
});
