<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import type { PresetFolder } from '../../types';

// 定义树节点类型，包含 children
interface FolderNode extends PresetFolder {
  children: FolderNode[];
  presetCount: number;
}

const props = defineProps<{
  folder: FolderNode;
  level: number;
  selectedFolderId: string | null;
  expandedIds: Set<string>;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'toggle', id: string): void;
  (e: 'create-sub', parentId: string): void;
  (e: 'edit', folder: PresetFolder): void;
  (e: 'delete', folder: PresetFolder): void;
}>();

const isExpanded = computed(() => props.expandedIds.has(props.folder.id));
const isSelected = computed(() => props.selectedFolderId === props.folder.id);

function handleToggle(e: Event) {
  e.stopPropagation();
  emit('toggle', props.folder.id);
}

function handleSelect() {
  emit('select', props.folder.id);
}

// 上下文菜单或操作按钮
const showActions = ref(false);
</script>

<template>
  <div class="folder-tree-item">
    <div 
      class="folder-row" 
      :class="{ active: isSelected }"
      :style="{ paddingLeft: `${level * 1.2 + 0.5}rem` }"
      @click="handleSelect"
      @mouseenter="showActions = true"
      @mouseleave="showActions = false"
    >
      <!-- 展开/折叠箭头 -->
      <button 
        class="toggle-btn" 
        :class="{ invisible: !folder.children.length }"
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

      <!-- 文件夹图标 -->
      <span class="folder-icon" :style="{ color: folder.color || '#6366f1' }">
        <svg v-if="isExpanded" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/>
        </svg>
      </span>

      <!-- 文件夹名称 -->
      <span class="folder-name">{{ folder.name }}</span>
      
      <!-- 计数 -->
      <span class="folder-count" v-if="folder.presetCount > 0">{{ folder.presetCount }}</span>

      <!-- 操作按钮组 (悬停显示) -->
      <div class="folder-actions" v-show="showActions || isSelected">
        <button @click.stop="emit('create-sub', folder.id)" title="新建子文件夹">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
        <button @click.stop="emit('edit', folder)" title="编辑文件夹">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button @click.stop="emit('delete', folder)" class="delete-btn" title="删除文件夹">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 递归渲染子节点 -->
    <div v-if="isExpanded && folder.children.length" class="folder-children">
      <FolderTreeItem
        v-for="child in folder.children"
        :key="child.id"
        :folder="child"
        :level="level + 1"
        :selected-folder-id="selectedFolderId"
        :expanded-ids="expandedIds"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
        @create-sub="emit('create-sub', $event)"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.folder-row {
  display: flex;
  align-items: center;
  padding: 0.375rem 0.5rem;
  cursor: pointer;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  transition: all 0.1s ease;
  position: relative;
  user-select: none;
  height: 2rem;
}

.folder-row:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.folder-row.active {
  background-color: var(--color-accent-light);
  color: var(--color-accent);
}

/* 适配暗色模式下的选中状态 */
:global(.dark) .folder-row.active {
  background-color: rgba(59, 130, 246, 0.2);
  color: var(--color-accent);
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
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-count {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  margin-left: 0.5rem;
  background-color: var(--color-bg-tertiary);
  padding: 0 0.375rem;
  border-radius: 99px;
  min-width: 1.25rem;
  text-align: center;
}

.folder-actions {
  display: flex;
  gap: 0.25rem;
  margin-left: 0.5rem;
}

.folder-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.folder-actions button:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.folder-actions button.delete-btn:hover {
  color: var(--color-error);
  background-color: rgba(239, 68, 68, 0.1);
}
</style>
