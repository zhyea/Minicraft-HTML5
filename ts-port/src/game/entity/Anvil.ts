/**
 * Port of entity/Anvil.java — opens the anvil crafting menu.
 *
 * `use` is inherited from Furniture and routes through the `onUse` hook
 * (Sprint 3); Sprint 5 will wire it to open CraftingMenu(Crafting.anvilRecipes).
 */
import { Furniture } from './Furniture';
import { Color } from '../../engine/Color';

export class Anvil extends Furniture {
  constructor() {
    super('铁砧');
    this.col = Color.get(-1, 0, 111, 222);
    this.sprite = 0;
    this.xr = 3;
    this.yr = 2;
  }
}

Furniture.registerFurniture('铁砧', Anvil);
