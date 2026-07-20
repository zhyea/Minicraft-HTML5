<script setup lang="ts">
/**
 * TitleMenu — the phase-0 entry overlay, kept as the single title screen.
 *
 * Ports the GWT TitleMenu's three buttons (开始游戏 / 玩法说明 / 关于) into a
 * reactive DOM overlay. Navigation is layout-independent via KeyboardEvent.code
 * (Arrow keys + WASD + Enter/X), mirroring the engine's InputHandler mapping,
 * with mouse hover/click as a bonus. Selecting 开始游戏 emits 'start', which
 * App.vue turns into a running game session. 玩法说明 / 关于 now open the
 * dedicated HelpMenu / AboutMenu overlays (Sprint 5) rather than inline panels,
 * so all help/about content lives in one place.
 */
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import { gameState, setSelectedIndex, getActiveGame } from '../../game/state';

const emit = defineEmits<{
  (e: 'start'): void;
  (e: 'help'): void;
  (e: 'about'): void;
  (e: 'continue'): void;
}>();

/**
 * Dynamic button list. When the active game reports a save slot, a "继续游戏"
 * entry is prepended so the player can resume. The list length drives keyboard
 * navigation, so the extra entry is handled automatically.
 */
const buttons = computed<string[]>(() => {
  const hasSave = getActiveGame()?.hasSave() ?? false;
  return hasSave
    ? ['继续游戏', '开始游戏', '玩法说明', '关于']
    : ['开始游戏', '玩法说明', '关于'];
});

function confirm(): void {
  const label = buttons.value[gameState.selectedIndex];
  switch (label) {
    case '继续游戏':
      emit('continue');
      break;
    case '开始游戏':
      emit('start');
      break;
    case '玩法说明':
      emit('help');
      break;
    case '关于':
      emit('about');
      break;
  }
}

function move(delta: number): void {
  const next = (gameState.selectedIndex + delta + buttons.value.length) % buttons.value.length;
  setSelectedIndex(next);
}

function onKey(e: KeyboardEvent): void {
  const code = e.code;
  if (code === 'ArrowUp' || code === 'KeyW') {
    e.preventDefault();
    move(-1);
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    e.preventDefault();
    move(1);
  } else if (code === 'Enter' || code === 'KeyX') {
    e.preventDefault();
    confirm();
  }
}

function onItemClick(i: number): void {
  setSelectedIndex(i);
  confirm();
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="title-menu">
    <h1 class="title">Minicraft</h1>
    <p class="subtitle">HTML5 · TypeScript 移植版 (Sprint 5)</p>

    <ul class="buttons">
      <li
        v-for="(label, i) in buttons"
        :key="label"
        class="button"
        :class="{ active: i === gameState.selectedIndex }"
        @mouseenter="setSelectedIndex(i)"
        @click="onItemClick(i)"
      >
        {{ label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.title-menu {
  font-family: 'Courier New', ui-monospace, monospace;
  color: #e8e8e8;
  text-align: center;
  user-select: none;
}

.title {
  font-size: 48px;
  letter-spacing: 4px;
  margin: 0 0 4px;
  color: #f4d35e;
  text-shadow: 2px 2px 0 #000;
}

.subtitle {
  margin: 0 0 28px;
  font-size: 14px;
  color: #9aa0a6;
}

.buttons {
  list-style: none;
  margin: 0;
  padding: 0;
  display: inline-block;
}

.button {
  padding: 8px 28px;
  margin: 6px 0;
  font-size: 20px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: color 0.1s, border-color 0.1s;
}

.button.active {
  color: #f4d35e;
  border-color: #f4d35e;
}

.button:hover {
  color: #fff;
}
</style>
