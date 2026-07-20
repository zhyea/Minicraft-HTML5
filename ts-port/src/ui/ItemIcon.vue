<script setup lang="ts">
/**
 * ItemIcon — renders an Item's pixel sprite into a small <canvas> using the
 * shared engine icon helper (itemIcon.ts). Re-draws when the item changes.
 * In jsdom (tests) getContext returns null and drawing is skipped.
 */
import { onMounted, ref, watch } from 'vue';
import type { Item } from '../game/item/Item';
import { renderItemIcon } from './itemIcon';

const props = defineProps<{ item: Item }>();
const canvasRef = ref<HTMLCanvasElement | null>(null);

function draw(): void {
  if (canvasRef.value) renderItemIcon(canvasRef.value, props.item);
}

onMounted(draw);
watch(() => props.item, draw);
</script>

<template>
  <canvas ref="canvasRef" class="item-icon" width="8" height="8"></canvas>
</template>

<style scoped>
.item-icon {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  display: block;
  background: #000;
  border: 1px solid #333;
}
</style>
