<script setup lang="ts">
/**
 * DeadMenu — shown when the player dies (Player.health <= 0). Faithful port of
 * screen/DeadMenu.java: same title ("你死了！呜！"), time/score readout and the
 * "按 C 重来" prompt; C / X / Enter returns to the title screen. A short
 * input delay (mirroring Java's inputDelay) stops an in-flight keypress from
 * instantly dismissing the screen.
 */
import { onMounted, onBeforeUnmount, ref } from 'vue';

const props = defineProps<{ score: number; time: number }>();
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
  // Mirror Java's 60-tick inputDelay (~1s at 60fps) before accepting input.
  window.setTimeout(() => {
    ready.value = true;
  }, 600);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="menu-frame dead-menu">
    <h2 class="menu-title dead">你死了！呜！</h2>
    <p class="stat"><span>时间：</span>{{ timeString(props.time) }}</p>
    <p class="stat"><span>分数：</span>{{ props.score }}</p>
    <p class="hint">按 C 重来</p>
  </div>
</template>

<style scoped>
.menu-frame {
  font-family: 'Courier New', ui-monospace, monospace;
  color: #e8e8e8;
  text-align: center;
  user-select: none;
  background: rgba(20, 4, 4, 0.94);
  border: 2px solid #a55;
  padding: 22px 30px;
  min-width: 240px;
}
.menu-title {
  margin: 0 0 16px;
  font-size: 26px;
  letter-spacing: 3px;
}
.menu-title.dead {
  color: #ff7a7a;
}
.stat {
  margin: 6px 0;
  font-size: 16px;
}
.stat span {
  color: #f4d35e;
}
.hint {
  color: #caa;
  font-size: 14px;
  margin: 18px 0 0;
}
</style>
