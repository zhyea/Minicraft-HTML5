/**
 * Port of entity/Workbench.java — opens the workbench crafting menu.
 *
 * `use` is inherited from Furniture and routes through the `onUse` hook
 * (Sprint 3); Sprint 5 will wire it to open CraftingMenu(Crafting.workbenchRecipes).
 */
import { Furniture } from './Furniture';
import { Color } from '../../engine/Color';

export class Workbench extends Furniture {
  constructor() {
    super('工作台');
    this.col = Color.get(-1, 100, 321, 431);
    this.sprite = 4;
    this.xr = 3;
    this.yr = 2;
  }
}

Furniture.registerFurniture('工作台', Workbench);
