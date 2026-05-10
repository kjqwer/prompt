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
    class="icon-export"
  >
    <path class="tray" d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    <path class="arrow" d="M12 3v12" />
    <path class="arrow-head" d="M7 8l5-5 5 5" />
  </svg>
</template>

<style scoped>
.icon-export {
  overflow: visible;
  color: currentColor;
}

.tray,
.arrow,
.arrow-head {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
  transform-origin: center;
}

:deep(.btn-icon:hover) .arrow,
.icon-export:hover .arrow {
  transform: translateY(-1px);
}

:deep(.btn-icon:hover) .arrow-head,
.icon-export:hover .arrow-head {
  transform: translateY(-1px) scale(1.06);
}
</style>
