/**
 * Port of entity/Furnace.java — opens the furnace smelting menu.
 *
 * NOTE: the provided Java Furnace.java contains only the constructor + `use`;
 * the input->output smelt happens in the CraftingMenu UI (deferred to Sprint 5),
 * so there is no per-tick smelt logic to port here. `use` is inherited from
 * Furniture and routes through the `onUse` hook (Sprint 3); Sprint 5 will wire
 * it to open CraftingMenu(Crafting.furnaceRecipes).
 */
import { Furniture } from './Furniture';
import { Color } from '../../engine/Color';

export class Furnace extends Furniture {
  constructor() {
    super('熔炉');
    this.col = Color.get(-1, 0, 222, 333);
    this.sprite = 3;
    this.xr = 3;
    this.yr = 2;
  }
}

Furniture.registerFurniture('熔炉', Furnace);
