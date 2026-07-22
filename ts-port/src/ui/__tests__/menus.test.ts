// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import InventoryMenu from '../menus/InventoryMenu.vue';
import CraftingMenu from '../menus/CraftingMenu.vue';
import ContainerMenu from '../menus/ContainerMenu.vue';
import DeadMenu from '../menus/DeadMenu.vue';
import WonMenu from '../menus/WonMenu.vue';
import { installTiles } from '../../game/level/tile/registry';
import { installResources } from '../../game/item/resource/registry';
import { installRecipes, Crafting } from '../../game/crafting/Crafting';
import { ResourceItem } from '../../game/item/ResourceItem';
import { ToolItem } from '../../game/item/ToolItem';
import { ToolType } from '../../game/item/ToolType';
import { ToolRecipe } from '../../game/crafting/ToolRecipe';
import { Resource } from '../../game/item/resource/Resource';
import { Inventory } from '../../game/entity/Inventory';
import { Chest } from '../../game/entity/Chest';

// Gem sword (anvil, level 4): costs wood x5 + gem x50. Computed inside
// beforeAll (after installRecipes populates anvilRecipes), NOT at module-eval
// time — at import time anvilRecipes is still empty and the find would return
// undefined, which would make CraftingMenu.props.recipes = [undefined] and
// throw in recompute().
let gemSword: ToolRecipe;

beforeAll(() => {
  // Recipes reference Resource/Tile singletons; install order matters.
  installTiles();
  installResources();
  installRecipes();
  gemSword = Crafting.anvilRecipes.find(
    (r) =>
      r instanceof ToolRecipe &&
      (r.resultTemplate as ToolItem).type === ToolType.sword &&
      (r.resultTemplate as ToolItem).level === 4,
  ) as ToolRecipe;
});

let mounted: ReturnType<typeof mount>[] = [];
afterEach(() => {
  mounted.forEach((m) => m.unmount());
  mounted = [];
});
function track<T extends ReturnType<typeof mount>>(m: T): T {
  mounted.push(m);
  return m;
}

describe('InventoryMenu', () => {
  it('renders the player items with their counts', () => {
    const items = [new ResourceItem(Resource.wood, 5), new ToolItem(ToolType.sword, 0)];
    const wrapper = track(mount(InventoryMenu, { props: { items } }));

    expect(wrapper.findAll('.item-cell').length).toBe(2);
    expect(wrapper.text()).toContain('木'); // wood (Chinese display name)
    expect(wrapper.text()).toContain('x5'); // stacked count
    expect(wrapper.text()).toContain('木剑'); // tool display name
  });

  it('emits "select" with the clicked item so App can equip it', async () => {
    const items = [new ResourceItem(Resource.wood, 5), new ToolItem(ToolType.sword, 0)];
    const wrapper = track(mount(InventoryMenu, { props: { items } }));

    await wrapper.findAll('.item-cell')[1].trigger('click');

    const emitted = wrapper.emitted('select');
    expect(emitted).toBeTruthy();
    // payload[0] is the Item the player chose to hold (reactive proxy of it).
    const chosen = emitted![0][0] as ToolItem;
    expect(chosen).toBeInstanceOf(ToolItem);
    expect(chosen.getName()).toBe('木剑');
    expect(chosen.level).toBe(0);
  });
});

describe('CraftingMenu', () => {
  it('lists the station recipes and disables uncraftable ones', () => {
    const poor = new Inventory();
    poor.add(new ResourceItem(Resource.wood, 5)); // missing gems
    const wrapper = track(mount(CraftingMenu, { props: { recipes: [gemSword], inventory: poor } }));

    expect(wrapper.findAll('button').length).toBe(1);
    expect(wrapper.text()).toContain('宝石剑');
    // canCraft false -> the craft button is disabled.
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('crafting deducts the cost and adds the result', () => {
    const rich = new Inventory();
    rich.add(new ResourceItem(Resource.wood, 5));
    rich.add(new ResourceItem(Resource.gem, 50));
    const wrapper = track(mount(CraftingMenu, { props: { recipes: [gemSword], inventory: rich } }));

    expect(wrapper.find('button').attributes('disabled')).toBeUndefined();
    wrapper.vm.craftAt(0);

    expect(rich.count(new ToolItem(ToolType.sword, 4))).toBe(1); // result added
    expect(rich.count(new ResourceItem(Resource.wood))).toBe(0); // cost consumed
    expect(rich.count(new ResourceItem(Resource.gem))).toBe(0); // cost consumed
  });
});

describe('ContainerMenu', () => {
  it('moves an item from the chest into the player inventory', () => {
    const chest = new Chest();
    chest.inventory.add(new ResourceItem(Resource.apple, 2));
    const player = new Inventory();

    const wrapper = track(
      mount(ContainerMenu, {
        props: { title: '箱子', container: chest.inventory, playerInventory: player },
      }),
    );

    expect(wrapper.text()).toContain('苹果');
    expect(chest.inventory.count(new ResourceItem(Resource.apple))).toBe(2);

    wrapper.vm.transfer(true, 0); // move from container (index 0) to player

    expect(chest.inventory.count(new ResourceItem(Resource.apple))).toBe(0);
    expect(player.count(new ResourceItem(Resource.apple))).toBe(2);
  });
});

describe('DeadMenu', () => {
  it('renders the death screen with score', () => {
    const wrapper = track(mount(DeadMenu, { props: { score: 42, time: 75 } }));
    expect(wrapper.text()).toContain('你死了！呜！');
    expect(wrapper.text()).toContain('42');
  });
});

describe('WonMenu', () => {
  it('shows when Game.hasWon is true', () => {
    const wrapper = track(mount(WonMenu, { props: { hasWon: true, score: 1000, time: 123 } }));
    expect(wrapper.find('.won-menu').exists()).toBe(true);
    expect(wrapper.text()).toContain('你赢了！耶！');
    expect(wrapper.text()).toContain('1000');
  });

  it('is hidden when Game.hasWon is false', () => {
    const wrapper = track(mount(WonMenu, { props: { hasWon: false, score: 0, time: 0 } }));
    expect(wrapper.find('.won-menu').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('你赢了');
  });
});
