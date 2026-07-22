<script setup lang="ts">
/**
 * TitleMenu — the phase-0 entry overlay, kept as the single title screen.
 *
 * Ports the GWT TitleMenu buttons into a reactive DOM overlay, but surfaces two
 * explicit, always-visible entries the user asked for:
 *   - 重新开始  -> fresh new game (emit 'start')
 *   - 读取存档  -> resume a saved game (emit 'continue'); greyed/disabled when
 *                  no save exists, so the player can never pick an empty slot.
 * 玩法说明 / 关于 open the dedicated HelpMenu / AboutMenu overlays.
 *
 * Navigation is layout-independent via KeyboardEvent.code (Arrow keys + WASD +
 * Enter/X + Esc), mirroring the engine's InputHandler mapping, with mouse
 * hover/click as a bonus. Disabled entries are skipped during keyboard
 * navigation and are inert to clicks.
 *
 * Overwrite guard: selecting 重新开始 while a save exists pops a confirm dialog
 * (defaulting to 取消) so the player can never wipe an existing save by accident.
 * 读取存档 never overwrites, so it needs no guard.
 */
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import { gameState, setSelectedIndex, getActiveGame } from '../../game/state';
import { Sound } from '../../game/audio/Sound';

type OptionKind = 'start' | 'continue' | 'help' | 'about';

interface TitleOption {
  label: string;
  enabled: boolean;
  kind: OptionKind;
}

const emit = defineEmits<{
  (e: 'start'): void;
  (e: 'help'): void;
  (e: 'about'): void;
  (e: 'continue'): void;
}>();

const hasSave = computed(() => getActiveGame()?.hasSave() ?? false);

/**
 * The four entry options. 重新开始 / 玩法说明 / 关于 are always enabled;
 * 读取存档 is enabled only when the active game reports a save slot.
 */
const options = computed<TitleOption[]>(() => [
  { label: '重新开始', enabled: true, kind: 'start' },
  { label: '读取存档', enabled: hasSave.value, kind: 'continue' },
  { label: '玩法说明', enabled: true, kind: 'help' },
  { label: '关于', enabled: true, kind: 'about' },
]);

// ---- Overwrite-confirm dialog state ----
const confirming = ref(false);
const confirmIndex = ref(1); // 0 = 确定(覆盖), 1 = 取消; default 取消 to avoid accidents
const confirmOptions = computed<string[]>(() => ['确定', '取消']);

function confirm(): void {
  const opt = options.value[gameState.selectedIndex];
  if (!opt || !opt.enabled) return;
  switch (opt.kind) {
    case 'continue':
      emit('continue');
      break;
    case 'start':
      if (hasSave.value) {
        // Existing save would be overwritten -> ask first.
        confirming.value = true;
        confirmIndex.value = 1; // default 取消
        return;
      }
      Sound.play('test'); // Java TitleMenu.java:42
      emit('start');
      break;
    case 'help':
      emit('help');
      break;
    case 'about':
      emit('about');
      break;
  }
}

function resolveConfirm(): void {
  if (confirmIndex.value === 0) {
    confirming.value = false;
    Sound.play('test'); // Java TitleMenu.java:42
    emit('start');
  } else {
    cancelConfirm();
  }
}

function cancelConfirm(): void {
  confirming.value = false;
}

function onConfirmClick(i: number): void {
  confirmIndex.value = i;
  resolveConfirm();
}

/** Move selection, skipping any disabled entries so the cursor never lands on
 *  读取存档 when no save exists. At least 重新开始 is always enabled, so the
 *  scan is guaranteed to terminate. */
function move(delta: number): void {
  const n = options.value.length;
  let next = gameState.selectedIndex;
  for (let i = 0; i < n; i++) {
    next = (next + delta + n) % n;
    if (options.value[next].enabled) break;
  }
  setSelectedIndex(next);
}

function onKey(e: KeyboardEvent): void {
  if (confirming.value) {
    const code = e.code;
    if (
      code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD' ||
      code === 'ArrowUp' || code === 'ArrowDown' || code === 'KeyW' || code === 'KeyS'
    ) {
      e.preventDefault();
      confirmIndex.value = confirmIndex.value === 0 ? 1 : 0;
    } else if (code === 'Enter' || code === 'KeyX') {
      e.preventDefault();
      resolveConfirm();
    } else if (code === 'Escape') {
      e.preventDefault();
      cancelConfirm();
    }
    return;
  }

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
  const opt = options.value[i];
  if (!opt || !opt.enabled) return;
  setSelectedIndex(i);
  confirm();
}

function onItemHover(i: number): void {
  const opt = options.value[i];
  if (opt && opt.enabled) setSelectedIndex(i);
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
  // Highlight 重新开始 by default; it is always enabled and first.
  setSelectedIndex(0);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="title-menu">
    <h1 class="title">Minicraft</h1>
    <p class="subtitle">HTML5 · TypeScript 移植版 (Sprint 5)</p>

    <template v-if="!confirming">
      <ul class="buttons">
        <li
          v-for="(opt, i) in options"
          :key="opt.label"
          class="button"
          :class="{ active: i === gameState.selectedIndex, disabled: !opt.enabled }"
          @mouseenter="onItemHover(i)"
          @click="onItemClick(i)"
        >
          {{ opt.label }}
        </li>
      </ul>
    </template>

    <div v-else class="confirm-box">
      <p class="confirm-text">开始新游戏将覆盖当前存档，确定吗？</p>
      <ul class="buttons">
        <li
          v-for="(c, i) in confirmOptions"
          :key="c"
          class="button"
          :class="{ active: i === confirmIndex }"
          @mouseenter="confirmIndex = i"
          @click="onConfirmClick(i)"
        >
          {{ c }}
        </li>
      </ul>
    </div>
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

.button:not(.disabled):hover {
  color: #fff;
}

.button.disabled {
  color: #5a5a5a;
  cursor: not-allowed;
  border-color: transparent;
}

.button.disabled.active {
  color: #5a5a5a;
  border-color: #5a5a5a;
}

.confirm-box {
  margin-top: 8px;
}

.confirm-text {
  font-size: 18px;
  color: #ffd27f;
  margin: 0 0 16px;
}
</style>
