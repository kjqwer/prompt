<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="icon-preset-type"
    :class="type"
  >
    <template v-if="type === 'positive'">
      <path class="positive-wand wand-shadow" d="M7.1 17.2 16.8 7.5" />
      <path class="positive-wand wand-body" d="M6.4 16.5 16.1 6.8" />
      <path class="positive-cap" d="M16.1 6.8 18.2 4.7" />
      <path class="positive-tip tip-1" d="M17.7 3.1 18.3 4.5 19.7 5.1 18.3 5.7 17.7 7.1 17.1 5.7 15.7 5.1 17.1 4.5Z" />
      <path class="positive-tip tip-2" d="M9.2 6.3 9.6 7.3 10.6 7.7 9.6 8.1 9.2 9.1 8.8 8.1 7.8 7.7 8.8 7.3Z" />
      <circle class="positive-tip dot-1" cx="14.1" cy="10.9" r="0.7" />
      <circle class="positive-tip dot-2" cx="6.9" cy="18.1" r="0.8" />
      <path class="positive-spark spark-1" d="M19.6 10.6 20 11.7 21.1 12.1 20 12.5 19.6 13.6 19.2 12.5 18.1 12.1 19.2 11.7Z" />
      <path class="positive-spark spark-2" d="M4.8 10.8 5.2 11.6 6 12 5.2 12.4 4.8 13.2 4.4 12.4 3.6 12 4.4 11.6Z" />
    </template>

    <template v-else-if="type === 'negative'">
      <circle class="negative-ring" cx="12" cy="12" r="9.2" />
      <line class="negative-slash" x1="5" y1="5" x2="19" y2="19" />
    </template>

    <template v-else-if="type === 'setting'">
      <path class="setting-gear" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L3.16 8.87c-.09.17-.05.39.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.09-.17.05-.39-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </template>

    <template v-else-if="type === 'style'">
      <path class="style-brush" d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3z"/>
      <path class="style-tip" d="M20.71 4.63l-1.34-1.34a.996.996 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 0 0 0-1.41z"/>
    </template>

    <template v-else-if="type === 'character'">
      <path class="character-body" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle class="character-head" cx="12" cy="7" r="4" />
    </template>

    <template v-else-if="type === 'scene'">
      <rect class="scene-frame" x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle class="scene-sun" cx="8.5" cy="8.5" r="1.5" />
      <polyline class="scene-mountain" points="21 15 16 10 5 21" />
    </template>

    <template v-else>
      <path class="custom-piece" d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5A2.5 2.5 0 0 0 10.5 1 2.5 2.5 0 0 0 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5a2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
    </template>
  </svg>
</template>

<script setup lang="ts">
import type { PresetType } from '../../types';

defineProps<{
  type: string | PresetType
}>();
</script>

<style scoped>
.icon-preset-type {
  overflow: visible;
  color: currentColor;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}

.positive-wand,
.positive-cap,
.positive-tip,
.positive-spark,
.negative-ring,
.negative-slash,
.setting-gear,
.style-brush,
.style-tip,
.character-body,
.character-head,
.scene-frame,
.scene-sun,
.scene-mountain,
.custom-piece {
  transform-origin: center;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease, stroke-dashoffset 0.35s ease, fill 0.25s ease;
}

.positive-wand {
  stroke-width: 3.2;
}

.positive-wand.wand-shadow {
  opacity: 0.18;
  filter: blur(0.2px);
}

.positive-wand.wand-body {
  stroke-width: 2.7;
}

.positive-cap {
  stroke-width: 2.7;
  opacity: 0.95;
}

.positive-tip {
  fill: currentColor;
  stroke: none;
  opacity: 0.95;
}

.positive-spark {
  fill: currentColor;
  stroke: none;
  opacity: 0;
}

.negative-ring {
  opacity: 0.92;
}

.negative-slash {
  transform-origin: center;
}

.setting-gear {
  transform-origin: center;
}

.style-tip {
  transform-origin: 10px 13px;
}

.character-head {
  transform-origin: center;
}

.scene-frame {
  opacity: 0.95;
}

.scene-sun {
  fill: currentColor;
  opacity: 0.9;
}

.icon-preset-type:hover,
:deep(.nav-btn:hover) .icon-preset-type {
  transform: translateY(-1px) scale(1.08);
}

.icon-preset-type.positive:hover .positive-wand,
:deep(.nav-btn:hover) .icon-preset-type.positive .positive-wand {
  transform: translate(-0.2px, -0.2px) rotate(-8deg);
}

.icon-preset-type.positive:hover .wand-shadow,
:deep(.nav-btn:hover) .icon-preset-type.positive .wand-shadow {
  opacity: 0.26;
  transform: translate(0.6px, 0.6px) rotate(-8deg);
}

.icon-preset-type.positive:hover .positive-tip,
:deep(.nav-btn:hover) .icon-preset-type.positive .positive-tip {
  opacity: 1;
  transform: translateY(-0.5px) scale(1.08);
}

.icon-preset-type.positive:hover .positive-spark,
:deep(.nav-btn:hover) .icon-preset-type.positive .positive-spark {
  opacity: 1;
}

.icon-preset-type.positive:hover .spark-1,
:deep(.nav-btn:hover) .icon-preset-type.positive .spark-1 {
  transform: translate(0.6px, -0.4px) scale(1.12);
}

.icon-preset-type.positive:hover .spark-2,
:deep(.nav-btn:hover) .icon-preset-type.positive .spark-2 {
  transform: translate(-0.4px, 0.4px) scale(1.12);
}

.icon-preset-type.negative:hover .negative-slash,
:deep(.nav-btn:hover) .icon-preset-type.negative .negative-slash {
  transform: rotate(3deg);
}

.icon-preset-type.setting:hover .setting-gear,
:deep(.nav-btn:hover) .icon-preset-type.setting .setting-gear {
  transform: rotate(70deg);
}

.icon-preset-type.style:hover .style-tip,
:deep(.nav-btn:hover) .icon-preset-type.style .style-tip {
  transform: translate(1px, -1px) rotate(-8deg);
}

.icon-preset-type.character:hover .character-head,
:deep(.nav-btn:hover) .icon-preset-type.character .character-head {
  transform: translateY(-1.5px) scale(1.08);
}

.icon-preset-type.scene:hover .scene-mountain,
:deep(.nav-btn:hover) .icon-preset-type.scene .scene-mountain {
  transform: translateY(-0.5px) scaleY(1.08);
}

.icon-preset-type.scene:hover .scene-sun,
:deep(.nav-btn:hover) .icon-preset-type.scene .scene-sun {
  transform: translateY(-1px) scale(1.1);
}

.icon-preset-type.custom:hover .custom-piece,
:deep(.nav-btn:hover) .icon-preset-type.custom .custom-piece {
  transform: rotate(-5deg) scale(1.06);
}
</style>
