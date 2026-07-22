import { describe, it, expect, beforeAll } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { Resource } from '../item/resource/Resource';
import { ResourceItem } from '../item/ResourceItem';
import { ToolItem } from '../item/ToolItem';
import { ToolType } from '../item/ToolType';
import { FurnitureItem } from '../item/FurnitureItem';
import { PowerGloveItem } from '../item/PowerGloveItem';
import { Item } from '../item/Item';
import { Workbench } from '../entity/Workbench';

beforeAll(() => {
  // Resource singletons (wood / gem / ...) must be installed before use.
  installTiles();
  installResources();
});

describe('Item.getDescription() — inventory description text (#item-desc)', () => {
  it('ResourceItem(wood) returns the 木 description from the registry', () => {
    const item = new ResourceItem(Resource.wood);
    expect(item.getDescription()).toBe('砍树获得，用途最广的基础材料，可合成木级工具与家具。');
  });

  it('ResourceItem(gem) returns the 宝石 description from the registry', () => {
    const item = new ResourceItem(Resource.gem);
    expect(item.getDescription()).toBe('地下深处挖到，集满 50 个可做顶级宝石工具武器。');
  });

  it('ToolItem(sword, 4) appends the level note and the type blurb', () => {
    const desc = new ToolItem(ToolType.sword, 4).getDescription();
    expect(desc).toContain('近战武器');
    expect(desc).toContain('木<石<铁<金<宝石，等级越高，伤害或效率越高。');
  });

  it('ToolItem(shovel, 0) returns the 铲 blurb', () => {
    const desc = new ToolItem(ToolType.shovel, 0).getDescription();
    expect(desc).toContain('整理地形的好帮手');
  });

  it('FurnitureItem(Workbench) returns the 工作台 description', () => {
    const item = new FurnitureItem(new Workbench());
    expect(item.getDescription()).toBe('靠近按 X 打开合成界面，做木石级工具与多种家具。');
  });

  it('PowerGloveItem returns the constant power-glove description', () => {
    expect(new PowerGloveItem().getDescription()).toBe('手持它对准已放下的家具按攻击键，即可收回背包。');
  });

  it('base Item returns an empty string (fallback)', () => {
    expect(new Item().getDescription()).toBe('');
  });
});
