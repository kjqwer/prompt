<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  isDark: boolean
}>()

const rootClass = computed(() => ({
  'is-dark': props.isDark,
}))
</script>

<template>
  <div class="icon-theme-container" :class="rootClass">
    <svg class="theme-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle class="sun-core" cx="12" cy="12" r="4.5" />
      <path class="sun-ray ray-1" d="M12 1.8v3.2" />
      <path class="sun-ray ray-2" d="M12 19v3.2" />
      <path class="sun-ray ray-3" d="M4.9 4.9l2.3 2.3" />
      <path class="sun-ray ray-4" d="M16.8 16.8l2.3 2.3" />
      <path class="sun-ray ray-5" d="M1.8 12h3.2" />
      <path class="sun-ray ray-6" d="M19 12h3.2" />
      <path class="sun-ray ray-7" d="M4.9 19.1l2.3-2.3" />
      <path class="sun-ray ray-8" d="M16.8 7.2l2.3-2.3" />
    </svg>

    <svg class="theme-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path class="moon-core" d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
      <path class="moon-rim" d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
      <path class="moon-ring ring-1" d="M16.5 6.5l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z" />
      <path class="moon-ring ring-2" d="M18.2 10.2l.3.9.9.3-.9.3-.3.9-.3-.9-.9-.3.9-.3z" />
    </svg>

    <span class="theme-glow"></span>
  </div>
</template>

<style scoped>
.icon-theme-container {
  position: relative;
  width: 1.25rem;
  height: 1.25rem;
  display: grid;
  place-items: center;
}

svg,
.theme-glow {
  position: absolute;
  inset: 0;
}

svg {
  overflow: visible;
  transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease;
}

.theme-sun {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.theme-moon {
  opacity: 0;
  transform: rotate(-80deg) scale(0.55);
}

.theme-glow {
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.5);
  background: radial-gradient(circle, color-mix(in srgb, currentColor 24%, transparent) 0%, transparent 72%);
  transition: opacity 0.35s ease, transform 0.45s ease;
  pointer-events: none;
}

.sun-core,
.sun-ray,
.moon-core,
.moon-rim,
.moon-ring {
  stroke: currentColor;
  fill: currentColor;
  transform-origin: center;
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
}

.sun-core,
.moon-core {
  stroke-width: 2;
  fill: none;
}

.moon-rim {
  stroke-width: 2;
  opacity: 0;
  fill: none;
}

.moon-ring {
  opacity: 0;
}

.icon-theme-container:hover .theme-glow {
  opacity: 1;
  transform: scale(1);
}

.icon-theme-container:hover .theme-sun {
  transform: rotate(45deg) scale(1.08);
}

.icon-theme-container:hover .sun-ray {
  transform: scaleX(1.08);
}

.icon-theme-container.is-dark .theme-sun {
  opacity: 0;
  transform: rotate(90deg) scale(0.45);
}

.icon-theme-container.is-dark .theme-moon {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.icon-theme-container.is-dark .moon-rim {
  opacity: 0.26;
}

.icon-theme-container.is-dark .moon-ring {
  opacity: 1;
}

.icon-theme-container:hover .theme-moon {
  transform: rotate(-6deg) scale(1.04);
}

.icon-theme-container:hover .ring-1 {
  animation: twinkle 1.4s ease-in-out infinite;
}

.icon-theme-container:hover .ring-2 {
  animation: twinkle 1.8s ease-in-out infinite 0.15s;
}

@keyframes twinkle {
  0%, 100% { transform: scale(0.85); opacity: 0.45; }
  50% { transform: scale(1.25); opacity: 1; }
}
</style>
