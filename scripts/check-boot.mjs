// Real-client check (Steam started with -cef-enable-debugging, Big Picture closed): opens Big
// Picture and samples, every 50 ms, whether Steam's home is drawn and whether the XMB shows.
// A flash of Steam's home is any sample with the home drawn and no XMB yet.
const json = async () => (await fetch('http://127.0.0.1:8080/json')).json();
async function evaluate(target, expression) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  return new Promise(resolve => {
    ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id === 1) { ws.close(); resolve(m.result?.result?.value); } });
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }));
  });
}
const shared = (await json()).find(t => t.title === 'SharedJSContext');
await evaluate(shared, 'SteamClient.UI.SetUIMode(4)');
const start = Date.now();
let bpm;
while (!bpm && Date.now() - start < 30000) { bpm = (await json()).find(t => /Big.Picture/i.test(t.title)); if (!bpm) await new Promise(r => setTimeout(r, 30)); }
if (!bpm) { console.log('Big Picture did not open'); process.exit(1); }
const samples = await evaluate(bpm, `(async () => {
  const out = [];
  const t0 = performance.now();
  while (performance.now() - t0 < 6000) {
    const home = document.querySelector('#Main > :not([data-ps3-standalone])');
    const drawn = !!home && home.offsetHeight > 0 && getComputedStyle(home).opacity !== '0';
    const xmb = !!document.querySelector('[data-ps3-standalone] .xmb-root');
    const s = (drawn ? 'H' : '-') + (xmb ? 'X' : '-');
    if (!out.length || out.at(-1)[1] !== s) out.push([Math.round(performance.now() - t0), s]);
    await new Promise(r => setTimeout(r, 50));
  }
  return out;
})()`);
console.log('window found after', Date.now() - start, 'ms; states (H = Steam home drawn, X = XMB shown):', JSON.stringify(samples));
const flash = samples.some(([, s]) => s === 'H-');
console.log(flash ? 'FLASH of Steam home before the XMB' : 'no flash');
process.exit(flash ? 1 : 0);
