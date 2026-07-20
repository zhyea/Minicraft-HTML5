<script setup lang="ts">
/**
 * WonMenu — shown when Game.hasWon flips true (defeating the Air Wizard).
 * Faithful port of screen/WonMenu.java: same title ("你赢了！耶！"), time/score
 * readout and "按 C 再玩" prompt; C / X / Enter returns to the title screen.
 * The whole overlay is gated on `hasWon` so it only renders once victory is
 * reached (the required test mounts it with hasWon=true/false).
 */
import { onMounted, onBeforeUnmount, ref } from 'vue';

const props = defineProps<{ hasWon: boolean; score: number; time: number }>();
const emit = defineEmits<{ (e: 'toTitle'): void }>();

const ready = ref(false);

function timeString(totalSeconds: number): string {
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  if (h > 0) return `${h}h${m < 10 ? '0' : ''}${m}m`;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

function onKey(e: KeyboardEvent): void {
  if (!ready.value) return;
  const code = e.code;
  if (code === 'KeyC' || code === 'KeyX' || code === 'Enter') {
    e.preventDefault();
    emit('toTitle');
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
  window.setTimeout(() => {
    ready.value = true;
  }, 600);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div v-if="hasWon" class="menu-frame won-menu">
    <h2 class="menu-title won">你赢了！耶！</h2>
    <p class="stat"><span>时间：</span>{{ timeString(props.time) }}</p>
    <p class="stat"><span>分数：</span>{{ props.score }}</p>
    <p class="hint">按 C 再玩</p>
  </div>
</template>

<style scoped>
.menu-frame {
  font-family: 'Courier New', ui-monospace, monospace;
  color: #e8e8e8;
  text-align: center;
  user-select: none;
  background: rgba(4, 16, 8, 0.94);
  border: 2px solid #5a5;
  padding: 22px 30px;
  min-width: 240px;
}
.menu-title {
  margin: 0 0 16px;
  font-size: 26px;
  letter-spacing: 3px;
}
.menu-title.won {
  color: #8cff8c;
}
.stat {
  margin: 6px 0;
  font-size: 16px;
}
.stat span {
  color: #f4d35e;
}
.hint {
  color: #aca;
  font-size: 14px;
  margin: 18px 0 0;
}
</style>
