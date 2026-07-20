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
import ItemIcon from '../ItemIcon.vue';

const props = defineProps<{ items: Item[] }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const selected = ref(0);

const rows = computed(() =>
  props.items.map((item) => ({
    item,
    name: item.getName(),
    count: item instanceof ResourceItem ? item.count : 1,
  })),
);

function clamp(): void {
  if (rows.value.length === 0) {
    selected.value = 0;
  } else if (selected.value < 0) {
    selected.value = rows.value.length - 1;
  } else if (selected.value >= rows.value.length) {
    selected.value = 0;
  }
}

function onKey(e: KeyboardEvent): void {
  const code = e.code;
  if (code === 'ArrowUp' || code === 'KeyW') {
    e.preventDefault();
    selected.value--;
    clamp();
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    e.preventDefault();
    selected.value++;
    clamp();
  } else if (code === 'Enter' || code === 'KeyX' || code === 'KeyC' || code === 'Escape') {
    e.preventDefault();
    emit('close');
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="menu-frame inventory-menu">
    <h2 class="menu-title">背包</h2>
    <ul v-if="rows.length" class="item-list">
      <li
        v-for="(row, i) in rows"
        :key="i"
        class="item-row"
        :class="{ active: i === selected }"
      >
        <ItemIcon :item="row.item" />
        <span class="item-name">{{ row.name }}</span>
        <span class="item-count">x{{ row.count }}</span>
      </li>
    </ul>
    <p v-else class="empty">（空）</p>
    <p class="hint">↑↓ 选择 · X 关闭</p>
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
.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
  font-size: 16px;
}
.item-row.active {
  background: rgba(244, 211, 94, 0.18);
  outline: 1px solid #f4d35e;
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
  margin: 8px 0;
}
.hint {
  color: #9aa0a6;
  font-size: 13px;
  margin: 14px 0 0;
}
</style>
