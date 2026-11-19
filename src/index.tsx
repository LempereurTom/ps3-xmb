import { definePlugin, routerHook, toaster } from '@decky/api';
import { uiLanguage } from './language';
import type { Language } from './model';
import { ButtonItem, Focusable, GamepadButton, Navigation, PanelSection, PanelSectionRow, ToggleField, staticClasses, type GamepadEvent } from '@decky/ui';
import { Component, useEffect, useRef, type ReactNode } from 'react';
import { Xmb, type InputSurfaceProps } from './Xmb';
import { handleXmbKey } from './input';
import { Icon } from './Icons';
import { getSettings, initSettings, subscribe, updateSettings, useSettings, watchRemoteSettings } from './settings';
import { flushInputReport, steamPlatform } from './decky-backend';
import { closeSound } from './sound';
import type { Command } from './model';

const HOME = '/library/home';
const ROUTE = '/ps3-xmb';

function DeckInput({ children, onCommand, label }: InputSurfaceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const navRef = useRef<{ TakeFocus: () => void } | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => { navRef.current?.TakeFocus?.(); ref.current?.focus(); }, 50);
    return () => clearTimeout(timer);
  }, []);
  const button = (event: GamepadEvent, directionsOnly = false) => {
    const map: Partial<Record<GamepadButton, Command>> = directionsOnly ? {
      [GamepadButton.DIR_LEFT]: 'left', [GamepadButton.DIR_RIGHT]: 'right', [GamepadButton.DIR_UP]: 'up', [GamepadButton.DIR_DOWN]: 'down',
    } : { [GamepadButton.BUMPER_LEFT]: 'left', [GamepadButton.BUMPER_RIGHT]: 'right' };
    const command = map[event.detail.button];
    if (command) { event.preventDefault(); event.stopPropagation(); onCommand(command); }
  };
  const action = (event: GamepadEvent, cmd: Command) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.detail.is_repeat) onCommand(cmd);
  };
  return <Focusable ref={ref} {...{ navRef }} className="xmb-input" role="application" aria-label={label} tabIndex={0} noFocusRing preferredFocus
    onGamepadDirection={e => button(e, true)} onButtonDown={e => button(e)}
    onOKButton={e => action(e, 'confirm')} onCancelButton={e => action(e, 'back')} onSecondaryButton={e => action(e, 'details')}
    onMenuButton={e => action(e, 'menu')} onOptionsButton={e => action(e, 'menu')}
    onKeyDown={e => handleXmbKey(e, onCommand)}>
    {children}
  </Focusable>;
}

class RecoveryBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) {
    console.error('[PS3 XMB] Restoring Steam Home after render error', error);
    updateSettings({ enabled: false });
    toaster.toast({ title: 'PS3 XMB', body: 'L’accueil Steam a été rétabli car le thème n’a pas pu se charger.' });
  }
  render() { return this.state.failed ? this.props.fallback ?? <ButtonItem onClick={() => Navigation.Navigate(HOME)}>Return to Steam Home</ButtonItem> : this.props.children; }
}

function Screen() {
  const settings = useSettings();
  return <Xmb platform={steamPlatform} settings={settings} updateSettings={updateSettings} InputSurface={DeckInput} />;
}
function RouteScreen() { return <RecoveryBoundary><Screen /></RecoveryBoundary>; }

const PANEL_EN = { home: 'PS3 Home screen', homeHelp: 'Replace Home with the PS3 cross-media bar.', open: 'Open XMB', waves: 'Animated wave', sounds: 'Menu sounds',
    backgrounds: 'Game backgrounds', folders: 'Game folders', foldersHelp: 'Browse Steam games, non-Steam games and your collections.', installed: 'Installed games only', restore: 'Restore Steam Home' };
const PANEL: Record<Language, typeof PANEL_EN> = {
  en: PANEL_EN,
  fr: { home: 'Accueil PS3', homeHelp: 'Remplacer l’accueil Steam par le XMB de la PS3.', open: 'Ouvrir le XMB', waves: 'Vague animée', sounds: 'Sons du menu',
    backgrounds: 'Fonds des jeux', folders: 'Dossiers de jeux', foldersHelp: 'Jeux Steam, jeux non-Steam et vos collections.', installed: 'Jeux installés uniquement', restore: 'Rétablir l’accueil Steam' },
  ru: { home: 'Экран PS3', homeHelp: 'Заменить главный экран Steam на XMB PS3.', open: 'Открыть XMB', waves: 'Анимация волны', sounds: 'Звуки меню',
    backgrounds: 'Фоны игр', folders: 'Папки игр', foldersHelp: 'Игры Steam, сторонние игры и ваши коллекции.', installed: 'Только установленные', restore: 'Вернуть экран Steam' },
  de: { home: 'PS3-Startbildschirm', homeHelp: 'Die Steam-Startseite durch das XMB der PS3 ersetzen.', open: 'XMB öffnen', waves: 'Animierte Welle', sounds: 'Menütöne',
    backgrounds: 'Spielhintergründe', folders: 'Spielordner', foldersHelp: 'Steam-Spiele, Nicht-Steam-Spiele und Ihre Sammlungen.', installed: 'Nur installierte Spiele', restore: 'Steam-Startseite wiederherstellen' },
  es: { home: 'Inicio PS3', homeHelp: 'Sustituir el inicio de Steam por el XMB de la PS3.', open: 'Abrir el XMB', waves: 'Ola animada', sounds: 'Sonidos del menú',
    backgrounds: 'Fondos de juegos', folders: 'Carpetas de juegos', foldersHelp: 'Juegos de Steam, juegos ajenos a Steam y tus colecciones.', installed: 'Solo juegos instalados', restore: 'Restaurar el inicio de Steam' },
  pt: { home: 'Início PS3', homeHelp: 'Substituir o início da Steam pelo XMB do PS3.', open: 'Abrir o XMB', waves: 'Onda animada', sounds: 'Sons do menu',
    backgrounds: 'Fundos dos jogos', folders: 'Pastas de jogos', foldersHelp: 'Jogos Steam, jogos fora da Steam e suas coleções.', installed: 'Só jogos instalados', restore: 'Restaurar o início da Steam' },
  it: { home: 'Home PS3', homeHelp: 'Sostituisci la Home di Steam con l’XMB della PS3.', open: 'Apri l’XMB', waves: 'Onda animata', sounds: 'Suoni del menu',
    backgrounds: 'Sfondi dei giochi', folders: 'Cartelle dei giochi', foldersHelp: 'Giochi Steam, giochi non Steam e le tue raccolte.', installed: 'Solo giochi installati', restore: 'Ripristina la Home di Steam' },
  pl: { home: 'Ekran główny PS3', homeHelp: 'Zastąp ekran główny Steam menu XMB z PS3.', open: 'Otwórz XMB', waves: 'Animowana fala', sounds: 'Dźwięki menu',
    backgrounds: 'Tła gier', folders: 'Foldery gier', foldersHelp: 'Gry Steam, gry spoza Steam i twoje kolekcje.', installed: 'Tylko zainstalowane gry', restore: 'Przywróć ekran Steam' },
  zh: { home: 'PS3 主页', homeHelp: '用 PS3 的 XMB 替换 Steam 主页。', open: '打开 XMB', waves: '波浪动画', sounds: '菜单音效',
    backgrounds: '游戏背景', folders: '游戏文件夹', foldersHelp: 'Steam 游戏、非 Steam 游戏和您的收藏夹。', installed: '仅已安装的游戏', restore: '恢复 Steam 主页' },
  ja: { home: 'PS3ホーム', homeHelp: 'SteamのホームをPS3のXMBに置き換えます。', open: 'XMBを開く', waves: 'ウェーブアニメーション', sounds: 'メニューサウンド',
    backgrounds: 'ゲーム背景', folders: 'ゲームフォルダー', foldersHelp: 'Steamゲーム、Steam以外のゲーム、コレクション。', installed: 'インストール済みのみ', restore: 'Steamホームに戻す' },
};

function Panel() {
  const s = useSettings();
  const t = PANEL[uiLanguage(s.language)];
  return <PanelSection title="PS3 XMB">
    <PanelSectionRow><ToggleField label={t.home} description={t.homeHelp} checked={s.enabled} onChange={enabled => updateSettings({ enabled })} /></PanelSectionRow>
    <PanelSectionRow><ButtonItem layout="below" onClick={() => { Navigation.CloseSideMenus(); Navigation.Navigate(ROUTE); }}>{t.open}</ButtonItem></PanelSectionRow>
    <PanelSectionRow><ToggleField label={t.waves} checked={s.motion} onChange={motion => updateSettings({ motion })} /></PanelSectionRow>
    <PanelSectionRow><ToggleField label={t.sounds} checked={s.sounds} onChange={sounds => updateSettings({ sounds })} /></PanelSectionRow>
    <PanelSectionRow><ToggleField label={t.backgrounds} checked={s.gameBackground} onChange={gameBackground => updateSettings({ gameBackground })} /></PanelSectionRow>
    <PanelSectionRow><ToggleField label={t.folders} description={t.foldersHelp} checked={s.groupByFolders} onChange={groupByFolders => updateSettings({ groupByFolders })} /></PanelSectionRow>
    <PanelSectionRow><ToggleField label={t.installed} checked={s.installedOnly} onChange={installedOnly => updateSettings({ installedOnly })} /></PanelSectionRow>
    <PanelSectionRow><ButtonItem layout="below" onClick={() => { updateSettings({ enabled: false }); Navigation.CloseSideMenus(); Navigation.Navigate(HOME); }}>{t.restore}</ButtonItem></PanelSectionRow>
  </PanelSection>;
}

export default definePlugin(() => {
  let unloaded = false;
  let patch: ReturnType<typeof routerHook.addPatch> | undefined;
  const sync = () => {
    if (getSettings().enabled && !unloaded && !patch) {
      patch = routerHook.addPatch(HOME, props => ({ ...props, component: undefined, render: undefined,
        children: <RecoveryBoundary fallback={props.children}><Screen /></RecoveryBoundary> }));
    } else if ((!getSettings().enabled || unloaded) && patch) { routerHook.removePatch(HOME, patch); patch = undefined; }
  };
  routerHook.addRoute(ROUTE, RouteScreen, { exact: true });
  const unsubscribe = subscribe(sync);
  const stopWatching = watchRemoteSettings();
  void initSettings().then(() => { if (!unloaded) sync(); }).catch(error => {
    console.error('[PS3 XMB] Settings unavailable; leaving Steam Home intact', error);
    toaster.toast({ title: 'PS3 XMB', body: 'Impossible de lire les réglages. Rechargez le plugin depuis Decky.' });
  });
  steamPlatform.report?.('frontend', 'loaded');
  return {
    name: 'PS3 XMB', titleView: <div className={staticClasses.Title}>PS3 XMB</div>, content: <Panel />,
    icon: <span style={{ display: 'block', width: 22, height: 22 }}><Icon name="game" /></span>,
    onDismount() { flushInputReport(); unloaded = true; stopWatching(); unsubscribe(); sync(); routerHook.removeRoute(ROUTE); closeSound(); },
  };
});
