<template>
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2" 
    stroke-linecap="round" 
    stroke-linejoin="round"
    class="icon-presets"
  >
    <path class="layout-main" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline class="layout-line-1" points="17 21 17 13 7 13 7 21" />
    <polyline class="layout-line-2" points="7 3 7 8 15 8" />
  </svg>
</template>

<style scoped>
.layout-main, .layout-line-1, .layout-line-2 {
  transition: all 0.3s ease;
  transform-origin: center;
}

:deep(.nav-btn:hover) .layout-line-1,
svg:hover .layout-line-1 {
  transform: scaleY(0.9) translateY(1px);
}

:deep(.nav-btn:hover) .layout-line-2,
svg:hover .layout-line-2 {
  transform: translateX(1px);
}
</style>
