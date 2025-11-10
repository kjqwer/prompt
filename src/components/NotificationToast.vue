<script setup lang="ts">
interface Props {
  message: string
  type: 'success' | 'error' | 'info'
  show: boolean
}

defineProps<Props>()
</script>

<template>
  <Transition name="notification">
    <div v-if="show" class="notification-toast" :class="type">
      <div class="notification-content">
        <svg v-if="type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="type === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
          <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.notification-toast {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  min-width: 300px;
  max-width: 500px;
  padding: 1rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(8px);
}

.notification-toast.success {
  background-color: var(--color-success);
  color: white;
}

.notification-toast.error {
  background-color: var(--color-error);
  color: white;
}

.notification-toast.info {
  background-color: var(--color-accent);
  color: white;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
}

/* 通知动画 */
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

@media (max-width: 640px) {
  .notification-toast {
    left: 1rem;
    right: 1rem;
    min-width: auto;
  }
}
</style>
