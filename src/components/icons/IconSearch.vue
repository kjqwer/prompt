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
    class="icon-search"
  >
    <circle class="search-lens" cx="11" cy="11" r="7" />
    <path class="search-handle" d="m16 16 4 4" />
    <circle class="search-glint" cx="9" cy="9" r="1" fill="currentColor" />
  </svg>
</template>

<style scoped>
.icon-search {
  overflow: visible;
  color: currentColor;
}

.search-lens,
.search-handle,
.search-glint {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease, stroke-dashoffset 0.35s ease;
  transform-origin: center;
}

:deep(.search-box:hover) .search-lens,
.icon-search:hover .search-lens {
  transform: scale(1.06);
  stroke-dasharray: 40 10;
}

:deep(.search-box:hover) .search-handle,
.icon-search:hover .search-handle {
  transform: translate(1px, 1px) rotate(12deg);
}

:deep(.search-box:hover) .search-glint,
.icon-search:hover .search-glint {
  opacity: 1;
  transform: scale(1.4);
}
</style>
