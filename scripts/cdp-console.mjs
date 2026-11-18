// Run an expression in a Steam window and print what it logs for a few seconds.
// node scripts/cdp-console.mjs <title-regex> <js>
const [match, ...rest] = process.argv.slice(2);
const targets = await (await fetch('http://127.0.0.1:8080/json')).json();
const target = targets.find(t => new RegExp(match, 'i').test(t.title));
if (!target) { console.log('NO TARGET'); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0;
const send = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }));
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.consoleAPICalled') console.log('console.' + m.params.type, m.params.args.map(a => a.value ?? a.description ?? a.type).join(' ').slice(0, 1500));
  if (m.method === 'Runtime.exceptionThrown') console.log('EXCEPTION', JSON.stringify(m.params.exceptionDetails).slice(0, 1500));
  if (m.id === 2) console.log('RESULT', JSON.stringify(m.result).slice(0, 800));
});
send('Runtime.enable');
send('Runtime.evaluate', { expression: rest.join(' '), awaitPromise: true, returnByValue: true });
setTimeout(() => { ws.close(); process.exit(0); }, 7000);
