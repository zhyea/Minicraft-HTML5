<script setup lang="ts">
/**
 * Dimension-change transition overlay (mirrors Java's LevelTransitionMenu).
 *
 * Shown when the player steps onto a stairs tile. The underlying world is
 * paused by the game core (currentMenu === 'transition' counts as "menu open"),
 * and the actual level swap is deferred until this overlay emits `done` after a
 * short delay (~1000ms ≈ 60 ticks). The overlay is intentionally transparent so
 * the frozen world stays visible behind the centered caption, matching the
 * original which draws the label on top of the live screen.
 */
import { onMounted, onBeforeUnmount } from 'vue';

const props = defineProps<{
  /** Centered caption, e.g. "进入洞穴…" or "进入天空…". */
  label: string;
}>();

const emit = defineEmits<{
  /** Fired once the transition delay elapses; the parent performs the swap. */
  done: [];
}>();

let timer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  // ~1000ms ≈ 60 ticks; auto-finish (mirrors LevelTransitionMenu's lifetime).
  timer = setTimeout(() => emit('done'), 1000);
});

onBeforeUnmount(() => {
  if (timer != null) clearTimeout(timer);
});
</script>

<template>
  <div class="transition">
    <div class="transition-label">{{ props.label }}</div>
  </div>
</template>

<style scoped>
.transition {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.transition-label {
  color: #fff;
  font-family: monospace;
  font-size: 20px;
  letter-spacing: 2px;
  text-shadow: 0 0 4px #000, 2px 2px 0 #000;
}
</style>
