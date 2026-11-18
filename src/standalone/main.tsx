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
import { borrowSteamGlobals } from './prelude';
import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { InputSurfaceProps } from '../Xmb';
import { cleanSettings, type Command, type MediaAlbum, type MediaLibrary, type Platform, type Settings, type Status } from '../model';
import { handleXmbKey } from '../input';

type SteamWindow = Window & Record<string, unknown>;
const win = window as unknown as SteamWindow;
const TAG = '[PS3 XMB · Millennium]';

/** Steam's stores and navigation, borrowed from the shared context once they exist. */
const borrowSteam = borrowSteamGlobals;

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
  // In the real client the whole Big Picture root carries .BasicHome, so the home is "#Main",
  // and Steam's dialogs (.FullModalOverlay: uninstall, power menu) keep their own input.
  if (el.closest('[data-ps3-standalone]')) return true;
  if (el.closest('.FullModalOverlay') || el.closest('#header')) return false;
  return !!el.closest('#Main') || el === document.body || el === document.documentElement;
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

// Seen in a real client: .BasicHome is on #GamepadUI_Full_Root itself, so hiding it hid the
// XMB too (black screen). Only the XMB's neighbours in #Main are Steam's home.
const HIDE_STEAM_HOME = `
  #Main > :not([data-ps3-standalone]) { opacity: 0 !important; }
  #Main > :not([data-ps3-standalone]) * { animation-play-state: paused !important; }
  #MainNavMenu-Rest > #Footer { opacity: 0 !important; }
`;

function App({ platform, Xmb }: { platform: Platform; Xmb: typeof import('../Xmb').Xmb }) {
  const settings = useSyncExternalStore(subscribe, getSettings, getSettings);
  const visible = useHomeVisible();
  if (!visible) return null;
  return <>
    {/* Steam's home stays in place under the XMB (it keeps Steam's focus, so the controller is
        still caught above) but is no longer drawn: Glass Dusk's big carousel showed through. */}
    <style>{HIDE_STEAM_HOME}</style>
    <Xmb platform={platform} settings={settings} updateSettings={updateSettings} InputSurface={StandaloneInput} />
  </>;
}

let root: Root | null = null;
let starting = false;
let homeSeenAt = 0;
/** True once the XMB runs (or cannot ever run here); false means "look again later". */
async function start(): Promise<boolean> {
  if (root || starting || (win as { __ps3XmbStandalone?: boolean }).__ps3XmbStandalone) return true;
  if (!/GamepadUIPopupWindowBody/.test(document.body?.className ?? '') && !/Big Picture/.test(document.title)) return false;
  if (!document.getElementById('Main') || !document.querySelector('.BasicHome')) return false;   // not built yet
  // Let Steam finish building Big Picture before adding anything to it.
  if (!homeSeenAt) { homeSeenAt = Date.now(); return false; }
  if (Date.now() - homeSeenAt < 1500) return false;
  if (!borrowSteam()) return false;                             // Steam's stores not ready yet
  starting = true;
  (win as { __ps3XmbStandalone?: boolean }).__ps3XmbStandalone = true;
  try {
    // Loaded only now: @decky/ui reads Steam's webpack modules as it is evaluated.
    const [{ createSteamPlatform }, { Xmb }] = await Promise.all([import('../steam'), import('../Xmb')]);
    const platform = createSteamPlatform({ media, status });
    const container = document.createElement('div');
    container.dataset.ps3Standalone = '';
    // Above everything Steam draws in #Main (the home's carousel builds stacking contexts of its
    // own); Steam's side menus and dialogs live outside #Main and stay above the XMB.
    container.style.cssText = 'position:fixed;inset:0;z-index:2147483000;';
    // Inside #Main, like a route: Steam's side menus and dialogs stay above it.
    (document.getElementById('Main') ?? document.body).appendChild(container);
    root = createRoot(container);
    root.render(<App platform={platform} Xmb={Xmb} />);
    console.info(TAG, 'started');
  } catch (error) {
    console.error(TAG, 'could not start; Steam Home is left as it is', error);
  }
  return true;
}

// Steam can create the Big Picture window long before it is opened and build it only then, so
// keep looking for as long as the window lives: a class test and a getElementById per second.
let tries = 0;
(function wait() {
  void start().then(done => {
    if (done) return;
    tries++;
    setTimeout(wait, tries < 50 ? 400 : 1000);
  });
})();
