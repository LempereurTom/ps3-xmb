import { useId, type ReactNode } from 'react';
import type { IconName } from './model';

// One 72-unit grid, 3-unit structural strokes and shared silver lighting.
// Details are transparent cutouts, so they inherit every XMB palette/poster.
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const id = useId().replace(/:/g, '');
  const gradient = `xmb-gloss-${id}`;
  const mask = `xmb-cutout-${id}`;
  let drawing: ReactNode;
  let cutouts: ReactNode;
  switch (name) {
    case 'settings':
      drawing = <><path d="M25 21v-6q0-4 4-4h14q4 0 4 4v6" fill="none"/><rect x="9" y="22" width="54" height="37" rx="3" stroke="none"/></>;
      cutouts = <><path d="M9 36h54" fill="none" stroke="black" strokeWidth="3"/><rect x="31" y="31" width="10" height="11" rx="1"/></>; break;
    case 'system':
      drawing = <><path d="M29 27h34v30H21V43m18 14v6m-10 0h20" fill="none"/><path d="M27 9a12 12 0 0 0-15 16L7 40q-1 4 3 6t7-2l9-14A12 12 0 0 0 36 12l-9 9-6-6z" stroke="none"/></>;
      cutouts = <circle cx="12" cy="40" r="2.2"/>; break;
    case 'photo':
      drawing = <><path d="M10 23h12l5-8h18l5 8h12q3 0 3 3v29q0 4-4 4H11q-4 0-4-4V27q0-4 3-4" stroke="none"/></>;
      cutouts = <><circle cx="36" cy="40" r="11"/><path d="M14 29h7" fill="none" stroke="black" strokeWidth="3"/></>; break;
    case 'music':
      drawing = <path d="M28 11v34c-5-2-13 0-16 5s0 10 6 10c8 0 15-5 15-12V22l23 4v23c-5-2-13 0-16 5s0 10 6 10c8 0 15-5 15-12V13q-16 5-33-2" stroke="none"/>; break;
    case 'video':
      drawing = <><rect x="10" y="13" width="52" height="46" rx="1" fill="none"/><path d="M20 13v46m32-46v46M10 24h10m-10 12h10m-10 12h10m32-24h10M52 36h10M52 48h10" fill="none"/></>; break;
    case 'game':
      drawing = <path d="M22 18h28c8 0 12 4 14 11l4 18c2 8-1 13-6 13-4 0-6-3-9-7l-3-4H22l-3 4c-3 4-5 7-9 7-5 0-8-5-6-13l4-18c2-7 6-11 14-11" stroke="none"/>;
      cutouts = <>
        <path d="M18 26v10m-5-5h10" fill="none" stroke="black" strokeWidth="3.2"/>
        <circle cx="54" cy="25.5" r="2"/><circle cx="59" cy="31" r="2"/><circle cx="49" cy="31" r="2"/><circle cx="54" cy="36.5" r="2"/>
        <circle cx="27" cy="44" r="4.6"/><circle cx="45" cy="44" r="4.6"/>
        <rect x="31" y="27" width="4" height="2.4" rx="1"/><rect x="38" y="27" width="4" height="2.4" rx="1"/>
      </>; break;
    case 'users':
      drawing = <><circle cx="36" cy="25" r="12" stroke="none"/><path d="M14 62v-5c0-10 9-16 22-16s22 6 22 16v5z" stroke="none"/></>; break;
    case 'steam':
      // "Steam Network": a globe with an orbiting star, in the spirit of the PS3 network icon.
      drawing = <><circle cx="34" cy="38" r="22" stroke="none"/><path d="M8 26q30-20 58 2" fill="none"/><path d="m58 8 2.8 6 6.2.8-4.6 4.2 1.2 6.2L58 22.2 52.4 25.2l1.2-6.2L49 14.8l6.2-.8z" stroke="none"/></>;
      cutouts = <><path d="M12 38h44M34 16v44M18 25q16 7 32 0M18 51q16-7 32 0" fill="none" stroke="black" strokeWidth="2.6"/><ellipse cx="34" cy="38" rx="9" ry="22" fill="none" stroke="black" strokeWidth="2.6"/></>; break;
    case 'power':
      drawing = <><path d="M36 9v26" fill="none" strokeWidth="5"/><path d="M22 18a22 22 0 1 0 28 0" fill="none" strokeWidth="5"/></>; break;
    case 'exit':
      drawing = <><path d="M30 10H14q-4 0-4 4v44q0 4 4 4h16" fill="none" strokeWidth="4"/><path d="M27 33h22V23l15 13-15 13V39H27z" stroke="none"/></>; break;
    case 'browser':
      drawing = <><rect x="8" y="12" width="56" height="46" rx="4" fill="none"/><path d="M8 23h56" fill="none"/><circle cx="14" cy="17.5" r="1.6" stroke="none"/><circle cx="20" cy="17.5" r="1.6" stroke="none"/><circle cx="36" cy="41" r="11" fill="none"/><path d="M25 41h22M36 30q6 11 0 22q-6-11 0-22" fill="none"/></>; break;
    case 'network':
      drawing = <><circle cx="36" cy="36" r="26" fill="none"/><ellipse cx="36" cy="36" rx="14" ry="26" fill="none"/><path d="M10 36h52M15 22q21 12 42 0M15 50q21-12 42 0M36 10v52" fill="none"/></>; break;
    case 'friends':
      drawing = <><path d="M29 9h30q3 0 3 3v24q-2 10-17 15-16-5-16-15z" stroke="none"/><path d="M10 25h30q3 0 3 3v24q-2 10-17 14-16-4-16-14z" stroke="none"/></>;
      cutouts = <><path d="M35 21h4m11 0h4M39 33q6-4 11 0M16 38h4m11 0h4M19 49q7 7 13 0M28 25h15v20" fill="none" stroke="black" strokeWidth="3"/></>; break;
    case 'folder':
      drawing = <path d="M7 21q0-4 4-4h15q2 0 4 2l4 5h26q4 0 4 4v25q0 4-4 4H11q-4 0-4-4z" stroke="none"/>; break;
    case 'memory':
      drawing = <><path d="M22 9h25l7 8v46H18V13z" fill="none"/><path d="M25 11v11m7-11v11m7-11v11m7-11v11M25 35h22v19H25z" fill="none"/></>; break;
    case 'theme':
      drawing = <><path d="M14 25h49v32H14z" fill="none"/><path d="M16 51l13-13 11 9 11-14 10 9v13H16" stroke="none"/><circle cx="20" cy="20" r="12" stroke="none"/></>;
      cutouts = <><path d="m23 12 5 5-10 10-5 1 1-5z"/><path d="m22 15 4 4" stroke="white" strokeWidth="2" fill="none"/></>; break;
    case 'clock':
      drawing = <><circle cx="36" cy="36" r="26" fill="none"/><path d="M36 19v18l-11 8" fill="none"/></>; break;
    case 'sound':
      drawing = <><path d="M9 28h13l17-13v42L22 44H9z" stroke="none"/><path d="M47 25q12 11 0 22m8-30q20 19 0 38" fill="none"/></>; break;
    case 'display':
      drawing = <><rect x="8" y="13" width="56" height="40" rx="1" fill="none"/><path d="M36 53v9m-15 0h30" fill="none"/></>; break;
    case 'download':
      drawing = <><path d="M29 10h14v25h13L36 54 16 35h13z" stroke="none"/><path d="M12 52v10h48V52" fill="none"/></>; break;
    case 'store':
      drawing = <><path d="M14 24h44l5 38H9z" fill="none"/><path d="M26 27V18a10 10 0 0 1 20 0v9" fill="none"/></>; break;
    case 'info':
      drawing = <><circle cx="36" cy="36" r="26" fill="none"/><path d="M36 32v20" fill="none"/><circle cx="36" cy="22" r="2.5" stroke="none"/></>; break;
    case 'play':
      drawing = <path d="M23 12 59 36 23 60z" stroke="none"/>; break;
    case 'delete':
      drawing = <><path d="M13 20h46M27 20v-7h18v7M18 20l3 41h30l3-41M30 30v22m12-22v22" fill="none"/></>; break;
    case 'profile':
      drawing = <><circle cx="36" cy="23" r="13" stroke="none"/><path d="M12 62v-7c0-11 10-17 24-17s24 6 24 17v7z" stroke="none"/></>; break;
  }
  return <svg aria-hidden="true" focusable="false" data-icon={name} className={`xmb-icon ${className}`} viewBox="0 0 72 72">
    <defs>
      <linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="0" y2="64"><stop stopColor="#ffffff"/><stop offset=".5" stopColor="#f4f7fa"/><stop offset=".52" stopColor="#e2e8ee"/><stop offset="1" stopColor="#c4ced6"/></linearGradient>
      {cutouts && <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="72" height="72"><rect width="72" height="72" fill="white"/><g fill="black" stroke="none" strokeLinecap="round" strokeLinejoin="round">{cutouts}</g></mask>}
    </defs>
    <g data-icon-shape="" fill={`url(#${gradient})`} stroke={`url(#${gradient})`} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" mask={cutouts ? `url(#${mask})` : undefined}>{drawing}</g>
  </svg>;
}
