import type { Game, GameFolder } from './model';

function sameArray<T>(a: readonly T[] | undefined, b: readonly T[] | undefined) {
  return a === b || (!!a && !!b && a.length === b.length && a.every((value, i) => value === b[i]));
}

/** Keep unchanged snapshots stable so polling doesn't rebuild every game row. */
export function sameGames(a: readonly Game[], b: readonly Game[]) {
  return a === b || (a.length === b.length && a.every((game, i) => {
    const next = b[i];
    return game.id === next.id && game.name === next.name && game.installed === next.installed
      && game.shortcut === next.shortcut && game.lastPlayed === next.lastPlayed && game.gameId === next.gameId
      && sameArray(game.artwork, next.artwork) && sameArray(game.backgrounds, next.backgrounds);
  }));
}

export function sameFolders(a: readonly GameFolder[], b: readonly GameFolder[]) {
  return a === b || (a.length === b.length && a.every((folder, i) => {
    const next = b[i];
    return folder.id === next.id && folder.name === next.name && sameArray(folder.gameIds, next.gameIds);
  }));
}
