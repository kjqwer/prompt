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
    class="icon-trash"
  >
    <path class="trash-lid" d="M3 6h18" />
    <path class="trash-body" d="m6 6 1 14h10l1-14" />
    <path class="trash-handle" d="M9 6V4h6v2" />
  </svg>
</template>

<style scoped>
.icon-trash {
  overflow: visible;
  color: currentColor;
}

.trash-lid,
.trash-body,
.trash-handle {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
  transform-origin: center;
}

:deep(.action-btn:hover) .trash-lid,
:deep(.dropdown-content button:hover) .trash-lid,
.icon-trash:hover .trash-lid {
  transform: translateY(-1px) rotate(-4deg);
}

:deep(.action-btn:hover) .trash-handle,
:deep(.dropdown-content button:hover) .trash-handle,
.icon-trash:hover .trash-handle {
  transform: translateY(-1px);
}
</style>
