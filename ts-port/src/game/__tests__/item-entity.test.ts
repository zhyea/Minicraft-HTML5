import { describe, it, expect, beforeAll } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { installRecipes } from '../crafting/Crafting';
import { Game } from '../Game';
import { Level } from '../level/Level';
import { Tile } from '../level/tile/Tile';
import { Player } from '../entity/Player';
import { ItemEntity } from '../entity/ItemEntity';
import { ResourceItem } from '../item/ResourceItem';
import { Resource } from '../item/resource/Resource';

beforeAll(() => {
  installTiles();
  installResources();
  installRecipes();
});

describe('ItemEntity drop (Tree.hurt)', () => {
  it('drops wood and reverts the tree to grass on a lethal hit', () => {
    const game = new Game();
    const level = new Level(64, 64, 0, null);
    const x = 6;
    const y = 6;
    level.setTile(x, y, Tile.tree, 0);

    const player = new Player(game, game.input);

    // One hit with dmg=20: damage = getData(0) + 20 >= 20 -> break.
    Tile.tree.hurt(level, x, y, player, 20, 0);

    const drops = level.entities.filter((e): e is ItemEntity => e instanceof ItemEntity);
    const wood = drops.filter((d) => d.item.resource === Resource.wood);

    expect(drops.length).toBeGreaterThanOrEqual(1);
    expect(wood.length).toBeGreaterThanOrEqual(1);
    expect(level.getTile(x, y)).toBe(Tile.grass);
  });
});

describe('ItemEntity pickup (Player.touchItem)', () => {
  it('adds the item to the inventory and removes the entity', () => {
    const game = new Game();
    const player = new Player(game, game.input);

    const ie = new ItemEntity(new ResourceItem(Resource.wood, 1), player.x, player.y);
    ie.time = 31; // past the 30-tick pickup grace period

    player.touchItem(ie);

    expect(player.inventory.count(new ResourceItem(Resource.wood, 1))).toBeGreaterThanOrEqual(1);
    expect(ie.removed).toBe(true);
  });
});

describe('ItemEntity lifetime', () => {
  it('removes itself once time reaches lifeTime', () => {
    const game = new Game();
    const level = new Level(64, 64, 0, null);
    const ie = new ItemEntity(new ResourceItem(Resource.wood, 1), 100, 100);
    ie.lifeTime = 2; // very short life
    level.add(ie); // sets ie.level so tick()'s move() can resolve tiles

    let guard = 0;
    while (!ie.removed && guard < 20) {
      ie.tick();
      guard++;
    }

    expect(ie.removed).toBe(true);
  });
});
