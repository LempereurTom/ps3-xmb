import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Xmb } from '../src/Xmb';
import { IconPreview } from './IconPreview';
import { cleanSettings, DEFAULT_SETTINGS, type Game, type Platform, type Settings } from '../src/model';

const fixtures: Game[] = [
  [620, 'Portal 2'], [367520, 'Hollow Knight'], [413150, 'Stardew Valley'], [1145360, 'Hades'], [250900, 'The Binding of Isaac: Rebirth'], [400, 'Portal'],
].map(([id, name], i) => ({ id: Number(id), name: String(name), installed: true, shortcut: false, lastPlayed: 1731600000 - i * 86400,
  artwork: [`https://shared.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`],
  backgrounds: [`https://shared.steamstatic.com/store_item_assets/steam/apps/${id}/library_hero.jpg`],
}));

function Preview() {
  const [settings, setSettings] = useState<Settings>(() => {
    try { return cleanSettings(JSON.parse(localStorage.getItem('ps3-xmb-preview') ?? 'null')); } catch { return DEFAULT_SETTINGS; }
  });
  const [action, setAction] = useState('');
  const [uninstall, setUninstall] = useState<Game | null>(null);
  const platform = useMemo<Platform>(() => ({
    games: async () => {
      const mode = new URLSearchParams(location.search).get('library');
      if (mode === 'error') throw new Error('Preview: Steam library unavailable');
      if (mode === 'actions') return fixtures.slice(0, 3).map((game, i) => ({ ...game, installed: i !== 1, shortcut: i === 2 }));
      return mode === 'empty' ? [] : fixtures;
    },
    status: async () => ({ battery: new URLSearchParams(location.search).has('desktop') ? null : 82, charging: false, pc: true }),
    user: () => 'Joueur',
    backgrounds: async id => fixtures.find(game => game.id === id)?.backgrounds ?? [],
    media: kind => (window as Window & { previewMedia?: Platform['media'] }).previewMedia?.(kind) ?? Promise.resolve({ albums: [], base: '' }),
    folders: async () => new URLSearchParams(location.search).get('library') === 'empty' ? [] : [
      { id: 'favorites', name: 'Favorites', gameIds: [620, 367520] },
      { id: 'empty', name: 'Empty collection', gameIds: [] },
    ],
    launch: game => setAction(`Preview: launch ${game.name}`),
    details: game => setAction(`Preview: Steam details for ${game.name}`),
    gameAction: (game, command) => {
      if (command === 'uninstall') setUninstall(game);
      else setAction(`Preview: ${command} ${game.name}`);
    },
    navigate: route => setAction(`Preview: open Steam ${route}`),
  }), []);
  const update = (next: Partial<Settings>) => setSettings(s => {
    const value = cleanSettings({ ...s, ...next }); localStorage.setItem('ps3-xmb-preview', JSON.stringify(value)); return value;
  });
  return <>
    <Xmb settings={settings} updateSettings={update} platform={platform} />
    {uninstall && <div role="dialog" aria-modal="true" aria-label="Steam uninstall confirmation (preview)" style={{ position: 'fixed', inset: '25% 15%', padding: 32, color: 'white', background: '#16212fee', font: '20px sans-serif', zIndex: 10 }}>
      <p>Uninstall {uninstall.name}?</p><p>Preview only — no game files will be changed.</p>
      <button onClick={() => setUninstall(null)}>Cancel</button>
      <button onClick={() => { setAction(`Preview: uninstall ${uninstall.name}`); setUninstall(null); }} style={{ marginLeft: 24 }}>Uninstall</button>
    </div>}
    {action && <div role="dialog" aria-label="Preview action" style={{ position: 'fixed', bottom: 75, left: '50%', transform: 'translateX(-50%)', padding: '18px 24px', color: 'white', background: '#061943ee', border: '1px solid #ffffff66', font: '16px Arial', zIndex: 5 }}>
      <span>{action}</span><button onClick={() => setAction('')} style={{ marginLeft: 20 }}>Close</button>
    </div>}
  </>;
}
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).has('icons') ? <IconPreview/> : <Preview/>);
