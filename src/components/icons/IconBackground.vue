<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  mode: 'particles' | 'grid' | 'gradient' | 'off'
}>()

const iconName = computed(() => {
  switch (props.mode) {
    case 'particles': return 'icon-particles'
    case 'grid': return 'icon-grid'
    case 'gradient': return 'icon-gradient'
    default: return 'icon-off'
  }
})
</script>

<template>
  <div class="icon-bg-container">
    <Transition name="icon-fade" mode="out-in">
      <svg v-if="mode === 'particles'" key="particles" width="24" height="24" viewBox="0 0 24 24" fill="none" class="icon-particles">
        <circle cx="6" cy="12" r="1.5" fill="currentColor" class="dot-1"/>
        <circle cx="12" cy="9" r="1.5" fill="currentColor" class="dot-2"/>
        <circle cx="18" cy="13" r="1.5" fill="currentColor" class="dot-3"/>
        <path d="M4 16c4-2 8-2 12 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="wave"/>
      </svg>
      
      <svg v-else-if="mode === 'grid'" key="grid" width="24" height="24" viewBox="0 0 24 24" fill="none" class="icon-grid">
        <path d="M3 3h18v18H3z" stroke="currentColor" stroke-width="2" class="grid-border"/>
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" stroke-width="2" class="grid-lines"/>
      </svg>
      
      <svg v-else-if="mode === 'gradient'" key="gradient" width="24" height="24" viewBox="0 0 24 24" fill="none" class="icon-gradient">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" class="gradient-circle"/>
        <path d="M8 12s1.5-2 4-2 4 2 4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="gradient-wave"/>
      </svg>
      
      <svg v-else key="off" width="24" height="24" viewBox="0 0 24 24" fill="none" class="icon-off">
        <path d="M5 5l14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
      </svg>
    </Transition>
  </div>
</template>

<style scoped>
.icon-bg-container {
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-fade-enter-active,
.icon-fade-leave-active {
  transition: all 0.2s ease;
}

.icon-fade-enter-from {
  opacity: 0;
  transform: scale(0.8) rotate(-90deg);
}

.icon-fade-leave-to {
  opacity: 0;
  transform: scale(0.8) rotate(90deg);
}

/* Animations */
.dot-1, .dot-2, .dot-3 {
  animation: float 3s ease-in-out infinite;
}
.dot-2 { animation-delay: 0.5s; }
.dot-3 { animation-delay: 1s; }

.grid-lines {
  transition: opacity 0.3s;
}
.icon-grid:hover .grid-lines {
  opacity: 0.5;
}

.gradient-circle {
  transition: stroke-dasharray 0.5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

.icon-bg-container:hover .wave {
  animation: wave 2s linear infinite;
}

@keyframes wave {
  0% { d: path("M4 16c4-2 8-2 12 0"); }
  50% { d: path("M4 16c4 2 8 2 12 0"); }
  100% { d: path("M4 16c4-2 8-2 12 0"); }
}
</style>
