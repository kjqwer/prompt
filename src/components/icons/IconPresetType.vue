<template>
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2" 
    stroke-linecap="round" 
    stroke-linejoin="round"
    class="icon-preset-type"
    :class="type"
  >
    <!-- Positive: Sparkles/Magic -->
    <template v-if="type === 'positive'">
      <path class="star-main" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </template>

    <!-- Negative: Ban/Stop -->
    <template v-else-if="type === 'negative'">
      <circle class="circle" cx="12" cy="12" r="10" />
      <line class="slash" x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </template>

    <!-- Setting: Gear -->
    <template v-else-if="type === 'setting'">
      <path class="gear" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L3.16 8.87c-.09.17-.05.39.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.09-.17.05-.39-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </template>

    <!-- Style: Brush -->
    <template v-else-if="type === 'style'">
      <path class="brush-handle" d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3z"/>
      <path class="brush-tip" d="M20.71 4.63l-1.34-1.34a.996.996 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 0 0 0-1.41z"/>
    </template>

    <!-- Character: User/Face -->
    <template v-else-if="type === 'character'">
      <path class="user-body" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle class="user-head" cx="12" cy="7" r="4" />
    </template>

    <!-- Scene: Image/Landscape -->
    <template v-else-if="type === 'scene'">
      <rect class="scene-frame" x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle class="scene-sun" cx="8.5" cy="8.5" r="1.5"/>
      <polyline class="scene-mountain" points="21 15 16 10 5 21"/>
    </template>

    <!-- Custom: Puzzle -->
    <template v-else>
      <path class="puzzle-piece" d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5A2.5 2.5 0 0 0 10.5 1 2.5 2.5 0 0 0 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5a2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
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
  transition: all 0.3s ease;
  overflow: visible;
}

/* Positive: Sparkle/Twinkle */
.positive .star-main {
  transform-origin: center;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
:deep(.nav-btn:hover) .positive .star-main,
.positive:hover .star-main {
  transform: scale(1.1) rotate(15deg);
  fill: currentColor;
  fill-opacity: 0.2;
}

/* Negative: Shake */
.negative .slash {
  transform-origin: center;
  transition: transform 0.3s ease;
}
:deep(.nav-btn:hover) .negative,
.negative:hover {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

/* Setting: Rotate */
.setting .gear {
  transform-origin: center;
  transition: transform 0.5s ease;
}
:deep(.nav-btn:hover) .setting .gear,
.setting:hover .gear {
  transform: rotate(90deg);
}

/* Style: Brush Wiggle */
.style .brush-tip {
  transform-origin: bottom left;
  transition: transform 0.3s ease;
}
:deep(.nav-btn:hover) .style .brush-tip,
.style:hover .brush-tip {
  transform: rotate(-10deg) translateY(-2px);
}

/* Character: Bounce */
.character .user-head {
  transform-origin: center;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
:deep(.nav-btn:hover) .character .user-head,
.character:hover .user-head {
  transform: translateY(-2px);
}

/* Scene: Zoom */
.scene .scene-mountain {
  transform-origin: bottom;
  transition: transform 0.3s ease;
}
.scene .scene-sun {
  transform-origin: center;
  transition: transform 0.3s ease;
}
:deep(.nav-btn:hover) .scene .scene-mountain,
.scene:hover .scene-mountain {
  transform: scaleY(1.1);
}
:deep(.nav-btn:hover) .scene .scene-sun,
.scene:hover .scene-sun {
  transform: translateY(-2px) scale(1.1);
}

/* Custom: Puzzle Fit */
.custom .puzzle-piece {
  transform-origin: center;
  transition: transform 0.3s ease;
}
:deep(.nav-btn:hover) .custom .puzzle-piece,
.custom:hover .puzzle-piece {
  transform: scale(1.1) rotate(-5deg);
}
</style>
