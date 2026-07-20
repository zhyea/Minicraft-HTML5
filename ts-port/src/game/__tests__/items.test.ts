import { describe, it, expect, beforeAll } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { Resource } from '../item/resource/Resource';
import { ToolItem } from '../item/ToolItem';
import { ToolType } from '../item/ToolType';
import { ResourceItem } from '../item/ResourceItem';
import { Inventory } from '../entity/Inventory';
import { Color } from '../../engine/Color';

beforeAll(() => {
  // Resource statics require the Tile singletons to be installed first.
  installTiles();
  installResources();
});

describe('Resource registry integrity (item/resource/Resource.java port)', () => {
  // [name, sprite, color] — transcribed verbatim from the GWT Resource.java.
  const expected: Array<[string, number, number]> = [
    ['木', 1 + 4 * 32, Color.get(-1, 200, 531, 430)],
    ['石', 2 + 4 * 32, Color.get(-1, 111, 333, 555)],
    ['鲜花', 0 + 4 * 32, Color.get(-1, 10, 444, 330)],
    ['橡果', 3 + 4 * 32, Color.get(-1, 100, 531, 320)],
    ['泥土', 2 + 4 * 32, Color.get(-1, 100, 322, 432)],
    ['沙', 2 + 4 * 32, Color.get(-1, 110, 440, 550)],
    ['仙人掌', 4 + 4 * 32, Color.get(-1, 10, 40, 50)],
    ['种子', 5 + 4 * 32, Color.get(-1, 10, 40, 50)],
    ['小麦', 6 + 4 * 32, Color.get(-1, 110, 330, 550)],
    ['面包', 8 + 4 * 32, Color.get(-1, 110, 330, 550)],
    ['苹果', 9 + 4 * 32, Color.get(-1, 100, 300, 500)],
    // Java "Color.get(-1, 000, 111, 111)" -> octal 000 == 0
    ['煤', 10 + 4 * 32, Color.get(-1, 0, 111, 111)],
    ['铁矿', 10 + 4 * 32, Color.get(-1, 100, 322, 544)],
    ['金矿', 10 + 4 * 32, Color.get(-1, 110, 440, 553)],
    ['铁锭', 11 + 4 * 32, Color.get(-1, 100, 322, 544)],
    ['金锭', 11 + 4 * 32, Color.get(-1, 110, 330, 553)],
    ['黏液', 10 + 4 * 32, Color.get(-1, 10, 30, 50)],
    ['玻璃', 12 + 4 * 32, Color.get(-1, 555, 555, 555)],
    ['布', 1 + 4 * 32, Color.get(-1, 25, 252, 141)],
    ['云', 2 + 4 * 32, Color.get(-1, 222, 555, 444)],
    ['宝石', 13 + 4 * 32, Color.get(-1, 101, 404, 545)],
  ];

  it('registers every expected resource and none are null', () => {
    for (const [name, sprite, color] of expected) {
      const r = Resource.getByName(name);
      expect(r, `resource "${name}" should be registered`).not.toBeNull();
      expect(r!.sprite).toBe(sprite);
      expect(r!.color).toBe(color);
    }
  });

  it('getByName resolves the same singleton as the static field', () => {
    expect(Resource.getByName('木')).toBe(Resource.wood);
    expect(Resource.getByName('石')).toBe(Resource.stone);
    expect(Resource.getByName('宝石')).toBe(Resource.gem);
    expect(Resource.getByName('苹果')).toBe(Resource.apple);
    expect(Resource.getByName('面包')).toBe(Resource.bread);
  });

  it('returns null for an unknown resource name', () => {
    expect(Resource.getByName('does-not-exist')).toBeNull();
  });
});

describe('ToolItem.getAttackDamageBonus (matches Java ranges)', () => {
  // GWT: axe = (level+1)*2 + rand(4); sword = (level+1)*3 + rand(2 + level*level*2)
  // where rand(n) is nextInt(n) in [0, n-1].
  function bounds(type: ToolType, level: number): [number, number] {
    if (type === ToolType.axe) {
      const base = (level + 1) * 2;
      return [base, base + 4 - 1];
    }
    if (type === ToolType.sword) {
      const base = (level + 1) * 3;
      const span = 2 + level * level * 2;
      return [base, base + span - 1];
    }
    return [1, 1]; // shovel / hoe / pickaxe fallback
  }

  function allInRange(type: ToolType, level: number, samples = 3000): void {
    const [min, max] = bounds(type, level);
    for (let i = 0; i < samples; i++) {
      const v = new ToolItem(type, level).getAttackDamageBonus(null as unknown as never);
      expect(v, `sample out of [${min}, ${max}]`).toBeGreaterThanOrEqual(min);
      expect(v, `sample out of [${min}, ${max}]`).toBeLessThanOrEqual(max);
    }
  }

  it('wood sword (level 0) lands in 3..4', () => allInRange(ToolType.sword, 0));
  it('stone sword (level 1) lands in 6..9', () => allInRange(ToolType.sword, 1));
  it('iron sword (level 2) lands in 9..18', () => allInRange(ToolType.sword, 2));
  it('gem sword (level 4) lands in 15..52', () => allInRange(ToolType.sword, 4));
  it('wood axe (level 0) lands in 2..5', () => allInRange(ToolType.axe, 0));
  it('gem axe (level 4) lands in 10..13', () => allInRange(ToolType.axe, 4));

  it('non-attack tools (shovel/hoe/pickaxe) always return 1', () => {
    for (const t of [ToolType.shovel, ToolType.hoe, ToolType.pickaxe]) {
      for (let i = 0; i < 200; i++) {
        expect(new ToolItem(t, 0).getAttackDamageBonus(null as unknown as never)).toBe(1);
      }
    }
  });

  it('name/sprite follow Java LEVEL_NAMES + ToolType.sprite', () => {
    const wood = new ToolItem(ToolType.sword, 0);
    expect(wood.getName()).toBe('木剑'); // 木 + 剑
    expect(wood.getSprite()).toBe(ToolType.sword.sprite + 5 * 32);
    expect(new ToolItem(ToolType.axe, 2).getName()).toBe('铁斧');
  });

  it('matches() compares type and level', () => {
    expect(new ToolItem(ToolType.sword, 0).matches(new ToolItem(ToolType.sword, 0))).toBe(true);
    expect(new ToolItem(ToolType.sword, 0).matches(new ToolItem(ToolType.sword, 1))).toBe(false);
    expect(new ToolItem(ToolType.sword, 0).matches(new ToolItem(ToolType.axe, 0))).toBe(false);
  });
});

describe('Inventory add / remove / count (entity/Inventory.java port)', () => {
  it('stacks ResourceItems of the same resource and counts them', () => {
    const inv = new Inventory();
    inv.add(new ResourceItem(Resource.wood, 3));
    inv.add(new ResourceItem(Resource.wood, 2));
    expect(inv.items.length).toBe(1); // stacked, not appended
    expect(inv.count(new ResourceItem(Resource.wood))).toBe(5);
  });

  it('keeps distinct resources as separate slots', () => {
    const inv = new Inventory();
    inv.add(new ResourceItem(Resource.wood, 3));
    inv.add(new ResourceItem(Resource.stone, 1));
    expect(inv.items.length).toBe(2);
    expect(inv.count(new ResourceItem(Resource.wood))).toBe(3);
    expect(inv.count(new ResourceItem(Resource.stone))).toBe(1);
  });

  it('hasResources reflects the stacked count', () => {
    const inv = new Inventory();
    inv.add(new ResourceItem(Resource.wood, 5));
    expect(inv.hasResources(Resource.wood, 5)).toBe(true);
    expect(inv.hasResources(Resource.wood, 6)).toBe(false);
  });

  it('removeResource decrements and drops the slot when depleted', () => {
    const inv = new Inventory();
    inv.add(new ResourceItem(Resource.wood, 5));
    expect(inv.removeResource(Resource.wood, 2)).toBe(true);
    expect(inv.count(new ResourceItem(Resource.wood))).toBe(3);
    expect(inv.items.length).toBe(1);

    expect(inv.removeResource(Resource.wood, 3)).toBe(true);
    expect(inv.count(new ResourceItem(Resource.wood))).toBe(0);
    expect(inv.items.length).toBe(0); // slot removed when count hit 0

    expect(inv.removeResource(Resource.wood, 1)).toBe(false); // nothing left
  });

  it('counts tool items by type+level via matches()', () => {
    const inv = new Inventory();
    inv.add(new ToolItem(ToolType.sword, 0));
    inv.add(new ToolItem(ToolType.sword, 0));
    inv.add(new ToolItem(ToolType.axe, 0));
    expect(inv.count(new ToolItem(ToolType.sword, 0))).toBe(2);
    expect(inv.count(new ToolItem(ToolType.axe, 0))).toBe(1);
  });
});
