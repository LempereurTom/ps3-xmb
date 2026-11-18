import { Icon } from '../src/Icons';
import { cleanSettings, PALETTES, words, type IconName } from '../src/model';
import { XMB_CSS } from '../src/styles';

const ICONS: IconName[] = ['settings', 'system', 'photo', 'music', 'video', 'game', 'network', 'store', 'friends', 'folder', 'memory', 'theme', 'clock', 'sound', 'display', 'download', 'info', 'play', 'delete', 'profile'];
const SIZES = [72, 32, 23];
const PREVIEW_CSS = `
.icon-preview { padding:24px 30px; }
.icon-preview-header { position:relative; display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px; }
.icon-preview-header h1 { margin:0; font-size:25px; font-weight:300; }
.icon-preview-header p { margin:0; font-size:15px; opacity:.8; }
.icon-preview-palettes { position:relative; display:flex; flex-wrap:wrap; gap:8px 17px; margin-bottom:19px; font-size:13px; }
.icon-preview-palettes a { color:inherit; opacity:.6; text-decoration:none; }
.icon-preview-palettes a[aria-current=page] { opacity:1; text-decoration:underline; text-underline-offset:4px; }
.icon-preview-grid { position:relative; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; }
.icon-preview-cell { padding:12px 15px 11px; border:1px solid #ffffff25; background:#08101a19; min-width:0; }
.icon-preview-cell h2 { margin:0 0 8px; font-size:15px; font-weight:400; letter-spacing:.3px; }
.icon-preview-samples { display:flex; align-items:center; justify-content:space-between; height:91px; gap:9px; }
.icon-preview-sample { display:flex; flex-direction:column; align-items:center; gap:7px; }
.icon-preview-sample small { font-size:11px; line-height:1; opacity:.6; }
.icon-preview-svg { display:block; flex-shrink:0; }
@media(max-width:900px) { .icon-preview-grid { grid-template-columns:repeat(4,minmax(0,1fr)); } .icon-preview { overflow:auto; } }
`;

/** Development-only contact sheet; never imported by the Decky entry point. */
export function IconPreview() {
  const palette = cleanSettings({ palette: new URLSearchParams(location.search).get('palette') }).palette;
  return <main className={`xmb-root xmb-${palette} icon-preview`}>
    <style>{XMB_CSS}{PREVIEW_CSS}</style>
    <div className="xmb-background"><div className="xmb-light" /></div>
    <header className="icon-preview-header"><h1>PS3 XMB · Icon sheet</h1><p>{words.en[palette]} · 72 / 32 / 23 px</p></header>
    <nav className="icon-preview-palettes" aria-label="Palette">
      {PALETTES.map(name => <a key={name} href={`?icons&palette=${name}`} aria-current={name === palette ? 'page' : undefined}>{words.en[name]}</a>)}
    </nav>
    <div className="icon-preview-grid">
      {ICONS.map(name => <section className="icon-preview-cell" data-name={name} key={name}>
        <h2>{name}</h2>
        <div className="icon-preview-samples">
          {SIZES.map(size => <div className="icon-preview-sample" data-size={size} key={size}>
            <span className="icon-preview-svg" style={{ width:size, height:size }}><Icon name={name} /></span><small>{size}</small>
          </div>)}
        </div>
      </section>)}
    </div>
  </main>;
}
