import { Icon } from './Icons';
import type { Item } from './model';
import type { SettingNode } from './preferences';

export function SettingMark() {
  return <svg className="xmb-setting-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" fillRule="evenodd" d="M12 1a11 11 0 1 1 0 22 11 11 0 1 1 0-22Zm4.5 4.4a4.7 4.7 0 0 0-6.3 5.7l-5.5 5.5a1.7 1.7 0 0 0 2.4 2.4l5.5-5.5a4.7 4.7 0 0 0 5.7-6.3l-3 3-2.3-.6-.6-2.2z"/>
  </svg>;
}

export function SettingsParent({ group, siblings, backLabel, goBack }: {
  group: SettingNode; siblings: SettingNode[]; backLabel: string; goBack: () => void;
}) {
  const index = siblings.findIndex(node => node.id === group.id);
  return <>
    <div className="xmb-setting-siblings" aria-hidden="true">
      {siblings.map((node, i) => {
        const delta = i - index;
        if (!delta) return null;
        const y = delta < 0 ? 13 + (delta + 1) * 7.4 : 60 + (delta - 1) * 7.4;
        return <span key={node.id} style={{ top: `${y}%` }}><Icon name={node.icon} /></span>;
      })}
    </div>
    <button className="xmb-setting-parent" tabIndex={-1} title={group.title} aria-label={backLabel}
      onMouseDown={e => e.preventDefault()} onClick={goBack}>
      <span className="xmb-parent-icon"><Icon name={group.icon} />{group.icon !== 'theme' && group.icon !== 'system' && <SettingMark />}</span>
      <span className="xmb-parent-arrow" aria-hidden="true">◂</span>
    </button>
  </>;
}

export function SettingLabel({ item, help, appliedLabel }: { item: Item; help?: string; appliedLabel: string }) {
  return <span className="xmb-item-copy">
    <span className="xmb-title">{item.title}</span>
    {item.opensLevel && item.subtitle && <span className="xmb-setting-value">{item.subtitle}</span>}
    {item.checked && <span className="xmb-setting-value xmb-applied" aria-label={appliedLabel}>✓</span>}
    {help && <span className="xmb-setting-help">{help}</span>}
  </span>;
}
