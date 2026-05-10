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
    class="icon-sort"
  >
    <path class="sort-arrow" d="M7 4v16" />
    <path class="sort-arrow-head" d="M4 7l3-3 3 3" />
    <path class="sort-bars bar-1" d="M13 8h7" />
    <path class="sort-bars bar-2" d="M13 12h5" />
    <path class="sort-bars bar-3" d="M13 16h3" />
  </svg>
</template>

<style scoped>
.icon-sort {
  overflow: visible;
  color: currentColor;
}

.sort-arrow,
.sort-arrow-head,
.sort-bars {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
  transform-origin: center;
}

:deep(.sort-direction-btn:hover) .sort-arrow-head,
.icon-sort:hover .sort-arrow-head {
  transform: translateY(-1px);
}

:deep(.sort-direction-btn:hover) .sort-bars.bar-1,
.icon-sort:hover .sort-bars.bar-1 {
  transform: translateX(1px);
}

:deep(.sort-direction-btn:hover) .sort-bars.bar-2,
.icon-sort:hover .sort-bars.bar-2 {
  transform: translateX(2px);
}

:deep(.sort-direction-btn:hover) .sort-bars.bar-3,
.icon-sort:hover .sort-bars.bar-3 {
  transform: translateX(3px);
}
</style>
