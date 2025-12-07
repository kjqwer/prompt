<template>
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2" 
    stroke-linecap="round" 
    stroke-linejoin="round"
    class="icon-editor"
  >
    <path class="paper" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path class="pencil" d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
</template>

<style scoped>
.icon-editor {
  overflow: visible;
}

.pencil {
  transform-origin: center;
  transition: transform 0.3s ease;
}

.paper {
  transition: stroke-dashoffset 0.3s ease;
}

/* Hover effect handled by parent class usually, or we can use :hover if the svg itself is the target */
:deep(.nav-btn:hover) .pencil,
svg:hover .pencil {
  transform: translate(2px, -2px) rotate(5deg);
  animation: write 1s ease-in-out infinite alternate;
}

@keyframes write {
  0% { transform: translate(0, 0) rotate(0); }
  100% { transform: translate(2px, -2px) rotate(10deg); }
}
</style>
