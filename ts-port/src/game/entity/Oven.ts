/**
 * Port of entity/Oven.java — opens the oven smelting menu.
 *
 * NOTE: the provided Java Oven.java contains only the constructor + `use`;
 * the input->output smelt happens in the CraftingMenu UI (deferred to Sprint 5),
 * so there is no per-tick smelt logic to port here. `use` is inherited from
 * Furniture and routes through the `onUse` hook (Sprint 3); Sprint 5 will wire
 * it to open CraftingMenu(Crafting.ovenRecipes).
 */
import { Furniture } from './Furniture';
import { Color } from '../../engine/Color';

export class Oven extends Furniture {
  constructor() {
    super('烤箱');
    this.col = Color.get(-1, 0, 332, 442);
    this.sprite = 2;
    this.xr = 3;
    this.yr = 2;
  }
}

Furniture.registerFurniture('烤箱', Oven);
