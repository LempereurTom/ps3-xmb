import { useEffect, useRef } from 'react';
import { Icon } from './Icons';
import { Glyph } from './Glyph';
import { words, type GameAction, type Glyphs, type IconName, type Item, type Language, type Platform } from './model';

interface MenuOption { id: string; title: string; icon: IconName; description?: string; perform: () => void | Promise<void> }

export function itemOptions(item: Item, platform: Platform, language: Language): MenuOption[] {
  const t = words[language];
  const game = item.game;
  if (!game) return [{ id: 'open', title: t.open, icon: item.icon, description: item.description ?? item.subtitle, perform: item.action }];
  const options: MenuOption[] = [];
  const action = (id: GameAction, title: string, icon: IconName, description: string): MenuOption => ({
    id, title, icon, description, perform: () => platform.gameAction!(game, id),
  });
  if (game.installed || game.shortcut) options.push({ id: 'play', title: t.play, icon: 'play', description: t.playHelp, perform: () => platform.launch(game) });
  else if (platform.gameAction) options.push(action('install', t.install, 'download', t.installHelp));
  if (platform.gameAction) {
    if (!game.shortcut) options.push(action('downloads', t.downloads, 'download', t.downloadsHelp));
    options.push(action('properties', t.properties, 'settings', t.propertiesHelp), action('controller', t.controller, 'game', t.controllerHelp));
  }
  options.push({ id: 'details', title: t.details, icon: 'info', description: t.detailsHelp, perform: () => platform.details(game) });
  if (platform.gameAction && game.installed && !game.shortcut) options.push(action('uninstall', t.uninstall, 'delete', t.uninstallHelp));
  return options;
}

export function ItemMenu({ item, options, index, activate, close, language, glyphs }: {
  item: Item; options: MenuOption[]; index: number; activate: (index: number) => void; close: () => void; language: Language; glyphs: Glyphs;
}) {
  const list = useRef<HTMLDivElement>(null);
  const t = words[language];
  useEffect(() => {
    const container = list.current;
    const row = container?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!container || !row) return;
    // scrollIntoView can scroll the whole XMB during the slide-in animation.
    if (row.offsetTop < container.scrollTop) container.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > container.scrollTop + container.clientHeight) container.scrollTop = row.offsetTop + row.offsetHeight - container.clientHeight;
  }, [index]);
  return <>
    <div className="xmb-menu-shade" onMouseDown={e => e.preventDefault()} onClick={close} />
    <div className="xmb-menu-frame"><section className="xmb-menu xmb-menu-context" role="dialog" aria-modal="true" aria-label={item.title} onMouseDown={e => e.preventDefault()}>
      <div className="xmb-menu-kind">{item.game ? t.gameOptions : t.menu}</div>
      <h2 className="xmb-menu-title" title={item.title}><Icon name={item.icon} /><span>{item.title}</span></h2>
      <div ref={list} className="xmb-menu-list" role="listbox" aria-label={t.menu} aria-activedescendant={`xmb-action-${options[index].id}`}>
        {options.map((option, i) => <button key={option.id} id={`xmb-action-${option.id}`} tabIndex={-1} role="option" aria-selected={i === index}
          className={`xmb-menu-row ${i === index ? 'selected' : ''}`} onClick={() => activate(i)}>
          <span className="xmb-menu-icon"><Icon name={option.icon} /></span><span className="xmb-menu-label">{option.title}</span>
        </button>)}
      </div>
      {options[index].description && <p className="xmb-menu-description">{options[index].description}</p>}
      <div className="xmb-menu-hint"><button tabIndex={-1} onClick={() => activate(index)}><Glyph action="confirm" glyphs={glyphs} /> {t.enter}</button>
        <button tabIndex={-1} onClick={close}><Glyph action="back" glyphs={glyphs} /> {t.back}</button></div>
    </section></div>
  </>;
}
