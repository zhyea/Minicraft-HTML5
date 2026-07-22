import { describe, it, expect, beforeAll } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { Game } from '../Game';
import { Player } from '../entity/Player';

beforeAll(() => {
  installTiles();
  installResources();
});

describe('Manual save entry', () => {
  it('saveGame() persists a slot that hasSave() then reports', () => {
    // Build a minimal but valid, *active* game — this mirrors the path the
    // InventoryMenu's onSave() takes (getActiveGame().saveGame()). Game.saveGame()
    // guards on `active === true` and a living, non-removed player, so both are
    // satisfied here. Default Player is alive (health === maxHealth, removed false).
    const game = new Game();
    game.active = true;
    game.player = new Player(game, game.input);

    // No slot exists before we explicitly save.
    expect(game.hasSave()).toBe(false);

    game.saveGame();

    // After saveGame(), a save slot must be present (localStorage `minicraft.save`
    // under the browser, or the in-memory fallback in the node test env).
    expect(game.hasSave()).toBe(true);
  });
});
