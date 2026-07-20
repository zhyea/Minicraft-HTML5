/**
 * ItemIO — serialises the four item variants to/from plain JSON objects.
 *
 * Dispatch key is `kind`:
 *   'resource'    -> ResourceItem   { resource: Resource.name, count }
 *   'tool'        -> ToolItem       { type: ToolType.name, level }
 *   'furniture'   -> FurnitureItem  { furniture: Furniture.name, placed }
 *   'powerglove'  -> PowerGloveItem (no payload)
 *
 * Resources/Tools/Furniture are resolved back through their existing
 * `getByName` registries, so the persisted form is name-based and stable
 * across process runs. Unknown payloads round-trip to null and are dropped by
 * the caller (defensive against forward-incompatible saves).
 */
import type { Item } from '../item/Item';
import { ResourceItem } from '../item/ResourceItem';
import { ToolItem } from '../item/ToolItem';
import { FurnitureItem } from '../item/FurnitureItem';
import { PowerGloveItem } from '../item/PowerGloveItem';
import { Resource } from '../item/resource/Resource';
import { ToolType } from '../item/ToolType';
import { Furniture } from '../entity/Furniture';

export class ItemIO {
  /** Serialise an item, or null if it has no persistent representation. */
  public static write(item: Item): Record<string, unknown> | null {
    if (item instanceof ResourceItem) {
      return { kind: 'resource', resource: item.resource.name, count: item.count };
    }
    if (item instanceof ToolItem) {
      return { kind: 'tool', type: item.type.name, level: item.level };
    }
    if (item instanceof FurnitureItem) {
      return { kind: 'furniture', furniture: item.furniture.name, placed: item.placed };
    }
    if (item instanceof PowerGloveItem) {
      return { kind: 'powerglove' };
    }
    return null;
  }

  /** Reconstruct an item, or null if the payload is unrecognised. */
  public static read(o: unknown): Item | null {
    if (!o || typeof o !== 'object') return null;
    const obj = o as Record<string, unknown>;
    const kind = obj.kind;
    switch (kind) {
      case 'resource': {
        const r = Resource.getByName(obj.resource as string);
        if (!r) return null;
        return new ResourceItem(r, (obj.count as number) ?? 1);
      }
      case 'tool': {
        const t = ToolType.getByName(obj.type as string);
        if (!t) return null;
        return new ToolItem(t, (obj.level as number) ?? 0);
      }
      case 'furniture': {
        const f = Furniture.createByName(obj.furniture as string);
        if (!f) return null;
        const it = new FurnitureItem(f);
        it.placed = obj.placed === true;
        return it;
      }
      case 'powerglove':
        return new PowerGloveItem();
      default:
        return null;
    }
  }
}
