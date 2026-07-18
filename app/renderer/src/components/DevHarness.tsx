import { observer } from 'mobx-react-lite';
import {
  audioDeviceStore,
  deckA,
  deckB,
  mixerStore,
  settingsStore,
} from '../stores/root';
import { formatUserError } from '../util/formatUserError';

export const DevHarness = observer(function DevHarness() {
  return (
    <div className="harness">
      <header className="harness-hd">
        <h1>E2 Dev harness</h1>
        <span className="mono">
          Plan {audioDeviceStore.activePlan} · {audioDeviceStore.planReason}
        </span>
      </header>
      <p className="hint">
        Manual soak (not CI): 30 min two-deck + FX toggles; renderer working set &lt; ~400 MB;
        heap snapshot after rebuilds should not accumulate nodes. HW gate:{' '}
        <code>docs/E2-HW-CHECKLIST.md</code>
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
        BPM {deck.effectiveBpm?.toFixed(1) ?? '—'} · {fmt(deck.position)} / {fmt(deck.duration)}
      </div>
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
          onClick={() => deck.syncTo(other)}
          title={
            other.state === 'empty'
              ? 'Load the other deck first'
              : 'Match tempo to the other deck'
          }
        >
          SYNC{deck.syncArmed ? ' ·' : ''}
        </button>
        <button type="button" className={deck.pfl ? 'on' : ''} onClick={() => deck.togglePfl()}>
          PFL
        </button>
      </div>
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
