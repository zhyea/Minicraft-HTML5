/**
 * Port of crafting/ResourceRecipe.java — yields a single ResourceItem on craft.
 *
 * Faithful 1:1 port. The result template is one ResourceItem of the given
 * resource; craft() adds exactly one such item to the inventory.
 */
import { ResourceItem } from '../item/ResourceItem';
import type { Resource } from '../item/resource/Resource';
import type { Inventory } from '../entity/Inventory';
import { Recipe } from './Recipe';

export class ResourceRecipe extends Recipe {
  private resource: Resource;

  constructor(resource: Resource) {
    super(new ResourceItem(resource, 1));
    this.resource = resource;
  }

  protected produce(inventory: Inventory): void {
    inventory.add(0, new ResourceItem(this.resource, 1));
  }
}
