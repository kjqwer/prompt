<script setup lang="ts">
import { computed } from 'vue';
import type { PresetFolder } from '../../types';

interface FolderNode extends PresetFolder {
  children: FolderNode[];
}

const props = defineProps<{
  folder: FolderNode;
  level: number;
  selectedId: string | null | undefined;
  excludeId?: string;
  expandedIds: Set<string>;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'toggle', id: string): void;
}>();

const isExpanded = computed(() => props.expandedIds.has(props.folder.id));
const isSelected = computed(() => props.selectedId === props.folder.id);
const isExcluded = computed(() => props.excludeId && props.folder.id === props.excludeId);

function handleToggle(e: Event) {
  e.stopPropagation();
  emit('toggle', props.folder.id);
}

function handleSelect() {
  emit('select', props.folder.id);
}
</script>

<template>
  <div v-if="!isExcluded" class="folder-selector-item">
    <div 
      class="item-row" 
      :class="{ active: isSelected }"
      :style="{ paddingLeft: `${level * 1.2 + 0.5}rem` }"
      @click="handleSelect"
    >
      <!-- Toggle Arrow -->
      <button 
        class="toggle-btn" 
        :class="{ invisible: !folder.children?.length }"
        @click="handleToggle"
      >
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          :class="{ rotated: isExpanded }"
          class="arrow-icon"
        >
          <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- Folder Icon -->
      <span class="folder-icon" :style="{ color: folder.color || '#6366f1' }">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
        </svg>
      </span>

      <span class="folder-name">{{ folder.name }}</span>
    </div>

    <!-- Children -->
    <div v-if="isExpanded && folder.children?.length" class="item-children">
      <FolderSelectorItem
        v-for="child in folder.children"
        :key="child.id"
        :folder="child"
        :level="level + 1"
        :selected-id="selectedId"
        :exclude-id="excludeId"
        :expanded-ids="expandedIds"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.item-row {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  color: var(--color-text-primary);
  transition: background-color 0.1s ease;
  user-select: none;
}

.item-row:hover {
  background-color: var(--color-bg-tertiary);
}

.item-row.active {
  background-color: var(--color-accent);
  color: white;
}

.item-row.active .folder-icon {
  color: white !important;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  margin-right: 0.25rem;
}

.toggle-btn.invisible {
  opacity: 0;
  pointer-events: none;
}

.arrow-icon {
  transition: transform 0.2s ease;
}

.arrow-icon.rotated {
  transform: rotate(90deg);
}

.folder-icon {
  display: flex;
  align-items: center;
  margin-right: 0.5rem;
}

.folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}
</style>
