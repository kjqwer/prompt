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
    stroke="none"
    xmlns="http://www.w3.org/2000/svg"
    class="icon-more"
  >
    <circle class="more-dot dot-1" cx="5" cy="12" r="1.2" fill="currentColor" />
    <circle class="more-dot dot-2" cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle class="more-dot dot-3" cx="19" cy="12" r="1.2" fill="currentColor" />
  </svg>
</template>

<style scoped>
.icon-more {
  overflow: visible;
  color: currentColor;
}

.more-dot {
  transform-origin: center;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}

:deep(.more-btn:hover) .dot-1,
.icon-more:hover .dot-1 {
  transform: translateY(-1px);
}

:deep(.more-btn:hover) .dot-2,
.icon-more:hover .dot-2 {
  transform: translateY(1px);
}

:deep(.more-btn:hover) .dot-3,
.icon-more:hover .dot-3 {
  transform: translateY(-1px);
}
</style>
