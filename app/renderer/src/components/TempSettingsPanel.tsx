import { observer } from 'mobx-react-lite';
import type { Settings } from '@stentordeck/shared';
import { settingsStore } from '../stores/SettingsStore';

const SCALES: Settings['ui']['scale'][] = [100, 125, 150];

/** Temporary E1 panel for settings round-trip acceptance. */
export const TempSettingsPanel = observer(function TempSettingsPanel() {
  return (
    <aside className="temp-settings">
      <div className="temp-title">E1 settings (temporary)</div>
      <label>
        UI scale
        <select
          value={settingsStore.scale}
          onChange={(e) => {
            const scale = Number(e.target.value) as Settings['ui']['scale'];
            void settingsStore.setScale(scale);
          }}
        >
          {SCALES.map((s) => (
            <option key={s} value={s}>
              {s}%
            </option>
          ))}
        </select>
      </label>
      <div className="temp-meta mono">
        rem {settingsStore.remPx}px · startMode {settingsStore.settings.ui.startMode}
      </div>
    </aside>
  );
});
