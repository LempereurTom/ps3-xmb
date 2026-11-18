import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Palette } from './model';
import { nightLevel, resolvePalette } from './palette';
import type { Swatch } from './accent';

/**
 * PS3-style background: a colour gradient that follows the month ("Original" theme) and the
 * time of day, with a translucent wave ribbon made of thin strands and drifting sparkles.
 *
 * Performance budget (Steam Deck and PC Big Picture):
 *  - the canvas is drawn at the screen's real resolution (sharp on a 1080p or 4K TV), never
 *    wider than 2560 px; drawing 18 thin paths and 26 stamped sprites is cheap at any size;
 *  - 30 fps at most, and no frame at all while `paused` (game art, media viewer, options
 *    panel — the glass blur behind the panel would be recomputed on every frame), while the
 *    page is hidden or when motion is off: a single still frame is drawn instead;
 *  - gradients, the sparkle sprite and the point buffers are built once per size, so a frame
 *    allocates nothing and reads nothing from the DOM.
 */

const STRANDS = 18;
const SPARKS = 26;
const MAX_WIDTH = 2560;

interface Spark { x: number; r: number; speed: number; phase: number; drift: number }
const SPARK_LIST: Spark[] = Array.from({ length: SPARKS }, (_, i) => ({
  x: (i * 0.618) % 1, r: 0.6 + ((i * 7) % 5) * 0.25, speed: 0.004 + ((i * 13) % 7) * 0.0012,
  phase: i * 1.7, drift: ((i * 5) % 11) / 10,
}));

function ribbonY(x: number, w: number, h: number, t: number, i: number) {
  // Two travelling sine waves; each strand is phase-shifted so the bundle twists.
  const u = x / w;
  const k = i / (STRANDS - 1);
  const base = h * (0.56 + 0.05 * Math.sin(u * 2.2 + t * 0.07));
  const twist = Math.sin(u * 3.1 + t * 0.21 + k * 1.6) * h * (0.035 + 0.05 * k);
  const swell = Math.sin(u * 5.3 - t * 0.13 + k * 0.9) * h * 0.022;
  const spread = (k - 0.5) * h * 0.11 * (0.65 + 0.35 * Math.sin(u * 2.5 - t * 0.17));
  return base + twist + swell + spread;
}

/** "#rrggbb" mixed into white by `amount` (0–1), as "rgb(r,g,b)"; white for anything else. */
export function mixWithWhite(hex: string, amount: number) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 'rgb(255,255,255)';
  const [r, g, b] = m.slice(1).map(v => Math.round(255 + (parseInt(v, 16) - 255) * amount));
  return `rgb(${r},${g},${b})`;
}

const STRAND_ALPHA = Array.from({ length: STRANDS }, (_, i) => 0.12 + 0.4 * Math.pow(Math.sin(Math.PI * i / (STRANDS - 1)), 2));

class WavePainter {
  private sheet: CanvasGradient | null = null;
  private fade: CanvasGradient | null = null;
  private rows: Float32Array[] = [];
  private step = 8;
  private readonly sprite: HTMLCanvasElement;

  private tint = '';
  constructor(private readonly canvas: HTMLCanvasElement, private readonly ctx: CanvasRenderingContext2D) {
    this.sprite = canvas.ownerDocument.createElement('canvas');
    this.sprite.width = this.sprite.height = 32;
    const s = this.sprite.getContext('2d');
    if (s) {
      const glow = s.createRadialGradient(16, 16, 0, 16, 16, 16);
      glow.addColorStop(0, 'rgba(255,255,255,1)');
      glow.addColorStop(0.3, 'rgba(255,255,255,0.45)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      s.fillStyle = glow;
      s.fillRect(0, 0, 32, 32);
    }
  }

  /** The strands take a little of the selected game's colour ('' = white). True when it changed. */
  setTint(tint: string) {
    if (tint === this.tint) return false;
    this.tint = tint;
    this.fade = this.strandGradient(this.canvas.width);
    return true;
  }

  private strandGradient(w: number) {
    // White, or white with a quarter of the game's colour: a hint, never a coloured ribbon.
    // Mixed here (a canvas may not take CSS color-mix()).
    const ink = mixWithWhite(this.tint, 0.28);
    const fade = this.ctx.createLinearGradient(0, 0, w, 0);
    fade.addColorStop(0, 'rgba(255,255,255,0)');
    fade.addColorStop(0.18, ink);
    fade.addColorStop(0.82, ink);
    fade.addColorStop(1, 'rgba(255,255,255,0)');
    return fade;
  }

  /** Returns true when the size changed. */
  resize(cssWidth: number, cssHeight: number, ratio: number) {
    const scale = Math.min(ratio, MAX_WIDTH / Math.max(1, cssWidth));
    const w = Math.max(320, Math.round(cssWidth * scale));
    const h = Math.max(200, Math.round(cssHeight * scale));
    if (w === this.canvas.width && h === this.canvas.height && this.sheet) return false;
    this.canvas.width = w;
    this.canvas.height = h;
    const { ctx } = this;
    this.sheet = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.75);
    this.sheet.addColorStop(0, 'rgba(255,255,255,0.15)');
    this.sheet.addColorStop(0.5, 'rgba(255,255,255,0.07)');
    this.sheet.addColorStop(1, 'rgba(255,255,255,0)');
    this.fade = this.strandGradient(w);
    // More points on a bigger canvas, so the curves stay smooth at full resolution.
    this.step = Math.max(6, Math.round(w / 160));
    const points = Math.ceil(w / this.step) + 3;
    this.rows = Array.from({ length: STRANDS }, () => new Float32Array(points));
    return true;
  }

  draw(t: number) {
    const { ctx, rows, step } = this;
    const w = this.canvas.width, h = this.canvas.height;
    if (!this.sheet || !this.fade || !rows.length) return;
    ctx.clearRect(0, 0, w, h);
    const n = rows[0].length;
    for (let i = 0; i < STRANDS; i++) {
      const row = rows[i];
      for (let j = 0; j < n; j++) row[j] = ribbonY(-step + j * step, w, h, t, i);
    }
    // Soft translucent sheet between the outer strands.
    ctx.fillStyle = this.sheet;
    ctx.beginPath();
    const top = rows[0], bottom = rows[STRANDS - 1];
    ctx.moveTo(-step, top[0]);
    for (let j = 1; j < n; j++) ctx.lineTo(-step + j * step, top[j]);
    for (let j = n - 1; j >= 0; j--) ctx.lineTo(-step + j * step, bottom[j]);
    ctx.closePath();
    ctx.fill();
    // The strands: brighter towards the centre of the bundle, fading at the screen edges.
    ctx.strokeStyle = this.fade;
    ctx.lineWidth = Math.max(1, w / 1500);
    for (let i = 0; i < STRANDS; i++) {
      const row = rows[i];
      ctx.globalAlpha = STRAND_ALPHA[i];
      ctx.beginPath();
      ctx.moveTo(-step, row[0]);
      for (let j = 1; j < n; j++) ctx.lineTo(-step + j * step, row[j]);
      ctx.stroke();
    }
    // Sparkles drift along the ribbon and twinkle: one pre-rendered sprite, stamped.
    const unit = w / 960;
    for (const s of SPARK_LIST) {
      const x = ((s.x + t * s.speed) % 1.1 - 0.05) * w;
      const y = ribbonY(x, w, h, t, Math.round(s.drift * (STRANDS - 1))) + Math.sin(t * 0.5 + s.phase) * h * 0.03;
      const r = s.r * unit * 3;
      ctx.globalAlpha = 0.25 + 0.55 * Math.max(0, Math.sin(t * 0.9 + s.phase));
      ctx.drawImage(this.sprite, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
}

function useClockTick(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), ms); return () => clearInterval(timer); }, [ms]);
  return now;
}

/** Where each colour of the game's art drifts in the sky: biggest share first, nearest the wave. */
const BLOB_HOMES = [[62, 56], [26, 38], [82, 26], [42, 80]] as const;

export const Waves = memo(function Waves({ palette, motion, paused = false, tint, swatches }: {
  palette: Palette; motion: boolean; paused?: boolean; tint?: string; swatches?: Swatch[];
}) {
  const background = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const wakeRef = useRef<() => void>(() => {});
  const painterRef = useRef<{ setTint: (tint: string) => boolean; redraw: () => void } | null>(null);
  const tintRef = useRef(tint ?? '');
  tintRef.current = tint ?? '';
  const now = useClockTick(5 * 60 * 1000);
  const colour = resolvePalette(palette, now);
  const night = nightLevel(now);

  useEffect(() => { pausedRef.current = paused; if (!paused) wakeRef.current(); }, [paused]);

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d', { alpha: true });
    if (!element || !ctx) return;
    const doc = element.ownerDocument;
    const win = doc.defaultView ?? window;
    const painter = new WavePainter(element, ctx);
    painter.setTint(tintRef.current);
    const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const animate = motion && !reduced;
    let frame = 0;
    let last = 0;
    let t = 37; // A pleasing starting shape for the still frame.

    const resize = () => {
      if (painter.resize(element.clientWidth, element.clientHeight, Math.min(2, win.devicePixelRatio || 1))) painter.draw(t);
    };
    const running = () => animate && !pausedRef.current && !doc.hidden;
    const loop = (time: number) => {
      frame = 0;
      if (!running()) return;            // stopped; wake() restarts it
      frame = win.requestAnimationFrame(loop);
      if (time - last < 33) return;      // ~30 fps is plenty for a slow wave
      t += Math.min(0.1, (time - (last || time)) / 1000);
      last = time;
      painter.draw(t);
    };
    const wake = () => { if (!frame && running()) { last = 0; frame = win.requestAnimationFrame(loop); } };
    wakeRef.current = wake;
    painterRef.current = { setTint: value => painter.setTint(value), redraw: () => painter.draw(t) };

    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    painter.draw(t);
    wake();
    const visibility = () => {
      if (background.current) background.current.hidden = doc.hidden;
      wake();
    };
    doc.addEventListener('visibilitychange', visibility);
    return () => {
      if (frame) win.cancelAnimationFrame(frame);
      wakeRef.current = () => {};
      painterRef.current = null;
      observer.disconnect();
      doc.removeEventListener('visibilitychange', visibility);
    };
  }, [motion]);

  // A still wave picks up the new tint at once; a moving one at its next frame.
  useEffect(() => { if (painterRef.current?.setTint(tint ?? '')) painterRef.current.redraw(); }, [tint]);

  return <div ref={background} className={`xmb-background ps3-${colour}`} aria-hidden="true" style={{ '--xmb-night': night.toFixed(2), '--xmb-tint': tint ?? 'transparent' } as CSSProperties}>
    <div className="xmb-light" />
    {/* The game's colours, each as large as its share of the art, drifting slowly (transform
        only: the compositor moves them, nothing repaints). */}
    <div className={`xmb-tint${tint ? ' on' : ''}`}>
      {(swatches?.length ? swatches : tint ? [{ color: tint, share: 1 }] : []).slice(0, 4).map((swatch, i) => {
        const [x, y] = BLOB_HOMES[i];
        const size = Math.round(34 + 70 * Math.sqrt(swatch.share));
        return <span key={i} className={`xmb-blob xmb-blob-${i}`}
          style={{ left: `${x}%`, top: `${y}%`, width: `${size}%`, '--blob': swatch.color, '--blob-strength': `${Math.round(45 + 30 * swatch.share)}%` } as CSSProperties} />;
      })}
    </div>
    <canvas ref={canvas} className="xmb-wave-canvas" />
    <div className="xmb-night" />
  </div>;
});
