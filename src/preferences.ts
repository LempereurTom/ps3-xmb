import { PALETTES, words, type IconName, type Settings } from './model';

export interface SettingNode {
  id: string;
  title: string;
  icon: IconName;
  subtitle?: string;
  description?: string;
  children?: SettingNode[];
  current?: string;
  value?: Partial<Settings>;
  destination?: string;
}

export function preferenceTree(settings: Settings): SettingNode[] {
  const t = words[settings.language];
  function choice<K extends keyof Settings>(key: K, title: string, icon: IconName, description: string, values: ReadonlyArray<readonly [Settings[K], string]>): SettingNode {
    return {
      id: key, title, icon, description, current: String(settings[key]),
      subtitle: values.find(([value]) => value === settings[key])?.[1],
      children: values.map(([value, label]) => ({ id: String(value), title: label, icon, value: { [key]: value } })),
    };
  }
  const toggle = [[true, t.on], [false, t.off]] as const;
  return [
    { id: 'system', title: t.system, icon: 'system', children: [
      choice('language', t.language, 'network', t.languageHelp, [['fr', 'Français'], ['en', 'English'], ['ru', 'Русский']]),
      choice('glyphs', t.glyphs, 'game', t.glyphsHelp, [['playstation', t.playstation], ['xbox', t.xbox]]),
      { id: 'date', title: t.date, description: t.dateHelp, icon: 'clock', destination: 'settings' },
      { id: 'display', title: t.display, description: t.displayHelp, icon: 'display', destination: 'display' },
      { id: 'steam', title: t.steamSettings, description: t.steamSettingsHelp, icon: 'system', destination: 'settings' },
      { id: 'restore', title: t.restore, description: t.restoreHelp, icon: 'display', destination: 'home', value: { enabled: false } },
    ] },
    { id: 'theme', title: t.theme, icon: 'theme', children: [
      choice('palette', t.colour, 'theme', t.themeHelp, PALETTES.map(palette => [palette, t[palette]])),
      choice('panels', t.panels, 'theme', t.panelsHelp, [['glass', t.glass], ['classic', t.classic]]),
      choice('accent', t.accent, 'theme', t.accentHelp, [['game', t.accentGame], ['ps3', t.accentPs3]]),
      choice('gameBackground', t.background, 'photo', t.backgroundHelp, toggle),
      choice('motion', t.animation, 'theme', t.motionHelp, toggle),
    ] },
    { id: 'sound', title: t.sound, icon: 'sound', children: [choice('sounds', t.keyTone, 'sound', t.soundHelp, toggle)] },
    { id: 'games', title: t.gameSettings, icon: 'game', children: [
      choice('groupByFolders', t.libraryView, 'folder', t.viewHelp, [[true, t.folders], [false, t.list]]),
      choice('installedOnly', t.filter, 'game', t.filterHelp, [[true, t.installed], [false, t.all]]),
      choice('recentCount', t.recentCount, 'clock', t.recentCountHelp, [[5, '5'], [10, '10'], [20, '20']]),
    ] },
  ];
}

export function settingAncestors(tree: SettingNode[], path: string[]) {
  const ancestors: SettingNode[] = [];
  let level = tree;
  for (const id of path) {
    const group = level.find(node => node.id === id);
    if (!group?.children) break;
    ancestors.push(group);
    level = group.children;
  }
  return ancestors;
}
