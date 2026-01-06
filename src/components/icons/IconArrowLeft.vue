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
    xmlns="http://www.w3.org/2000/svg"
    class="icon-arrow"
  >
    <path
      d="M15 19l-7-7 7-7"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="arrow-path"
    />
  </svg>
</template>

<style scoped>
.icon-arrow {
  overflow: visible;
}

.arrow-path {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center;
}

.icon-arrow:hover .arrow-path {
  transform: translateX(-4px) scale(1.15);
}
</style>
