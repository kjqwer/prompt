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
    class="icon-menu"
  >
    <path class="menu-line line-1" d="M4 7h16" />
    <path class="menu-line line-2" d="M4 12h16" />
    <path class="menu-line line-3" d="M4 17h16" />
    <circle class="menu-spark" cx="19" cy="7" r="1" fill="currentColor" />
  </svg>
</template>

<style scoped>
.icon-menu {
  overflow: visible;
  color: currentColor;
}

.menu-line,
.menu-spark {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
  transform-origin: center;
}

:deep(.mobile-menu-btn:hover) .line-1,
.icon-menu:hover .line-1 {
  transform: translateY(-1px) rotate(4deg);
}

:deep(.mobile-menu-btn:hover) .line-2,
.icon-menu:hover .line-2 {
  transform: scaleX(0.86);
}

:deep(.mobile-menu-btn:hover) .line-3,
.icon-menu:hover .line-3 {
  transform: translateY(1px) rotate(-4deg);
}

:deep(.mobile-menu-btn:hover) .menu-spark,
.icon-menu:hover .menu-spark {
  opacity: 1;
  transform: scale(1.4);
}
</style>
