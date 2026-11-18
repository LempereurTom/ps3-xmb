import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameFolders, sameGames } from '../src/library';
import type { Game, GameFolder } from '../src/model';

const game: Game = { id: 620, name: 'Portal 2', installed: true, shortcut: false, lastPlayed: 123,
  gameId: '620', artwork: ['header.jpg'], backgrounds: ['hero.jpg'] };

test('equivalent library polls do not invalidate a large game list', () => {
  const games = Array.from({ length: 1000 }, (_, i) => ({ ...game, id: i + 1 }));
  assert.equal(sameGames(games, structuredClone(games)), true);
  assert.equal(sameGames([], []), true);
});

test('library changes still update launch state, ordering, titles and artwork', () => {
  const changes: Partial<Game>[] = [
    { id: 400 }, { name: 'Renamed' }, { installed: false }, { shortcut: true },
    { lastPlayed: 456 }, { gameId: '400' }, { artwork: ['custom.jpg'] },
    { backgrounds: ['custom-hero.jpg'] }, { backgrounds: undefined },
  ];
  for (const change of changes) assert.equal(sameGames([game], [{ ...game, ...change }]), false, JSON.stringify(change));
  const other = { ...game, id: 400 };
  assert.equal(sameGames([game, other], [other, game]), false);
  assert.equal(sameGames([game], []), false);
  assert.equal(sameGames([], [game]), false);
});

test('collection polling preserves unchanged lists and detects edits and membership', () => {
  const folder: GameFolder = { id: 'favorites', name: 'Favorites', gameIds: [620, 400] };
  assert.equal(sameFolders([folder], structuredClone([folder])), true);
  for (const change of [{ id: 'other' }, { name: 'Renamed' }, { gameIds: [620] }, { gameIds: [400, 620] }]) {
    assert.equal(sameFolders([folder], [{ ...folder, ...change }]), false);
  }
  assert.equal(sameFolders([folder], []), false);
  assert.equal(sameFolders([], [folder]), false);
});
