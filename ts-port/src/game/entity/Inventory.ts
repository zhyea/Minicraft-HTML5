/**
 * Port of entity/Inventory.java — faithful 1:1 port of the item slot model.
 *
 * The GWT original keeps a flat `List<Item>`. ResourceItems of the same
 * Resource stack by incrementing count (see findResource), while all other
 * items simply append. The slot-add overload, hasResources, removeResource and
 * count APIs are preserved exactly.
 */
import { Item } from '../item/Item';
import { ResourceItem } from '../item/ResourceItem';
import type { Resource } from '../item/resource/Resource';

export class Inventory {
  public items: Item[] = [];

  public add(item: Item): void;
  public add(slot: number, item: Item): void;
  public add(slotOrItem: Item | number, item?: Item): void {
    let slot: number;
    let it: Item;
    if (typeof slotOrItem === 'number') {
      slot = slotOrItem;
      it = item!;
    } else {
      slot = this.items.length;
      it = slotOrItem;
    }
    if (it instanceof ResourceItem) {
      const toTake = it;
      const has = this.findResource(toTake.resource);
      if (has == null) {
        this.items.splice(slot, 0, toTake);
      } else {
        has.count += toTake.count;
      }
    } else {
      this.items.splice(slot, 0, it);
    }
  }

  private findResource(resource: Resource): ResourceItem | null {
    for (const item of this.items) {
      if (item instanceof ResourceItem) {
        const has = item;
        if (has.resource === resource) return has;
      }
    }
    return null;
  }

  public hasResources(r: Resource, count: number): boolean {
    const ri = this.findResource(r);
    if (ri == null) return false;
    return ri.count >= count;
  }

  public removeResource(r: Resource, count: number): boolean {
    const ri = this.findResource(r);
    if (ri == null) return false;
    if (ri.count < count) return false;
    ri.count -= count;
    if (ri.count <= 0) {
      const idx = this.items.indexOf(ri);
      if (idx >= 0) this.items.splice(idx, 1);
    }
    return true;
  }

  public count(item: Item): number {
    if (item instanceof ResourceItem) {
      const ri = this.findResource(item.resource);
      if (ri != null) return ri.count;
    } else {
      let c = 0;
      for (const it of this.items) {
        if (it.matches(item)) c++;
      }
      return c;
    }
    return 0;
  }
}
