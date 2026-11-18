import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSettings, clampSelection, visibleGames, DEFAULT_SETTINGS, type Game } from '../src/model';
import { nightLevel, resolvePalette } from '../src/palette';

test('a fresh install never replaces Steam Home automatically', () => {
  assert.equal(cleanSettings(undefined).enabled, false);
  assert.equal(cleanSettings({}).enabled, false);
});

test('invalid stored settings cannot inject unknown preference types', () => {
  assert.deepEqual(cleanSettings({ enabled: 'yes', palette: '../../file', language: 'xx', sounds: null, motion: false, installedOnly: 0, gameBackground: 'false', groupByFolders: 0 }), { ...DEFAULT_SETTINGS, motion: false });
});
test('PS3 palettes, languages and glyphs persist and reject unknown values', () => {
  for (const palette of ['original', 'silver', 'gold', 'lime', 'pink', 'green', 'purple', 'teal', 'sky', 'blue', 'violet', 'brown', 'red', 'black']) {
    assert.equal(cleanSettings({ palette, language: 'ru' }).palette, palette);
  }
  assert.equal(cleanSettings({ palette: 'classic' }).palette, 'original');
  assert.equal(cleanSettings({ language: 'fr' }).language, 'fr');
  assert.equal(cleanSettings({ language: 'en' }).language, 'en');
  assert.equal(cleanSettings({ glyphs: 'xbox' }).glyphs, 'xbox');
  assert.equal(cleanSettings({ glyphs: 'nintendo' }).glyphs, 'playstation');
});
test('Original follows the month and the background dims at night', () => {
  assert.equal(resolvePalette('original', new Date(2026, 0, 15)), 'silver');
  assert.equal(resolvePalette('original', new Date(2026, 10, 18)), 'brown');
  assert.equal(resolvePalette('original', new Date(2026, 11, 1)), 'red');
  assert.equal(resolvePalette('blue', new Date(2026, 0, 1)), 'blue');
  assert.equal(nightLevel(new Date(2026, 0, 1, 12)), 0);
  assert.equal(nightLevel(new Date(2026, 0, 1, 23)), 1);
});
test('library includes installed games and shortcuts; deduplicates and orders by last played', () => {
  const game = (id: number, installed: boolean, shortcut: boolean, lastPlayed: number): Game => ({ id, name: `Game ${id}`, installed, shortcut, lastPlayed, artwork: [] });
  const games = [game(1, true, false, 100), game(2, false, false, 200), game(3, false, true, 300), game(1, true, false, 100)];
  assert.deepEqual(visibleGames(games, true).map(g => g.id), [3, 1]);
  assert.deepEqual(visibleGames(games, false).map(g => g.id), [3, 2, 1]);
});
test('selection stays valid when a library shrinks or becomes empty', () => {
  assert.equal(clampSelection(30, 2), 1);
  assert.equal(clampSelection(4, 0), 0);
  assert.equal(clampSelection(-1, 9), 0);
});
test('recently played holds 5 games by default, 10 or 20 on request', () => {
  assert.equal(cleanSettings({}).recentCount, 5);
  assert.equal(cleanSettings({ recentCount: 20 }).recentCount, 20);
  assert.equal(cleanSettings({ recentCount: 7 }).recentCount, 5);
});
