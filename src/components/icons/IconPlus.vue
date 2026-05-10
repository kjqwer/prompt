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
    class="icon-plus"
  >
    <circle class="plus-ring" cx="12" cy="12" r="9" />
    <path class="plus-vert" d="M12 7v10" />
    <path class="plus-horz" d="M7 12h10" />
  </svg>
</template>

<style scoped>
.icon-plus {
  overflow: visible;
  color: currentColor;
}

.plus-ring,
.plus-vert,
.plus-horz {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease, stroke-dashoffset 0.35s ease;
  transform-origin: center;
}

:deep(.btn-primary:hover) .plus-ring,
.icon-plus:hover .plus-ring {
  opacity: 1;
  transform: scale(1.08);
}

:deep(.btn-primary:hover) .plus-vert,
.icon-plus:hover .plus-vert {
  transform: rotate(90deg);
}

:deep(.btn-primary:hover) .plus-horz,
.icon-plus:hover .plus-horz {
  transform: scaleX(1.12);
}
</style>
