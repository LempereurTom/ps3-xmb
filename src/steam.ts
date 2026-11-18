import { Navigation, Router } from '@decky/ui';
import { callable } from '@decky/api';
import type { Game, GameFolder, MediaKind, MediaLibrary, Platform, Status } from './model';
import { performGameAction } from './steam-actions';
import { createHealthReporter } from './health';

const deviceStatus = callable<[], Status>('get_status');
const reportHealth = callable<[event: string, value: string | number], void>('report_health');

const health = createHealthReporter((event, value) => { void reportHealth(event, value).catch(() => {}); });
export const flushInputReport = health.flushInput;

export const steamPlatform: Platform = {
  report: health.report,
  media: callable<[kind: MediaKind], MediaLibrary>('get_media'),
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
      if (typeof collectionStore.BIsSystemCollectionId === 'function' && collectionStore.BIsSystemCollectionId(collection.id)) continue;
      result.push({
        id: collection.id,
        name: collection.displayName,
        gameIds: [...new Set((collection.visibleApps ?? []).filter(app => [1, 2, 1073741824].includes(app.app_type)).map(app => app.appid))],
      });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  },
  status: deviceStatus,
  gameAction: performGameAction,
  launch(game) {
    Navigation.CloseSideMenus();
    if (Router.MainRunningAppID === game.id) { Router.NavigateToRunningApp(false); return; }
    if (!game.installed && !game.shortcut) { this.details(game); return; }
    try { SteamClient.Apps.RunGame(game.gameId ?? String(game.id), '', -1, 100); }
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
    if (destination === 'chat') return Navigation.NavigateToChat();
    if (destination === 'points') return Navigation.NavigateToSteamWeb('https://store.steampowered.com/points/shop');
    if (destination === 'browser') return Navigation.NavigateToExternalWeb('https://www.google.com/');
    if (destination === 'power') return Navigation.OpenPowerMenu();
    if (destination === 'exitbp') {
      // Only offered on a PC: Big Picture closes and the desktop Steam client returns.
      const ui = (SteamClient as unknown as { UI?: { ExitBigPictureMode?: () => void } }).UI;
      if (typeof ui?.ExitBigPictureMode !== 'function') throw new Error('Big Picture exit is unavailable');
      return ui.ExitBigPictureMode();
    }
    const routes: Record<string, string> = { home: '/library/home', library: '/library', settings: '/settings', display: '/settings/display', internet: '/settings/internet', media: '/media/grid', downloads: '/library/downloads' };
    if (!routes[destination]) throw new Error(`Unknown destination: ${destination}`);
    Navigation.Navigate(routes[destination]);
  },
};
