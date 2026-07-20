<script setup lang="ts">
/**
 * HelpMenu — static "玩法说明" panel, ported from screen/InstructionsMenu.java
 * (Chinese strings per design/i18n/zh-CN-strings.md). Replaces the inline help
 * panel that lived inside TitleMenu in phase 0 so help/about share the same
 * overlay shell as the rest of the Sprint-5 menu tree. X / Enter / Esc closes.
 */
import { onMounted, onBeforeUnmount } from 'vue';

const emit = defineEmits<{ (e: 'close'): void }>();

const lines = [
  '使用方向键移动你的角色',
  '按 C 键攻击与交互',
  '按 X 键打开背包并使用物品',
  '在背包中选择物品来装备',
  '击败天空层的天空巫师即可获胜',
];

function onKey(e: KeyboardEvent): void {
  const code = e.code;
  if (code === 'KeyX' || code === 'Enter' || code === 'Escape') {
    e.preventDefault();
    emit('close');
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="menu-frame help-menu">
    <h2 class="menu-title">玩法说明</h2>
    <ul class="help-list">
      <li v-for="(line, i) in lines" :key="i">{{ line }}</li>
    </ul>
    <p class="hint">X / Enter / Esc 返回</p>
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
  padding: 18px 26px;
  min-width: 460px;
  max-width: 90vw;
}
.menu-title {
  color: #f4d35e;
  margin: 0 0 12px;
  font-size: 22px;
  letter-spacing: 4px;
}
.help-list {
  list-style: none;
  margin: 0;
  padding: 0;
  line-height: 1.8;
  font-size: 15px;
  text-align: left;
}
.hint {
  color: #9aa0a6;
  font-size: 13px;
  margin: 14px 0 0;
}
</style>
