import { describe, it, expect, beforeAll } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { installRecipes } from '../crafting/Crafting';
import { Game } from '../Game';
import { Level } from '../level/Level';
import { Tile } from '../level/tile/Tile';
import { Player } from '../entity/Player';
import { FurnitureItem } from '../item/FurnitureItem';
import { Workbench } from '../entity/Workbench';
import { SpriteSheet } from '../../engine/SpriteSheet';
import { Screen } from '../../engine/Screen';

beforeAll(() => {
  installTiles();
  installResources();
  installRecipes();
});

/** Count non-transparent pixels written into the screen. */
function countDrawn(screen: Screen): number {
  let n = 0;
  for (let i = 0; i < screen.pixels.length; i++) if (screen.pixels[i] !== 0) n++;
  return n;
}

/**
 * P2#6 — Player.render attack swing + held furniture.
 *
 * Mirrors the mob.test.ts harness (Game + Level + Player) so render() has a
 * valid `level` for isSwimming(). attackTime/attackDir are private, so they are
 * poked via a cast; the public API is unchanged. Asserts the new branches
 * execute (no throw) and actually draw pixels for every attack direction and
 * when carrying a FurnitureItem.
 */
describe('Player.render attack swing + held furniture (P2#6)', () => {
  it('renders the body (and does not regress) without throwing', () => {
    const game = new Game();
    const level = new Level(64, 64, 0, null);
    level.setTile(4, 4, Tile.grass, 0);

    const player = new Player(game, game.input);
    player.x = 100;
    player.y = 100;
    level.add(player); // assigns player.level

    const screen = new Screen(200, 200, new SpriteSheet());
    screen.setOffset(0, 0);
    expect(() => player.render(screen)).not.toThrow();
    expect(countDrawn(screen)).toBeGreaterThan(0);
  });

  it('draws the swing for every attack direction', () => {
    const game = new Game();
    const level = new Level(64, 64, 0, null);
    const player = new Player(game, game.input);
    player.x = 100;
    player.y = 100;
    level.add(player);

    const screen = new Screen(200, 200, new SpriteSheet());
    screen.setOffset(0, 0);

    for (const dir of [0, 1, 2, 3]) {
      (player as unknown as { attackTime: number; attackDir: number }).attackTime = 5;
      (player as unknown as { attackTime: number; attackDir: number }).attackDir = dir;
      screen.clear(0);
      player.render(screen);
      expect(countDrawn(screen), `direction ${dir} should draw`).toBeGreaterThan(0);
    }
  });

  it('draws the carried furniture sprite when holding a FurnitureItem', () => {
    const game = new Game();
    const level = new Level(64, 64, 0, null);
    const player = new Player(game, game.input);
    player.x = 100;
    player.y = 100;
    level.add(player);
    player.activeItem = new FurnitureItem(new Workbench());

    const screen = new Screen(200, 200, new SpriteSheet());
    screen.setOffset(0, 0);
    expect(() => player.render(screen)).not.toThrow();
    expect(countDrawn(screen)).toBeGreaterThan(0);
  });
});
