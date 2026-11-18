/**
 * PS3 XMB for Millennium — the same XMB as the Decky plugin, without Decky.
 *
 * Millennium loads this file (ps3/xmb.js) into the Big Picture window. Steam's stores and
 * router live in the client's shared context, which Big Picture reaches as window.opener
 * (Glass Dusk reads the library the same way). We borrow them, then lay the XMB over the
 * Big Picture home only: every other screen (game pages, store, settings, the STEAM and
 * Quick Access menus) stays Steam's, dressed by Glass Dusk and the PS3 layer.
 *
 * Input: Steam turns the controller into "vgp_onbuttondown" events on the element it has in
 * focus. While the XMB shows, those aimed at the home (under the XMB) are taken in the capture
 * phase and cancelled, so the hidden carousel never moves or launches anything. Events aimed at
 * a menu Steam opened over the XMB pass through untouched.
 */
import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { InputSurfaceProps } from '../Xmb';
import { cleanSettings, type Command, type MediaAlbum, type MediaLibrary, type Platform, type Settings, type Status } from '../model';
import { handleXmbKey } from '../input';

type SteamWindow = Window & Record<string, unknown>;
const win = window as unknown as SteamWindow;
const TAG = '[PS3 XMB · Millennium]';

/** Copies Steam's shared globals into this window. False when this is not Steam's Big Picture. */
function borrowSteam(): boolean {
  let shared: SteamWindow | null = null;
  try { shared = (window.opener as SteamWindow | null) ?? null; } catch { shared = null; }
  const source = shared && shared.webpackChunksteamui ? shared : win.webpackChunksteamui ? win : null;
  if (!source) return false;
  for (const name of ['webpackChunksteamui', 'SteamClient', 'SteamUIStore', 'collectionStore', 'appStore', 'appDetailsStore', 'App']) {
    if (win[name] === undefined && source[name] !== undefined) win[name] = source[name];
  }
  return !!win.SteamClient && !!win.collectionStore;
}

// ───────── settings: localStorage of the Big Picture window (persists with Steam) ─────────
const KEY = 'ps3-xmb-settings';
const listeners = new Set<() => void>();
let current: Settings = (() => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return { ...cleanSettings(JSON.parse(saved)), enabled: true };
  } catch { /* unreadable: start from the defaults */ }
  // First run: the colour chosen in the theme's PS3 tab (ps3/colours/*.css), so the XMB and the
  // rest of Big Picture match out of the box. The XMB's own Theme Settings can change it later.
  const choice = getComputedStyle(document.documentElement).getPropertyValue('--ps3-choice').trim();
  return { ...cleanSettings({ palette: choice || 'original' }), enabled: true };
})();
let sessionHidden = false;   // «Accueil Steam standard» hides the XMB until Big Picture restarts
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const getSettings = () => current;
function updateSettings(value: Partial<Settings>) {
  if (value.enabled === false) { sessionHidden = true; listeners.forEach(fn => fn()); }
  const { enabled: _ignored, ...rest } = value;
  current = { ...cleanSettings({ ...current, ...rest }), enabled: true };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* private storage: this session only */ }
  listeners.forEach(fn => fn());
}

// ───────── what Decky's Python backend gives, done from Steam's frontend ─────────
interface Screenshot { nAppID: number; hHandle: number; nCreated: number; strCaption?: string; strUrl: string }
async function media(kind: 'photo' | 'video'): Promise<MediaLibrary> {
  if (kind === 'video') return { base: '', albums: [] };   // recordings need the Decky worker
  const api = (win.SteamClient as { Screenshots?: { GetAllLocalScreenshots?: () => Promise<Screenshot[]> } } | undefined)?.Screenshots;
  if (!api?.GetAllLocalScreenshots) throw new Error('Steam screenshots are unavailable');
  const shots = await api.GetAllLocalScreenshots();
  const albums = new Map<string, MediaAlbum>();
  for (const shot of shots ?? []) {
    if (!shot?.strUrl) continue;
    const appId = String(shot.nAppID ?? '');
    const album = albums.get(appId) ?? { id: `screenshots/${appId}`, name: '', source: 'screenshots' as const, appId, entries: [] };
    album.entries.push({ id: `${appId}-${shot.hHandle}`, title: shot.strCaption || new Date(shot.nCreated * 1000).toLocaleString(), time: shot.nCreated,
      format: 'JPG', url: shot.strUrl, thumb: shot.strUrl });
    albums.set(appId, album);
  }
  const list = [...albums.values()];
  list.forEach(album => album.entries.sort((a, b) => b.time - a.time));
  return { base: '', albums: list.sort((a, b) => b.entries[0].time - a.entries[0].time) };
}
async function status(): Promise<Status> {
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; chargingTime: number; dischargingTime: number }> };
    const battery = await nav.getBattery?.();
    // A desktop PC reports a full, charging "battery" that never discharges: show none.
    if (!battery || (battery.charging && battery.level === 1 && battery.dischargingTime === Infinity && battery.chargingTime === 0)) return { battery: null, charging: false, pc: true };
    return { battery: Math.round(battery.level * 100), charging: battery.charging, pc: true };
  } catch { return { battery: null, charging: false, pc: true }; }
}

// ───────── controller and keyboard while the XMB covers the home ─────────
const BUTTONS: Record<number, Command> = { 1: 'confirm', 2: 'back', 3: 'details', 4: 'menu', 14: 'menu', 5: 'left', 6: 'right', 9: 'up', 10: 'down', 11: 'left', 12: 'right' };
const DIRECTIONS = new Set<Command>(['up', 'down', 'left', 'right']);
const ours = (target: EventTarget | null) => {
  const el = target as Element | null;
  if (!el || typeof el.closest !== 'function') return target === document || target === window;
  return !!(el.closest('[data-ps3-standalone]') || el.closest('.BasicHome')) || el === document.body || el === document.documentElement;
};

function StandaloneInput({ children, onCommand, label }: InputSurfaceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const command = useRef(onCommand);
  command.current = onCommand;
  useEffect(() => {
    const element = ref.current;
    const view = element?.ownerDocument.defaultView;
    if (!element || !view) return;
    element.focus({ preventScroll: true });
    const onButton = (event: Event) => {
      if (!ours(event.target)) return;          // a Steam menu over the XMB keeps its input
      const detail = (event as CustomEvent<{ button: number; is_repeat?: boolean }>).detail;
      event.preventDefault();
      event.stopImmediatePropagation();
      const cmd = detail ? BUTTONS[detail.button] : undefined;
      if (cmd && (!detail.is_repeat || DIRECTIONS.has(cmd))) command.current(cmd);
    };
    const swallow = (event: Event) => { if (ours(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); } };
    const onKey = (event: KeyboardEvent) => {
      if (!ours(event.target)) return;
      handleXmbKey(event as unknown as Parameters<typeof handleXmbKey>[0], cmd => command.current(cmd));
    };
    view.addEventListener('vgp_onbuttondown', onButton, true);
    view.addEventListener('vgp_onbuttonup', swallow, true);
    view.addEventListener('keydown', onKey, true);
    return () => {
      view.removeEventListener('vgp_onbuttondown', onButton, true);
      view.removeEventListener('vgp_onbuttonup', swallow, true);
      view.removeEventListener('keydown', onKey, true);
    };
  }, []);
  return <div className="xmb-input" ref={ref} tabIndex={0} role="application" aria-label={label}>{children}</div>;
}

// ───────── mounting over the Big Picture home ─────────
function useHomeVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const check = () => {
      // Decky's PS3 XMB already replaces the home: stand aside.
      const decky = [...document.querySelectorAll('.xmb-root')].some(el => !el.closest('[data-ps3-standalone]'));
      const home = document.querySelector('.BasicHome');
      setVisible(!sessionHidden && !decky && !!home && !document.hidden);
    };
    check();
    const timer = setInterval(check, 400);
    const unsubscribe = subscribe(check);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); unsubscribe(); document.removeEventListener('visibilitychange', check); };
  }, []);
  return visible;
}

function App({ platform, Xmb }: { platform: Platform; Xmb: typeof import('../Xmb').Xmb }) {
  const settings = useSyncExternalStore(subscribe, getSettings, getSettings);
  const visible = useHomeVisible();
  return visible ? <Xmb platform={platform} settings={settings} updateSettings={updateSettings} InputSurface={StandaloneInput} /> : null;
}

let root: Root | null = null;
async function start() {
  if (root || (win as { __ps3XmbStandalone?: boolean }).__ps3XmbStandalone) return;
  if (!/GamepadUIPopupWindowBody/.test(document.body?.className ?? '') && !/Big Picture/.test(document.title)) return;
  if (!borrowSteam()) { console.warn(TAG, 'Steam stores not reachable from this window; XMB not started'); return; }
  (win as { __ps3XmbStandalone?: boolean }).__ps3XmbStandalone = true;
  try {
    // Loaded only now: @decky/ui reads Steam's webpack modules as it is evaluated.
    const [{ createSteamPlatform }, { Xmb }] = await Promise.all([import('../steam'), import('../Xmb')]);
    const platform = createSteamPlatform({ media, status });
    const container = document.createElement('div');
    container.dataset.ps3Standalone = '';
    // Inside #Main, like a route: Steam's side menus and dialogs stay above it.
    (document.getElementById('Main') ?? document.body).appendChild(container);
    root = createRoot(container);
    root.render(<App platform={platform} Xmb={Xmb} />);
    console.info(TAG, 'started');
  } catch (error) {
    console.error(TAG, 'could not start; Steam Home is left as it is', error);
  }
}

// Big Picture builds its body a moment after the script runs; try for ~20 s.
let tries = 0;
(function wait() {
  if (root) return;
  if (document.getElementById('Main') || tries >= 50) { void start(); return; }
  tries++;
  setTimeout(wait, 400);
})();
