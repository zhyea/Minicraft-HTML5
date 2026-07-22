import { describe, it, expect, beforeAll } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { groupItems } from '../../ui/inventoryGroup';
import { ResourceItem } from '../item/ResourceItem';
import { ToolItem } from '../item/ToolItem';
import { ToolType } from '../item/ToolType';
import { Resource } from '../item/resource/Resource';

beforeAll(() => { installTiles(); installResources(); });

describe('groupItems aggregation', () => {
  it('merges N identical tools into one group with count=N', () => {
    const items = [new ToolItem(ToolType.sword, 0), new ToolItem(ToolType.sword, 0), new ToolItem(ToolType.sword, 0)];
    const g = groupItems(items);
    expect(g).toHaveLength(1);
    expect(g[0].name).toBe('木剑');
    expect(g[0].count).toBe(3);
    expect(g[0].items).toHaveLength(3);
  });

  it('keeps different tools in separate groups', () => {
    const items = [new ToolItem(ToolType.sword, 0), new ToolItem(ToolType.axe, 0)];
    const g = groupItems(items);
    expect(g).toHaveLength(2);
    expect(g.map((x) => x.name).sort()).toEqual(['木剑', '木斧']);
  });

  it('merges a single ResourceItem by its count', () => {
    const items = [new ResourceItem(Resource.wood, 20)];
    const g = groupItems(items);
    expect(g).toHaveLength(1);
    expect(g[0].name).toBe('木');
    expect(g[0].count).toBe(20);
  });

  it('sums multiple ResourceItem instances of same resource', () => {
    const items = [new ResourceItem(Resource.wood, 20), new ResourceItem(Resource.wood, 5)];
    const g = groupItems(items);
    expect(g).toHaveLength(1);
    expect(g[0].count).toBe(25);
  });

  it('separates different resources', () => {
    const items = [new ResourceItem(Resource.wood, 3), new ResourceItem(Resource.stone, 2)];
    const g = groupItems(items);
    expect(g.map((x) => x.name).sort()).toEqual(['木', '石']);
  });
});
