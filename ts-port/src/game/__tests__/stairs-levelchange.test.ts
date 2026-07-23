/**
 * Deterministic reproduction of the stairs level-change pipeline.
 * Reproduces what happens when the player steps onto a stairsDown tile:
 *   Player.tick -> game.changeLevel -> pendingLevelChange
 *   Game.tick -> openTransition (currentMenu='transition')
 *   TransitionMenu done -> game.completeLevelChange -> currentLevel swaps
 * If this passes, the mechanism itself is sound and a "can't enter" report
 * must come from something else (map/controls/save). If it fails, the exact
 * broken link shows up here.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { installRecipes } from '../crafting/Crafting';
import { Game } from '../Game';
import { Tile } from '../level/tile/Tile';
import { gameState } from '../state';

beforeAll(() => {
  installTiles();
  installResources();
  installRecipes();
});

beforeEach(() => {
  gameState.currentMenu = 'none'; // live game, not a menu overlay
});

describe('stairs level change', () => {
  it('stepping onto stairsDown swaps surface -> underground1', () => {
    const game = new Game();
    game.startNewGame();

    const surface = game.levels[3]!;
    let sx = -1;
    let sy = -1;
    for (let y = 0; y < surface.h && sx < 0; y++) {
      for (let x = 0; x < surface.w; x++) {
        if (surface.getTile(x, y) === Tile.stairsDown) {
          sx = x;
          sy = y;
          break;
        }
      }
    }
    expect(sx).toBeGreaterThanOrEqual(0); // surface must have a stairsDown

    // Teleport the player onto the stairs tile center.
    game.player!.x = sx * 16 + 8;
    game.player!.y = sy * 16 + 8;

    expect(game.currentLevel).toBe(3);

    // A few ticks: Player.tick should schedule the change, Game.tick should
    // open the transition overlay.
    for (let i = 0; i < 5; i++) game.tick();

    expect(gameState.currentMenu).toBe('transition');
    expect(gameState.menuContext.levelChangeDir).toBe(-1);

    // Simulate the TransitionMenu "done" event (App.vue @done callback).
    game.completeLevelChange(gameState.menuContext.levelChangeDir ?? 0);

    expect(game.currentLevel).toBe(2); // surface (3) -> underground1 (2)
    expect(gameState.currentMenu).toBe('none');
    // Player must now live on the underground level.
    expect(game.levels[2]!.player).toBe(game.player);
  });
});
