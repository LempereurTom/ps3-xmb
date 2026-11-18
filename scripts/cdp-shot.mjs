// Screenshot a Steam window: node scripts/cdp-shot.mjs <title-regex> <out.png>
import { writeFile } from 'node:fs/promises';
const [match, out] = process.argv.slice(2);
const targets = await (await fetch('http://127.0.0.1:8080/json')).json();
const target = targets.find(t => new RegExp(match, 'i').test(t.title));
if (!target) { console.log('NO TARGET'); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
ws.addEventListener('message', async e => {
  const m = JSON.parse(e.data);
  if (m.id === 1) { await writeFile(out, Buffer.from(m.result.data, 'base64')); console.log('saved', out); process.exit(0); }
});
setTimeout(() => { console.log('timeout'); process.exit(2); }, 15000);
