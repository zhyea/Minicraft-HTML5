/**
 * Port of crafting/Crafting.java — the static recipe registry.
 *
 * The GWT original keeps four static Lists (workbench / anvil / furnace / oven)
 * filled by a static initializer block. To mirror the ts-port deferred-init
 * convention already used by Tile (installTiles) and Resource (installResources),
 * the lists are populated by installRecipes(), which must run AFTER
 * installResources() (recipes reference Resource singletons).
 *
 * Every recipe's costs + outputs are transcribed verbatim from Crafting.java —
 * workbench / anvil / furnace / oven groups, with the exact resource counts and
 * tool levels. `Crafting.recipes` is a convenience accessor returning every
 * recipe across the four stations (used by the registry-integrity tests and the
 * future Vue crafting menu).
 */
import { Recipe } from './Recipe';
import { ResourceRecipe } from './ResourceRecipe';
import { ToolRecipe } from './ToolRecipe';
import { FurnitureRecipe } from './FurnitureRecipe';
import { ToolType } from '../item/ToolType';
import { Resource } from '../item/resource/Resource';

export class Crafting {
  public static readonly anvilRecipes: Recipe[] = [];
  public static readonly ovenRecipes: Recipe[] = [];
  public static readonly furnaceRecipes: Recipe[] = [];
  public static readonly workbenchRecipes: Recipe[] = [];

  /** Every registered recipe, across all four stations, in registration order. */
  public static get recipes(): Recipe[] {
    return [
      ...Crafting.workbenchRecipes,
      ...Crafting.anvilRecipes,
      ...Crafting.furnaceRecipes,
      ...Crafting.ovenRecipes,
    ];
  }
}

let installed = false;

/**
 * Populate the four recipe groups. Safe to call repeatedly (guarded). Must run
 * after installResources() so the Resource singletons referenced below exist.
 */
export function installRecipes(): void {
  if (installed) return;
  installed = true;

  // ---- Workbench ----
  Crafting.workbenchRecipes.push(
    new FurnitureRecipe(FurnitureRecipe.FurnitureType.LANTERN)
      .addCost(Resource.wood, 5)
      .addCost(Resource.slime, 10)
      .addCost(Resource.glass, 4),
  );
  Crafting.workbenchRecipes.push(
    new FurnitureRecipe(FurnitureRecipe.FurnitureType.OVEN).addCost(Resource.stone, 15),
  );
  Crafting.workbenchRecipes.push(
    new FurnitureRecipe(FurnitureRecipe.FurnitureType.FURNACE).addCost(Resource.stone, 20),
  );
  Crafting.workbenchRecipes.push(
    new FurnitureRecipe(FurnitureRecipe.FurnitureType.WORKBENCH).addCost(Resource.wood, 20),
  );
  Crafting.workbenchRecipes.push(
    new FurnitureRecipe(FurnitureRecipe.FurnitureType.CHEST).addCost(Resource.wood, 20),
  );
  Crafting.workbenchRecipes.push(
    new FurnitureRecipe(FurnitureRecipe.FurnitureType.ANVIL).addCost(Resource.ironIngot, 5),
  );

  Crafting.workbenchRecipes.push(
    new ToolRecipe(ToolType.sword, 0).addCost(Resource.wood, 5),
  );
  Crafting.workbenchRecipes.push(
    new ToolRecipe(ToolType.axe, 0).addCost(Resource.wood, 5),
  );
  Crafting.workbenchRecipes.push(
    new ToolRecipe(ToolType.hoe, 0).addCost(Resource.wood, 5),
  );
  Crafting.workbenchRecipes.push(
    new ToolRecipe(ToolType.pickaxe, 0).addCost(Resource.wood, 5),
  );
  Crafting.workbenchRecipes.push(
    new ToolRecipe(ToolType.shovel, 0).addCost(Resource.wood, 5),
  );
  Crafting.workbenchRecipes.push(
    new ToolRecipe(ToolType.sword, 1).addCost(Resource.wood, 5).addCost(Resource.stone, 5),
  );
  Crafting.workbenchRecipes.push(
    new ToolRecipe(ToolType.axe, 1).addCost(Resource.wood, 5).addCost(Resource.stone, 5),
  );
  Crafting.workbenchRecipes.push(
    new ToolRecipe(ToolType.hoe, 1).addCost(Resource.wood, 5).addCost(Resource.stone, 5),
  );
  Crafting.workbenchRecipes.push(
    new ToolRecipe(ToolType.pickaxe, 1).addCost(Resource.wood, 5).addCost(Resource.stone, 5),
  );
  Crafting.workbenchRecipes.push(
    new ToolRecipe(ToolType.shovel, 1).addCost(Resource.wood, 5).addCost(Resource.stone, 5),
  );

  // ---- Anvil ----
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.sword, 2).addCost(Resource.wood, 5).addCost(Resource.ironIngot, 5),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.axe, 2).addCost(Resource.wood, 5).addCost(Resource.ironIngot, 5),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.hoe, 2).addCost(Resource.wood, 5).addCost(Resource.ironIngot, 5),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.pickaxe, 2).addCost(Resource.wood, 5).addCost(Resource.ironIngot, 5),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.shovel, 2).addCost(Resource.wood, 5).addCost(Resource.ironIngot, 5),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.sword, 3).addCost(Resource.wood, 5).addCost(Resource.goldIngot, 5),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.axe, 3).addCost(Resource.wood, 5).addCost(Resource.goldIngot, 5),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.hoe, 3).addCost(Resource.wood, 5).addCost(Resource.goldIngot, 5),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.pickaxe, 3).addCost(Resource.wood, 5).addCost(Resource.goldIngot, 5),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.shovel, 3).addCost(Resource.wood, 5).addCost(Resource.goldIngot, 5),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.sword, 4).addCost(Resource.wood, 5).addCost(Resource.gem, 50),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.axe, 4).addCost(Resource.wood, 5).addCost(Resource.gem, 50),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.hoe, 4).addCost(Resource.wood, 5).addCost(Resource.gem, 50),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.pickaxe, 4).addCost(Resource.wood, 5).addCost(Resource.gem, 50),
  );
  Crafting.anvilRecipes.push(
    new ToolRecipe(ToolType.shovel, 4).addCost(Resource.wood, 5).addCost(Resource.gem, 50),
  );

  // ---- Furnace ----
  Crafting.furnaceRecipes.push(
    new ResourceRecipe(Resource.ironIngot).addCost(Resource.ironOre, 4).addCost(Resource.coal, 1),
  );
  Crafting.furnaceRecipes.push(
    new ResourceRecipe(Resource.goldIngot).addCost(Resource.goldOre, 4).addCost(Resource.coal, 1),
  );
  Crafting.furnaceRecipes.push(
    new ResourceRecipe(Resource.glass).addCost(Resource.sand, 4).addCost(Resource.coal, 1),
  );

  // ---- Oven ----
  Crafting.ovenRecipes.push(
    new ResourceRecipe(Resource.bread).addCost(Resource.wheat, 4),
  );
}
