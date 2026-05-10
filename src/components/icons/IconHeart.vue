<script setup lang="ts">
withDefaults(defineProps<{
  width?: string | number
  height?: string | number
  active?: boolean
}>(), {
  active: false,
})
</script>

<template>
  <svg
    :width="width || 24"
    :height="height || 24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    class="icon-heart"
    :class="{ 'is-active': active }"
  >
    <path class="heart-glow" d="M12 20.5 10.9 19.5C6.1 15.4 3.4 12.9 3.4 9.6 3.4 7.1 5.4 5 7.9 5c1.5 0 2.8.7 3.6 1.9.8-1.2 2.1-1.9 3.6-1.9 2.5 0 4.5 2.1 4.5 4.6 0 3.3-2.7 5.8-7.5 9.9L12 20.5Z" />
    <path class="heart-fill" fill="currentColor" d="M12 20.5 10.9 19.5C6.1 15.4 3.4 12.9 3.4 9.6 3.4 7.1 5.4 5 7.9 5c1.5 0 2.8.7 3.6 1.9.8-1.2 2.1-1.9 3.6-1.9 2.5 0 4.5 2.1 4.5 4.6 0 3.3-2.7 5.8-7.5 9.9L12 20.5Z" />
    <path class="heart-outline" d="M12 20.5 10.9 19.5C6.1 15.4 3.4 12.9 3.4 9.6 3.4 7.1 5.4 5 7.9 5c1.5 0 2.8.7 3.6 1.9.8-1.2 2.1-1.9 3.6-1.9 2.5 0 4.5 2.1 4.5 4.6 0 3.3-2.7 5.8-7.5 9.9L12 20.5Z" />
  </svg>
</template>

<style scoped>
.icon-heart {
  overflow: visible;
  color: currentColor;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.heart-glow,
.heart-fill,
.heart-outline {
  transform-origin: center;
  transition: transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease, fill 0.25s ease, stroke 0.25s ease;
}

.heart-glow {
  fill: currentColor;
  opacity: 0;
  stroke: none;
  filter: blur(1.25px);
  transform: scale(0.86);
}

.heart-fill {
  fill: currentColor;
  opacity: 0;
  stroke: none;
}

.heart-outline {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  opacity: 0.92;
}

.icon-heart.is-active .heart-fill {
  opacity: 1;
  transform: scale(1.01);
}

.icon-heart.is-active .heart-outline {
  opacity: 0;
}

.icon-heart:hover,
:deep(.action-btn:hover) .icon-heart,
:deep(.action-btn.is-favorite:hover) .icon-heart {
  transform: translateY(-1px) scale(1.1);
}

.icon-heart:hover .heart-outline,
:deep(.action-btn:hover) .heart-outline {
  transform: scale(1.04);
}

.icon-heart:hover .heart-glow,
:deep(.action-btn:hover) .heart-glow {
  opacity: 0.2;
  transform: scale(1.18);
}

.icon-heart.is-active:hover .heart-fill,
:deep(.action-btn.is-favorite:hover) .heart-fill {
  transform: scale(1.04);
}

.icon-heart.is-active:hover .heart-glow,
:deep(.action-btn.is-favorite:hover) .heart-glow {
  opacity: 0.24;
  transform: scale(1.22);
}
</style>
