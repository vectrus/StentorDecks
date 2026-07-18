import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import {
  gainKnobFromTrimDb,
  trimDbFromGainKnob,
  type ControlId,
} from '@stentordeck/shared';
import type { DeckStore } from '../../stores/DeckStore';
import { libraryStore, midiStore } from '../../stores/root';
import { formatUserError } from '../../util/formatUserError';
import { fmtRemaining } from '../prep/fmt';
import { OverviewWaveform } from './OverviewWaveform';
import { PerfKnob } from './PerfKnob';

function pitchPercent(deck: DeckStore): string {
  const pct = (deck.pitchOnlyRate - 1) * 100;
  if (Math.abs(pct) < 0.05) return '0.0%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export const PerfDeckMini = observer(function PerfDeckMini(props: {
  deck: DeckStore;
  other: DeckStore;
  accent: 'a' | 'b';
}) {
  const { deck, other, accent } = props;
  const playing = deck.state === 'playing';
  const empty = deck.state === 'empty';
  const title = deck.title || (empty ? 'Empty' : 'Untitled');
  const artist = deck.artist || '—';
  const bpm =
    deck.effectiveBpm != null
      ? deck.effectiveBpm.toFixed(1)
      : deck.fileBpm != null
        ? deck.fileBpm.toFixed(1)
        : '—';
  const pct = pitchPercent(deck);
  const pctZero = pct === '0.0%';
  const key = deck.keyCamelot ?? '—';
  const gainRaw = gainKnobFromTrimDb(deck.trimDb);
  const gainId = `deck${deck.id}.gain` as ControlId;
  const pitchId = `deck${deck.id}.pitch` as ControlId;
  const gainPickup = midiStore.takeoverView(gainId);
  const pitchPickup = midiStore.takeoverView(pitchId);
  const syncLit = deck.syncArmed || deck.phaseGluePartner != null;
  const [loadFlash, setLoadFlash] = useState(false);

  useEffect(() => {
    if (!loadFlash) return;
    const t = window.setTimeout(() => setLoadFlash(false), 420);
    return () => window.clearTimeout(t);
  }, [loadFlash]);

  const eotClass =
    deck.eotWarn === 10 || deck.eotWarn === 15
      ? ' eot-pulse'
      : deck.eotWarn === 30
        ? ' eot'
        : '';

  return (
    <div className={`perf-deck perf-deck-${accent}`}>
      <div className="perf-deck-hd">
        <div className="perf-deck-meta">
          <div className="perf-deck-title">{title}</div>
          <div className="perf-deck-artist">{artist}</div>
        </div>
        <button
          type="button"
          className={`perf-phones${deck.pfl ? ' on' : ''}`}
          title={deck.pfl ? 'PFL on' : 'PFL off'}
          disabled={empty}
          onClick={() => deck.togglePfl()}
          aria-label={`Deck ${deck.id} headphones PFL`}
        >
          ♪
        </button>
        <PerfKnob
          label="GAIN"
          ariaLabel={`Deck ${deck.id} gain`}
          value={gainRaw}
          disabled={empty}
          pickup={gainPickup?.armed ? gainPickup.hardwareValue : null}
          onChange={(v) => deck.setTrimDb(trimDbFromGainKnob(v))}
          reset={0.5}
        />
      </div>

      <div className="perf-bpmrow">
        <span className={`perf-deck-bpm mono accent-${accent}`}>{bpm}</span>
        <span className={`perf-pitch-pct mono${pctZero ? ' zero' : ''}`}>{pct}</span>
        <span className="perf-key-chip mono">{key}</span>
        <span className={`perf-deck-rem mono${eotClass}`}>
          {empty ? '—' : fmtRemaining(deck.position, deck.duration)}
        </span>
      </div>

      <OverviewWaveform deck={deck} accent={accent} />

      <div
        className="perf-pitch-strip"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={deck.pitchPos}
        aria-label={`Deck ${deck.id} pitch`}
        tabIndex={empty ? -1 : 0}
        onPointerDown={(e) => {
          if (empty) return;
          e.preventDefault();
          const el = e.currentTarget;
          const setFrom = (clientX: number) => {
            const rect = el.getBoundingClientRect();
            const x = (clientX - rect.left) / Math.max(1, rect.width);
            deck.setPitchPos(Math.min(1, Math.max(0, x)));
          };
          setFrom(e.clientX);
          const move = (ev: PointerEvent) => setFrom(ev.clientX);
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
        onKeyDown={(e) => {
          if (empty) return;
          if (e.key === 'ArrowRight') deck.setPitchPos(Math.min(1, deck.pitchPos + 0.01));
          if (e.key === 'ArrowLeft') deck.setPitchPos(Math.max(0, deck.pitchPos - 0.01));
        }}
      >
        <span className="perf-pitch-zero" aria-hidden />
        <span className="perf-pitch-cap" style={{ left: `${deck.pitchPos * 100}%` }} />
        {pitchPickup?.armed && pitchPickup.hardwareValue != null && (
          <span
            className="perf-pitch-ghost"
            style={{ left: `${pitchPickup.hardwareValue * 100}%` }}
            aria-hidden
          />
        )}
      </div>

      <div className="perf-deck-row">
        <button
          type="button"
          className={`perf-play${playing ? ' on' : ''}`}
          disabled={empty}
          onClick={() => {
            try {
              if (playing) deck.pause();
              else deck.play();
            } catch (err) {
              alert(formatUserError(err, `Deck ${deck.id} transport`));
            }
          }}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          className="perf-btn"
          disabled={empty}
          onClick={() => deck.cuePress()}
        >
          CUE
        </button>
        <button
          type="button"
          className={`perf-btn${syncLit ? ' sync' : ''}`}
          disabled={empty}
          onClick={() => deck.toggleSync(other)}
        >
          SYNC
        </button>
        <button
          type="button"
          className={`perf-btn${deck.filterOn ? ' fxon' : ''}`}
          disabled={empty}
          onClick={() => deck.toggleFilter()}
        >
          FILTER
        </button>
        <PerfKnob
          size="sm"
          label="AMT"
          ariaLabel={`Deck ${deck.id} filter amount`}
          value={deck.filterAmount}
          disabled={empty}
          reset={0.5}
          onChange={(v) => deck.setFilterAmount(v)}
        />
        <button
          type="button"
          className={`perf-btn${deck.flangerOn ? ' fxon' : ''}`}
          disabled={empty}
          onClick={() => deck.toggleFlanger()}
        >
          FLANGER
        </button>
        <div className="perf-deck-trail">
          <PerfKnob
            size="sm"
            label="WET"
            ariaLabel={`Deck ${deck.id} flanger wet`}
            value={deck.flangerWet}
            disabled={empty}
            reset={0}
            onChange={(v) => deck.setFlangerWet(v)}
          />
          <button
            type="button"
            className={`perf-btn load${playing ? ' locked' : ''}${!playing && !empty ? ' ready' : ''}${loadFlash ? ' flash' : ''}`}
            title={playing ? 'Pause deck before load (R4.2)' : 'Load selected library track'}
            onClick={() => {
              if (playing) {
                setLoadFlash(true);
                libraryStore.rejectLoad(`Deck ${deck.id} is playing — pause first`);
                return;
              }
              try {
                libraryStore.requestLoad(deck);
              } catch (err) {
                setLoadFlash(true);
                alert(formatUserError(err, `Deck ${deck.id} load`));
              }
            }}
          >
            {playing ? '🔒 LOAD' : 'LOAD'}
          </button>
        </div>
      </div>
    </div>
  );
});
