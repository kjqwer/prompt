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
    class="icon-share"
  >
    <circle class="share-node node-1" cx="18" cy="5" r="3" />
    <circle class="share-node node-2" cx="6" cy="12" r="3" />
    <circle class="share-node node-3" cx="18" cy="19" r="3" />
    <path class="share-link link-1" d="M8.59 13.51 15.42 17.49" />
    <path class="share-link link-2" d="M15.41 6.51 8.59 10.49" />
  </svg>
</template>

<style scoped>
.icon-share {
  overflow: visible;
  color: currentColor;
}

.share-node,
.share-link {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
  transform-origin: center;
}

:deep(.btn-icon:hover) .share-node,
:deep(.dropdown-content button:hover) .share-node,
.icon-share:hover .share-node {
  transform: scale(1.08);
}

:deep(.btn-icon:hover) .link-1,
:deep(.dropdown-content button:hover) .link-1,
.icon-share:hover .link-1 {
  transform: translateY(-1px) rotate(2deg);
}

:deep(.btn-icon:hover) .link-2,
:deep(.dropdown-content button:hover) .link-2,
.icon-share:hover .link-2 {
  transform: translateY(1px) rotate(-2deg);
}
</style>
