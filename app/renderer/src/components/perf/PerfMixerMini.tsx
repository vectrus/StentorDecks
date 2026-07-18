import { observer } from 'mobx-react-lite';
import { mixerStore } from '../../stores/root';

function dbToUnit(db: number): number {
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

/** Compact mixer column until E6 full mixer UI. */
export const PerfMixerMini = observer(function PerfMixerMini() {
  const a = dbToUnit(mixerStore.meters.aDb);
  const b = dbToUnit(mixerStore.meters.bDb);

  return (
    <div className="perf-mixer">
      <div className="perf-fads">
        <div className="perf-ch">
          <div className="perf-fw">
            <div className="perf-ft">
              <span className="perf-cap" style={{ top: `${(1 - mixerStore.faderA) * 78}%` }} />
            </div>
            <div className="perf-vu">
              <div style={{ height: `${a * 100}%` }} className="ok" />
            </div>
          </div>
          <div className="kl accent-a">A</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={mixerStore.faderA}
            onChange={(e) => mixerStore.setFaderA(Number(e.target.value))}
            aria-label="Channel fader A"
          />
        </div>
        <div className="perf-ch">
          <div className="perf-fw">
            <div className="perf-ft">
              <span className="perf-cap" style={{ top: `${(1 - mixerStore.faderB) * 78}%` }} />
            </div>
            <div className="perf-vu">
              <div style={{ height: `${b * 100}%` }} className="ok" />
            </div>
          </div>
          <div className="kl accent-b">B</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={mixerStore.faderB}
            onChange={(e) => mixerStore.setFaderB(Number(e.target.value))}
            aria-label="Channel fader B"
          />
        </div>
      </div>
    </div>
  );
});
