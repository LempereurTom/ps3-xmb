// Headless checks of the XMB preview: no page errors, screenshots of the main screens, and
// the wave's frame budget (≈30 fps while idle, 0 while paused behind a menu or a poster).
// Usage: npm run dev (other terminal), then: node scripts/check-xmb.mjs <screenshot folder>
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const out = process.argv[2] ?? '.';
const base = process.env.XMB_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

// Count wave frames: wrap clearRect on the XMB canvas.
const countFrames = async ms => {
  await page.evaluate(() => {
    const c = document.querySelector('.xmb-wave-canvas');
    const ctx = c.getContext('2d');
    window.__frames = 0;
    if (!ctx.__wrapped) { const o = ctx.clearRect.bind(ctx); ctx.clearRect = (...a) => { window.__frames++; return o(...a); }; ctx.__wrapped = true; }
  });
  await page.waitForTimeout(ms);
  return page.evaluate(() => window.__frames);
};

await page.addInitScript(() => localStorage.setItem('ps3-xmb-preview', JSON.stringify({ sounds: false, palette: 'blue' })));
await page.goto(base);
await page.waitForSelector('.xmb-root');
await page.waitForTimeout(800);
const idle = await countFrames(2000);
await page.screenshot({ path: `${out}/xmb-home.png` });

await page.keyboard.press('Enter');                       // open «Jeux Steam»
await page.waitForTimeout(1500);                          // poster + accent dwell
const accent = await page.evaluate(() => getComputedStyle(document.querySelector('.xmb-root')).getPropertyValue('--xmb-accent'));
await page.screenshot({ path: `${out}/xmb-games.png` });
const behindPoster = await countFrames(1000);

await page.keyboard.press('m');                           // options panel
await page.waitForTimeout(500);
const behindMenu = await countFrames(1000);
await page.screenshot({ path: `${out}/xmb-menu.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
// Back on a folder, the menu is in the theme's colours again (it kept the last game's before).
const accentAfter = await page.evaluate(() => document.querySelector('.xmb-root').style.getPropertyValue('--xmb-accent'));

for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');   // Settings
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');                                    // Theme settings
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/xmb-theme-settings.png` });

console.log(JSON.stringify({ idle, behindPoster, behindMenu, accent, accentAfter, errors }));
assert.notEqual(accent, accentAfter, 'game colour while on the game');
assert.equal(accentAfter, '#3f7ae0', 'theme colour (blue) once back on a folder');
assert.equal(errors.length, 0, 'page errors');
assert.ok(idle >= 40 && idle <= 70, `idle wave runs at ~30 fps (got ${idle} frames in 2 s)`);
assert.equal(behindMenu, 0, 'wave paused behind the options panel');
await browser.close();
console.log('PASS');
