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
    stroke-width="2.25"
    stroke-linecap="round"
    stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    class="icon-check"
  >
    <circle class="check-ring" cx="12" cy="12" r="9" />
    <path class="check-mark" d="M7 12.5 10.2 15.7 17 8.9" />
  </svg>
</template>

<style scoped>
.icon-check {
  overflow: visible;
  color: currentColor;
}

.check-ring,
.check-mark {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease, stroke-dashoffset 0.35s ease;
  transform-origin: center;
}

.check-mark {
  stroke-dasharray: 18;
  stroke-dashoffset: 18;
}

:deep(.action-btn:hover) .check-ring,
:deep(.action-btn:hover) .check-mark,
.icon-check:hover .check-ring,
.icon-check:hover .check-mark {
  transform: scale(1.06);
  stroke-dashoffset: 0;
}
</style>
