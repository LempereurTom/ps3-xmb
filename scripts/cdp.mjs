// Tiny Chrome DevTools Protocol helper for the local Steam client (debug port 8080).
// node scripts/cdp.mjs list                 → windows
// node scripts/cdp.mjs eval <title-regex> <js>
const [cmd, match, ...rest] = process.argv.slice(2);
const targets = await (await fetch('http://127.0.0.1:8080/json')).json();
if (cmd === 'list') { for (const t of targets) console.log(t.type, '|', t.title, '|', t.url.slice(0, 80)); process.exit(0); }
const target = targets.find(t => new RegExp(match, 'i').test(t.title));
if (!target) { console.log('NO TARGET', match); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: rest.join(' '), returnByValue: true, awaitPromise: true } }));
ws.addEventListener('message', e => {
  const msg = JSON.parse(e.data);
  if (msg.id === 1) { console.log(JSON.stringify(msg.result?.result?.value ?? msg.result, null, 1)); ws.close(); process.exit(0); }
});
setTimeout(() => { console.log('timeout'); process.exit(2); }, 15000);
