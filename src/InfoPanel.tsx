import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { Glyph } from './Glyph';
import { words, type Glyphs, type Language, type PanelData } from './model';

/**
 * An XMB side panel (profile, game information, downloads…): the same smoked-glass frame as
 * the Options (△) menu, with a header, information rows and a list of actions.
 */
export function InfoPanel({ panel, index, activate, close, language, glyphs }: {
  panel: PanelData; index: number; activate: (index: number) => void; close: () => void; language: Language; glyphs: Glyphs;
}) {
  const t = words[language];
  const list = useRef<HTMLDivElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [panel.image]);
  useEffect(() => {
    const row = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const container = list.current;
    if (!row || !container) return;
    if (row.offsetTop < container.scrollTop) container.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > container.scrollTop + container.clientHeight) container.scrollTop = row.offsetTop + row.offsetHeight - container.clientHeight;
  }, [index]);
  const action = panel.actions[index];
  return <>
    <div className="xmb-menu-shade" onMouseDown={e => e.preventDefault()} onClick={close} />
    <div className="xmb-menu-frame xmb-panel-frame">
      <section className={`xmb-menu xmb-panel xmb-panel-${panel.kind}`} role="dialog" aria-modal="true" aria-label={panel.title} onMouseDown={e => e.preventDefault()}>
        <header className="xmb-panel-head">
          {panel.image && !imageFailed
            ? <img className={`xmb-panel-image${panel.round ? ' round' : ''}`} src={panel.image} alt="" draggable={false} onError={() => setImageFailed(true)} />
            : <span className="xmb-panel-icon"><Icon name={panel.icon} /></span>}
          <div className="xmb-panel-heading">
            <h2 title={panel.title}>{panel.title}</h2>
            {panel.subtitle && <p>{panel.subtitle}</p>}
          </div>
        </header>
        {panel.rows.length > 0 && <dl className="xmb-panel-rows">
          {panel.rows.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
        </dl>}
        {panel.actions.length > 0 && <div ref={list} className="xmb-menu-list" role="listbox" aria-label={t.menu} aria-activedescendant={action ? `xmb-panel-${action.id}` : undefined}>
          {panel.actions.map((option, i) => <button key={option.id} id={`xmb-panel-${option.id}`} tabIndex={-1} role="option" aria-selected={i === index}
            className={`xmb-menu-row ${i === index ? 'selected' : ''}`} onClick={() => activate(i)}>
            <span className="xmb-menu-icon"><Icon name={option.icon} /></span>
            <span className="xmb-menu-label">{option.title}</span>
            {option.checked && <span className="xmb-menu-value" aria-label={t.applied}>✓</span>}
          </button>)}
        </div>}
        {action?.description && <p className="xmb-menu-description">{action.description}</p>}
        <div className="xmb-menu-hint">
          {panel.actions.length > 0 && <button tabIndex={-1} onClick={() => activate(index)}><Glyph action="confirm" glyphs={glyphs} /> {t.enter}</button>}
          <button tabIndex={-1} onClick={close}><Glyph action="back" glyphs={glyphs} /> {t.back}</button>
        </div>
      </section>
    </div>
  </>;
}
