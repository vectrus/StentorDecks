import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { CONTROL_IDS, type ControlId } from '@stentordeck/shared';
import {
  audioDeviceStore,
  browseStore,
  deckA,
  deckB,
  midiStore,
  mixerStore,
  settingsStore,
} from '../stores/root';
import { formatUserError } from '../util/formatUserError';

export const DevHarness = observer(function DevHarness() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && midiStore.learnActive) {
        e.preventDefault();
        midiStore.cancelLearn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="harness">
      <header className="harness-hd">
        <h1>E2/E3 Dev harness</h1>
        <span className="mono">
          Plan {audioDeviceStore.activePlan} · {audioDeviceStore.planReason}
        </span>
      </header>
      <section className="sec">
        <div className="hd">Browse (MIDI cluster / fixture until E4)</div>
        <div className="mono hint">{browseStore.breadcrumb}</div>
        <ul className="browse-list">
          {browseStore.entries.map((e, i) => (
            <li key={e.id} className={i === browseStore.cursor ? 'sel' : ''}>
              {e.kind === 'folder' ? '[dir] ' : ''}
              {e.name}
            </li>
          ))}
        </ul>
        {browseStore.pendingLoad && (
          <div className="row" style={{ marginTop: 8 }}>
            <span className="mono">
              MIDI Load → Deck {browseStore.pendingLoad.deckId}:{' '}
              {browseStore.pendingLoad.entry.name}
            </span>
            <label className="row">
              Pick audio file
              <input
                type="file"
                accept="audio/*,.mp3,.flac,.wav"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  const pending = browseStore.pendingLoad;
                  if (!f || !pending) return;
                  const deck = pending.deckId === 'A' ? deckA : deckB;
                  browseStore.clearPendingLoad();
                  void deck.load(f).catch((err: unknown) => {
                    alert(formatUserError(err, `Couldn’t load on Deck ${pending.deckId}`));
                  });
                }}
              />
            </label>
            <button type="button" onClick={() => browseStore.clearPendingLoad()}>
              Dismiss
            </button>
          </div>
        )}
      </section>
      <p className="hint">
        Manual soak (not CI): 30 min two-deck + FX toggles; renderer working set &lt; ~400 MB;
        heap snapshot after rebuilds should not accumulate nodes. E2 HW done · E3 HW:{' '}
        <code>docs/E3-HW-CHECKLIST.md</code>
      </p>

      <div className="harness-grid">
        <DeckPanel deck={deckA} other={deckB} label="Deck A" />
        <MixerPanel />
        <DeckPanel deck={deckB} other={deckA} label="Deck B" />
      </div>

      <section className="sec">
        <div className="hd">Global</div>
        <label>
          Pitch range
          <select
            value={settingsStore.settings.mixer.pitchFaders.range}
            onChange={(e) => {
              void settingsStore.set({
                mixer: {
                  pitchFaders: {
                    range: Number(e.target.value) as 0.08 | 0.16,
                  },
                },
              });
            }}
          >
            <option value={0.08}>±8%</option>
            <option value={0.16}>±16%</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={settingsStore.settings.audio.brakeOnStop}
            onChange={(e) => {
              void settingsStore.set({ audio: { brakeOnStop: e.target.checked } });
            }}
          />
          Brake on stop
        </label>
        <label>
          <input
            type="checkbox"
            checked={settingsStore.settings.audio.autoGain}
            onChange={(e) => {
              void settingsStore.set({ audio: { autoGain: e.target.checked } });
            }}
          />
          Auto-gain
        </label>
        <p className="hint">
          Sync tip: File BPM is a label (like writing “128” on a vinyl sleeve). Pitch changes real
          speed. Sync makes the other deck’s <em>effective</em> BPM match — only within ±8/16%, so a
          128 track cannot sync down to “20”.
        </p>
      </section>

      <section className="sec">
        <div className="hd">MIDI map (E3 persist)</div>
        <p className="hint mono">
          {Object.keys(midiStore.mapping).length} bindings
          {midiStore.mappingReady ? '' : ' · loading…'} · SQLite midi_map
        </p>
        <div className="row">
          <button
            type="button"
            onClick={() => {
              void midiStore.exportMappingJson().then((json) => {
                void navigator.clipboard?.writeText(json);
                alert('MIDI map JSON copied to clipboard.');
              }).catch((err: unknown) => {
                alert(formatUserError(err, 'Couldn’t export MIDI map'));
              });
            }}
          >
            Export → clipboard
          </button>
          <button
            type="button"
            onClick={() => {
              const json = window.prompt('Paste MIDI map JSON to import:');
              if (json == null || json.trim() === '') return;
              void midiStore.importMappingJson(json).catch((err: unknown) => {
                alert(formatUserError(err, 'Couldn’t import MIDI map'));
              });
            }}
          >
            Import…
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('Reset MIDI map to RMX2 factory defaults?')) return;
              void midiStore.resetMapping().catch((err: unknown) => {
                alert(formatUserError(err, 'Couldn’t reset MIDI map'));
              });
            }}
          >
            Reset to RMX2 defaults
          </button>
        </div>
        <label>
          <input
            type="checkbox"
            checked={settingsStore.settings.midi.sendLeds}
            onChange={(e) => {
              void settingsStore.set({ midi: { sendLeds: e.target.checked } });
            }}
          />
          Send MIDI LEDs
        </label>
      </section>

      <section className="sec">
        <div className="hd">Soft takeover pickup (E3)</div>
        <p className="hint">
          After Sync or a UI slider move, hardware is inert until it crosses software
          (raw 0..1). Gain uses trim↔knob inverse.
        </p>
        <table className="mono" style={{ width: '100%', fontSize: '12px' }}>
          <thead>
            <tr>
              <th align="left">Control</th>
              <th align="right">Soft</th>
              <th align="right">Hard</th>
              <th align="left">Armed</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                'deckA.pitch',
                'deckB.pitch',
                'deckA.gain',
                'deckB.gain',
                'mixer.faderA',
                'mixer.faderB',
                'mixer.master',
                'mixer.headMix',
              ] as const
            ).map((id) => {
              const t = midiStore.takeoverView(id);
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td align="right">{t ? t.softwareValue.toFixed(3) : '—'}</td>
                  <td align="right">
                    {t?.hardwareValue != null ? t.hardwareValue.toFixed(3) : '—'}
                  </td>
                  <td>{t?.armed ? 'ARMED' : t ? 'live' : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="sec">
        <div className="hd">MIDI learn (E3)</div>
        <p className="hint mono">
          Phase: {midiStore.learn.phase.phase}
          {midiStore.learn.phase.phase === 'listen'
            ? ` · ${midiStore.learn.phase.controlId}`
            : ''}
          {midiStore.learn.phase.phase === 'confirm' || midiStore.learn.phase.phase === 'steal'
            ? ` · ${midiStore.learn.phase.controlId} ← ${JSON.stringify(midiStore.learn.phase.binding)}`
            : ''}
          {midiStore.learn.phase.phase === 'confirm' && midiStore.learn.phase.conflict
            ? ` · conflict ${midiStore.learn.phase.conflict}`
            : ''}
          {midiStore.learn.phase.phase === 'steal'
            ? ` · steal from ${midiStore.learn.phase.conflict}`
            : ''}
        </p>
        <div className="row">
          {!midiStore.learnActive ? (
            <button
              type="button"
              onClick={() => {
                midiStore.startLearn();
                midiStore.selectLearnControl('deckA.wet');
              }}
            >
              Start learn
            </button>
          ) : (
            <button type="button" onClick={() => midiStore.cancelLearn()}>
              Cancel (Esc)
            </button>
          )}
          <label>
            Target control
            <select
              disabled={!midiStore.learnActive || midiStore.learn.phase.phase === 'steal'}
              value={
                midiStore.learn.phase.phase === 'listen' ||
                midiStore.learn.phase.phase === 'confirm' ||
                midiStore.learn.phase.phase === 'steal'
                  ? midiStore.learn.phase.controlId
                  : 'deckA.wet'
              }
              onChange={(e) => {
                midiStore.selectLearnControl(e.target.value as ControlId);
              }}
            >
              {CONTROL_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          {(midiStore.learn.phase.phase === 'confirm' &&
            midiStore.learn.phase.conflict == null) && (
            <button
              type="button"
              onClick={() => {
                void midiStore.confirmLearn().catch((err: unknown) => {
                  alert(formatUserError(err, 'Couldn’t save learned binding'));
                });
              }}
            >
              Confirm bind
            </button>
          )}
          {(midiStore.learn.phase.phase === 'confirm' &&
            midiStore.learn.phase.conflict != null) && (
            <button
              type="button"
              onClick={() => {
                void midiStore.confirmLearn();
              }}
            >
              Review steal…
            </button>
          )}
          {midiStore.learn.phase.phase === 'steal' && (
            <>
              <button
                type="button"
                onClick={() => {
                  void midiStore.acceptLearnSteal().catch((err: unknown) => {
                    alert(formatUserError(err, 'Couldn’t steal binding'));
                  });
                }}
              >
                Steal &amp; save
              </button>
              <button type="button" onClick={() => midiStore.rejectLearnSteal()}>
                Keep previous
              </button>
            </>
          )}
        </div>
        <p className="hint">
          Tip: learn <code>deckA.wet</code> / <code>deckA.filter</code> on spare knobs — twist
          until ≥3 values in 500 ms. LSB CCs are ignored as standalone. Esc cancels.
        </p>
      </section>
    </div>
  );
});

const DeckPanel = observer(function DeckPanel(props: {
  deck: typeof deckA;
  other: typeof deckB;
  label: string;
}) {
  const { deck, other, label } = props;
  return (
    <section className="sec deck-panel">
      <div className="hd">
        {label}{' '}
        <span className="mono">
          {deck.state}
          {deck.eotWarn ? ` · EOT ${deck.eotWarn}s` : ''}
        </span>
      </div>
      <input
        type="file"
        accept="audio/*,.mp3,.flac,.wav"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          void deck.load(f).catch((err: unknown) => {
            alert(formatUserError(err, `Couldn’t load on ${label}`));
          });
        }}
      />
      <div className="tt">
        {deck.title || '— empty —'}
        {deck.loading ? ' (loading…)' : ''}
      </div>
      <div className="mono">
        BPM {deck.effectiveBpm?.toFixed(1) ?? '—'}
        {deck.fileBpm != null ? ` (= file ${deck.fileBpm} × rate)` : ' (set File BPM)'} ·{' '}
        {fmt(deck.position)} / {fmt(deck.duration)}
      </div>
      <label>
        File BPM (tag only — not playback speed)
        <input
          type="number"
          min={60}
          max={200}
          step={0.1}
          placeholder="e.g. 128"
          value={deck.fileBpm ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            deck.setFileBpm(v === '' ? null : Number(v));
          }}
          title="Track’s tagged BPM for Sync math. Does NOT change how fast audio plays — use Pitch. E5 will fill this."
        />
      </label>
      <div className="row">
        <button type="button" onClick={() => deck.togglePlay()}>
          {deck.state === 'playing' ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onMouseDown={() => {
            if (deck.state === 'playing') {
              deck.cuePress();
            } else {
              deck.cuePress();
              deck.cueHoldStart();
            }
          }}
          onMouseUp={() => deck.cueHoldEnd()}
          onMouseLeave={() => deck.cueHoldEnd()}
        >
          CUE
        </button>
        <button
          type="button"
          className={deck.syncArmed ? 'on' : undefined}
          onClick={() => deck.toggleSync(other)}
          title={
            other.state === 'empty'
              ? 'Load the other deck first'
              : deck.syncArmed
                ? 'SYNC on — press to turn off'
                : other.fileBpm == null || deck.fileBpm == null
                  ? 'SYNC needs File BPM on BOTH decks to match tempo (else only copies pitch %)'
                  : 'SYNC off — press to match tempo and latch on'
          }
        >
          SYNC{deck.syncArmed ? ' ON' : ''}
        </button>
        <button type="button" className={deck.pfl ? 'on' : ''} onClick={() => deck.togglePfl()}>
          PFL
        </button>
      </div>
      {deck.syncStatusLine ? (
        <p className="hint mono" style={{ color: deck.syncMode === 'bpm' ? undefined : 'var(--warn, #e6a23c)' }}>
          {deck.syncStatusLine}
        </p>
      ) : null}
      <label>
        Pitch
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={deck.pitchPos}
          onChange={(e) => deck.setPitchPos(Number(e.target.value))}
        />
      </label>
      <label>
        Trim dB {deck.trimDb.toFixed(1)}
        <input
          type="range"
          min={-24}
          max={12}
          step={0.1}
          value={deck.trimDb}
          onChange={(e) => deck.setTrimDb(Number(e.target.value))}
        />
      </label>
      {(['low', 'mid', 'high'] as const).map((band) => (
        <div key={band} className="row">
          <label style={{ flex: 1 }}>
            EQ {band}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={deck.eq[band]}
              onChange={(e) => deck.setEq(band, Number(e.target.value))}
            />
          </label>
          <button type="button" className={deck.kills[band] ? 'on' : ''} onClick={() => deck.toggleKill(band)}>
            Kill
          </button>
        </div>
      ))}
      <div className="row">
        <button type="button" className={deck.filterOn ? 'on' : ''} onClick={() => deck.toggleFilter()}>
          FILTER
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={deck.filterAmount}
          onChange={(e) => deck.setFilterAmount(Number(e.target.value))}
        />
      </div>
      <div className="row">
        <button type="button" className={deck.flangerOn ? 'on' : ''} onClick={() => deck.toggleFlanger()}>
          FLANGER
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={deck.flangerWet}
          onChange={(e) => deck.setFlangerWet(Number(e.target.value))}
        />
      </div>
      <div className="row">
        <button type="button" onClick={() => deck.nudge(-1)}>
          Nudge −
        </button>
        <button type="button" onClick={() => deck.nudge(1)}>
          Nudge +
        </button>
      </div>
    </section>
  );
});

const MixerPanel = observer(function MixerPanel() {
  return (
    <section className="sec">
      <div className="hd">Mixer</div>
      <label>
        Fader A
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={mixerStore.faderA}
          onChange={(e) => mixerStore.setFaderA(Number(e.target.value))}
        />
      </label>
      <label>
        Fader B
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={mixerStore.faderB}
          onChange={(e) => mixerStore.setFaderB(Number(e.target.value))}
        />
      </label>
      <label>
        Master
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={mixerStore.master}
          onChange={(e) => mixerStore.setMaster(Number(e.target.value))}
        />
      </label>
      <label>
        HeadMix — left=cue/PFL only, right=master ({mixerStore.headMix.toFixed(2)})
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={mixerStore.headMix}
          onChange={(e) => mixerStore.setHeadMix(Number(e.target.value))}
        />
      </label>
      <label>
        Phones ({mixerStore.phones.toFixed(2)})
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={mixerStore.phones}
          onChange={(e) => mixerStore.setPhones(Number(e.target.value))}
        />
      </label>
      <div className="mono meters">
        VU A {mixerStore.meters.aDb.toFixed(1)} · B {mixerStore.meters.bDb.toFixed(1)} · M{' '}
        {mixerStore.meters.masterDb.toFixed(1)} dBFS
      </div>
    </section>
  );
});

function fmt(sec: number): string {
  if (!Number.isFinite(sec)) return '-:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
