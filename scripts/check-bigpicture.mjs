// Headless check of the Millennium XMB in a stand-in Big Picture window (desktop-theme/test/bigpicture.html):
// it must start, take the controller only for the home, launch through Steam, give way to other
// screens, and keep Glass Dusk's layers in order. Usage: npm run dev, then node scripts/check-bigpicture.mjs <dir>
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const out = process.argv[2] ?? '.';
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
// Vite's dev server rewrites scripts it serves; give the page the built file exactly as Millennium will.
const bundle = await readFile(new URL('../desktop-theme/PS3-XMB/ps3/xmb.js', import.meta.url), 'utf8');
await page.route(/\/ps3\/xmb\.js/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: bundle }));
await page.addInitScript(() => localStorage.setItem('ps3-xmb-settings', JSON.stringify({ sounds: false, palette: 'blue' })));
const query = process.argv[3] ?? '';
await page.goto('http://127.0.0.1:5173/desktop-theme/test/bigpicture.html' + query);
await page.waitForSelector('[data-ps3-standalone] .xmb-root', { timeout: 30000 });
await page.waitForTimeout(600);

const press = (button, target = '#carousel') => page.evaluate(([b, t]) => {
  const event = new CustomEvent('vgp_onbuttondown', { detail: { button: b, is_repeat: false }, bubbles: true, cancelable: true });
  document.querySelector(t).dispatchEvent(event);
  return event.defaultPrevented;
}, [button, target]);
const category = () => page.evaluate(() => document.querySelector('.xmb-root').dataset.category);

const layers = await page.evaluate(() => [...document.getElementById('GamepadUI_Full_Root').children].map(e => e.id).join(','));
const start = await category();
const blockedHome = await press(12);           // right on the hidden carousel → XMB category
const afterRight = await category();
await press(11);                               // back to Game
const passedMenu = !(await press(12, '#menu-item'));   // a Steam menu keeps its input
const stillGame = await category();
await press(1); await page.waitForTimeout(300); // open «Jeux Steam»
await page.screenshot({ path: `${out}/bpm-xmb.png` });
await press(1); await page.waitForTimeout(200); // launch Portal 2
const log = await page.evaluate(() => window.__steamLog.slice());
await page.evaluate(() => document.querySelector('.BasicHome').remove());   // Steam leaves the home
await page.waitForTimeout(700);
const gone = await page.evaluate(() => !document.querySelector('.xmb-root'));
await page.screenshot({ path: `${out}/bpm-other-screen.png` });

const result = { layers, start, blockedHome, afterRight, passedMenu, stillGame, log, gone, errors };
console.log(JSON.stringify(result));
assert.deepEqual(errors, []);
assert.equal(layers.split(',').slice(0, 4).join(','), 'ps3-ground,gd-bpm-bg,ps3-wave,ps3-night');
assert.equal(start, 'game');
assert.ok(blockedHome, 'controller input aimed at the home is taken by the XMB');
assert.equal(afterRight, 'network');
assert.ok(passedMenu, 'input aimed at a Steam menu is left alone');
assert.equal(stillGame, 'game');
assert.ok(log.includes('run 620'), 'Portal 2 launched through SteamClient.Apps.RunGame');
assert.ok(gone, 'XMB gives way when Steam leaves the home');
await browser.close();
console.log('PASS');
