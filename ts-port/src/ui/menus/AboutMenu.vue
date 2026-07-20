<script setup lang="ts">
/**
 * AboutMenu — static "关于 Minicraft" panel, ported from screen/AboutMenu.java
 * (Chinese strings per design/i18n/zh-CN-strings.md). Shares the Sprint-5 menu
 * overlay shell with HelpMenu. X / Enter / Esc closes.
 */
import { onMounted, onBeforeUnmount } from 'vue';

const emit = defineEmits<{ (e: 'close'): void }>();

const lines = [
  'Minicraft 由',
  '马库斯·佩尔松',
  '为第 22 届 Ludum',
  'Dare 大赛，于',
  '2011 年 12 月',
  '谨以此游戏献给',
  '我的父亲。<3',
  'HTML5/GWT 移植：由',
  'Chi Hoang',
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
  <div class="menu-frame about-menu">
    <h2 class="menu-title">关于 Minicraft</h2>
    <ul class="about-list">
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
  min-width: 240px;
}
.menu-title {
  color: #f4d35e;
  margin: 0 0 12px;
  font-size: 20px;
  letter-spacing: 2px;
}
.about-list {
  list-style: none;
  margin: 0;
  padding: 0;
  line-height: 1.7;
  font-size: 14px;
}
.hint {
  color: #9aa0a6;
  font-size: 13px;
  margin: 14px 0 0;
}
</style>
