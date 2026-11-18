import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hslToHex, pickAccent } from '../src/accent';
import { cleanSettings } from '../src/model';

const fill = (r: number, g: number, b: number, n = 576) => {
  const data = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) data.set([r, g, b, 255], i * 4);
  return data;
};
const hue = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

test('a vivid picture gives an accent of its hue and a close second colour', () => {
  const pair = pickAccent(fill(30, 90, 220))!;
  assert.ok(pair);
  assert.ok(Math.abs(hue(pair.accent) - 222) < 12, pair.accent);
  const gap = Math.abs(hue(pair.second) - hue(pair.accent));
  assert.ok(Math.min(gap, 360 - gap) >= 25 && Math.min(gap, 360 - gap) <= 50, pair.second);
});
test('grey or black art gives no accent (the PS3 colour stays)', () => {
  assert.equal(pickAccent(fill(128, 128, 128)), null);
  assert.equal(pickAccent(fill(5, 5, 8)), null);
});
test('hslToHex converts primaries', () => {
  assert.equal(hslToHex(0, 1, 0.5), '#ff0000');
  assert.equal(hslToHex(120, 1, 0.5), '#00ff00');
  assert.equal(hslToHex(240, 1, 0.5), '#0000ff');
});
test('panel and accent settings fall back safely', () => {
  assert.equal(cleanSettings({}).panels, 'glass');
  assert.equal(cleanSettings({ panels: 'classic' }).panels, 'classic');
  assert.equal(cleanSettings({ panels: 'neon' }).panels, 'glass');
  assert.equal(cleanSettings({ accent: 'ps3' }).accent, 'ps3');
  assert.equal(cleanSettings({ accent: 'rainbow' }).accent, 'game');
});
test('the wave tint is a light hint of the game colour', async () => {
  const { mixWithWhite } = await import('../src/Waves');
  assert.equal(mixWithWhite('#ff0000', 0.28), 'rgb(255,184,184)');
  assert.equal(mixWithWhite('#000000', 0), 'rgb(255,255,255)');
  assert.equal(mixWithWhite('not a colour', 0.5), 'rgb(255,255,255)');
});
