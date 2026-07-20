<script setup lang="ts">
/**
 * CraftingMenu — station-aware crafting list (workbench / anvil / furnace /
 * oven). Faithful port of screen/CraftingMenu.java: it runs checkCanCraft on
 * every recipe, greys out uncraftable entries, and on confirm calls
 * deductCost(player) then craft(player) — the exact Java split. The active
 * recipe's costs are shown with have/required counts so the player can see
 * what is missing.
 *
 * Presentational: App.vue passes the station's recipe list (Crafting.*Recipes)
 * and the player's Inventory, and handles 'close'.
 */
import { onMounted, onBeforeUnmount, ref } from 'vue';
import type { Recipe } from '../../game/crafting/Recipe';
import type { Inventory } from '../../game/entity/Inventory';
import { ResourceItem } from '../../game/item/ResourceItem';
import ItemIcon from '../ItemIcon.vue';

const props = defineProps<{ recipes: Recipe[]; inventory: Inventory }>();
const emit = defineEmits<{ (e: 'close'): void }>();

interface Entry {
  recipe: Recipe;
  canCraft: boolean;
}

const selected = ref(0);
const entries = ref<Entry[]>([]);

/** Recompute canCraft for every recipe and sort craftable first (Java order). */
function recompute(): void {
  const list: Entry[] = props.recipes.map((r) => {
    r.checkCanCraft(props.inventory);
    return { recipe: r, canCraft: r.canCraft };
  });
  list.sort((a, b) => (b.canCraft ? 1 : 0) - (a.canCraft ? 1 : 0));
  entries.value = list;
  if (selected.value >= list.length) selected.value = Math.max(0, list.length - 1);
}

/** Craft the recipe at index (Java: deductCost + craft). No-op if uncraftable. */
function craftAt(i: number): void {
  const e = entries.value[i];
  if (!e || !e.canCraft) return;
  e.recipe.deductCost(props.inventory);
  e.recipe.craft(props.inventory);
  recompute();
}

function move(delta: number): void {
  const len = entries.value.length;
  if (len === 0) return;
  selected.value = (selected.value + delta + len) % len;
}

function onKey(e: KeyboardEvent): void {
  const code = e.code;
  if (code === 'ArrowUp' || code === 'KeyW') {
    e.preventDefault();
    move(-1);
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    e.preventDefault();
    move(1);
  } else if (code === 'Enter' || code === 'KeyC') {
    e.preventDefault();
    craftAt(selected.value);
  } else if (code === 'KeyX' || code === 'Escape') {
    e.preventDefault();
    emit('close');
  }
}

// Populate the recipe list synchronously during setup so the FIRST render
// already shows the entries. (Doing it only in onMounted queues a nextTick
// re-render, which leaves a one-tick empty flash and breaks synchronous unit
// asserts on the initial DOM — matching Java, the menu lists its recipes the
// moment it opens.)
recompute();

onMounted(() => {
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

defineExpose({ craftAt, recompute });
</script>

<template>
  <div class="menu-frame crafting-menu">
    <h2 class="menu-title">合成</h2>
    <ul v-if="entries.length" class="recipe-list">
      <li
        v-for="(e, i) in entries"
        :key="i"
        class="recipe-row"
        :class="{ active: i === selected, disabled: !e.canCraft }"
      >
        <button
          type="button"
          class="recipe-btn"
          :disabled="!e.canCraft"
          @click="craftAt(i)"
        >
          <ItemIcon :item="e.recipe.resultTemplate" />
          <span class="recipe-name">{{ e.recipe.resultTemplate.getName() }}</span>
          <span class="recipe-state">{{ e.canCraft ? '可合成' : '材料不足' }}</span>
        </button>
      </li>
    </ul>
    <p v-else class="empty">（无配方）</p>

    <div v-if="entries.length" class="cost-panel">
      <h3 class="cost-title">消耗</h3>
      <ul class="cost-list">
        <li v-for="(cost, ci) in entries[selected].recipe.costs" :key="ci" class="cost-row">
          <ItemIcon :item="cost" />
          <span class="cost-name">{{ cost.getName() }}</span>
          <span
            class="cost-amt"
            :class="{ missing: !(cost instanceof ResourceItem && inventory.hasResources(cost.resource, cost.count)) }"
          >
            {{ cost instanceof ResourceItem ? cost.count : 1 }} / {{ inventory.count(cost) }}
          </span>
        </li>
      </ul>
    </div>

    <p class="hint">↑↓ 选择 · C 合成 · X 关闭</p>
  </div>
</template>

<style scoped>
.menu-frame {
  font-family: 'Courier New', ui-monospace, monospace;
  color: #e8e8e8;
  text-align: center;
  user-select: none;
  background: rgba(8, 8, 12, 0.92);
  border: 2px solid #555;
  padding: 16px 22px;
  min-width: 300px;
}
.menu-title {
  color: #f4d35e;
  margin: 0 0 12px;
  font-size: 22px;
  letter-spacing: 4px;
}
.recipe-list,
.cost-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.recipe-row.active {
  outline: 1px solid #f4d35e;
}
.recipe-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 4px 8px;
  font: inherit;
  color: inherit;
  background: rgba(244, 211, 94, 0.06);
  border: none;
  cursor: pointer;
  text-align: left;
}
.recipe-row.disabled .recipe-btn {
  color: #777;
  cursor: not-allowed;
  background: transparent;
}
.recipe-name {
  flex: 1;
  text-align: left;
}
.recipe-state {
  font-size: 12px;
  color: #9aa0a6;
}
.recipe-row.disabled .recipe-state {
  color: #a55;
}
.empty {
  color: #9aa0a6;
  margin: 8px 0;
}
.cost-panel {
  margin-top: 12px;
  border-top: 1px solid #444;
  padding-top: 8px;
}
.cost-title {
  color: #f4d35e;
  font-size: 14px;
  margin: 0 0 6px;
}
.cost-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  padding: 2px 0;
}
.cost-name {
  flex: 1;
  text-align: left;
}
.cost-amt {
  color: #9ad0ff;
}
.cost-amt.missing {
  color: #e06b6b;
}
.hint {
  color: #9aa0a6;
  font-size: 13px;
  margin: 14px 0 0;
}
</style>
