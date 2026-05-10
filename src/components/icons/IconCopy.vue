<script setup lang="ts">
defineProps<{
  width?: string | number
  height?: string | number
}>()
</script>

<template>
  <svg
    :width="width || 24"
    :height="height || 24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    class="icon-copy"
  >
    <rect class="copy-back" x="7" y="7" width="11" height="11" rx="2" />
    <rect class="copy-front" x="4" y="4" width="11" height="11" rx="2" />
  </svg>
</template>

<style scoped>
.icon-copy {
  overflow: visible;
  color: currentColor;
}

.copy-back,
.copy-front {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
  transform-origin: center;
}

:deep(.action-btn:hover) .copy-back,
.icon-copy:hover .copy-back {
  transform: translate(1px, 1px);
}

:deep(.action-btn:hover) .copy-front,
.icon-copy:hover .copy-front {
  transform: translate(-1px, -1px) rotate(-4deg);
}
</style>
