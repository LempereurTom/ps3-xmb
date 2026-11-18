import type { Glyphs } from './model';

export type GlyphAction = 'confirm' | 'back' | 'menu' | 'details';

// PS3 layout (Europe/America): ✕ confirm, ○ back, △ options, □ information.
const PS = {
  confirm: { colour: '#8fb8ff', shape: <path d="M5 5l14 14M19 5L5 19" fill="none" strokeWidth="2.6" strokeLinecap="round" /> },
  back: { colour: '#ff7a7a', shape: <circle cx="12" cy="12" r="7.5" fill="none" strokeWidth="2.6" /> },
  menu: { colour: '#5fe0a6', shape: <path d="M12 4.2l8 13.6H4z" fill="none" strokeWidth="2.6" strokeLinejoin="round" /> },
  details: { colour: '#f39ad6', shape: <rect x="5" y="5" width="14" height="14" fill="none" strokeWidth="2.6" /> },
};
// Xbox / Steam Deck layout: A confirm, B back, Y options, X information.
const XBOX = {
  confirm: { colour: '#7ccf3c', letter: 'A' },
  back: { colour: '#f05454', letter: 'B' },
  menu: { colour: '#f2c230', letter: 'Y' },
  details: { colour: '#3e8ff0', letter: 'X' },
};

export function Glyph({ action, glyphs }: { action: GlyphAction; glyphs: Glyphs }) {
  if (glyphs === 'xbox') {
    const { colour, letter } = XBOX[action];
    return <b className="xmb-glyph xbox" style={{ color: colour }} aria-label={letter}>{letter}</b>;
  }
  const { colour, shape } = PS[action];
  return <b className="xmb-glyph" aria-hidden="true"><svg viewBox="0 0 24 24" stroke={colour}>{shape}</svg></b>;
}
