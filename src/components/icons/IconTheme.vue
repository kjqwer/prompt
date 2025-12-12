<script setup lang="ts">
defineProps<{
  isDark: boolean
}>()
</script>

<template>
  <div class="icon-theme-container">
    <div class="moon-glow" :class="{ 'is-active': isDark }"></div>

    <svg 
      class="icon-sun"
      :class="{ 'is-hidden': isDark }"
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
    
    <svg 
      class="icon-moon"
      :class="{ 'is-visible': isDark }"
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      <g class="stars" stroke="none" stroke-width="0" fill="currentColor">
        <path class="star star-1" d="M17 8 L17.5 9.5 L19 10 L17.5 10.5 L17 12 L16.5 10.5 L15 10 L16.5 9.5 Z" />
        <path class="star star-2" d="M13 3.5 L13.3 4.5 L14.3 4.8 L13.3 5.1 L13 6.1 L12.7 5.1 L11.7 4.8 L12.7 4.5 Z" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.icon-theme-container {
  position: relative;
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.moon-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.5);
  width: 200%;
  height: 200%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 100%);
  opacity: 0;
  transition: all 0.4s ease;
  z-index: 0;
  pointer-events: none;
}

.icon-theme-container:hover .moon-glow.is-active {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

svg {
  position: absolute;
  width: 100%;
  height: 100%;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

.icon-sun {
  opacity: 1;
  transform: rotate(0) scale(1);
}

.icon-sun.is-hidden {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}

.icon-moon {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.icon-moon.is-visible {
  opacity: 1;
  transform: rotate(0) scale(1);
}

/* Star styles */
.star {
  transform-origin: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.icon-moon.is-visible .star {
  opacity: 1;
}

/* Hover effects */
.icon-theme-container:hover .icon-sun:not(.is-hidden) {
  animation: spin 4s linear infinite;
}

.icon-theme-container:hover .icon-moon.is-visible {
  animation: swing 2.5s ease-in-out infinite;
}

.icon-theme-container:hover .star-1 {
  animation: twinkle 1.5s infinite ease-in-out;
}

.icon-theme-container:hover .star-2 {
  animation: twinkle 2s infinite ease-in-out 0.2s;
}

@keyframes spin {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}

@keyframes swing {
  0%, 100% { transform: rotate(0) scale(1); }
  50% { transform: rotate(-10deg) scale(1.05); }
}

@keyframes twinkle {
  0%, 100% { opacity: 0.5; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
</style>
