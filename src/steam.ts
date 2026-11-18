import { Navigation, Router } from '@decky/ui';
import type { DownloadsInfo, Game, GameFolder, GameInfo, PersonaState, Platform, ProfileInfo } from './model';
import { performGameAction } from './steam-actions';
import { steamClient } from './steam-client';

/**
 * Steam's own library, navigation and game actions, shared by both versions:
 * the Decky plugin (backend in Python) and the Millennium theme (no backend).
 * `backend` supplies what Steam's frontend cannot: media, device status, health reports.
 */
export type PlatformBackend = Pick<Platform, 'media' | 'status' | 'report'>;

export function createSteamPlatform(backend: PlatformBackend): Platform {
  return { ...steamCore, ...backend };
}

const steamCore: Omit<Platform, 'media' | 'status' | 'report'> = {
  async games() {
    if (typeof collectionStore === 'undefined') throw new Error('Steam collectionStore is not ready');
    const collections = ['type-games', 'type-software'];
    const result: Game[] = [];
    for (const id of collections) {
      const apps = collectionStore.GetCollection(id)?.visibleApps ?? [];
      for (const app of apps) {
        if (![1, 2, 1073741824].includes(app.app_type)) continue;
        const shortcut = app.app_type === 1073741824;
        let headers: string[] = [];
        try {
          headers = typeof appDetailsStore !== 'undefined' && appDetailsStore.GetHeaderImages
            ? appDetailsStore.GetHeaderImages(app) : appStore.GetCustomLandcapeImageURLs(app) ?? [];
        } catch { /* The library may still be populating this overview. */ }
        const fallbackHeaders = shortcut ? [] : [
          `/assets/${app.appid}/header.jpg`,
          `https://shared.steamstatic.com/store_item_assets/steam/apps/${app.appid}/capsule_616x353.jpg`,
          `https://shared.steamstatic.com/store_item_assets/steam/apps/${app.appid}/header.jpg`,
        ];
        const artwork = [...new Set([...headers, ...fallbackHeaders])];
        const installed = (app as typeof app & { installed?: boolean }).installed === true;
        result.push({ id: app.appid, name: app.display_name, installed, shortcut,
          lastPlayed: app.rt_last_time_played ?? 0, gameId: app.gameid,
          artwork,
          backgrounds: [...(shortcut ? [] : [
            `/assets/${app.appid}/library_hero.jpg`,
            `https://shared.steamstatic.com/store_item_assets/steam/apps/${app.appid}/library_hero.jpg`,
          ]), ...artwork],
        });
      }
    }
    return result;
  },
  async backgrounds(id) {
    const app = appStore.GetAppOverviewByAppID(id);
    if (!app) return [];
    if (app.app_type === 1073741824 || typeof appDetailsStore === 'undefined' || !appDetailsStore.GetHeroImages)
      return appStore.GetCustomHeroImageURLs?.(app) ?? [];
    await appDetailsStore.RequestAppDetails?.(id);
    return appDetailsStore.GetHeroImages(app)?.rgHeroImages ?? [];
  },
  async folders() {
    if (typeof collectionStore === 'undefined' || !Array.isArray(collectionStore.userCollections)) {
      throw new Error('Steam user collections are not ready');
    }
    const result: GameFolder[] = [];
    for (const collection of collectionStore.userCollections) {
      if (!collection.id || !collection.displayName) continue;
      // Favourites is a "system" collection but the player's own, as in Steam's library tabs;
      // the other system ones (uncategorised, soundtracks…) are not folders of games.
      if (collection.id !== 'favorite' && typeof collectionStore.BIsSystemCollectionId === 'function' && collectionStore.BIsSystemCollectionId(collection.id)) continue;
      result.push({
        id: collection.id,
        name: collection.displayName,
        gameIds: [...new Set((collection.visibleApps ?? []).filter(app => [1, 2, 1073741824].includes(app.app_type)).map(app => app.appid))],
      });
    }
    return result.sort((a, b) => Number(b.id === 'favorite') - Number(a.id === 'favorite') || a.name.localeCompare(b.name));
  },
  profile() { return readProfile(); },
  setPersonaState(state) {
    const friends = sharedObject<{ m_FriendsUIFriendStore?: { SetUserPersonaState?: (s: number) => void } }>('friendStore')?.m_FriendsUIFriendStore;
    if (typeof friends?.SetUserPersonaState !== 'function') throw new Error('Steam: SetUserPersonaState is unavailable');
    friends.SetUserPersonaState(state);
  },
  gameInfo(game) { return readGameInfo(game); },
  downloads() { return readDownloads(); },
  gameAction: performGameAction,
  launch(game) {
    Navigation.CloseSideMenus();
    if (Router.MainRunningAppID === game.id) { Router.NavigateToRunningApp(false); return; }
    if (!game.installed && !game.shortcut) { this.details(game); return; }
    try { steamClient().Apps.RunGame(game.gameId ?? String(game.id), '', -1, 100); }
    catch (error) { console.warn('[PS3 XMB] Falling back to Steam game details', error); this.details(game); }
  },
  details(game) { Navigation.Navigate(`/library/app/${game.id}`); },
  user() {
    // Steam keeps the signed-in persona on the global App object; read it defensively.
    try {
      const app = (globalThis as unknown as { App?: { m_CurrentUser?: { strPlayerName?: string; strAccountName?: string } } }).App;
      return app?.m_CurrentUser?.strPlayerName || app?.m_CurrentUser?.strAccountName || undefined;
    } catch { return undefined; }
  },
  navigate(destination) {
    Navigation.CloseSideMenus();
    if (destination === 'store') return Navigation.NavigateToSteamWeb('https://store.steampowered.com/');
    if (destination === 'community') return Navigation.NavigateToSteamWeb('https://steamcommunity.com/');
    if (destination === 'profile') return Navigation.NavigateToSteamWeb('https://steamcommunity.com/my/');
    // In Big Picture, friends and chat live in the Quick Access menu (tab 3), not on a route.
    if (destination === 'chat') return Navigation.OpenQuickAccessMenu ? Navigation.OpenQuickAccessMenu(3) : Navigation.NavigateToChat();
    if (destination === 'points') return Navigation.NavigateToSteamWeb('https://store.steampowered.com/points/shop');
    if (destination === 'browser') return Navigation.NavigateToExternalWeb('https://www.google.com/');
    if (destination === 'power') return Navigation.OpenPowerMenu();
    if (destination === 'exitbp') {
      // Only offered on a PC: Big Picture closes and the desktop Steam client returns.
      const ui = (steamClient() as unknown as { UI?: { ExitBigPictureMode?: () => void } }).UI;
      if (typeof ui?.ExitBigPictureMode !== 'function') throw new Error('Big Picture exit is unavailable');
      return ui.ExitBigPictureMode();
    }
    const routes: Record<string, string> = { home: '/library/home', library: '/library', settings: '/settings', display: '/settings/display', internet: '/settings/internet', media: '/media/grid', downloads: '/library/downloads' };
    if (!routes[destination]) throw new Error(`Unknown destination: ${destination}`);
    Navigation.Navigate(routes[destination]);
  },
};

// ───────── data for the XMB's own side panels (every read guarded: Steam's stores change) ─────────
function sharedObject<T>(name: string): T | undefined {
  try { return (globalThis as unknown as Record<string, T | undefined>)[name]; } catch { return undefined; }
}
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

interface FriendLike { persona?: { m_ePersonaState?: number; m_strPlayerName?: string; m_strAvatarHash?: string } }
function readProfile(): ProfileInfo | undefined {
  try {
    const store = sharedObject<{ m_FriendsUIFriendStore?: { self?: FriendLike; all_friends?: FriendLike[]; online_friends?: FriendLike[]; GetPendingInviteCount?: () => number } }>('friendStore')?.m_FriendsUIFriendStore;
    const app = sharedObject<{ m_CurrentUser?: { strAccountName?: string } }>('App');
    const persona = store?.self?.persona;
    const name = persona?.m_strPlayerName || app?.m_CurrentUser?.strAccountName;
    if (!name) return undefined;
    const hash = persona?.m_strAvatarHash;
    const state = num(persona?.m_ePersonaState) ?? 1;
    const games = (collectionStore as unknown as { myGamesCollection?: { visibleApps?: unknown[] } })?.myGamesCollection?.visibleApps?.length;
    return {
      name, account: app?.m_CurrentUser?.strAccountName,
      avatar: hash && !/^0+$/.test(hash) ? `https://avatars.fastly.steamstatic.com/${hash}_full.jpg` : undefined,
      state: ([0, 1, 3, 7].includes(state) ? state : 1) as PersonaState,
      friends: Array.isArray(store?.all_friends) ? store!.all_friends!.length : undefined,
      friendsOnline: Array.isArray(store?.online_friends) ? store!.online_friends!.length : undefined,
      invites: typeof store?.GetPendingInviteCount === 'function' ? store.GetPendingInviteCount() : undefined,
      games,
    };
  } catch { return undefined; }
}

function readGameInfo(game: Game): GameInfo | undefined {
  try {
    const app = appStore.GetAppOverviewByAppID(game.id) as unknown as Record<string, unknown> | undefined;
    if (!app) return undefined;
    const size = Number(app.size_on_disk);
    return {
      minutes: num(app.minutes_playtime_forever), minutesTwoWeeks: num(app.minutes_playtime_last_two_weeks),
      lastPlayed: num(app.rt_last_time_played) || undefined, purchased: num(app.rt_purchased_time) || undefined,
      sizeOnDisk: Number.isFinite(size) && size > 0 ? size : undefined,
      metacritic: num(app.metacritic_score) || undefined, reviewPercent: num(app.review_percentage_with_bombs) || undefined,
      hero: game.backgrounds?.[0],
    };
  } catch { return undefined; }
}

function readDownloads(): DownloadsInfo | undefined {
  try {
    // As read from a real client: LocalDownloadOverview is a getter with the running update;
    // m_DownloadItems is a MobX map of the queue (the running one included).
    const store = sharedObject<{ LocalDownloadOverview?: Record<string, unknown>; CurrentViewingDownloadOverview?: Record<string, unknown>;
      m_DownloadItems?: { values?: () => Iterable<Record<string, unknown>> } | Array<Record<string, unknown>> }>('downloadsStore');
    if (!store) return undefined;
    const overview = store.LocalDownloadOverview ?? store.CurrentViewingDownloadOverview ?? {};
    const raw = store.m_DownloadItems;
    const items = Array.isArray(raw) ? raw : typeof raw?.values === 'function' ? [...raw.values()] : [];
    const appid = num(overview.update_appid) || 0;
    const queued = items.filter(item => !item.completed && num(item.appid) !== appid).length;
    if (!appid) return { queued };
    const name = (appStore.GetAppOverviewByAppID(appid) as unknown as { display_name?: string } | undefined)?.display_name ?? String(appid);
    const eta = num(overview.overall_estimated_time_remaining_sec);
    return { queued, current: {
      name, percent: Math.max(0, Math.min(100, num(overview.overall_percent_complete) ?? 0)),
      bytesPerSecond: num(overview.update_network_bytes_per_second) ?? 0, paused: !!overview.paused,
      etaSeconds: eta !== undefined && eta >= 0 ? eta : undefined,
    } };
  } catch { return undefined; }
}
