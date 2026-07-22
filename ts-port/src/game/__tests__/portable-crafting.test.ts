import { describe, it, expect, beforeAll } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { Crafting, installRecipes } from '../crafting/Crafting';
import { FurnitureItem } from '../item/FurnitureItem';
import { ResourceItem } from '../item/ResourceItem';
import { Resource } from '../item/resource/Resource';
import { Inventory } from '../entity/Inventory';

beforeAll(() => {
  // Recipes reference Resource singletons, so install order matters:
  // installTiles -> installResources -> installRecipes.
  installTiles();
  installResources();
  installRecipes();
});

describe('Portable crafting (workbench recipes are reachable without a workbench)', () => {
  it('exposes the workbench furniture recipe (wood x20)', () => {
    const bench = Crafting.workbenchRecipes.find(
      (r) =>
        r.resultTemplate instanceof FurnitureItem &&
        r.resultTemplate.furniture.name === '工作台',
    );
    expect(bench).toBeTruthy();
    const woodCost = bench!.costs.find(
      (c) => c instanceof ResourceItem && (c as ResourceItem).resource === Resource.wood,
    );
    expect(woodCost).toBeTruthy();
    // wood cost is a ResourceItem(Resource.wood, 20)
    expect((woodCost as ResourceItem).count).toBe(20);
  });

  it('lets a fresh player craft a wood sword from 5 wood', () => {
    const sword = Crafting.workbenchRecipes.find(
      (r) => r.resultTemplate.getName() === '木剑',
    );
    expect(sword).toBeTruthy();
    const inv = new Inventory();
    inv.add(new ResourceItem(Resource.wood, 5));
    sword!.checkCanCraft(inv);
    expect(sword!.canCraft).toBe(true);
  });
});
