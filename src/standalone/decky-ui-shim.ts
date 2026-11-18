/**
 * What the Millennium build uses in place of @decky/ui.
 *
 * @decky/ui finds Steam's internals by requiring EVERY module of Steam's webpack bundle as it
 * loads. Decky does that once, in the shared context, after Steam has started. Done from the
 * Big Picture window while Steam was still building it, it crashed the whole client (seen on a
 * real PC). So this build never touches webpack: it speaks to SteamUIStore, the object Steam
 * itself exposes on window (the same one @decky/ui's Router resolves to), borrowed from the
 * shared context by prelude.ts. Every call is guarded: a missing method means "do nothing".
 */
type Fn = (...args: unknown[]) => unknown;
interface WindowInstance {
  Navigate?: Fn; NavigateBack?: Fn; NavigateToSteamWeb?: Fn; BrowserWindow?: Window;
  Navigator?: Record<string, Fn | Record<string, Fn> | undefined>;
  MenuStore?: Record<string, Fn | undefined>;
}
interface UIStore {
  GetFocusedWindowInstance?: () => WindowInstance | undefined;
  WindowStore?: { GamepadUIMainWindowInstance?: WindowInstance; SteamUIWindows?: WindowInstance[] };
  MainRunningAppID?: number;
  NavigateToRunningApp?: Fn;
  OpenPowerMenu?: Fn;
}

const store = (): UIStore | undefined => (window as unknown as { SteamUIStore?: UIStore }).SteamUIStore;
function focused(): WindowInstance | undefined {
  const ui = store();
  try { return ui?.GetFocusedWindowInstance?.() ?? ui?.WindowStore?.GamepadUIMainWindowInstance ?? ui?.WindowStore?.SteamUIWindows?.[0]; }
  catch { return ui?.WindowStore?.GamepadUIMainWindowInstance; }
}
const call = (owner: object | undefined, name: string, ...args: unknown[]) => {
  const fn = owner && (owner as Record<string, unknown>)[name];
  if (typeof fn !== 'function') throw new Error(`Steam: ${name} is unavailable`);
  return (fn as Fn).apply(owner, args);
};

export const Router = {
  get MainRunningAppID() { return store()?.MainRunningAppID; },
  NavigateToRunningApp(...args: unknown[]) { return call(store(), 'NavigateToRunningApp', ...args); },
  get ActiveWindowInstance() { return focused() as (WindowInstance & { m_Navigator?: unknown }) | undefined; },
  get WindowStore() { return store()?.WindowStore; },
};

export const Navigation = {
  Navigate: (path: string) => call(focused(), 'Navigate', path),
  NavigateBack: () => call(focused(), 'NavigateBack'),
  NavigateToSteamWeb: (url: string) => call(focused(), 'NavigateToSteamWeb', url),
  NavigateToExternalWeb: (url: string) => call(focused()?.Navigator, 'ExternalWeb', url),
  NavigateToChat: () => call(focused()?.Navigator, 'Chat'),
  CloseSideMenus: () => { try { call(focused()?.MenuStore, 'CloseSideMenus'); } catch { /* nothing open */ } },
  OpenPowerMenu: (...args: unknown[]) => call(store(), 'OpenPowerMenu', ...args),
};

/** No module search in this build: callers fall back (the uninstall dialog says to use Steam). */
export function findModuleChild(_filter: unknown): undefined { return undefined; }
