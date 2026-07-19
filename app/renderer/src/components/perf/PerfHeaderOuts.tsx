import { observer } from 'mobx-react-lite';
import { midiStore, mixerStore } from '../../stores/root';
import { PerfKnob } from './PerfKnob';

/** MST / CUE / PHN — in Perf header so the mixer + library keep vertical room. */
export const PerfHeaderOuts = observer(function PerfHeaderOuts() {
  const mstPickup = midiStore.takeoverView('mixer.master');
  const cuePickup = midiStore.takeoverView('mixer.headMix');
  const phnPickup = midiStore.takeoverView('mixer.phones');

  return (
    <div className="perf-header-outs" aria-label="Master outputs">
      <PerfKnob
        size="sm"
        label="MST"
        ariaLabel="Master"
        title="Master (RMX2 main volume)"
        value={mixerStore.master}
        onChange={(v) => mixerStore.setMaster(v)}
        pickup={mstPickup?.armed ? mstPickup.hardwareValue : null}
      />
      <PerfKnob
        size="sm"
        label="CUE"
        ariaLabel="Headphone cue/mix"
        title="Cue/mix blend (RMX2 Cue to Mix knob)"
        value={mixerStore.headMix}
        onChange={(v) => mixerStore.setHeadMix(v)}
        pickup={cuePickup?.armed ? cuePickup.hardwareValue : null}
      />
      <PerfKnob
        size="sm"
        label="PHN"
        ariaLabel="Phones level"
        title="Software cue level. RMX2 phones volume knob is analog (no MIDI) — use this or Learn a spare knob."
        value={mixerStore.phones}
        onChange={(v) => mixerStore.setPhones(v)}
        pickup={phnPickup?.armed ? phnPickup.hardwareValue : null}
      />
    </div>
  );
});
