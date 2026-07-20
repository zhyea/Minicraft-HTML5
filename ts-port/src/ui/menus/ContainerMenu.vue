<script setup lang="ts">
/**
 * ContainerMenu — Chest <-> Player item transfer, faithful to
 * screen/ContainerMenu.java. Two panels (container on the left, player on the
 * right); left/right switches which panel is active, up/down moves the cursor,
 * and C moves the selected item from the active panel into the other one. We
 * keep Java's exact mutation (remove from source, add at the same slot in the
 * target) via Inventory.add / items.splice.
 *
 * Presentational: App.vue passes the Chest's Inventory plus the player's and
 * handles 'close'.
 */
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import type { Inventory } from '../../game/entity/Inventory';
import { ResourceItem } from '../../game/item/ResourceItem';
import ItemIcon from '../ItemIcon.vue';

const props = defineProps<{
  title: string;
  container: Inventory;
  playerInventory: Inventory;
}>();
const emit = defineEmits<{ (e: 'close'): void }>();

/** true = container panel active (left); false = player panel active (right). */
const containerActive = ref(true);
const selected = ref(0);

const activeList = computed(() =>
  containerActive.value ? props.container : props.playerInventory,
);
const inactiveList = computed(() =>
  containerActive.value ? props.playerInventory : props.container,
);

interface Row {
  item: import('../../game/item/Item').Item;
  name: string;
  count: number;
}

function toRows(inv: Inventory): Row[] {
  return inv.items.map((item) => ({
    item,
    name: item.getName(),
    count: item instanceof ResourceItem ? item.count : 1,
  }));
}

/** Move the item at `index` from `fromContainer` into the other inventory. */
function transfer(fromContainer: boolean, index: number): void {
  const from = fromContainer ? props.container : props.playerInventory;
  const to = fromContainer ? props.playerInventory : props.container;
  if (index < 0 || index >= from.items.length) return;
  const it = from.items[index];
  from.items.splice(index, 1);
  to.add(index, it);
}

function moveActive(): void {
  transfer(containerActive.value, selected.value);
  const len = activeList.value.items.length;
  if (selected.value >= len) selected.value = Math.max(0, len - 1);
}

function onKey(e: KeyboardEvent): void {
  const code = e.code;
  if (code === 'ArrowUp' || code === 'KeyW') {
    e.preventDefault();
    selected.value = Math.max(0, selected.value - 1);
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    e.preventDefault();
    const len = activeList.value.items.length;
    selected.value = len === 0 ? 0 : Math.min(len - 1, selected.value + 1);
  } else if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowRight' || code === 'KeyD') {
    e.preventDefault();
    containerActive.value = !containerActive.value;
    selected.value = 0;
  } else if (code === 'Enter' || code === 'KeyC') {
    e.preventDefault();
    moveActive();
  } else if (code === 'KeyX' || code === 'Escape') {
    e.preventDefault();
    emit('close');
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

defineExpose({ transfer, moveActive });
</script>

<template>
  <div class="menu-frame container-menu">
    <h2 class="menu-title">{{ title }}</h2>
    <div class="panels">
      <div class="panel" :class="{ active: containerActive }">
        <h3 class="panel-title">{{ title }}</h3>
        <ul class="item-list">
          <li
            v-for="(row, i) in toRows(props.container)"
            :key="'c' + i"
            class="item-row"
            :class="{ active: containerActive && i === selected }"
          >
            <ItemIcon :item="row.item" />
            <span class="item-name">{{ row.name }}</span>
            <span class="item-count">x{{ row.count }}</span>
          </li>
        </ul>
        <p v-if="!props.container.items.length" class="empty">（空）</p>
      </div>

      <div class="panel" :class="{ active: !containerActive }">
        <h3 class="panel-title">背包</h3>
        <ul class="item-list">
          <li
            v-for="(row, i) in toRows(props.playerInventory)"
            :key="'p' + i"
            class="item-row"
            :class="{ active: !containerActive && i === selected }"
          >
            <ItemIcon :item="row.item" />
            <span class="item-name">{{ row.name }}</span>
            <span class="item-count">x{{ row.count }}</span>
          </li>
        </ul>
        <p v-if="!props.playerInventory.items.length" class="empty">（空）</p>
      </div>
    </div>
    <p class="hint">←→ 切换 · ↑↓ 选择 · C 移动 · X 关闭</p>
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
}
.menu-title {
  color: #f4d35e;
  margin: 0 0 12px;
  font-size: 22px;
  letter-spacing: 4px;
}
.panels {
  display: flex;
  gap: 24px;
  justify-content: center;
}
.panel {
  min-width: 200px;
  padding: 6px;
  border: 1px solid transparent;
}
.panel.active {
  border-color: #f4d35e;
  background: rgba(244, 211, 94, 0.08);
}
.panel-title {
  color: #f4d35e;
  font-size: 15px;
  margin: 0 0 8px;
}
.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 6px;
  font-size: 14px;
}
.item-row.active {
  outline: 1px solid #9ad0ff;
}
.item-name {
  flex: 1;
  text-align: left;
}
.item-count {
  color: #9ad0ff;
}
.empty {
  color: #9aa0a6;
  font-size: 13px;
}
.hint {
  color: #9aa0a6;
  font-size: 13px;
  margin: 14px 0 0;
}
</style>
