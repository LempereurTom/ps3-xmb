import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { CATEGORIES, HOME_CATEGORY, clampSelection, visibleGames, words, type Command, type Game, type GameFolder, type Item, type Platform, type Settings, type Status } from './model';
import { MediaParents, MediaViewer, useMediaLibrary, type ViewerHandle } from './Media';
import { ItemMenu, itemOptions } from './ItemMenu';
import { SettingLabel, SettingMark, SettingsParent } from './SettingsBranch';
import { preferenceTree, settingAncestors } from './preferences';
import { handleXmbKey, useBrowserGestures } from './input';
import { Icon } from './Icons';
import { Waves } from './Waves';
import { Glyph } from './Glyph';
import { LOCALES } from './i18n';
import { gameAccent, type AccentPair } from './accent';
import { PS3_ACCENTS, resolvePalette } from './palette';
import { playSound } from './sound';
import { XMB_CSS } from './styles';
import { GameBackdrop } from './GameBackdrop';
import { sameFolders, sameGames } from './library';

export interface InputSurfaceProps { children: ReactNode; onCommand: (command: Command) => void; label: string }
function KeyboardSurface({ children, onCommand, label }: InputSurfaceProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <div className="xmb-input" ref={ref} tabIndex={0} role="application" aria-label={label} onKeyDown={e => handleXmbKey(e, onCommand)}>{children}</div>;
}

function Artwork({ item }: { item: Item }) {
  const [source, setSource] = useState(0);
  const candidates = item.artwork?.join('\n');
  useEffect(() => setSource(0), [item.id, candidates]);
  const url = item.artwork?.[source];
  return url ? <img src={url} alt="" decoding="async" draggable={false} onError={() => setSource(i => i + 1)} /> : <Icon name={item.icon} />;
}

function Clock({ status }: { status: Status }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      const time = new Date();
      setNow(time);
      timer = setTimeout(tick, 60000 - time.getTime() % 60000);
    };
    tick();
    document.addEventListener('visibilitychange', tick);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const date = `${now.getDate()}/${now.getMonth() + 1}`;
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  return <div className="xmb-status"><span className="xmb-user-dot" aria-hidden="true" /><time dateTime={now.toISOString()}>{date}&nbsp;&nbsp;{time}</time>
    {status.battery !== null && <span className={`xmb-battery ${status.charging ? 'charging' : ''}`} role="img" aria-label={`Battery ${status.battery}%`}>
      {[0, 1, 2].map(i => <i key={i} style={{ opacity: status.battery! > i * 33 ? 1 : .15 }} />)}
    </span>}
  </div>;
}

let rememberedCategory = HOME_CATEGORY;
const rememberedSelection: Record<string, string> = {};

export function Xmb({ platform, settings, updateSettings, InputSurface = KeyboardSurface }: {
  platform: Platform; settings: Settings; updateSettings: (value: Partial<Settings>) => void; InputSurface?: ComponentType<InputSurfaceProps>;
}) {
  const t = words[settings.language];
  const [categoryIndex, setCategoryIndex] = useState(rememberedCategory);
  const category = CATEGORIES[categoryIndex];
  const [selections, setSelections] = useState<Record<string, string>>({ ...rememberedSelection });
  const [games, setGames] = useState<Game[]>([]);
  const [folders, setFolders] = useState<GameFolder[]>([]);
  const [folderError, setFolderError] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const viewer = useRef<ViewerHandle>(null);
  const mediaKind = category === 'photo' || category === 'video' ? category : undefined;
  const media = useMediaLibrary(platform, mediaKind);
  const [settingsPath, setSettingsPath] = useState<string[]>([]);
  const [menuTarget, setMenuTarget] = useState<Item | null>(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>({ battery: null, charging: false });
  const [scale, setScale] = useState(1);
  const [backdropVisible, setBackdropVisible] = useState(false);
  const [gamePair, setGamePair] = useState<AccentPair | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const busy = useRef(false);

  useEffect(() => {
    alive.current = true;
    platform.report?.('screen', 'mounted');
    return () => { alive.current = false; };
  }, [platform]);
  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setScale(Math.min(width / 960, height / 600));
    });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await platform.games();
      platform.report?.('library_count', next.length);
      if (alive.current) { setGames(current => sameGames(current, next) ? current : next); setLoadError(false); }
    } catch (error) { if (alive.current) setLoadError(true); platform.report?.('library_error', 'unavailable'); console.warn('[PS3 XMB] Library unavailable', error); }
    finally { if (alive.current) setLoading(false); }
  }, [platform]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (category !== 'game' && category !== 'music') return;
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 10000);
    return () => clearInterval(timer);
  }, [refresh, category]);
  useEffect(() => {
    if (!platform.folders || category !== 'game' || !settings.groupByFolders) return;
    let cancelled = false;
    const read = async () => {
      try { const next = await platform.folders!(); if (!cancelled) { setFolders(current => sameFolders(current, next) ? current : next); setFolderError(false); } }
      catch { if (!cancelled) setFolderError(true); }
    };
    void read();
    const timer = setInterval(() => { if (!document.hidden) void read(); }, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [platform, category, settings.groupByFolders]);
  useEffect(() => {
    const read = () => { void platform.status().then(s => { if (alive.current) setStatus(s); }).catch(() => {}); };
    read(); const timer = setInterval(read, 30000); return () => clearInterval(timer);
  }, [platform]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 3500); return () => clearTimeout(timer); }, [message]);

  const run = useCallback((fn: () => void | Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    void Promise.resolve().then(fn).catch(error => {
      console.error('[PS3 XMB] Action failed', error);
      if (alive.current) setMessage(t.error);
    }).finally(() => { busy.current = false; });
  }, [t.error]);
  const nav = useCallback((destination: string) => () => run(() => platform.navigate(destination)), [platform, run]);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(LOCALES[settings.language]), [settings.language]);
  const captureDate = useMemo(() => new Intl.DateTimeFormat(LOCALES[settings.language],
    { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }), [settings.language]);
  const gameItem = useCallback((game: Game): Item => ({ id: String(game.id), title: game.name, icon: 'game', artwork: game.artwork, game,
    subtitle: game.lastPlayed ? dateFormat.format(new Date(game.lastPlayed * 1000)) : game.installed || game.shortcut ? t.ready : t.notInstalled,
    action: () => run(() => platform.launch(game)),
  }), [run, platform, dateFormat, t.ready, t.notInstalled]);
  const library = useMemo<Item>(() => ({ id: 'library', title: t.library, subtitle: t.openLibrary, icon: 'memory', action: nav('library') }), [t, nav]);
  const musicItems = useMemo(() => games.filter(g => /spotify|music|foobar|vlc|clementine|audacious|rhythmbox/i.test(g.name)).map(gameItem), [games, gameItem]);
  const listedGames = useMemo(() => visibleGames(games, settings.installedOnly), [games, settings.installedOnly]);
  const folderLists = useMemo(() => [
    { id: 'builtin:steam', name: t.steamGames, games: listedGames.filter(game => !game.shortcut) },
    { id: 'builtin:shortcuts', name: t.shortcuts, games: listedGames.filter(game => game.shortcut) },
    ...folders.map(folder => { const ids = new Set(folder.gameIds); return { id: `collection:${folder.id}`, name: folder.name, games: listedGames.filter(game => ids.has(game.id)) }; }),
  ], [listedGames, folders, t]);
  const activeFolder = settings.groupByFolders && category === 'game' ? folderLists.find(folder => folder.id === folderId) : undefined;
  const albums = useMemo(() => {
    const names = new Map(games.map(game => [String(game.id), game.name]));
    return (media.library?.albums ?? []).map(album => ({ ...album,
      title: album.name || names.get(album.appId) || (album.appId ? `${t[album.source]} · ${album.appId}` : t[album.source]),
    }));
  }, [media.library, games, t]);
  const album = albums.find(row => row.id === albumId);
  const tree = useMemo(() => preferenceTree(settings), [settings]);
  const ancestors = settingAncestors(tree, settingsPath);
  const parent = ancestors.at(-1);
  const settingGroup = category === 'settings' ? parent : undefined;
  const nested = !!activeFolder || !!settingGroup || !!album;
  const palettePicker = settingGroup?.id === 'palette';
  const selectionKey = album ? `${category}/${album.id}` : activeFolder ? `game/${activeFolder.id}` : category === 'settings' ? ['settings', ...settingsPath].join('/') : category;
  const remember = (key: string, id: string) => {
    rememberedSelection[key] = id;
    setSelections(previous => ({ ...previous, [key]: id }));
  };
  const settingItems: Item[] = (parent?.children ?? tree).map(node => ({
    id: node.id, title: node.title, icon: node.icon, subtitle: node.subtitle, description: node.description,
    opensLevel: !!node.children, checked: parent?.current === undefined ? undefined : parent.current === node.id,
    action: () => {
      if (node.children) {
        // Each visit to a value picker starts on the value currently in effect.
        if (node.current !== undefined) remember(`${selectionKey}/${node.id}`, node.current);
        setSettingsPath([...settingsPath, node.id]);
      } else {
        if (node.value) updateSettings(node.value);
        if (node.destination) nav(node.destination)();
        else setSettingsPath(settingsPath.slice(0, -1));
      }
    },
  }));
  const gameRoot = useMemo<Item[]>(() => {
    const rows = settings.groupByFolders
      ? folderLists.map((folder): Item => ({ id: folder.id, title: folder.name, subtitle: `${t.gameCount}: ${folder.games.length}`,
          icon: 'folder', opensLevel: true, action: () => setFolderId(folder.id) }))
      : listedGames.map(gameItem);
    return [...rows, rows.length ? library : { ...library, subtitle: t.noGamesHelp },
      { id: 'downloads', title: t.downloads, icon: 'download', action: nav('downloads') }];
  }, [settings.groupByFolders, folderLists, t, listedGames, gameItem, library, nav]);
  const folderContents = useMemo<Item[]>(() => activeFolder?.games.length ? activeFolder.games.map(gameItem)
    : [{ id: 'empty-folder', title: t.emptyFolder, subtitle: t.folderHelp, icon: 'folder', action: () => setFolderId(null) }], [activeFolder, gameItem, t]);
  const gameItems = activeFolder ? folderContents : gameRoot;
  const gameIndices = useMemo(() => new Map(gameItems.map((item, i) => [item.id, i])), [gameItems]);
  const mediaRows = useMemo<Item[]>(() => {
    if (!mediaKind) return [];
    if (album) return album.entries.map(file => {
      const subtitle = captureDate.format(new Date(file.time * 1000));
      const title = file.format === 'DASH' && /^(clip|fg|bg)_/.test(file.title) ? album.title : file.title;
      return { id: file.id, title, subtitle, icon: mediaKind, artwork: [`${media.library!.base}/${file.id}/thumb`],
        media: { ...file, title }, action: () => setViewing(true) };
    });
    return albums.map(group => ({ id: group.id, title: group.title, subtitle: String(group.entries.length), icon: 'folder',
      opensLevel: true, action: () => setAlbumId(group.id) }));
  }, [album, albums, mediaKind, media.library, captureDate]);
  const mediaItems: Item[] = mediaRows.length ? mediaRows : [{
    id: media.failed ? 'media-retry' : media.library ? 'media-empty' : 'loading',
    title: media.failed ? t.mediaError : !media.library ? t.mediaLoading : category === 'photo' ? t.noPhotos : t.noVideos,
    subtitle: media.failed ? t.retry : media.library ? (category === 'photo' ? t.photosHelp : t.videosHelp) : undefined,
    icon: mediaKind ?? 'folder', action: media.retry,
  }];
  const lists: Record<string, Item[]> = {
    users: [
      { id: 'user', title: platform.user?.() || t.user, subtitle: t.userHelp, icon: 'users', action: nav('profile') },
      ...(status.pc ? [{ id: 'exit-big-picture', title: t.exitBp, subtitle: t.exitBpHelp, icon: 'exit' as const, action: nav('exitbp') }] : []),
      { id: 'power', title: t.power, subtitle: t.powerHelp, icon: 'power', action: nav('power') },
    ],
    settings: settingItems,
    photo: mediaItems,
    music: musicItems.length ? musicItems : [{ id: 'music-library', title: t.musicApps, subtitle: t.noMusic, icon: 'music', action: nav('library') }],
    video: mediaItems,
    game: gameItems,
    network: [
      { id: 'browser', title: t.browser, subtitle: t.browserHelp, icon: 'browser', action: nav('browser') },
      { id: 'internet', title: t.internet, icon: 'network', action: nav('internet') },
      { id: 'downloads', title: t.downloads, icon: 'download', action: nav('downloads') },
    ],
    steam: [
      { id: 'store', title: t.store, icon: 'store', action: nav('store') },
      { id: 'community', title: t.community, icon: 'network', action: nav('community') },
      { id: 'points', title: t.points, icon: 'steam', action: nav('points') },
    ],
    friends: [{ id: 'chat', title: t.chat, icon: 'friends', action: nav('chat') }, { id: 'profile', title: t.profile, icon: 'profile', action: nav('profile') }],
  };
  if (category === 'game' && loading) lists.game = [{ id: 'loading', title: t.loading, icon: 'memory', action: () => { void refresh(); } }];
  if (category === 'game' && loadError) lists.game = [{ id: 'retry', title: t.loadError, subtitle: t.retry, icon: 'info', action: () => { void refresh(); } }, library];
  const items = lists[category];
  const selectedId = selections[selectionKey];
  const index = clampSelection(items === gameItems ? gameIndices.get(selectedId) ?? 0 : items.findIndex(item => item.id === selectedId), items.length);
  const selected = items[index];
  const gameGallery = category === 'game' && !!selected?.game;
  const viewerFile = viewing && selected?.media;
  // Keep game actions pinned across a Steam library refresh, including uninstall.
  const targetGame = menuTarget?.game;
  const liveGame = targetGame && (games.find(game => game.id === targetGame.id) ?? targetGame);
  const menuItem = menuTarget && (liveGame ? { ...menuTarget, game: liveGame, title: liveGame.name } : items.find(item => item.id === menuTarget.id));
  const options = menuItem ? itemOptions(menuItem, platform, settings.language) : [];
  const activeMenuIndex = clampSelection(menuIndex, options.length);
  const canShowOptions = (item: Item) => item.checked === undefined && !['loading', 'empty-folder', 'media-empty', 'media-retry'].includes(item.id);
  useEffect(() => { if (menuTarget && !menuItem) setMenuTarget(null); }, [menuTarget, menuItem]);

  // Glass Dusk accent: the colours of the selected game's art. Read once the cursor rests on a
  // game (no work while scrolling through the list), cached per game, and kept after leaving
  // the game list, as Glass Dusk keeps the last game's colour.
  const accentGame = settings.accent === 'game' ? selected?.game : undefined;
  useEffect(() => {
    if (!accentGame) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void gameAccent(String(accentGame.id), [...accentGame.artwork, ...(accentGame.backgrounds ?? [])])
        .then(pair => { if (!cancelled && pair) setGamePair(pair); });
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [accentGame]);
  const ps3Pair = PS3_ACCENTS[resolvePalette(settings.palette)];
  const accentPair = settings.accent === 'game' && gamePair ? [gamePair.accent, gamePair.second] : ps3Pair;

  const selectCategory = (next: number) => {
    const clamped = clampSelection(next, CATEGORIES.length);
    if (clamped === categoryIndex) return;
    playSound('category', settings.sounds);
    rememberedCategory = clamped;
    setCategoryIndex(clamped);
    setSettingsPath([]);
    setFolderId(null);
    setAlbumId(null);
    setViewing(false);
  };
  const selectItem = (next: number) => {
    const clamped = clampSelection(next, items.length);
    if (clamped !== index) { playSound('move', settings.sounds); remember(selectionKey, items[clamped].id); }
  };
  const goBack = () => {
    if (!nested) return;
    playSound('back', settings.sounds);
    if (album) setAlbumId(null);
    else if (activeFolder) setFolderId(null);
    else setSettingsPath(settingsPath.slice(0, -1));
  };
  const openMenu = (item: Item) => {
    if (!canShowOptions(item)) return;
    playSound('menuOpen', settings.sounds);
    setMenuIndex(0);
    setMenuTarget(item);
  };
  const closeMenu = () => { playSound('menuClose', settings.sounds); setMenuTarget(null); };
  const activateMenu = (i: number) => {
    playSound('enter', settings.sounds);
    setMenuTarget(null);
    if (menuItem?.game) run(options[i].perform);
    else options[i].perform();
  };
  const openItem = (item: Item) => { playSound('enter', settings.sounds); item.action(); };
  const command = (cmd: Command) => {
    platform.report?.('last_input', cmd);
    if (viewerFile) { viewer.current?.command(cmd); return; }
    if (menuItem) {
      if (cmd === 'menu' || cmd === 'back') closeMenu();
      else if (cmd === 'confirm') activateMenu(activeMenuIndex);
      else if (cmd === 'up' || cmd === 'down') {
        const next = clampSelection(activeMenuIndex + (cmd === 'up' ? -1 : 1), options.length);
        if (next !== activeMenuIndex) { playSound('move', settings.sounds); setMenuIndex(next); }
      }
      return;
    }
    if (cmd === 'menu') openMenu(selected);
    else if (cmd === 'up' || cmd === 'down') selectItem(index + (cmd === 'up' ? -1 : 1));
    else if (cmd === 'confirm') openItem(selected);
    else if (cmd === 'back' || (nested && cmd === 'left')) goBack();
    else if (nested && cmd === 'right') { if (selected.opensLevel) openItem(selected); }
    else if (cmd === 'left' || cmd === 'right') selectCategory(categoryIndex + (cmd === 'left' ? -1 : 1));
    else if (cmd === 'details' && selected.game) run(() => platform.details(selected.game!));
  };
  const gestures = useBrowserGestures(command);
  const breadcrumb = album ? [t[category], album.title] : activeFolder ? [t.game, activeFolder.name] : [t.settings, ...ancestors.map(node => node.title)];

  const firstRow = palettePicker ? 0 : Math.max(0, index - (settingGroup ? 6 : 3));
  const offsetY = (delta: number, row: number) => {
    if (palettePicker) return 13 + row * 5.9;
    if (album) return delta * 24.7;
    if (gameGallery) return delta ? Math.sign(delta) * (26.5 + (Math.abs(delta) - 1) * 17.2) : 0;
    if (settingGroup) return delta ? Math.sign(delta) * (16.4 + (Math.abs(delta) - 1) * 7.4) : 0;
    return delta < 0 ? -46 + (delta + 1) * 21 : delta * 22.6;
  };

  return <div ref={root} className={`xmb-root ${settings.panels === 'glass' ? 'xmb-glass' : 'xmb-classic'} ${settings.motion ? '' : 'xmb-still'}`}
    style={{ '--xmb-scale': scale, '--xmb-accent': accentPair[0], '--xmb-accent-2': accentPair[1] } as CSSProperties} data-category={category} data-depth={activeFolder || album ? 1 : category === 'settings' ? settingsPath.length : 0}>
    <style>{XMB_CSS}</style><Waves palette={settings.palette} motion={settings.motion} paused={backdropVisible || !!viewerFile || !!menuItem} />
    <GameBackdrop game={selected?.game} enabled={settings.gameBackground} resolve={platform.backgrounds} onVisible={setBackdropVisible} />
    <InputSurface onCommand={command} label="PS3 XMB">
      <div className="xmb-stage" aria-hidden={viewerFile ? true : undefined} inert={viewerFile ? true : undefined}>
        <Clock status={status} />
        <div className={`xmb-browser${nested ? ' xmb-nested' : ' xmb-home'}${settingGroup ? ' xmb-settings-branch' : ''}${palettePicker ? ' xmb-palette-picker' : ''}${gameGallery ? ' xmb-game-gallery' : ''}${album ? ' xmb-media-gallery' : ''}`} {...gestures} aria-hidden={!!menuItem || undefined} inert={!!menuItem || undefined}>
        <div className="xmb-category-rail" role="tablist" aria-label="Categories" aria-hidden={!!settingGroup || !!album || undefined} inert={!!settingGroup || !!album || undefined}>
          {CATEGORIES.map((name, i) => <button key={name} role="tab" tabIndex={-1} hidden={!!activeFolder && i !== categoryIndex} aria-selected={i === categoryIndex} aria-label={t[name]}
            className={`xmb-category ${i === categoryIndex ? 'selected' : ''}`} style={{ transform: `translateX(${(i - categoryIndex) * 100}%)` }} onMouseDown={e => e.preventDefault()} onClick={() => nested ? goBack() : selectCategory(i)}>
            <Icon name={name}/><span>{t[name]}</span>
          </button>)}
        </div>
        {settingGroup && <SettingsParent group={settingGroup} siblings={ancestors.at(-2)?.children ?? tree}
          backLabel={`${t.back} · ${breadcrumb.join(' › ')}`} goBack={goBack} />}
        {palettePicker && <span className="xmb-picker-name">{settingGroup.title}</span>}
        {album && <MediaParents albums={albums} index={albums.indexOf(album)} back={goBack} backLabel={`${t.back} · ${album.title}`} />}
        {activeFolder && <button className="xmb-breadcrumb" tabIndex={-1} aria-label={`${t.back} · ${breadcrumb.join(' › ')}`}
          onMouseDown={e => e.preventDefault()} onClick={goBack}><span aria-hidden="true">‹</span>{breadcrumb.join(' › ')}</button>}
        <div key={selectionKey} className="xmb-items" role="listbox" aria-label={nested ? breadcrumb.at(-1) : t[category]} aria-activedescendant={`xmb-item-${selected?.id}`}>
          {items.slice(firstRow, palettePicker ? items.length : index + (album || gameGallery ? 4 : 8)).map((item, offset) => {
            const itemIndex = firstRow + offset;
            const delta = itemIndex - index;
            // At the top level the previous row clears the category rail. In settings
            // the rail recedes and the rows sit equally far above and below the cursor.
            const y = offsetY(delta, itemIndex);
            return <button key={`${selectionKey}/${item.id}`} id={`xmb-item-${item.id}`} role="option" aria-selected={delta === 0} tabIndex={-1}
              className={`xmb-item ${delta === 0 ? 'selected' : ''} ${item.game || item.media ? 'has-art' : ''}`} aria-hidden={!palettePicker && (delta < (settingGroup ? -5 : -2) || delta > 6) || undefined}
              style={{ transform: `translateY(${y}cqh)` }}
              onMouseDown={e => e.preventDefault()} onClick={() => delta === 0 ? openItem(item) : selectItem(itemIndex)}
              onContextMenu={e => {
                e.preventDefault();
                if (!canShowOptions(item)) return;
                if (itemIndex !== index) remember(selectionKey, item.id);
                openMenu(item);
              }}>
              <span className="xmb-item-art">{palettePicker ? <i className={`xmb-swatch swatch-${item.id}`} /> : settingGroup ? <SettingMark /> : <Artwork item={item}/>}</span>
              {settingGroup
                ? <SettingLabel item={item} appliedLabel={t.applied} help={delta === 0 ? item.description ?? settingGroup.description : undefined} />
                : <span className="xmb-item-copy"><span className="xmb-title">{item.title}</span>{item.subtitle && <span className="xmb-subtitle">{item.subtitle}</span>}
                    {item.media && <span className="xmb-media-type">{item.media.format}</span>}</span>}
            </button>;
          })}
        </div>
        </div>
        {folderError && category === 'game' && settings.groupByFolders && !activeFolder && <div className="xmb-collections-notice" role="status">{t.folderUnavailable}</div>}
        {!menuItem && <div className="xmb-legend" onMouseDown={e => e.preventDefault()}>
          <button tabIndex={-1} onClick={() => command('confirm')}><Glyph action="confirm" glyphs={settings.glyphs} />{t.enter}</button>
          {nested && <button tabIndex={-1} onClick={() => command('back')}><Glyph action="back" glyphs={settings.glyphs} />{t.back}</button>}
          {selected?.game && <button tabIndex={-1} onClick={() => command('details')}><Glyph action="details" glyphs={settings.glyphs} />{t.details}</button>}
          {canShowOptions(selected) && <button tabIndex={-1} onClick={() => command('menu')}><Glyph action="menu" glyphs={settings.glyphs} />{t.menu}</button>}
        </div>}
        {message && <div className="xmb-message" role="status">{message}</div>}
        <div className="xmb-live" aria-live="polite">{t[category]}: {selected?.title}</div>
      </div>
      {viewerFile && mediaKind && media.library && <MediaViewer ref={viewer} key={viewerFile.id} file={viewerFile} kind={mediaKind} base={media.library.base}
        language={settings.language} previous={index > 0} next={index + 1 < items.length} step={delta => selectItem(index + delta)}
        close={() => { playSound('back', settings.sounds); setViewing(false); root.current?.querySelector<HTMLElement>('.xmb-input')?.focus({ preventScroll: true }); }} />}
      {menuItem && <ItemMenu item={menuItem} options={options} index={activeMenuIndex} activate={activateMenu} close={closeMenu} language={settings.language} glyphs={settings.glyphs} />}
    </InputSurface>
  </div>;
}
