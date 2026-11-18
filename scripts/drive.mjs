// Drives the XMB in a real Steam Big Picture window (Steam started with -cef-enable-debugging):
// presses controller buttons the way Steam delivers them, and reports what happened.
//   node scripts/drive.mjs "<steps>"     steps: right left up down a b x y wait home shot:<file> state
// Every step prints the XMB state, where Steam navigated, and any error the page logged.
import { writeFile } from 'node:fs/promises';

const BUTTONS = { a: 1, b: 2, x: 3, y: 4, l1: 5, r1: 6, up: 9, down: 10, left: 11, right: 12, start: 14 };

async function connect(match) {
  const targets = await (await fetch('http://127.0.0.1:8080/json')).json();
  const t = targets.find(x => match.test(x.title));
  if (!t) return null;
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).split('\n')[0]);
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      const text = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
      if (!/@decky\/ui|Ignoring require|DevTools/.test(text)) logs.push(m.params.type.toUpperCase() + ' ' + text.split('\n')[0].slice(0, 300));
    }
  });
  const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  await send('Runtime.enable');
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  return { ws, send, evaluate, logs, title: t.title };
}

const STATE = `(() => {
  const root = document.querySelector('[data-ps3-standalone] .xmb-root');
  if (!root) return { xmb: false };
  const sel = root.querySelector('.xmb-item.selected');
  const menu = root.querySelector('.xmb-menu');
  return { xmb: true, category: root.dataset.category, depth: root.dataset.depth,
    selected: sel?.querySelector('.xmb-title')?.textContent, subtitle: sel?.querySelector('.xmb-subtitle, .xmb-setting-value')?.textContent,
    items: [...root.querySelectorAll('.xmb-item .xmb-title')].map(e => e.textContent).slice(0, 12),
    breadcrumb: root.querySelector('.xmb-breadcrumb')?.textContent, message: root.querySelector('.xmb-message')?.textContent,
    menu: menu ? [...menu.querySelectorAll('.xmb-menu-label')].map(e => e.textContent) : undefined,
    menuSelected: menu?.querySelector('.xmb-menu-row.selected .xmb-menu-label')?.textContent,
    viewer: !!root.querySelector('.xmb-viewer') };
})()`;

const steps = (process.argv[2] ?? 'state').split(/\s+/).filter(Boolean);
const bpm = await connect(/Big.Picture/i);
const shared = await connect(/SharedJSContext/);
if (!bpm) { console.log('Big Picture window not found'); process.exit(1); }
const route = async () => (await shared?.evaluate('location.pathname + location.search'))?.slice(0, 80);
const sleep = ms => new Promise(r => setTimeout(r, ms));

for (const step of steps) {
  if (step === 'wait') { await sleep(1500); continue; }
  if (step === 'home') { await shared.evaluate(`(SteamUIStore.GetFocusedWindowInstance?.() ?? SteamUIStore.WindowStore.GamepadUIMainWindowInstance).Navigate('/library/home'), 1`); await sleep(2500); }
  else if (step.startsWith('shot:')) {
    const r = await bpm.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(step.slice(5), Buffer.from(r.result.data, 'base64'));
    console.log('shot', step.slice(5)); continue;
  } else if (BUTTONS[step]) {
    await bpm.evaluate(`(() => { const t = document.activeElement || document.body;
      for (const type of ['vgp_onbuttondown', 'vgp_onbuttonup']) t.dispatchEvent(new CustomEvent(type, { detail: { button: ${BUTTONS[step]}, is_repeat: false, source: 1 }, bubbles: true, cancelable: true })); })()`);
    await sleep(step === 'a' || step === 'b' || step === 'x' ? 1400 : 450);
  }
  const state = await bpm.evaluate(STATE);
  const errs = [...bpm.logs.splice(0), ...(shared?.logs.splice(0) ?? []).map(l => 'shared: ' + l)];
  console.log(`[${step}]`, JSON.stringify({ ...state, route: await route() }), errs.length ? '\n   ' + errs.join('\n   ') : '');
}
process.exit(0);
