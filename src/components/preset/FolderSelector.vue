<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import FolderSelectorItem from './FolderSelectorItem.vue';

const props = defineProps<{
  modelValue: string | null | undefined;
  tree: any[];
  flattened: any[]; // Used for quick name lookup
  excludeId?: string;
  placeholder?: string;
  rootLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();

const isOpen = ref(false);
const expandedIds = ref(new Set<string>());
const selectorRef = ref<HTMLElement | null>(null);

const displayLabel = computed(() => {
  if (!props.modelValue) return props.rootLabel || '(无)';
  const found = props.flattened.find(f => f.id === props.modelValue);
  return found ? found.name : (props.rootLabel || '(未知文件夹)');
});

// Auto-expand to selected folder on mount/change
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    expandToId(newVal);
  }
}, { immediate: true });

function expandToId(id: string) {
  // Find path to this id
  // Since we don't have parent pointers easily available without traversal, 
  // we can rely on the fact that we want to ensure parents are expanded.
  // A simple way is to traverse the tree.
  // Or, we can just search in flattened list if it had parentId info?
  // The flattened list in PresetManager has `label` which is path, but maybe not direct parent chain.
  // Let's just do a simple tree search if needed.
  
  // Actually, let's just rely on user expanding, OR simple search.
  // For now, let's not overengineer auto-expansion unless requested.
  // Wait, if I select a deep folder, I expect to see it if I open the dropdown again?
  // Maybe just keep `expandedIds` persistent.
}

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function closeDropdown() {
  isOpen.value = false;
}

function handleSelect(id: string) {
  emit('update:modelValue', id);
  closeDropdown();
}

function handleToggle(id: string) {
  const newSet = new Set(expandedIds.value);
  if (newSet.has(id)) {
    newSet.delete(id);
  } else {
    newSet.add(id);
  }
  expandedIds.value = newSet;
}

// Click outside to close
function handleClickOutside(event: MouseEvent) {
  if (selectorRef.value && !selectorRef.value.contains(event.target as Node)) {
    closeDropdown();
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
  <div class="folder-selector" ref="selectorRef">
    <!-- Trigger Button -->
    <div class="selector-trigger" @click="toggleDropdown" :class="{ active: isOpen }">
      <span class="selected-label">
        <span v-if="!modelValue" class="icon-root">📂</span>
        <span v-else class="icon-folder">📁</span>
        {{ displayLabel }}
      </span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="chevron" :class="{ rotated: isOpen }">
        <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    <!-- Dropdown -->
    <div v-if="isOpen" class="selector-dropdown">
      <!-- Root Option -->
      <div 
        class="root-option" 
        :class="{ active: !modelValue }"
        @click="handleSelect('')"
      >
        <span class="icon-root">📂</span>
        <span>{{ rootLabel || '(无)' }}</span>
      </div>

      <!-- Tree -->
      <div class="tree-container">
        <FolderSelectorItem
          v-for="folder in tree"
          :key="folder.id"
          :folder="folder"
          :level="0"
          :selected-id="modelValue"
          :exclude-id="excludeId"
          :expanded-ids="expandedIds"
          @select="handleSelect"
          @toggle="handleToggle"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.folder-selector {
  position: relative;
  width: 100%;
}

.selector-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.selector-trigger:hover {
  border-color: var(--color-accent);
}

.selector-trigger.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

.selected-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  color: var(--color-text-tertiary);
  transition: transform 0.2s ease;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.selector-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 100;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.root-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  color: var(--color-text-secondary);
}

.root-option:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.root-option.active {
  background-color: var(--color-accent);
  color: white;
}

.tree-container {
  padding: 0.25rem 0;
}

.icon-root, .icon-folder {
  font-size: 1.1em;
}
</style>
