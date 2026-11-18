export type IconName = 'users' | 'settings' | 'system' | 'photo' | 'music' | 'video' | 'game' | 'network' | 'steam' | 'store' | 'friends' | 'folder' | 'memory' | 'theme' | 'clock' | 'sound' | 'display' | 'download' | 'info' | 'play' | 'delete' | 'profile' | 'power' | 'exit' | 'browser';
export type Category = 'users' | 'settings' | 'photo' | 'music' | 'video' | 'game' | 'network' | 'steam' | 'friends';
export type Command = 'left' | 'right' | 'up' | 'down' | 'confirm' | 'back' | 'details' | 'menu';
export const LANGUAGES = ['fr', 'en', 'ru'] as const;
export type Language = typeof LANGUAGES[number];
/** PS3 "Original" follows the calendar month; the others are the fixed PS3 colours. */
export const PALETTES = ['original', 'silver', 'gold', 'lime', 'pink', 'green', 'purple', 'teal', 'sky', 'blue', 'violet', 'brown', 'red', 'black'] as const;
export type Palette = typeof PALETTES[number];
export const MONTH_PALETTES: Palette[] = ['silver', 'gold', 'lime', 'pink', 'green', 'purple', 'teal', 'sky', 'blue', 'violet', 'brown', 'red'];
export const GLYPHS = ['playstation', 'xbox'] as const;
export type Glyphs = typeof GLYPHS[number];
/** Glass Dusk smoked-glass panels, or the PS3's own dark panels. */
export const PANELS = ['glass', 'classic'] as const;
export type Panels = typeof PANELS[number];
/** Accent from the selected game's art (Glass Dusk) or the PS3 theme colour. */
export const ACCENTS = ['game', 'ps3'] as const;
export type Accent = typeof ACCENTS[number];

export interface Settings {
  enabled: boolean;
  palette: Palette;
  language: Language;
  glyphs: Glyphs;
  panels: Panels;
  accent: Accent;
  sounds: boolean;
  motion: boolean;
  installedOnly: boolean;
  gameBackground: boolean;
  groupByFolders: boolean;
}
export const DEFAULT_SETTINGS: Settings = { enabled: false, palette: 'original', language: 'fr', glyphs: 'playstation', panels: 'glass', accent: 'game', sounds: true, motion: true, installedOnly: true, gameBackground: true, groupByFolders: true };

export interface Game {
  id: number;
  name: string;
  installed: boolean;
  shortcut: boolean;
  lastPlayed: number;
  artwork: string[];
  backgrounds?: string[];
  gameId?: string;
}
export interface GameFolder { id: string; name: string; gameIds: number[] }
export type MediaKind = 'photo' | 'video';
/** url/thumb: direct addresses (Steam screenshots in the Millennium version); otherwise served by the Decky media worker. */
export interface MediaFile { id: string; title: string; time: number; format: string; url?: string; thumb?: string }
export interface MediaAlbum { id: string; name: string; source: 'pictures' | 'screenshots' | 'videos' | 'recordings'; appId: string; entries: MediaFile[] }
export interface MediaLibrary { base: string; albums: MediaAlbum[] }
export type GameAction = 'install' | 'uninstall' | 'properties' | 'controller' | 'downloads';
export interface Status { battery: number | null; charging: boolean; pc?: boolean }
export interface Platform {
  games: () => Promise<Game[]>;
  backgrounds?: (appId: number) => Promise<string[]>;
  folders?: () => Promise<GameFolder[]>;
  media: (kind: MediaKind) => Promise<MediaLibrary>;
  status: () => Promise<Status>;
  launch: (game: Game) => void | Promise<void>;
  details: (game: Game) => void;
  gameAction?: (game: Game, action: GameAction) => void | Promise<void>;
  navigate: (destination: string) => void;
  user?: () => string | undefined;
  report?: (event: string, value: string | number) => void;
}
export interface Item { id: string; title: string; subtitle?: string; description?: string; icon: IconName; artwork?: string[]; game?: Game; media?: MediaFile; opensLevel?: boolean; checked?: boolean; action: () => void }

export const CATEGORIES: Category[] = ['users', 'settings', 'photo', 'music', 'video', 'game', 'network', 'steam', 'friends'];
export const HOME_CATEGORY = CATEGORIES.indexOf('game');

export function cleanSettings(value: unknown): Settings {
  const s = (value && typeof value === 'object' ? value : {}) as Partial<Settings>;
  return {
    enabled: typeof s.enabled === 'boolean' ? s.enabled : DEFAULT_SETTINGS.enabled,
    palette: PALETTES.includes(s.palette as Palette) ? s.palette! : DEFAULT_SETTINGS.palette,
    language: LANGUAGES.includes(s.language as Language) ? s.language! : DEFAULT_SETTINGS.language,
    glyphs: GLYPHS.includes(s.glyphs as Glyphs) ? s.glyphs! : DEFAULT_SETTINGS.glyphs,
    panels: PANELS.includes(s.panels as Panels) ? s.panels! : DEFAULT_SETTINGS.panels,
    accent: ACCENTS.includes(s.accent as Accent) ? s.accent! : DEFAULT_SETTINGS.accent,
    sounds: typeof s.sounds === 'boolean' ? s.sounds : DEFAULT_SETTINGS.sounds,
    motion: typeof s.motion === 'boolean' ? s.motion : DEFAULT_SETTINGS.motion,
    installedOnly: typeof s.installedOnly === 'boolean' ? s.installedOnly : DEFAULT_SETTINGS.installedOnly,
    gameBackground: typeof s.gameBackground === 'boolean' ? s.gameBackground : DEFAULT_SETTINGS.gameBackground,
    groupByFolders: typeof s.groupByFolders === 'boolean' ? s.groupByFolders : DEFAULT_SETTINGS.groupByFolders,
  };
}

export function visibleGames(games: Game[], installedOnly: boolean): Game[] {
  const unique = new Map(games.filter(g => g.id > 0 && g.name && (!installedOnly || g.installed || g.shortcut)).map(g => [g.id, g]));
  return [...unique.values()].sort((a, b) => b.lastPlayed - a.lastPlayed || a.name.localeCompare(b.name));
}

export function clampSelection(index: number, count: number): number { return Math.max(0, Math.min(index, Math.max(0, count - 1))); }

export { words } from './i18n';
