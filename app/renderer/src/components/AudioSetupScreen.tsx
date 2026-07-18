import { observer } from 'mobx-react-lite';
import { audioDeviceStore, settingsStore } from '../stores/root';

export const AudioSetupScreen = observer(function AudioSetupScreen(props: {
  onContinue: () => void;
  allowSkip?: boolean;
}) {
  const audio = settingsStore.settings.audio;
  const outputs = audioDeviceStore.outputs;

  return (
    <div className="audio-setup">
      <h1>Audio setup</h1>
      <p className="sub">{audioDeviceStore.detectedSummary}</p>
      <p className="plan-note mono">{audioDeviceStore.planReason || 'Select devices, then Continue.'}</p>

      <section className="sec">
        <div className="hd">Master output → sound system</div>
        <div className="pick">
          <select
            value={audio.masterDevice ?? ''}
            onChange={(e) => {
              void audioDeviceStore.saveAndRebuild({
                masterDevice: e.target.value || null,
              });
            }}
          >
            <option value="">Select device…</option>
            {outputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
                {d.maxChannelCount != null ? ` (${d.maxChannelCount} ch)` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={audioDeviceStore.testing === 'master' ? 'test ok' : 'test'}
            disabled={!audio.masterDevice}
            onClick={() => void audioDeviceStore.testTone('master')}
          >
            Test tone
          </button>
        </div>
      </section>

      <section className="sec">
        <div className="hd">Cue output → headphones</div>
        <div className="pick">
          <select
            value={audio.cueDevice ?? ''}
            onChange={(e) => {
              void audioDeviceStore.saveAndRebuild({
                cueDevice: e.target.value || null,
              });
            }}
          >
            <option value="">Select device…</option>
            {outputs.map((d) => (
              <option key={`cue-${d.deviceId}`} value={d.deviceId}>
                {d.label}
                {d.maxChannelCount != null ? ` (${d.maxChannelCount} ch)` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={audioDeviceStore.testing === 'cue' ? 'test ok' : 'test'}
            disabled={!audio.cueDevice}
            onClick={() => void audioDeviceStore.testTone('cue')}
          >
            Test tone
          </button>
        </div>
        <p className="note">
          Plan A: single 4-channel device (outs 1-2 master / 3-4 cue), sample-locked. Plan B: two
          stereo devices (cue latency slightly higher). Active:{' '}
          <strong>Plan {audioDeviceStore.activePlan}</strong>
        </p>
      </section>

      <section className="sec">
        <div className="buf">
          <span>Buffer size (hint)</span>
          <span className="mono">{audio.bufferHintMs} ms</span>
        </div>
        <input
          type="range"
          min={10}
          max={80}
          value={audio.bufferHintMs}
          onChange={(e) => {
            void audioDeviceStore.saveAndRebuild({
              bufferHintMs: Number(e.target.value),
            });
          }}
        />
        <div className="buf" style={{ marginTop: '0.75rem' }}>
          <span>Routing plan</span>
          <select
            value={audio.routingPlan}
            onChange={(e) => {
              void audioDeviceStore.saveAndRebuild({
                routingPlan: e.target.value as 'auto' | 'A' | 'B',
              });
            }}
          >
            <option value="auto">Auto</option>
            <option value="A">Force A (4-ch)</option>
            <option value="B">Force B (dual stereo)</option>
          </select>
        </div>
      </section>

      <section className="sec dis">
        <div className="hd">
          Inputs <span className="badge">Coming later</span>
        </div>
        <p className="note">
          {audioDeviceStore.inputs.length === 0
            ? 'No inputs enumerated yet.'
            : audioDeviceStore.inputs.map((i) => i.label).join(' · ')}
          {' — '}
          detected and listed, not yet routable.
        </p>
      </section>

      <div className="actions">
        <button
          type="button"
          className="secondary"
          onClick={() => void audioDeviceStore.refreshDevices()}
        >
          Refresh devices
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => void audioDeviceStore.applySuggestions()}
        >
          Suggest RMX2
        </button>
        <button
          type="button"
          className="primary"
          disabled={!audio.masterDevice || !audio.cueDevice}
          onClick={() => {
            void (async () => {
              await audioDeviceStore.rebuildEngine();
              props.onContinue();
            })();
          }}
        >
          Continue
        </button>
        {props.allowSkip ? (
          <button type="button" className="secondary" onClick={props.onContinue}>
            Close
          </button>
        ) : null}
      </div>
    </div>
  );
});
