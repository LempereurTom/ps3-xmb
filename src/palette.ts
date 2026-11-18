import { MONTH_PALETTES, type Palette } from './model';

/** Resolve "original" to the colour of the current month, like the PS3 did. */
export function resolvePalette(palette: Palette, date = new Date()): Exclude<Palette, 'original'> {
  return (palette === 'original' ? MONTH_PALETTES[date.getMonth()] : palette) as Exclude<Palette, 'original'>;
}

/** 0 during the day, 1 at night. The PS3 dims its background in the evening. */
export function nightLevel(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 7 && h < 18) return 0;
  if (h >= 18 && h < 21) return (h - 18) / 3;
  if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
  return 1;
}

/** The dark tone of each PS3 colour (the top of its sky), for panels tinted with the theme. */
export const PS3_DARK: Record<Exclude<Palette, 'original'>, string> = {
  silver: '#3b3f45', gold: '#4a3a06', lime: '#2a4708', pink: '#5c1840', green: '#08391a', purple: '#311144', teal: '#06393f',
  sky: '#0f3d66', blue: '#05173f', violet: '#1d0d42', brown: '#2d1806', red: '#3f0306', black: '#000000',
};

/** PS3 colour lifted to read on smoked glass — used as the accent when no game lends one. */
export const PS3_ACCENTS: Record<Exclude<Palette, 'original'>, [string, string]> = {
  silver: ['#b9c3cc', '#dfe6ec'], gold: ['#e0b93a', '#f2d46b'], lime: ['#94cf3a', '#c4e86a'], pink: ['#e46fae', '#f29ac7'],
  green: ['#3fb35f', '#7fd68a'], purple: ['#a35fd6', '#c58ae8'], teal: ['#25b8c2', '#6fdcd8'], sky: ['#5aaee8', '#8fd0f5'],
  blue: ['#3f7ae0', '#6fa0f0'], violet: ['#7d55d0', '#a487e6'], brown: ['#c8803f', '#e0a96c'], red: ['#e0403a', '#f0766a'],
  black: ['#9aa3ad', '#c8ced5'],
};
