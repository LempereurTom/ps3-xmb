/**
 * Borrows the objects Steam exposes on its shared context (window.opener in Big Picture):
 * the stores the library is read from, SteamClient, and SteamUIStore for navigation.
 *
 * Deliberately NOT webpackChunksteamui: requiring Steam's modules from this window, while
 * Steam builds it, crashed the client (see decky-ui-shim.ts). Only plain references are copied;
 * nothing of Steam's runs here.
 */
type SteamWindow = Window & Record<string, unknown>;

export const SHARED_NAMES = ['SteamClient', 'SteamUIStore', 'collectionStore', 'appStore', 'appDetailsStore', 'App'];

export function borrowSteamGlobals(): boolean {
  const win = window as unknown as SteamWindow;
  let shared: SteamWindow | null = null;
  try { shared = (window.opener as SteamWindow | null) ?? null; } catch { shared = null; }
  const source = shared && shared.SteamUIStore ? shared : win.SteamUIStore ? win : null;
  if (!source) return false;
  for (const name of SHARED_NAMES) {
    try { if (win[name] === undefined && source[name] !== undefined) win[name] = source[name]; } catch { /* read-only global */ }
  }
  return !!win.SteamUIStore && !!win.SteamClient && !!win.collectionStore;
}
