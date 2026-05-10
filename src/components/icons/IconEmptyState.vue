<script setup lang="ts">
defineProps<{
  width?: string | number
  height?: string | number
}>()
</script>

<template>
  <svg
    :width="width || 48"
    :height="height || 48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    class="icon-empty-state"
  >
    <path class="empty-box" d="M4 7h16v10H4z" />
    <path class="empty-line" d="M7 11h10" />
    <path class="empty-line" d="M7 14h6" />
    <circle class="empty-spark spark-1" cx="17" cy="8" r="1" fill="currentColor" />
    <circle class="empty-spark spark-2" cx="8" cy="6" r="1" fill="currentColor" />
  </svg>
</template>

<style scoped>
.icon-empty-state {
  overflow: visible;
  color: currentColor;
}

.empty-box,
.empty-line,
.empty-spark {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
  transform-origin: center;
}

.empty-spark {
  opacity: 0.45;
}

.icon-empty-state:hover .empty-box {
  transform: translateY(-1px);
}

.icon-empty-state:hover .spark-1 {
  transform: translateY(-1px) scale(1.2);
}

.icon-empty-state:hover .spark-2 {
  transform: translateY(1px) scale(1.2);
}
</style>
