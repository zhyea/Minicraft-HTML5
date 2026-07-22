/**
 * Port of crafting/ToolRecipe.java — yields a single ToolItem on craft.
 *
 * Faithful 1:1 port. The result template is one ToolItem of the given type +
 * level; craft() adds exactly one such tool to the inventory.
 */
import { ToolItem } from '../item/ToolItem';
import { ToolType } from '../item/ToolType';
import type { Inventory } from '../entity/Inventory';
import { Recipe } from './Recipe';

export class ToolRecipe extends Recipe {
  private type: ToolType;
  private level: number;

  constructor(type: ToolType, level: number) {
    super(new ToolItem(type, level));
    this.type = type;
    this.level = level;
  }

  protected produce(inventory: Inventory): void {
    inventory.add(0, new ToolItem(this.type, this.level));
  }
}
