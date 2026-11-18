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
for (const mode of ['still', 'live']) {
  await page.goto('http://127.0.0.1:5173/desktop-theme/test/harness.html' + (mode === 'live' ? '?css=' + encodeURIComponent(':root{--ps3-wave:live}') : ''));
  await page.evaluate(() => { const c = document.getElementById('ps3-wave'); window.__draws = 0; const ctx = c.getContext('2d'); const o = ctx.clearRect.bind(ctx); ctx.clearRect = (...a) => { window.__draws++; return o(...a); }; });
  await page.waitForTimeout(2000);
  console.log('draws in 2s', mode, await page.evaluate(() => window.__draws));
}
console.log('errors', JSON.stringify(errors));
await browser.close();
