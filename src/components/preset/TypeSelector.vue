<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { PresetType } from '../../types';
import IconPresetType from '../icons/IconPresetType.vue';

const props = defineProps<{
  modelValue: PresetType | 'all';
  options: { value: PresetType | 'all'; label: string }[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: PresetType | 'all'): void;
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const selectedLabel = computed(() => {
  const option = props.options.find(o => o.value === props.modelValue);
  return option ? option.label : '所有类型';
});

function toggle() {
  isOpen.value = !isOpen.value;
}

function select(value: PresetType | 'all') {
  emit('update:modelValue', value);
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="type-selector" ref="containerRef">
    <button class="selector-btn nav-btn" @click="toggle" :class="{ active: isOpen }">
      <div class="selected-content">
        <IconPresetType v-if="modelValue !== 'all'" :type="modelValue" width="16" height="16" />
        <span v-else class="all-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </span>
        <span>{{ selectedLabel }}</span>
      </div>
      <svg class="chevron" :class="{ rotated: isOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
    
    <Transition name="fade">
      <div v-if="isOpen" class="options-list">
        <button 
          v-for="option in options" 
          :key="option.value" 
          class="option-item nav-btn"
          :class="{ selected: modelValue === option.value }"
          @click="select(option.value)"
        >
          <div class="option-icon">
            <IconPresetType v-if="option.value !== 'all'" :type="option.value" width="16" height="16" />
            <span v-else class="all-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </span>
          </div>
          <span>{{ option.label }}</span>
          <svg v-if="modelValue === option.value" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.type-selector {
  position: relative;
  min-width: 140px;
}

.selector-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.selector-btn:hover, .selector-btn.active {
  border-color: var(--color-border-hover);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.selected-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chevron {
  transition: transform 0.2s;
  color: var(--color-text-tertiary);
}

.chevron.rotated {
  transform: rotate(180deg);
}

.options-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  min-width: 160px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 50;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.25rem;
}

.option-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem;
  border: none;
  background: none;
  color: var(--color-text-primary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background-color 0.2s;
  text-align: left;
}

.option-item:hover {
  background-color: var(--color-bg-secondary);
}

.option-item.selected {
  background-color: var(--color-bg-tertiary);
  font-weight: 500;
  color: var(--color-text-primary);
}

.option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.5rem;
  color: var(--color-text-secondary);
}

.all-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  margin-left: auto;
  color: var(--color-accent);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
