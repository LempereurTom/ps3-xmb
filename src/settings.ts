import { callable, toaster } from '@decky/api';
import { useSyncExternalStore } from 'react';
import { cleanSettings, DEFAULT_SETTINGS, type Settings } from './model';

const read = callable<[], Settings>('get_settings');
const write = callable<[value: Settings], Settings>('save_settings');
let current: Settings = { ...DEFAULT_SETTINGS, enabled: false };
const listeners = new Set<() => void>();
let saveQueue = Promise.resolve();
let pendingSaves = 0;
let revision = 0;
export const getSettings = () => current;
export const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const useSettings = () => useSyncExternalStore(subscribe, getSettings, getSettings);
const publish = (value: Settings) => { current = value; listeners.forEach(fn => fn()); };
export async function initSettings() { publish(cleanSettings(await read())); }
// Remote manager writes the same preferences atomically over SSH. Do not let
// an in-flight read replace an edit made on the Deck while the read was pending.
export function watchRemoteSettings() {
  let stopped = false;
  let reading = false;
  const timer = setInterval(async () => {
    if (reading || pendingSaves) return;
    reading = true;
    const before = revision;
    try {
      const value = cleanSettings(await read());
      if (!stopped && !pendingSaves && before === revision && JSON.stringify(value) !== JSON.stringify(current)) publish(value);
    } catch { /* Keep the current screen during a transient Decky disconnect. */ }
    finally { reading = false; }
  }, 3000);
  return () => { stopped = true; clearInterval(timer); };
}
export function updateSettings(value: Partial<Settings>) {
  revision++;
  pendingSaves++;
  const next = cleanSettings({ ...current, ...value });
  publish(next);
  saveQueue = saveQueue.then(async () => { await write(next); }).catch(error => {
    console.error('[PS3 XMB] Could not persist settings', error);
    toaster.toast({ title: 'PS3 XMB', body: 'Settings changed for this session, but could not be saved.' });
  }).finally(() => { pendingSaves--; });
}
