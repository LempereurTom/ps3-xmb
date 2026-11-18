import { XMB_FONT_CSS } from './fonts/nunito';

/*
 * PS3 XMB look: month/time-tinted gradient, a glowing ribbon wave, white glossy
 * icons with a soft halo, a pulsing highlight on the selected row, the PS3
 * clock in the top-right corner and the translucent Options (△) side panel.
 * Layout rules are shared with the original PSP XMB plugin.
 */
export const XMB_CSS = XMB_FONT_CSS + String.raw`
/* Steam's search/status bar is a sibling of the route. Its overlay windows have their own chrome. */
#GamepadUI_Full_Root:has(> #Main .xmb-root) > #header { display:none; }
#MainNavMenu-Rest:has(.xmb-input:focus-within) > #Footer { visibility:hidden; pointer-events:none; }
.xmb-root { position:fixed; inset:0; overflow:hidden; color:#fff; background:#123; font-family:"XMB Humanist","Segoe UI","Trebuchet MS",sans-serif; font-weight:300; font-synthesis:none; -webkit-font-smoothing:antialiased; isolation:isolate; --xmb-text-shadow:0 0 6px #0006,1px 1px 2px #0008; --xmb-glow:0 0 8px #ffffffb0; }
.xmb-root,.xmb-root * { box-sizing:border-box; }
.xmb-root button { appearance:none; margin:0; padding:0; border:0; border-radius:0; background:none; color:inherit; font:inherit; text-align:left; cursor:pointer; outline:none; }
.xmb-root button:focus-visible { outline:1px solid #ffffffe0; outline-offset:5px; }

/* ---------- Background: PS3 colours (Original = colour of the month) ---------- */
.xmb-background { position:absolute; inset:0; overflow:hidden; z-index:-1;
  background:
    radial-gradient(ellipse 85% 55% at 50% 58%, var(--ps3-light) 0%, transparent 70%),
    linear-gradient(180deg, var(--ps3-dark) 0%, var(--ps3-mid) 46%, var(--ps3-mid) 62%, var(--ps3-dark) 100%);
  transition:background 1.5s ease; }
.xmb-light { position:absolute; inset:0; background:radial-gradient(ellipse 60% 40% at 18% 12%, #ffffff1c, transparent 70%); }
.xmb-wave-canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
/* With game backgrounds off, the selected game's colour lies softly in the sky (opacity only:
   the gradient itself never changes while the cursor moves). */
.xmb-tint { position:absolute; inset:0; overflow:hidden; opacity:0; transition:opacity 1.4s ease; }
.xmb-tint.on { opacity:.5; }
.xmb-blob { position:absolute; aspect-ratio:1; border-radius:50%; transform:translate(-50%,-50%); will-change:transform;
  background:radial-gradient(closest-side,color-mix(in srgb,var(--blob) var(--blob-strength,60%),transparent),transparent);
  transition:width 1.4s ease,left 1.4s ease,top 1.4s ease; }
.xmb-blob-0 { animation:xmb-drift-0 34s ease-in-out infinite alternate; }
.xmb-blob-1 { animation:xmb-drift-1 41s ease-in-out infinite alternate; }
.xmb-blob-2 { animation:xmb-drift-2 29s ease-in-out infinite alternate; }
.xmb-blob-3 { animation:xmb-drift-3 47s ease-in-out infinite alternate; }
@keyframes xmb-drift-0 { from { transform:translate(-50%,-50%) scale(1); } to { transform:translate(-62%,-44%) scale(1.12); } }
@keyframes xmb-drift-1 { from { transform:translate(-50%,-50%) scale(1.08); } to { transform:translate(-36%,-60%) scale(.94); } }
@keyframes xmb-drift-2 { from { transform:translate(-50%,-50%) scale(.95); } to { transform:translate(-58%,-36%) scale(1.1); } }
@keyframes xmb-drift-3 { from { transform:translate(-50%,-50%) scale(1.05); } to { transform:translate(-40%,-58%) scale(.92); } }
.xmb-night { position:absolute; inset:0; background:#000814; opacity:calc(var(--xmb-night,0) * .42); transition:opacity 4s ease; pointer-events:none; }
.ps3-silver { --ps3-dark:#3b3f45; --ps3-mid:#8a9096; --ps3-light:#d9dde0; }
.ps3-gold   { --ps3-dark:#4a3a06; --ps3-mid:#a68b1d; --ps3-light:#f0dc7a; }
.ps3-lime   { --ps3-dark:#2a4708; --ps3-mid:#71a823; --ps3-light:#c9ec7c; }
.ps3-pink   { --ps3-dark:#5c1840; --ps3-mid:#c25596; --ps3-light:#f6b7d8; }
.ps3-green  { --ps3-dark:#08391a; --ps3-mid:#23843f; --ps3-light:#86d690; }
.ps3-purple { --ps3-dark:#311144; --ps3-mid:#7a3ca6; --ps3-light:#c99ae6; }
.ps3-teal   { --ps3-dark:#06393f; --ps3-mid:#16909a; --ps3-light:#7fe0e0; }
.ps3-sky    { --ps3-dark:#0f3d66; --ps3-mid:#3d8fd0; --ps3-light:#a6dcf7; }
.ps3-blue   { --ps3-dark:#05173f; --ps3-mid:#1b4ca8; --ps3-light:#6b9ae6; }
.ps3-violet { --ps3-dark:#1d0d42; --ps3-mid:#56309a; --ps3-light:#a68ade; }
.ps3-brown  { --ps3-dark:#2d1806; --ps3-mid:#7a4a1f; --ps3-light:#c49564; }
.ps3-red    { --ps3-dark:#3f0306; --ps3-mid:#a3161c; --ps3-light:#ee6a5e; }
.ps3-black  { --ps3-dark:#000; --ps3-mid:#111317; --ps3-light:#3a3e45; }

/* Game backdrop (PIC1). */
.xmb-backdrop { position:absolute; inset:0; z-index:0; overflow:hidden; pointer-events:none; opacity:0; transition:opacity 1.1s ease; }
.xmb-backdrop.visible { opacity:1; }
/* The game's picture is framed, not pasted: it melts into the PS3 sky at its edges (more so on
   the left, where the menu is) and drifts in a slow zoom. Transform only, so the compositor
   moves it; the wave behind it is paused meanwhile. */
.xmb-backdrop-image { display:block; width:100%; height:100%; object-fit:cover; object-position:center 35%; transform-origin:64% 42%;
  -webkit-mask-image:radial-gradient(ellipse 52% 62% at 63% 42%,#000 24%,rgba(0,0,0,.6) 54%,transparent 86%);
  mask-image:radial-gradient(ellipse 52% 62% at 63% 42%,#000 24%,rgba(0,0,0,.6) 54%,transparent 86%);
  animation:xmb-backdrop-in 1.4s cubic-bezier(.2,.7,.25,1) both,xmb-kenburns 46s ease-in-out 1.4s infinite alternate; }
@keyframes xmb-backdrop-in { from { transform:scale(1.12); filter:blur(6px); } to { transform:scale(1.04); filter:blur(0); } }
@keyframes xmb-kenburns { from { transform:scale(1.04) translate(0,0); } to { transform:scale(1.14) translate(-2.4%,1.6%); } }
.xmb-backdrop:after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,#0009 0%,#0005 40%,#0001 80%),linear-gradient(0deg,#0007,transparent 42%,#0003); }

.xmb-input { position:absolute; inset:0; z-index:1; outline:none !important; box-shadow:none !important; }
.xmb-stage { position:absolute; inset:0 auto auto 0; width:calc(100% / var(--xmb-scale)); height:calc(100% / var(--xmb-scale)); container-type:size; transform:scale(var(--xmb-scale)); transform-origin:top left; --xmb-axis:29.4%; --xmb-category-step:10.65%; }
.xmb-stage { --xmb-label-size:min(3.1cqw,5.6cqh); --xmb-detail-size:min(2cqw,3.6cqh); }
.xmb-browser { position:absolute; inset:0; touch-action:none; user-select:none; }
.xmb-collections-notice { position:absolute; left:282px; bottom:67px; max-width:560px; font-size:15px; opacity:.75; text-shadow:var(--xmb-text-shadow); }

/* ---------- PS3 clock (top right) ---------- */
.xmb-status { position:absolute; top:4.2cqh; right:0; display:flex; align-items:center; gap:14px; height:4.6cqh; padding:0 4.2cqw 0 1.6cqw; font-size:min(2.25cqw,4cqh); font-weight:400; letter-spacing:.4px; text-shadow:var(--xmb-text-shadow);
  border-radius:3cqh 0 0 3cqh; border:1px solid #ffffff66; border-right:0; background:linear-gradient(180deg,#ffffff24,#ffffff08 55%,#00000014); box-shadow:inset 0 1px 0 #ffffff40; }
.xmb-status:before { content:''; position:absolute; right:100%; top:50%; width:22cqw; height:1px; background:linear-gradient(90deg,transparent,#ffffff8c); }
.xmb-status time { font-variant-numeric:tabular-nums; }
.xmb-user-dot { width:1.4cqw; height:1.4cqw; border-radius:50%; background:radial-gradient(circle at 35% 30%,#fff,#bfe4ff 45%,#3d86c4); box-shadow:0 0 6px #fff8; }
.xmb-battery { position:relative; width:32px; height:15px; border:2px solid #fff; border-radius:3px; display:flex; gap:2px; padding:2px; box-shadow:0 1px 3px #0006; }
.xmb-battery:after { content:''; position:absolute; width:3px; height:7px; right:-5px; top:2px; background:#fff; border-radius:0 1px 1px 0; }
.xmb-battery i { flex:1; background:#fff; }
.xmb-battery.charging { filter:drop-shadow(0 0 3px #fff); }

/* ---------- Icons: white, glossy, soft halo ---------- */
.xmb-icon { display:block; width:100%; height:100%; overflow:visible; filter:drop-shadow(0 0 1.5px #ffffff60) drop-shadow(1px 2px 2px #0000004d); }
.xmb-category-rail { position:absolute; z-index:2; top:26.6%; left:0; width:100%; height:0; transition:transform 260ms ease; }
.xmb-root .xmb-category { position:absolute; top:-25px; left:var(--xmb-axis); width:var(--xmb-category-step); margin-left:calc(var(--xmb-category-step) / -2); height:70px; display:flex; align-items:center; flex-direction:column; opacity:.62; transition:transform 300ms cubic-bezier(.2,.7,.25,1),opacity 220ms ease; }
.xmb-category .xmb-icon { width:50px; height:50px; flex-shrink:0; transition:transform 260ms ease,filter 260ms ease; }
.xmb-root .xmb-category.selected { opacity:1; }
.xmb-category.selected .xmb-icon { transform:scale(1.3); filter:drop-shadow(0 0 6px #ffffffc0) drop-shadow(0 0 14px #ffffff60) drop-shadow(1px 3px 2px #0006); }
.xmb-category span { position:absolute; top:53px; font-size:14px; font-weight:400; white-space:nowrap; text-shadow:var(--xmb-text-shadow); opacity:0; transition:opacity 220ms ease; }
.xmb-category.selected span { opacity:1; }
.xmb-breadcrumb { position:absolute; z-index:2; top:26.6%; left:35.5%; transform:translateY(-50%); max-width:60%; display:flex; align-items:center; gap:10px; font-size:17px; line-height:1.3; opacity:.85; text-shadow:var(--xmb-text-shadow); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }

/* Rows pass behind the fixed band occupied by the categories. */
.xmb-items { position:absolute; inset:0; pointer-events:none; clip-path:polygon(0 0,100% 0,100% 17%,0 17%,0 38%,100% 38%,100% 100%,0 100%); }
.xmb-item { position:absolute; left:var(--xmb-axis); top:calc(46.6% - 20px); height:40px; width:67%; display:flex; align-items:center; pointer-events:auto; opacity:.7; transition:transform 260ms cubic-bezier(.2,.7,.25,1),opacity 200ms ease; }
.xmb-item.selected { opacity:1; }
.xmb-item-art { position:absolute; left:-23px; width:46px; height:44px; display:flex; align-items:center; justify-content:center; transition:transform 260ms ease-out; }
.xmb-item-art .xmb-icon { width:44px; height:44px; }
.xmb-item.selected .xmb-item-art { transform:scale(1.9); filter:drop-shadow(0 0 4px #ffffffa0); }
/* The PS3 "breathing" highlight: a halo behind the icon whose opacity pulses (compositor only,
   no repaint per frame — animating filter or box-shadow would repaint every frame). */
.xmb-item-art::after { content:''; position:absolute; inset:-22%; z-index:-1; border-radius:50%; pointer-events:none; opacity:0;
  background:radial-gradient(closest-side,color-mix(in srgb,var(--xmb-accent,#fff) 35%,#ffffffa0),transparent); }
.xmb-item.selected .xmb-item-art::after { animation:xmb-halo 2.4s ease-in-out infinite; }
.xmb-item.has-art .xmb-item-art::after,.xmb-settings-branch .xmb-item-art::after,.xmb-palette-picker .xmb-item-art::after { display:none; }
/* On the home level the rows are clipped where they pass behind the category band, and the
   halo of the selected row was cut there in a hard line. The highlight sits still on the PS3
   (the rows move under it), so here it is one fixed halo, outside the clipped rows. */
.xmb-home .xmb-item-art::after { display:none; }
.xmb-home:not(.xmb-game-gallery):not(.xmb-media-gallery)::before { content:''; position:absolute; left:var(--xmb-axis); top:50%; width:17cqw; height:17cqw;
  transform:translate(-50%,-50%); border-radius:50%; pointer-events:none; opacity:.3;
  background:radial-gradient(closest-side,color-mix(in srgb,var(--xmb-accent,#fff) 35%,#ffffffa0),transparent);
  animation:xmb-halo 2.4s ease-in-out infinite; }
.xmb-item.has-art .xmb-item-art { height:26px; overflow:hidden; background:#0006; box-shadow:0 1px 3px #0008; }
.xmb-item.has-art.selected .xmb-item-art { transform:scale(2.1); outline:1px solid #ffffffc0; }
.xmb-item-art img { width:100%; height:100%; object-fit:cover; }
/* Not installed: shown, as in Steam's library, but quieter (opening it offers to install). */
.xmb-item.not-installed .xmb-item-art img { filter:saturate(.35) brightness(.72); }
.xmb-item.not-installed:not(.selected) { opacity:.5; }
.xmb-item-copy { position:relative; display:block; min-width:0; flex:1; margin-left:6.1cqw; text-shadow:var(--xmb-text-shadow); }
.xmb-title,.xmb-subtitle { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.xmb-title { font-size:var(--xmb-label-size); line-height:1.25; }
.xmb-item.selected .xmb-title { font-weight:400; text-shadow:0 0 10px #ffffff70,var(--xmb-text-shadow); }
.xmb-subtitle { position:absolute; top:100%; left:0; width:100%; font-size:var(--xmb-detail-size); line-height:1.2; opacity:.8; }
.xmb-item:not(.selected) .xmb-subtitle { opacity:0; }

/* ---------- Button legend (PlayStation or Xbox glyphs) ---------- */
.xmb-legend { position:absolute; right:3.6cqw; bottom:3.2cqh; display:flex; gap:2.2cqw; font-size:min(1.6cqw,2.9cqh); opacity:.9; text-shadow:var(--xmb-text-shadow); }
.xmb-legend span,.xmb-legend button { display:flex; gap:.6cqw; align-items:center; }
.xmb-glyph { display:inline-flex; align-items:center; justify-content:center; width:1.15em; height:1.15em; flex:0 0 auto; border-radius:50%; font-size:1.25em; line-height:1; font-weight:700; font-style:normal; text-shadow:none;
  background:radial-gradient(circle at 35% 30%,#4b4f57,#16181c 70%); box-shadow:0 0 0 1px #ffffff55,0 1px 3px #0009; }
.xmb-glyph svg { width:62%; height:62%; display:block; }
.xmb-glyph.xbox { font-size:.82em; width:1.45em; height:1.45em; font-family:"Segoe UI",Arial,sans-serif; }
.xmb-glyph.menu { border-radius:3px; }
.xmb-legend button { min-height:32px; }
.xmb-root .xmb-category[hidden] { display:none; }
.xmb-nested .xmb-category-rail { transform:translateX(calc(-1 * var(--xmb-category-step))); }
.xmb-root .xmb-breadcrumb { padding:4px 0; }

/* ---------- Settings branches ---------- */
.xmb-settings-branch .xmb-category-rail { z-index:0; transform:translateX(-13.5%); pointer-events:none; }
.xmb-settings-branch .xmb-category { opacity:.12; }
.xmb-settings-branch .xmb-category.selected { opacity:.8; }
.xmb-settings-branch .xmb-category span { visibility:hidden; }
.xmb-setting-siblings { position:absolute; inset:0; pointer-events:none; }
.xmb-setting-siblings > span { position:absolute; left:23.4%; width:32px; height:32px; transform:translate(-50%,-50%); opacity:.22; }
.xmb-setting-parent { position:absolute; z-index:1; top:46.6%; left:calc(15.9% - 43px); width:calc(7.2% + 61px); height:86px; transform:translateY(-50%); }
.xmb-parent-icon { position:absolute; left:0; top:0; width:86px; height:86px; opacity:.9; }
.xmb-setting-mark { width:100%; height:100%; display:block; }
.xmb-parent-icon .xmb-setting-mark { position:absolute; top:4%; left:-6%; width:35%; height:35%; }
.xmb-parent-arrow { position:absolute; right:6px; top:50%; width:24px; transform:translateY(-50%); text-align:center; font-size:22px; line-height:1; }
.xmb-settings-branch .xmb-items { clip-path:inset(0); animation:xmb-level-in 220ms ease-out; }
.xmb-settings-branch .xmb-item { top:calc(46.6% - .6 * var(--xmb-label-size)); height:calc(1.2 * var(--xmb-label-size)); }
.xmb-settings-branch .xmb-item.selected { background:linear-gradient(90deg,transparent,#ffffff1f 6%,#ffffff12 70%,transparent); }
.xmb-settings-branch .xmb-item-art { width:15px; height:15px; left:-7.5px; }
.xmb-settings-branch .xmb-item.selected .xmb-item-art { transform:scale(1.65); }
.xmb-settings-branch .xmb-item-copy { display:grid; grid-template-columns:35.2cqw minmax(0,1fr); align-items:center; margin-left:3.1cqw; }
.xmb-settings-branch .xmb-title { padding-right:1cqw; }
.xmb-settings-branch .xmb-item-copy:not(:has(.xmb-setting-value)) .xmb-title { grid-column:1 / -1; }
.xmb-setting-value { font-size:var(--xmb-detail-size); line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.xmb-setting-help { position:absolute; left:0; top:100%; width:100%; font-size:var(--xmb-detail-size); line-height:1.2; opacity:.85; }

/* ---------- Home level geometry (bigger PS3 icons) ---------- */
.xmb-home { --xmb-axis:24%; --xmb-category-step:15.5%; }
.xmb-home .xmb-category-rail { top:25%; }
.xmb-home .xmb-category { top:-4.25cqw; height:14cqw; }
.xmb-home .xmb-category .xmb-icon { width:7.6cqw; height:7.6cqw; }
.xmb-home .xmb-category.selected .xmb-icon { transform:scale(1.32); }
.xmb-home .xmb-category span { top:9.4cqw; font-size:2.3cqw; }
.xmb-home .xmb-item { top:calc(50% - 4cqw); height:8cqw; width:72%; }
.xmb-home .xmb-item-art { left:-4.6cqw; width:9.2cqw; height:9.2cqw; }
.xmb-home .xmb-item-art .xmb-icon { width:100%; height:100%; }
.xmb-home .xmb-item.selected .xmb-item-art { transform:scale(1.25); }
.xmb-home .xmb-item-copy { margin-left:7.6cqw; }

/* ---------- Game list: PS3 shows the game icon (ICON0) beside its title ---------- */
.xmb-game-gallery .xmb-items,.xmb-media-gallery .xmb-items { clip-path:inset(0); }
/* Rows fade out above the button legend instead of running under it (a mask: drawn once by the
   compositor, nothing repaints while the list moves). */
.xmb-game-gallery .xmb-items,.xmb-media-gallery .xmb-items,.xmb-settings-branch .xmb-items {
  -webkit-mask-image:linear-gradient(to bottom,#000 0,#000 74%,transparent 89%); mask-image:linear-gradient(to bottom,#000 0,#000 74%,transparent 89%); }
.xmb-game-gallery.xmb-nested .xmb-category-rail { top:13%; transform:translateX(-23%); }
.xmb-game-gallery.xmb-nested .xmb-category span { display:none; }
.xmb-game-gallery .xmb-breadcrumb { top:13%; left:10.8%; max-width:76%; font-size:2.1cqw; }
.xmb-game-gallery.xmb-home .xmb-category-rail { top:12%; }
.xmb-game-gallery.xmb-home .xmb-category .xmb-icon { width:5.4cqw; height:5.4cqw; }
.xmb-game-gallery.xmb-home .xmb-category { top:-2.9cqw; height:8cqw; }
.xmb-game-gallery.xmb-home .xmb-category span { top:6.6cqw; font-size:1.7cqw; }
.xmb-game-gallery .xmb-item { left:18.6%; top:calc(50% - 4.5cqw); width:78%; height:9cqw; }
.xmb-game-gallery .xmb-item.has-art { opacity:.8; }
.xmb-game-gallery .xmb-item.selected { opacity:1; z-index:1; }
.xmb-game-gallery .xmb-item.has-art .xmb-item-art { --card-width:min(16cqw,29cqh); left:calc(var(--card-width) / -2); width:var(--card-width); height:auto; aspect-ratio:144/80;
  background:#000a; border:0; box-shadow:0 2px 6px #000a; border-radius:2px; }
.xmb-game-gallery .xmb-item.has-art .xmb-item-art .xmb-icon,.xmb-media-gallery .xmb-item-art .xmb-icon { width:44%; height:70%; }
.xmb-game-gallery .xmb-item.has-art.selected .xmb-item-art { transform:scale(1.8); outline:none; box-shadow:0 0 0 1px #ffffffd0,0 0 14px #ffffffa0,0 4px 10px #000c; }
.xmb-game-gallery .xmb-item-copy { margin-left:10cqw; transition:transform 260ms ease-out,opacity 200ms; }
.xmb-game-gallery .xmb-item.selected .xmb-item-copy { transform:translateX(7.3cqw); max-width:58cqw; }
.xmb-game-gallery .xmb-title { font-size:2.75cqw; }
.xmb-game-gallery .xmb-subtitle { font-size:1.85cqw; }

/* ---------- Photo / Video albums ---------- */
.xmb-media-gallery .xmb-category-rail { display:none; }
.xmb-album-rail { position:absolute; inset:0; pointer-events:none; }
.xmb-album-rail > span { position:absolute; left:9.7%; width:12cqw; height:12cqw; transform:translate(-50%,-50%); opacity:.42; }
.xmb-album-rail > span.selected { opacity:.96; }
.xmb-album-back { pointer-events:auto; position:absolute; left:0; top:50%; width:21.5%; height:16cqh; transform:translateY(-50%); text-align:right !important;
  padding-right:.8cqw !important; font-size:3cqw !important; text-shadow:0 0 5px white,1px 1px 3px #111; }
.xmb-media-gallery .xmb-item { left:30.4%; top:calc(50% - 4.3cqw); width:68.4%; height:8.6cqw; opacity:.7; }
.xmb-media-gallery .xmb-item.selected { opacity:1; }
.xmb-media-gallery .xmb-item.has-art .xmb-item-art { left:-7.5cqw; width:15cqw; height:auto; aspect-ratio:72/41; border-radius:2px; box-shadow:0 2px 5px #0009; background:#000a; }
.xmb-media-gallery .xmb-item.has-art.selected .xmb-item-art { transform:none; outline:1px solid #ffffffe0; box-shadow:0 0 12px #fffa,0 2px 5px #000a; }
.xmb-media-gallery .xmb-item-copy { margin-left:8.9cqw; margin-top:-1.8cqw; }
.xmb-media-gallery .xmb-title { font-size:3.1cqw; }
.xmb-media-gallery .xmb-subtitle { font-size:2.3cqw; padding-top:.35cqw; opacity:.85 !important; }
.xmb-media-gallery .xmb-item.selected .xmb-item-copy { border-bottom:1px solid #ffffffd9; }
.xmb-media-gallery .xmb-item:not(.selected) .xmb-item-copy { opacity:0; }
.xmb-media-type { position:absolute; right:0; top:calc(100% + .65cqw); background:#f1f3f6; color:#172036; text-shadow:none; font:bold 1.95cqw/1.1 Arial,sans-serif; padding:0 .48cqw; border-radius:.3cqw; }

/* ---------- Theme colour picker ---------- */
.xmb-picker-name { position:absolute; left:30%; top:46.6%; transform:translateY(-50%); font-size:var(--xmb-label-size); text-shadow:var(--xmb-text-shadow); }
.xmb-palette-picker .xmb-items { left:55%; background:linear-gradient(90deg,#00000000,#0000004d 8%,#00000066); }
.xmb-palette-picker .xmb-title { font-size:min(2.3cqw,4.3cqh); }
.xmb-palette-picker .xmb-item { top:-2.95cqh; height:5.9cqh; left:0; width:100%; padding:0 .8cqw; opacity:.8; }
.xmb-palette-picker .xmb-item.selected { opacity:1; background:linear-gradient(90deg,#ffffff33,#ffffff14); box-shadow:inset 0 1px 0 #ffffff70,inset 0 -1px 0 #ffffff70; }
.xmb-palette-picker .xmb-item .xmb-item-art,.xmb-palette-picker .xmb-item.selected .xmb-item-art { left:1cqw; width:3cqw; height:3cqw; transform:none; animation:none; }
.xmb-palette-picker .xmb-item-copy { margin-left:4.6cqw; grid-template-columns:minmax(0,1fr) auto; }
.xmb-palette-picker .xmb-applied { margin-right:1.4cqw; }
.xmb-palette-picker .xmb-setting-help { display:none; }
.xmb-swatch { display:block; width:100%; height:100%; border-radius:50%; border:1px solid #ffffffb0; box-shadow:0 1px 3px #0006; background:radial-gradient(circle at 35% 30%,#ffffff70,transparent 55%),var(--swatch); }
.swatch-original { --swatch:conic-gradient(#a3161c,#a68b1d,#71a823,#23843f,#16909a,#1b4ca8,#7a3ca6,#c25596,#a3161c); }
.swatch-silver { --swatch:#8a9096; } .swatch-gold { --swatch:#a68b1d; } .swatch-lime { --swatch:#71a823; } .swatch-pink { --swatch:#c25596; }
.swatch-green { --swatch:#23843f; } .swatch-purple { --swatch:#7a3ca6; } .swatch-teal { --swatch:#16909a; } .swatch-sky { --swatch:#3d8fd0; }
.swatch-blue { --swatch:#1b4ca8; } .swatch-violet { --swatch:#56309a; } .swatch-brown { --swatch:#7a4a1f; } .swatch-red { --swatch:#a3161c; } .swatch-black { --swatch:#111317; }

/* ---------- Full-screen media viewer ---------- */
.xmb-viewer { position:absolute; inset:0; z-index:8; overflow:hidden; background:#050608; color:white; font-size:clamp(14px,2.1vw,28px); user-select:none; }
.xmb-viewer-image,.xmb-viewer-image img,.xmb-viewer-image video { display:block; width:100%; height:100%; object-fit:contain; touch-action:none; }
.xmb-viewer-heading,.xmb-viewer-controls { position:absolute; left:0; right:0; display:flex; align-items:center; gap:1.4em; padding:1.2em 3.2vw; text-shadow:0 1px 4px #000; }
.xmb-viewer-heading { top:0; justify-content:space-between; background:linear-gradient(#000c,transparent); }
.xmb-viewer-heading span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.xmb-viewer-heading button { flex-shrink:0; }
.xmb-viewer-controls { bottom:0; justify-content:center; background:linear-gradient(transparent,#000d); font-variant-numeric:tabular-nums; }
.xmb-viewer-controls button,.xmb-viewer-heading button { min-height:40px; padding:.25em .4em; }
.xmb-viewer-controls button:disabled { opacity:.35; }
.xmb-viewer-controls input { width:50%; accent-color:#e4edf9; }
.xmb-viewer-error { position:absolute; top:48%; width:100%; text-align:center; }

/* ---------- Options panel (△) — PS3 slides a dark translucent panel in from the right ---------- */
.xmb-menu-shade { position:absolute; inset:0; z-index:5; background:#0000003a; animation:xmb-menu-shade-in 200ms ease-out; }
.xmb-menu-frame { position:absolute; z-index:6; top:0; right:0; width:400px; height:calc(100% / var(--xmb-scale)); transform:scale(var(--xmb-scale)); transform-origin:top right; }
.xmb-menu { position:absolute; inset:0; padding:70px 26px 30px 34px; background:linear-gradient(90deg,#00000000 0%,#000000a6 9%,#000000c4 40%,#000000d0); text-shadow:0 1px 2px #000a; animation:xmb-menu-in 240ms cubic-bezier(.2,.7,.25,1); }
.xmb-menu:before { content:''; position:absolute; left:34px; top:0; bottom:0; width:1px; background:linear-gradient(180deg,transparent,#ffffff55 20%,#ffffff55 80%,transparent); }
.xmb-menu-title { margin:0 0 22px; padding:0 10px 14px; border-bottom:1px solid #ffffff40; font-size:24px; font-weight:300; letter-spacing:.2px; }
.xmb-menu-title .xmb-icon { display:inline-block; width:30px; height:30px; margin-right:12px; vertical-align:-6px; }
.xmb-menu-kind { margin:0 10px 9px; font-size:15px; opacity:.65; }
.xmb-menu-context .xmb-menu-title { display:flex; align-items:flex-start; gap:12px; font-size:22px; line-height:1.25; }
.xmb-menu-context .xmb-menu-title .xmb-icon { flex:0 0 30px; margin:0; }
.xmb-menu-context .xmb-menu-title span { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:3; overflow:hidden; overflow-wrap:anywhere; }
.xmb-menu-context .xmb-menu-list { max-height:310px; }
.xmb-menu-list { position:relative; max-height:389px; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:#ffffff66 transparent; }
.xmb-menu .xmb-menu-row { position:relative; display:flex; align-items:center; gap:12px; width:100%; min-height:42px; padding:9px 11px; line-height:1.25; font-size:18px; border-radius:2px; transition:background 120ms ease; }
.xmb-menu .xmb-menu-row.selected,.xmb-menu .xmb-menu-row[aria-selected=true] { color:#fff; background:linear-gradient(90deg,#ffffff38,#ffffff10); box-shadow:inset 0 1px 0 #ffffff50,inset 0 -1px 0 #ffffff30; text-shadow:0 0 8px #ffffff70,0 1px 3px #0008; }
.xmb-menu .xmb-menu-row[disabled] { opacity:.4; cursor:default; }
.xmb-menu-icon { width:23px; height:23px; flex:0 0 23px; }
.xmb-menu-label { min-width:0; flex:1; overflow-wrap:anywhere; }
.xmb-menu-value { max-width:126px; flex-shrink:0; font-size:15px; text-align:right; opacity:.75; }
.xmb-menu-description { margin:17px 11px 0; font-size:14px; line-height:1.45; opacity:.75; }
.xmb-menu-hint { position:absolute; left:44px; right:35px; bottom:29px; display:flex; align-items:center; gap:18px; font-size:14px; opacity:.85; }
.xmb-menu-hint button { display:flex; align-items:center; gap:8px; }
.xmb-menu input { width:100%; padding:9px 10px; border:1px solid #ffffff70; border-radius:0; background:#0003; color:#fff; font:inherit; font-size:19px; outline:none; }
.xmb-menu input:focus { border-color:#fff; }
.xmb-message { position:absolute; z-index:8; left:50%; bottom:64px; transform:translateX(-50%); max-width:700px; padding:14px 24px; background:#000000c0; border-radius:3px; box-shadow:0 0 0 1px #ffffff50; font-size:18px; text-align:center; }
.xmb-live { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
.xmb-still * { animation:none !important; transition:none !important; }
@keyframes xmb-halo { 0%,100% { opacity:.3; } 50% { opacity:.9; } }
/* ---------- Side panels (profile, game information, downloads): the Options frame, wider ---------- */
.xmb-panel-frame { width:470px; }
.xmb-panel { display:flex; flex-direction:column; }
.xmb-menu { display:flex; flex-direction:column; }
.xmb-menu .xmb-menu-list { flex:0 1 auto; min-height:0; }
.xmb-menu .xmb-menu-description { flex:0 0 auto; }
.xmb-menu .xmb-menu-hint { position:static; margin-top:auto; padding:16px 0 0 10px; flex:0 0 auto; }
.xmb-panel .xmb-menu-list { max-height:none; flex:0 1 auto; min-height:0; }
.xmb-panel-head { display:flex; align-items:center; gap:16px; margin:0 6px 18px; padding:0 4px 16px; border-bottom:1px solid #ffffff2e; }
.xmb-panel-image { width:84px; height:84px; flex:0 0 84px; object-fit:cover; border-radius:10px; box-shadow:0 0 0 1px #ffffff40,0 6px 16px #0008; }
.xmb-panel-image.round { border-radius:50%; box-shadow:0 0 0 2px color-mix(in srgb,var(--xmb-accent,#fff) 70%,#fff),0 0 18px color-mix(in srgb,var(--xmb-accent,#fff) 45%,transparent); }
.xmb-panel-game .xmb-panel-image { width:150px; flex-basis:150px; height:70px; }
.xmb-panel-icon { width:64px; height:64px; flex:0 0 64px; }
.xmb-panel-heading { min-width:0; }
.xmb-panel-heading h2 { margin:0; font-size:24px; font-weight:400; line-height:1.2; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.xmb-panel-heading p { margin:4px 0 0; font-size:15px; opacity:.72; }
.xmb-panel-rows { margin:0 10px 16px; display:grid; gap:9px; font-size:15px; }
.xmb-panel-rows > div { display:flex; justify-content:space-between; gap:16px; }
.xmb-panel-rows dt { opacity:.68; }
.xmb-panel-rows dd { margin:0; text-align:right; font-weight:400; overflow-wrap:anywhere; }

/* ---------- Steam's Quick Access panel (friends, chat…) open over the XMB: the clock and the
   button legend move out from under it. --xmb-side-inset is its width in screen pixels. ---------- */
.xmb-status,.xmb-legend { transition:transform 260ms cubic-bezier(.2,.7,.25,1); }
[data-ps3-side-open] .xmb-status,[data-ps3-side-open] .xmb-legend { transform:translateX(calc(-1 * var(--xmb-side-inset,0px) / var(--xmb-scale,1))); }
/* Pushed aside, the clock no longer runs off the edge of the screen: it gets a rounded end. */
.xmb-status { transition:transform 260ms cubic-bezier(.2,.7,.25,1),border-radius 260ms ease,padding 260ms ease; }
[data-ps3-side-open] .xmb-status { border-right:1px solid #ffffff66; border-radius:3cqh; padding-right:1.6cqw; }
.xmb-glass [data-ps3-side-open] .xmb-status, [data-ps3-side-open] .xmb-glass .xmb-status { border-right-color:rgba(255,255,255,.22); }

/* ---------- Glass (from Glass Dusk): smoked glass, fine grain, edges lit in the accent ----------
   The accent pair (--xmb-accent, --xmb-accent-2) comes from the selected game's art, or the PS3
   colour. Blur is used on the Options panel only: the wave is paused while it is open, so the
   blur is worked out once, not on every frame. */
.xmb-glass { --xmb-glass-fill:linear-gradient(150deg,color-mix(in srgb,var(--xmb-theme-dark,#0c0d13) 45%,rgba(12,13,19,.64)),color-mix(in srgb,var(--xmb-theme-dark,#05060a) 30%,rgba(5,6,9,.58)));
  --xmb-grain:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23g)' opacity='.09'/%3E%3C/svg%3E");
  --xmb-lit:color-mix(in srgb,var(--xmb-accent,#5e90e4) 45%,rgba(255,255,255,.18));
  --xmb-accent-fill:linear-gradient(135deg,var(--xmb-accent,#5e90e4),var(--xmb-accent-2,var(--xmb-accent,#5e90e4))); }
.xmb-glass .xmb-menu { inset:18px 18px 18px 0; padding:52px 22px 30px 26px; border-radius:24px; border:1px solid rgba(255,255,255,.1); border-top-color:var(--xmb-lit); border-left-color:var(--xmb-lit);
  background:var(--xmb-grain),var(--xmb-glass-fill); -webkit-backdrop-filter:blur(30px) saturate(1.35); backdrop-filter:blur(30px) saturate(1.35);
  box-shadow:0 40px 90px -30px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.1); }
.xmb-glass .xmb-menu:before { display:none; }
.xmb-glass .xmb-menu-title { border-bottom-color:rgba(255,255,255,.1); }
.xmb-glass .xmb-menu .xmb-menu-row { border-radius:12px; }
.xmb-glass .xmb-menu .xmb-menu-row.selected,.xmb-glass .xmb-menu .xmb-menu-row[aria-selected=true] { background:var(--xmb-accent-fill); box-shadow:0 8px 20px -8px color-mix(in srgb,var(--xmb-accent,#5e90e4) 75%,transparent),inset 0 1px 0 rgba(255,255,255,.25); text-shadow:0 1px 2px #0006; }
.xmb-glass .xmb-menu-hint { left:30px; }
.xmb-glass .xmb-message { border-radius:16px; background:var(--xmb-grain),var(--xmb-glass-fill),rgba(5,6,9,.5); box-shadow:0 0 0 1px rgba(255,255,255,.1),0 20px 50px -20px #000; border-top:1px solid var(--xmb-lit); }
.xmb-glass .xmb-status { background:var(--xmb-grain),linear-gradient(180deg,#ffffff1c,#ffffff06 55%,#00000020); border-color:rgba(255,255,255,.22); border-top-color:var(--xmb-lit); }
.xmb-glass .xmb-user-dot { background:radial-gradient(circle at 35% 30%,#fff,var(--xmb-accent-2,#bfe4ff) 45%,var(--xmb-accent,#3d86c4)); }
.xmb-glass .xmb-settings-branch .xmb-item.selected { border-radius:10px; background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--xmb-accent,#5e90e4) 34%,transparent) 5%,color-mix(in srgb,var(--xmb-accent-2,#5e90e4) 14%,transparent) 72%,transparent); }
.xmb-glass .xmb-palette-picker .xmb-items { background:var(--xmb-grain),linear-gradient(90deg,transparent,rgba(5,6,9,.5) 8%,rgba(5,6,9,.62)); }
.xmb-glass .xmb-palette-picker .xmb-item.selected { background:linear-gradient(90deg,color-mix(in srgb,var(--xmb-accent,#5e90e4) 40%,transparent),color-mix(in srgb,var(--xmb-accent-2,#5e90e4) 14%,transparent)); }
.xmb-glass .xmb-game-gallery .xmb-item.has-art .xmb-item-art { border-radius:6px; }
.xmb-glass .xmb-game-gallery .xmb-item.has-art.selected .xmb-item-art { box-shadow:0 0 0 1px rgba(255,255,255,.9),0 0 18px color-mix(in srgb,var(--xmb-accent,#fff) 80%,transparent),0 6px 14px #000c; }
.xmb-glass .xmb-media-gallery .xmb-item.has-art .xmb-item-art { border-radius:6px; }
.xmb-glass .xmb-media-gallery .xmb-item.selected .xmb-item-copy { border-bottom-color:var(--xmb-accent,#fff); }
.xmb-glass .xmb-legend button { padding:0 .7cqw 0 .25cqw; border-radius:999px; background:var(--xmb-grain),rgba(5,6,9,.86); box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),0 4px 14px rgba(0,0,0,.35); }
.xmb-classic .xmb-legend button { padding:0 .7cqw 0 .25cqw; border-radius:999px; background:rgba(0,0,0,.6); }
.xmb-glass .xmb-backdrop:after { background:linear-gradient(90deg,#000a 0%,#0005 45%,#0001 85%),linear-gradient(0deg,#0009,transparent 45%,#0004),linear-gradient(135deg,color-mix(in srgb,var(--xmb-accent,#000) 18%,transparent),transparent 60%); }
@keyframes xmb-level-in { from { opacity:0; transform:translateX(1.5cqw); } to { opacity:1; transform:translateX(0); } }
@keyframes xmb-menu-in { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
@keyframes xmb-menu-shade-in { from { opacity:0; } to { opacity:1; } }
@media(prefers-reduced-motion:reduce) { .xmb-root * { animation:none !important; transition:none !important; } }
`;
