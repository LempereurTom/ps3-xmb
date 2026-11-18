import { findModuleChild, Navigation, Router } from '@decky/ui';
import type { Game, GameAction } from './model';
import { steamClient } from './steam-client';

/**
 * Use Steam's confirmation component, which invokes its own matching native
 * API only after confirmation. Steam's OpenUninstallWizard gained a remote ID
 * argument in 2026; directly guessing its overload can skip confirmation.
 */
type UninstallDialog = (appIds: number[], ownerWindow: Window, confirmPassword: boolean, remoteClientID?: string) => void;
function uninstallDialog(): UninstallDialog {
  const dialog = findModuleChild((module: Record<string, unknown>) => {
    if (!module || (typeof module !== 'object' && typeof module !== 'function')) return;
    for (const value of Object.values(module)) {
      if (typeof value !== 'function') continue;
      const source = Function.prototype.toString.call(value);
      // Exclude the inner component that executes an uninstall, and select
      // only the exported wrapper that opens the native confirmation dialog.
      if (!source.includes('#UninstallDialog_Title') || !source.includes('rgApps') || !source.includes('bConfirmPassword') || source.includes('OpenUninstallWizard')) continue;
      const expectedArity = source.includes('remoteClientID') ? 4 : 3;
      if (value.length === expectedArity) return value;
    }
  }) as UninstallDialog | undefined;
  if (!dialog) throw new Error('Steam uninstall confirmation is unavailable; open the game in Steam to manage it');
  return dialog;
}

type GameNavigator = {
  AppProperties?: (appId: number) => void;
  ControllerConfigurator?: { Main?: (appId: number) => void };
};

export function performGameAction(game: Game, action: GameAction) {
  if (!Number.isSafeInteger(game.id) || game.id <= 0) throw new Error('Invalid Steam app ID');
  // The source of truth is the current library entry, not the snapshot from
  // when the context menu opened. The native wizard also revalidates state.
  const app = typeof appStore === 'undefined' ? undefined : appStore.GetAppOverviewByAppID(game.id);
  const shortcut = app ? app.app_type === 1073741824 : game.shortcut;
  if ((action === 'install' || action === 'uninstall') && shortcut) throw new Error('Non-Steam shortcuts are managed by their original installer');
  Navigation.CloseSideMenus();
  if (action === 'install') {
    // This is Steam's own install URI, also used by its current client UI.
    // It opens the native install flow for storage, licenses and downloads.
    // @decky/ui currently resolves SteamClient.URL to the DOM URL type.
    const protocol = steamClient().URL as unknown as { ExecuteSteamURL?: (url: string) => void };
    if (typeof protocol.ExecuteSteamURL !== 'function') throw new Error('Steam installation is unavailable; open the game in Steam to manage it');
    protocol.ExecuteSteamURL(`steam://install/${game.id}`);
    return;
  }
  if (action === 'uninstall') {
    const showDialog = uninstallDialog();
    const ownerWindow = Router.ActiveWindowInstance?.BrowserWindow ?? window;
    // "0" is Steam's local-client sentinel. Legacy dialogs ignore the fourth
    // parameter; current dialogs use it to avoid targeting another computer.
    showDialog([game.id], ownerWindow, false, '0');
    return;
  }
  const instance = Router.ActiveWindowInstance as typeof Router.ActiveWindowInstance & { Navigator?: GameNavigator };
  const navigator = instance?.Navigator ?? instance?.m_Navigator;
  if (action === 'properties') {
    if (typeof navigator?.AppProperties === 'function') navigator.AppProperties(game.id);
    else Navigation.Navigate(`/app/${game.id}/properties/general`);
  } else if (action === 'controller') {
    if (typeof navigator?.ControllerConfigurator?.Main === 'function') navigator.ControllerConfigurator.Main(game.id);
    else Navigation.Navigate(`/app/${game.id}/controllerconfigurator/main`);
  } else if (action === 'downloads') Navigation.Navigate('/library/downloads');
}
