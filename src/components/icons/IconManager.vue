<template>
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2" 
    stroke-linecap="round" 
    stroke-linejoin="round"
    class="icon-manager"
  >
    <path class="disk-top" d="M21 5c0 1.66-4 3-9 3s-9-1.34-9-3 4-3 9-3 9 1.34 9 3z" />
    <path class="disk-middle" d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path class="disk-bottom" d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
  </svg>
</template>

<style scoped>
.disk-top, .disk-middle, .disk-bottom {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

:deep(.nav-btn:hover) .disk-top,
svg:hover .disk-top {
  transform: translateY(-1px);
}

:deep(.nav-btn:hover) .disk-bottom,
svg:hover .disk-bottom {
  transform: translateY(1px);
}
</style>
