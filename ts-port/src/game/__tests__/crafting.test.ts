import { describe, it, expect, beforeAll } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { Crafting, installRecipes } from '../crafting/Crafting';
import { Recipe } from '../crafting/Recipe';
import { ResourceRecipe } from '../crafting/ResourceRecipe';
import { ToolRecipe } from '../crafting/ToolRecipe';
import { FurnitureRecipe } from '../crafting/FurnitureRecipe';
import { Resource } from '../item/resource/Resource';
import { ToolType } from '../item/ToolType';
import { ResourceItem } from '../item/ResourceItem';
import { ToolItem } from '../item/ToolItem';
import { FurnitureItem } from '../item/FurnitureItem';
import { Inventory } from '../entity/Inventory';

beforeAll(() => {
  // Recipes reference Resource singletons, so install order matters:
  // installTiles -> installResources -> installRecipes.
  installTiles();
  installResources();
  installRecipes();
});

describe('ResourceRecipe (crafting/ResourceRecipe.java port)', () => {
  // Glass: a furnace recipe, costs sand x4 + coal x1, yields 1 glass.
  function makeGlassRecipe(): ResourceRecipe {
    return new ResourceRecipe(Resource.glass).addCost(Resource.sand, 4).addCost(Resource.coal, 1);
  }

  it('canCraft true only when every input resource is present', () => {
    const recipe = makeGlassRecipe();

    const empty = new Inventory();
    recipe.checkCanCraft(empty);
    expect(recipe.canCraft).toBe(false);

    const ready = new Inventory();
    ready.add(new ResourceItem(Resource.sand, 4));
    ready.add(new ResourceItem(Resource.coal, 1));
    recipe.checkCanCraft(ready);
    expect(recipe.canCraft).toBe(true);
  });

  it('craft() adds the output; deductCost() then consumes the inputs (Java split)', () => {
    const recipe = makeGlassRecipe();
    const inv = new Inventory();
    inv.add(new ResourceItem(Resource.sand, 4));
    inv.add(new ResourceItem(Resource.coal, 1));

    // Java craft() only yields the output; it does NOT deduct costs.
    recipe.craft(inv);
    expect(inv.count(new ResourceItem(Resource.glass))).toBe(1);
    expect(inv.count(new ResourceItem(Resource.sand))).toBe(4); // still present
    expect(inv.count(new ResourceItem(Resource.coal))).toBe(1); // still present

    // deductCost() removes the inputs (as the crafting menu calls it post-craft).
    recipe.deductCost(inv);
    expect(inv.count(new ResourceItem(Resource.sand))).toBe(0);
    expect(inv.count(new ResourceItem(Resource.coal))).toBe(0);
    expect(inv.count(new ResourceItem(Resource.glass))).toBe(1); // output kept
  });
});

describe('ToolRecipe (crafting/ToolRecipe.java port)', () => {
  // Gem sword: an anvil recipe (level 4), costs wood x5 + gem x50.
  function makeGemSword(): ToolRecipe {
    return new ToolRecipe(ToolType.sword, 4).addCost(Resource.wood, 5).addCost(Resource.gem, 50);
  }

  it('canCraft false without the required gem, true with wood + gem', () => {
    const recipe = makeGemSword();

    const noGem = new Inventory();
    noGem.add(new ResourceItem(Resource.wood, 5));
    recipe.checkCanCraft(noGem);
    expect(recipe.canCraft).toBe(false);

    const ready = new Inventory();
    ready.add(new ResourceItem(Resource.wood, 5));
    ready.add(new ResourceItem(Resource.gem, 50));
    recipe.checkCanCraft(ready);
    expect(recipe.canCraft).toBe(true);
  });

  it('craft yields a tool of the right type + level; deductCost consumes inputs', () => {
    const recipe = makeGemSword();
    const inv = new Inventory();
    inv.add(new ResourceItem(Resource.wood, 5));
    inv.add(new ResourceItem(Resource.gem, 50));

    recipe.craft(inv);
    expect(inv.count(new ToolItem(ToolType.sword, 4))).toBe(1);

    recipe.deductCost(inv);
    expect(inv.count(new ResourceItem(Resource.wood))).toBe(0);
    expect(inv.count(new ResourceItem(Resource.gem))).toBe(0);
    expect(inv.count(new ToolItem(ToolType.sword, 4))).toBe(1);
  });
});

describe('FurnitureRecipe (crafting/FurnitureRecipe.java port)', () => {
  it('craft yields a FurnitureItem whose name matches the FurnitureType', () => {
    const recipe = new FurnitureRecipe(FurnitureRecipe.FurnitureType.OVEN).addCost(Resource.stone, 15);
    const inv = new Inventory();
    inv.add(new ResourceItem(Resource.stone, 15));

    recipe.checkCanCraft(inv);
    expect(recipe.canCraft).toBe(true);

    recipe.craft(inv);
    const oven = inv.items.find((it) => it instanceof FurnitureItem) as FurnitureItem | undefined;
    expect(oven).toBeDefined();
    expect(oven!.furniture.name).toBe('烤箱');

    recipe.deductCost(inv);
    expect(inv.count(new ResourceItem(Resource.stone))).toBe(0);
  });
});

describe('Recipe registry integrity (crafting/Crafting.java port)', () => {
  it('registers the exact Java recipe counts across all four stations', () => {
    expect(Crafting.workbenchRecipes.length).toBe(16);
    expect(Crafting.anvilRecipes.length).toBe(15);
    expect(Crafting.furnaceRecipes.length).toBe(3);
    expect(Crafting.ovenRecipes.length).toBe(1);
    expect(Crafting.recipes.length).toBe(35);
  });

  it('exposes the gem sword as an anvil ToolRecipe at level 4 (needs anvil)', () => {
    const gemSword = Crafting.anvilRecipes.find(
      (r) =>
        r instanceof ToolRecipe &&
        (r.resultTemplate as ToolItem).type === ToolType.sword &&
        (r.resultTemplate as ToolItem).level === 4,
    );
    expect(gemSword).toBeDefined();
    expect(gemSword).toBeInstanceOf(ToolRecipe);
  });

  it('places the workbench furniture recipe under the workbench station', () => {
    const workbench = Crafting.workbenchRecipes.find(
      (r) =>
        r instanceof FurnitureRecipe &&
        (r.resultTemplate as FurnitureItem).furniture.name === '工作台',
    );
    expect(workbench).toBeDefined();
  });

  it('every recipe is a Recipe with a non-null resultTemplate + at least one cost', () => {
    expect(Crafting.recipes.length).toBeGreaterThan(0);
    for (const r of Crafting.recipes) {
      expect(r).toBeInstanceOf(Recipe);
      expect(r.resultTemplate).not.toBeNull();
      expect(r.costs.length).toBeGreaterThan(0);
    }
  });
});
