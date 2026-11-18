import { chromium } from '@playwright/test';
const out = process.argv[2];
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const cases = {
  default: '',
  art_ps3accent_blue: '?art&css=' + encodeURIComponent(':root{--ps3-accent:on;--gd-accent-lock:1;--ps3-choice:blue}'),
  off: '?art&css=' + encodeURIComponent(':root{--ps3-mode:off}'),
};
for (const [name, q] of Object.entries(cases)) {
  await page.goto('http://127.0.0.1:5173/desktop-theme/test/harness.html' + q);
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => ({ cls: document.documentElement.className, kids: [...document.body.children].map(e => e.id || e.tagName).join(','),
    wave: getComputedStyle(document.getElementById('ps3-wave') || document.body).display, accent: document.getElementById('ps3-accent')?.textContent || '' }));
  console.log(name, JSON.stringify(info));
  await page.screenshot({ path: `${out}/desk-${name}.png` });
}
// performance: count frames drawn by the wave in still mode vs live mode over 2 s
const draws = {};
let assert_top, drift;
for (const mode of ['live', 'still']) {
  await page.goto('http://127.0.0.1:5173/desktop-theme/test/harness.html' + (mode === 'still' ? '?css=' + encodeURIComponent(':root{--ps3-wave:still}') : ''));
  await page.evaluate(() => { const c = document.getElementById('ps3-wave'); window.__draws = 0; const ctx = c.getContext('2d'); const o = ctx.clearRect.bind(ctx); ctx.clearRect = (...a) => { window.__draws++; return o(...a); }; });
  await page.waitForTimeout(2000);
  draws[mode] = await page.evaluate(() => window.__draws);
  if (mode === 'live') drift = await page.evaluate(() => ({ a: getComputedStyle(document.getElementById('ps3-wave')).animationName,
    b: getComputedStyle(document.getElementById('ps3-wave-2') || document.body).animationName, wide: document.getElementById('ps3-wave').getBoundingClientRect().width / innerWidth }));
  if (mode === 'live') assert_top = await page.evaluate(() => { const w = document.getElementById('ps3-wave'); const steam = document.getElementById('popup_target');
    return { z: getComputedStyle(w).zIndex, steamZ: getComputedStyle(steam).zIndex, blur: getComputedStyle(document.documentElement).getPropertyValue('--gd-blur').trim() }; });
  console.log('draws in 2s', mode, draws[mode]);
}
const assert = (await import('node:assert/strict')).default;
assert.deepEqual(errors, []);
assert.equal(draws.live, 0, 'the desktop wave is never redrawn while it moves');
assert.deepEqual([drift.a, drift.b], ['ps3-drift-a', 'ps3-drift-b'], 'two layers drift by CSS');
assert.ok(Math.abs(drift.wide - 1.4) < 0.05, 'layers wider than the window');
assert.equal(draws.still, 0, 'still wave draws nothing per frame');
assert.ok(Number(assert_top.z) < Number(assert_top.steamZ), 'the wave stays behind Steam, never over the game art');
assert.equal(assert_top.blur, '14px', 'lighter glass blur while the wave moves');
console.log('errors', JSON.stringify(errors), 'drift', JSON.stringify(drift));
await browser.close();
console.log('PASS');
