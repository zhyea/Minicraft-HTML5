<script setup lang="ts">
/**
 * InventoryMenu — lists the player's inventory (icon + name + count).
 *
 * Faithful port of screen/InventoryMenu.java's render frame ("背包") plus a
 * 1:1 of the item list. Navigation + close mirror the Java menu (up/down to
 * move the cursor, menu key to close). It is a pure presentational overlay:
 * App.vue feeds it `items` from Player.inventory and handles the close.
 */
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import type { Item } from '../../game/item/Item';
import { ResourceItem } from '../../game/item/ResourceItem';
import { FoodResource } from '../../game/item/resource/FoodResource';
import ItemIcon from '../ItemIcon.vue';
import { groupItems } from '../inventoryGroup';
import type { InventoryGroup } from '../inventoryGroup';
import { getActiveGame } from '../../game/state';

const props = defineProps<{ items: Item[] }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'help'): void; (e: 'craft'): void; (e: 'save'): void; (e: 'select', item: Item): void }>();

const selected = ref(0);
/** Bumped after an in-place inventory mutation (e.g. eating a food stack) so
 *  the grid recomputes even though props.items is the same array reference. */
const nonce = ref(0);

// Grid column count: drives the up/down navigation step and the CSS grid.
const GRID_COLS = 9;

const rows = computed<InventoryGroup[]>(() => { nonce.value; return groupItems(props.items); });

// Selected item's zh-CN description, shown beneath the list. Empty string hides it.
const selectedDesc = computed(() => {
  const row = rows.value[selected.value];
  return row ? row.item.getDescription() : '';
});

// ---- Manual save feedback (背包「保存」按钮 / Q 键) ----
const savedFlash = ref(false);
let savedTimer: ReturnType<typeof setTimeout> | undefined;
function onSave(): void {
  const g = getActiveGame();
  if (!g) return;
  g.saveGame();
  savedFlash.value = true;
  if (savedTimer) clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { savedFlash.value = false; }, 1500);
}

function clamp(): void {
  const n = rows.value.length;
  if (n === 0) { selected.value = 0; return; }
  selected.value = (selected.value % n + n) % n;
}

function onKey(e: KeyboardEvent): void {
  const code = e.code;
  if (code === 'ArrowLeft' || code === 'KeyA') {
    e.preventDefault();
    selected.value--;
    clamp();
  } else if (code === 'ArrowRight' || code === 'KeyD') {
    e.preventDefault();
    selected.value++;
    clamp();
  } else if (code === 'ArrowUp' || code === 'KeyW') {
    e.preventDefault();
    selected.value -= GRID_COLS;
    clamp();
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    e.preventDefault();
    selected.value += GRID_COLS;
    clamp();
  } else if (code === 'Enter' || code === 'KeyC') {
    // Equip the highlighted item into the player's hand, then close.
    e.preventDefault();
    const row = rows.value[selected.value];
    if (row) emit('select', row.item);
  } else if (code === 'KeyE') {
    // 打开随身合成（基础配方，含第一张工作台），无需先有工作台。
    e.preventDefault();
    emit('craft');
  } else if (code === 'KeyQ') {
    // 手动保存当前进度到 localStorage。
    e.preventDefault();
    onSave();
  } else if (code === 'KeyX' || code === 'Escape') {
    // Cancel: keep the current held item, just close the inventory.
    e.preventDefault();
    emit('close');
  }
}

/** Click a cell: just highlight it (mirrors the keyboard cursor). No equip/close. */
function selectRow(i: number): void {
  selected.value = i;
}

/**
 * Double-click a cell:
 *  - Food  -> eat it (heal) and stay in the menu; bump nonce to refresh counts.
 *  - Other -> legacy behaviour: equip-and-close (emit 'select').
 * Food is detected locally so a full-HP bite still won't close the menu.
 */
function eatRow(i: number): void {
  const row = rows.value[i];
  if (!row) return;
  // Food: eat (heal) and stay in the menu. Requires the live player.
  if (row.item instanceof ResourceItem && row.item.resource instanceof FoodResource) {
    const p = getActiveGame()?.player;
    if (!p) return; // no active game (e.g. headless test) — nothing to eat
    p.eatFromInventory(row.item);
    nonce.value++;
    return;
  }
  // Non-food: double-click == equip-and-close (matches the old single-click path).
  emit('select', row.item);
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  if (savedTimer) clearTimeout(savedTimer);
});
</script>

<template>
  <div class="menu-frame inventory-menu">
    <h2 class="menu-title">背包</h2>
    <div v-if="rows.length" class="item-grid">
      <button
        v-for="(row, i) in rows"
        :key="i"
        type="button"
        class="item-cell"
        :class="{ active: i === selected }"
        @click="selectRow(i)"
        @dblclick="eatRow(i)"
      >
        <ItemIcon :item="row.item" />
        <span class="cell-name">{{ row.name }}</span>
        <span v-if="row.count > 1" class="cell-count">x{{ row.count }}</span>
      </button>
    </div>
    <p v-else class="empty">（空）</p>
    <p v-if="selectedDesc" class="item-desc">{{ selectedDesc }}</p>
    <p v-else class="empty">（空）</p>
    <div class="btn-row">
      <button type="button" class="help-btn" @click="emit('craft')">随身合成 (E)</button>
      <button type="button" class="help-btn" @click="onSave">保存 (Q)</button>
      <button type="button" class="help-btn" @click="emit('help')">玩法说明 (H)</button>
    </div>
    <p v-if="savedFlash" class="saved-flash">已保存 ✓</p>
    <p class="hint">单击选中 · 双击食物补血 / 双击其它装备 · C/Enter 装备并关闭 · E 随身合成 · Q 保存 · X 关闭</p>
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
  min-width: 260px;
}
.menu-title {
  color: #f4d35e;
  margin: 0 0 12px;
  font-size: 22px;
  letter-spacing: 4px;
}
.item-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 8px;
  margin: 0 auto;
  max-width: 540px;
}
.item-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 4px;
  background: rgba(255,255,255,0.04);
  border: 1px solid #444;
  border-radius: 4px;
  color: #e8e8e8;
  cursor: pointer;
  font-family: 'Courier New', ui-monospace, monospace;
}
.item-cell.active {
  outline: 2px solid #f4d35e;
  background: rgba(244,211,94,0.15);
}
.cell-name {
  font-size: 12px;
  text-align: center;
  line-height: 1.1;
}
.cell-count {
  position: absolute;
  right: 4px;
  top: 2px;
  font-size: 12px;
  color: #9ad0ff;
}
.empty {
  color: #9aa0a6;
  margin: 8px 0;
}
.item-desc {
  color: #c8c8c8;
  font-size: 13px;
  margin: 10px 0 0;
  max-width: 100%;
  white-space: normal;
  line-height: 1.5;
  text-align: left;
}
.btn-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin: 14px 0 0;
}
.help-btn {
  margin: 0;
  display: inline-block;
  font-family: 'Courier New', ui-monospace, monospace;
  font-size: 15px;
  color: #f4d35e;
  background: transparent;
  border: 1px solid #f4d35e;
  border-radius: 4px;
  padding: 6px 18px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.help-btn:hover {
  background: rgba(244, 211, 94, 0.18);
  color: #fff;
}
.hint {
  color: #9aa0a6;
  font-size: 13px;
  margin: 14px 0 0;
}
.saved-flash {
  color: #7CFC9B;
  font-size: 14px;
  margin: 12px 0 0;
  text-align: center;
}
</style>
