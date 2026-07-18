import { useEffect, useRef } from 'react';
import {
  CHANNEL_FADER_TOE_IN,
  channelFaderDb,
  channelFaderEasedPos,
} from '@stentordeck/shared';

type Props = {
  shape: number;
  /** Probe position 0..1 (UI scrubber or live fader). */
  probePos: number;
  accent?: string;
};

/**
 * Canvas curve preview — mockup 06 / docs/03 (toe + power curve in eased domain).
 * Draws outside React; redraws when shape / probe change.
 */
export function FaderCurveEditor(props: Props) {
  const { shape, probePos, accent = '#FFB454' } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const w = cv.width;
    const h = cv.height;
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#262E39';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * h) / 4);
      ctx.lineTo(w, (i * h) / 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((i * w) / 4, 0);
      ctx.lineTo((i * w) / 4, h);
      ctx.stroke();
    }

    // Linear reference
    ctx.strokeStyle = '#4A5563';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Toe marker
    ctx.strokeStyle = '#39424E';
    ctx.beginPath();
    ctx.moveTo(CHANNEL_FADER_TOE_IN * w, 0);
    ctx.lineTo(CHANNEL_FADER_TOE_IN * w, h);
    ctx.stroke();

    // Curve: y = eased domain after power (same as channelFaderGain domain map)
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= w; i++) {
      const p = i / w;
      const eased = channelFaderEasedPos(p);
      const shaped =
        eased <= 0 ? 0 : Math.pow(eased, Math.pow(2, shape / 50));
      const y = h - shaped * h;
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();

    // Probe
    const pp = Math.min(1, Math.max(0, probePos));
    const pe = channelFaderEasedPos(pp);
    const pv = pe <= 0 ? 0 : Math.pow(pe, Math.pow(2, shape / 50));
    ctx.fillStyle = '#F4F7FB';
    ctx.beginPath();
    ctx.arc(pp * w, h - pv * h, 6, 0, Math.PI * 2);
    ctx.fill();
  }, [shape, probePos, accent]);

  const db = channelFaderDb(probePos, shape);
  const dbLabel = !Number.isFinite(db) || db <= -60 ? '−∞ dB' : `${db.toFixed(1)} dB`;

  return (
    <div className="settings-fader-curve">
      <canvas
        ref={canvasRef}
        className="settings-fader-canvas"
        width={360}
        height={240}
        aria-label={`Channel fader curve, shape ${shape}`}
      />
      <div className="settings-fader-out">
        <div className="settings-fader-out-label">Output @ {Math.round(probePos * 100)}%</div>
        <div className="mono settings-fader-out-v">{dbLabel}</div>
      </div>
    </div>
  );
}
