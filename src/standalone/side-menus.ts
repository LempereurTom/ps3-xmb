/**
 * Steam's own side panels in Big Picture, dressed as XMB panels.
 *
 * The Quick Access menu (friends, chat, notifications, settings…) and the STEAM menu are
 * separate windows that Millennium does not theme. Like Glass Dusk, we find them through
 * Steam's gamepad navigation manager and add a stylesheet: the XMB's typeface, translucent
 * smoked glass with a hairline edge, and the selection in the XMB's accent. While Quick Access
 * is open over the XMB, the XMB moves its clock and button legend out from under it.
 */
import { XMB_FONT_CSS } from '../fonts/nunito';

type AnyWindow = Window & Record<string, unknown>;
interface NavTree { m_window?: Window; m_ID?: unknown }
interface NavContext { m_rgGamepadNavigationTrees?: NavTree[] }

function steamUIStore() {
  return (window as unknown as AnyWindow).SteamUIStore as {
    WindowStore?: { m_Parent?: { m_GamepadNavigationManager?: { m_rgAllContexts?: NavContext[] } };
      GamepadUIMainWindowInstance?: { MenuStore?: { m_eOpenSideMenu?: number; GetOpenSideMenu?: () => number } } };
  } | undefined;
}

/** The side windows (Quick Access, STEAM menu…), with what they are. */
export function sideWindows(): Array<{ win: Window; kind: 'quick' | 'menu' | 'other' }> {
  const found = new Map<Window, string>();
  try {
    for (const context of steamUIStore()?.WindowStore?.m_Parent?.m_GamepadNavigationManager?.m_rgAllContexts ?? []) {
      for (const tree of context.m_rgGamepadNavigationTrees ?? []) {
        const w = tree.m_window;
        if (w && w !== window && !found.has(w)) found.set(w, String(tree.m_ID ?? ''));
      }
    }
  } catch { /* no such trees in this client */ }
  return [...found].map(([win, id]) => ({ win, kind: /QuickAccess/i.test(id) ? 'quick' : /MainNav/i.test(id) ? 'menu' : 'other' }));
}

/** 2 = Quick Access is open (on the right), 1 = the STEAM menu (on the left), 0 = none. */
export function openSideMenu(): number {
  try {
    const menus = steamUIStore()?.WindowStore?.GamepadUIMainWindowInstance?.MenuStore;
    const value = typeof menus?.GetOpenSideMenu === 'function' ? menus.GetOpenSideMenu() : menus?.m_eOpenSideMenu;
    return typeof value === 'number' ? value : 0;
  } catch { return 0; }
}

/**
 * Width in this window's CSS pixels covered by Quick Access. Its window is wider than what
 * shows (it runs past the right edge of the screen; seen in a real client): the visible part is
 * its panel, as wide as its header. Both windows share the same pixel ratio.
 */
export function quickAccessInset(): number {
  const fallback = Math.round(window.innerWidth * 0.22);
  const quick = sideWindows().find(side => side.kind === 'quick')?.win;
  try {
    const panel = quick?.document.querySelector<HTMLElement>('#QuickAccess-Menu .HeaderContainer');
    const width = panel?.getBoundingClientRect().right ?? 0;
    return width > 120 && width < window.innerWidth * 0.45 ? Math.round(width) : fallback;
  } catch { return fallback; }
}

// Every rule outranks Glass Dusk's (html[data-gd-bpm-view] #QuickAccess-Menu …, added to the same
// windows): "html[…] body" plus the panel's id and class, so the order of the sheets never matters.
const SIDE_CSS = String.raw`
html[data-ps3-xmb-side] { --ps3-panel:color-mix(in srgb,var(--xmb-theme-dark,#03050c) 55%,#020306); }
html[data-ps3-xmb-side] body, html[data-ps3-xmb-side] body .BasicUI { font-family:"XMB Humanist","Motiva Sans",Arial,sans-serif !important; }
/* Quick Access: glass in the theme colour, fading in from the left like the XMB's Options panel */
html[data-ps3-xmb-side=quick] body #QuickAccess-Menu.QuickAccessMenu {
  background:linear-gradient(90deg,transparent 0%,color-mix(in srgb,var(--ps3-panel) 60%,transparent) 6%,color-mix(in srgb,var(--ps3-panel) 76%,transparent) 40%,color-mix(in srgb,var(--ps3-panel) 84%,transparent) 100%) !important;
  border-left:1px solid rgba(255,255,255,.16) !important; box-shadow:none !important; }
/* Glass Dusk paints the friends list and chats with its own blue: let the panel show through */
html[data-ps3-xmb-side=quick] body #QuickAccess-Menu .friendlist, html[data-ps3-xmb-side=quick] body #QuickAccess-Menu .FriendsChats,
html[data-ps3-xmb-side=quick] body #QuickAccess-Menu .Title { background:none !important; background-image:none !important; }
/* the STEAM menu: the same glass, mirrored */
html[data-ps3-xmb-side=menu] body #MainNavMenuContainer .Menu, html[data-ps3-xmb-side=menu] body .MainNavMenu {
  background:linear-gradient(270deg,transparent 0%,color-mix(in srgb,var(--ps3-panel) 60%,transparent) 6%,color-mix(in srgb,var(--ps3-panel) 78%,transparent) 40%,color-mix(in srgb,var(--ps3-panel) 86%,transparent) 100%) !important;
  border-right:1px solid rgba(255,255,255,.16) !important; box-shadow:none !important; }
html[data-ps3-xmb-side] body #QuickAccess-Menu .Tabs .Tab, html[data-ps3-xmb-side] body #MainNavMenuContainer .Menu .Item { border-radius:14px !important; }
html[data-ps3-xmb-side] body #QuickAccess-Menu .Tabs .Tab.Selected {
  background:linear-gradient(135deg,var(--xmb-accent,#5e90e4),var(--xmb-accent-2,var(--xmb-accent,#5e90e4))) !important;
  box-shadow:0 6px 18px -6px var(--xmb-accent,#5e90e4),inset 0 1px 0 rgba(255,255,255,.3) !important; }
/* what the controller is on: the XMB's highlighted row, in the theme colour */
html[data-ps3-xmb-side] body #QuickAccess-Menu .Tabs .Tab.gpfocus,
html[data-ps3-xmb-side] body #MainNavMenuContainer .Menu .Item.gpfocus,
html[data-ps3-xmb-side] body .gpfocus:not(.Tab):not(.TabList):not(.Menu):not(#QuickAccess-Menu) {
  background:linear-gradient(90deg,color-mix(in srgb,var(--xmb-accent,#5e90e4) 52%,transparent),color-mix(in srgb,var(--xmb-accent-2,#5e90e4) 18%,transparent)) !important;
  border-radius:12px !important; box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 8px 20px -10px var(--xmb-accent,#5e90e4) !important; outline:none !important; }
html[data-ps3-xmb-side] body h1, html[data-ps3-xmb-side] body h2, html[data-ps3-xmb-side] body [class*=Title] { text-shadow:0 0 10px rgba(255,255,255,.25),0 1px 2px rgba(0,0,0,.6); }
`;

/** Adds the XMB dress to every side window (once each) and keeps its theme colours current. */
export function dressSideWindows(accent: string, accent2: string, dark: string) {
  for (const { win, kind } of sideWindows()) {
    try {
      const doc = win.document;
      if (!doc?.head) continue;
      const root = doc.documentElement;
      if (!doc.getElementById('ps3-xmb-side')) {
        const style = doc.createElement('style');
        style.id = 'ps3-xmb-side';
        style.textContent = XMB_FONT_CSS + SIDE_CSS;
        doc.head.appendChild(style);
      }
      if (root.getAttribute('data-ps3-xmb-side') !== kind) root.setAttribute('data-ps3-xmb-side', kind);
      if (root.style.getPropertyValue('--xmb-accent') !== accent) root.style.setProperty('--xmb-accent', accent);
      if (root.style.getPropertyValue('--xmb-accent-2') !== accent2) root.style.setProperty('--xmb-accent-2', accent2);
      if (root.style.getPropertyValue('--xmb-theme-dark') !== dark) root.style.setProperty('--xmb-theme-dark', dark);
    } catch { /* a window being closed */ }
  }
}
