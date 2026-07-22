import type { Item } from '../game/item/Item';
import { ResourceItem } from '../game/item/ResourceItem';

export interface InventoryGroup {
  item: Item;      // 代表实例（用于渲染图标/名称/描述，及 select 时回传）
  name: string;
  count: number;
  items: Item[];   // 底层所有同名实例（select 用 items[0]）
}

export function groupItems(items: Item[]): InventoryGroup[] {
  const map = new Map<string, InventoryGroup>();
  for (const it of items) {
    const key = it.getName();
    const add = it instanceof ResourceItem ? it.count : 1;
    const existing = map.get(key);
    if (existing) {
      existing.count += add;
      existing.items.push(it);
    } else {
      map.set(key, { item: it, name: key, count: add, items: [it] });
    }
  }
  return Array.from(map.values());
}
