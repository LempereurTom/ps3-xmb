/**
 * Glass Dusk-style accent: two close colours picked out of a game's art.
 *
 * The art is drawn on a 32 × 18 canvas once per game and the pair is cached, so moving the
 * cursor over the library costs nothing after the first visit. A picture served without CORS
 * headers cannot be read back (the canvas is "tainted"); then there is simply no game accent
 * and the XMB keeps the PS3 colour.
 */
/** A colour of the art and its share of the art's colour (shares add up to 1). */
export interface Swatch { color: string; share: number }
export interface AccentPair { accent: string; second: string; ink: string; palette?: Swatch[] }

const cache = new Map<string, AccentPair | null>();
const pending = new Map<string, Promise<AccentPair | null>>();
const MAX_CACHE = 300;

const hex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

export function hslToHex(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${hex(f(0) * 255)}${hex(f(8) * 255)}${hex(f(4) * 255)}`;
}

/** Dominant vivid hue of RGBA pixels; null when the picture is (nearly) grey. Exported for tests. */
export function pickAccent(data: Uint8ClampedArray): AccentPair | null {
  const bins = new Float64Array(36);
  const light = new Float64Array(36);              // weighted lightness per hue, for the palette
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d < 0.08 || max < 0.15) continue;           // grey or near black
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    const bin = Math.floor(h / 10) % 36;
    bins[bin] += d * max;                          // vivid and bright pixels weigh most
    light[bin] += d * max * (max + min) / 2;
  }
  let best = -1, weight = 0, total = 0;
  bins.forEach((w, i) => { total += w; if (w > weight) { weight = w; best = i; } });
  if (best < 0 || weight < 0.6) return null;
  // Smooth with the neighbours for a stable hue.
  const at = (i: number) => bins[(i + 36) % 36];
  const centre = best * 10 + 5 + ((at(best + 1) - at(best - 1)) / (at(best - 1) + weight + at(best + 1))) * 10;
  // Second colour: the strongest hue 26–50° away, as Glass Dusk does; else a fixed 35° step.
  let second = -1, secondWeight = 0;
  for (let i = 0; i < 36; i++) {
    const distance = Math.min(Math.abs(i - best), 36 - Math.abs(i - best)) * 10;
    if (distance >= 26 && distance <= 50 && bins[i] > secondWeight) { secondWeight = bins[i]; second = i; }
  }
  const h1 = (centre + 360) % 360;
  const h2 = second >= 0 && secondWeight > total * 0.04 ? second * 10 + 5 : (h1 + 35) % 360;
  // Same saturation and lightness for both, tuned to read on smoked glass.
  return { accent: hslToHex(h1, 0.68, 0.6), second: hslToHex(h2, 0.68, 0.6), ink: '#ffffff', palette: pickPalette(bins, light) };
}

/**
 * Up to four colours of the art, each with its share: the strongest hues at least 30° apart,
 * each taking the weight of its neighbourhood (±15°), lit as they are in the art (kept within a
 * range that reads as a glow on the dark sky). Exported for tests.
 */
export function pickPalette(bins: Float64Array, light: Float64Array): Swatch[] {
  const at = (i: number) => bins[(i + 36) % 36];
  const order = [...bins.keys()].filter(i => bins[i] > 0).sort((a, b) => bins[b] - bins[a]);
  const chosen: number[] = [];
  for (const i of order) {
    if (chosen.length === 4) break;
    if (chosen.every(j => Math.min(Math.abs(i - j), 36 - Math.abs(i - j)) >= 3)) chosen.push(i);
  }
  const weights = chosen.map(i => at(i - 1) + at(i) + at(i + 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (!total) return [];
  return chosen
    .map((i, k) => {
      const l = bins[i] ? light[i] / bins[i] : 0.5;
      return { color: hslToHex(i * 10 + 5, 0.62, Math.max(0.42, Math.min(0.64, l))), share: weights[k] / total };
    })
    .filter(swatch => swatch.share >= 0.06)        // a speck of colour is not part of the mood
    .map((swatch, _k, kept) => ({ ...swatch, share: swatch.share / kept.reduce((sum, s) => sum + s.share, 0) }));
}

function read(url: string): Promise<AccentPair | null> {
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    const timer = setTimeout(() => done(null), 4000);
    const done = (value: AccentPair | null) => { clearTimeout(timer); image.onload = image.onerror = null; resolve(value); };
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 18;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return done(null);
        ctx.drawImage(image, 0, 0, 32, 18);
        done(pickAccent(ctx.getImageData(0, 0, 32, 18).data));
      } catch { done(null); }   // tainted canvas: no CORS on this picture
    };
    image.onerror = () => done(null);
    image.src = url;
  });
}

/** The accent pair for a game, from the first of its pictures that can be read. */
export function gameAccent(key: string, urls: string[]): Promise<AccentPair | null> {
  if (cache.has(key)) return Promise.resolve(cache.get(key)!);
  let job = pending.get(key);
  if (!job) {
    job = (async () => {
      for (const url of urls.slice(0, 3)) {
        const pair = await read(url);
        if (pair) return pair;
      }
      return null;
    })().then(pair => {
      pending.delete(key);
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
      cache.set(key, pair);
      return pair;
    });
    pending.set(key, job);
  }
  return job;
}
