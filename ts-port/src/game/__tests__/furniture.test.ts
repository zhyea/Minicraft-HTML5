import { describe, it, expect, beforeAll, vi } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { installRecipes } from '../crafting/Crafting';
import { Game } from '../Game';
import { Level } from '../level/Level';
import { Player } from '../entity/Player';
import { Furniture } from '../entity/Furniture';
import { Workbench } from '../entity/Workbench';
import { Chest } from '../entity/Chest';
import { Lantern } from '../entity/Lantern';
import { Oven } from '../entity/Oven';
import { Inventory } from '../entity/Inventory';
import { FurnitureRecipe } from '../crafting/FurnitureRecipe';
import { FurnitureItem } from '../item/FurnitureItem';
import { Resource } from '../item/resource/Resource';
import { ResourceItem } from '../item/ResourceItem';

beforeAll(() => {
  // Recipes reference Resource singletons, so install order matters:
  // installTiles -> installResources -> installRecipes.
  installTiles();
  installResources();
  installRecipes();
});

describe('Chest inventory storage', () => {
  it('stores an item via add and returns it via remove/retrieve (Inventory persists)', () => {
    const chest = new Chest();
    const item = new ResourceItem(Resource.wood, 3);
    chest.inventory.add(item);
    expect(chest.inventory.count(new ResourceItem(Resource.wood))).toBe(3);

    // Retrieve: remove 2 of 3; the remaining 1 persists in the chest.
    expect(chest.inventory.removeResource(Resource.wood, 2)).toBe(true);
    expect(chest.inventory.count(new ResourceItem(Resource.wood))).toBe(1);
  });
});

describe('Furniture add / remove from Level', () => {
  it('a furniture entity can be added to a Level and removed (entity count changes)', () => {
    const level = new Level(64, 64, 0, null);
    const bench = new Workbench();
    bench.x = 8 * 16 + 8;
    bench.y = 8 * 16 + 8;

    const before = level.entities.length;
    expect(level.entities.includes(bench)).toBe(false);

    level.add(bench);
    expect(level.entities.length).toBe(before + 1);
    expect(level.entities.includes(bench)).toBe(true);

    level.remove(bench);
    expect(level.entities.length).toBe(before);
    expect(level.entities.includes(bench)).toBe(false);
  });
});

describe('Lantern light radius', () => {
  it('exposes the expected light radius (field + getLightRadius)', () => {
    const lantern = new Lantern();
    expect(lantern.lightRadius).toBe(8);
    expect(lantern.getLightRadius()).toBe(8);
  });
});

describe('Workbench use hook (onUse priority)', () => {
  it('use triggers the onUse hook and propagates its return value', () => {
    const game = new Game();
    const player = new Player(game, game.input);
    const bench = new Workbench();

    let invoked = false;
    let capturedDir = -1;
    let capturedPlayer: Player | null = null;
    bench.onUse = (p, dir) => {
      invoked = true;
      capturedDir = dir;
      capturedPlayer = p;
      return true;
    };

    const result = bench.use(player, 2);

    expect(invoked).toBe(true);
    expect(capturedDir).toBe(2);
    expect(capturedPlayer).toBe(player);
    expect(result).toBe(true);
  });
});

describe('Sprint-2 FurnitureStub reconciliation', () => {
  it('crafting an OVEN yields a real Furniture (Oven) instance, not a stub', () => {
    const recipe = new FurnitureRecipe(FurnitureRecipe.FurnitureType.OVEN);
    const ovenItem = new FurnitureItem(recipe.type.newInst());
    expect(ovenItem.furniture).toBeInstanceOf(Oven);
    expect(ovenItem.furniture).toBeInstanceOf(Furniture);
    expect(ovenItem.furniture.name).toBe('烤箱');
  });

  it('the real Furniture satisfies the col/sprite/name contract FurnitureItem relies on', () => {
    const bench = new Workbench();
    expect(typeof bench.col).toBe('number');
    expect(typeof bench.sprite).toBe('number');
    expect(typeof bench.name).toBe('string');
    expect(bench.name).toBe('工作台');
  });
});

describe('Furniture.use() -> Game.furnitureUseHandler routing (Task #24)', () => {
  it('routes a used workbench to the UI handler and returns its result', () => {
    const game = new Game();
    const player = new Player(game, game.input);
    const wb = new Workbench();

    const handler = vi.fn((f: Furniture) => f instanceof Workbench);
    game.furnitureUseHandler = handler;

    const used = wb.use(player, 0);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBe(wb);
    expect(used).toBe(true);
  });

  it('returns false when no handler is wired (falls back to inventory)', () => {
    const game = new Game();
    const player = new Player(game, game.input);
    const wb = new Workbench();
    game.furnitureUseHandler = null;

    expect(wb.use(player, 0)).toBe(false);
  });
});
