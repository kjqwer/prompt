<script setup lang="ts">
import { ref, computed } from 'vue';
import FolderTreeItem from './FolderTreeItem.vue';
import type { PresetFolder } from '../../types';

interface FolderNode extends PresetFolder {
  children: FolderNode[];
  presetCount: number;
}

const props = defineProps<{
  folderTree: FolderNode[];
  selectedFolderId: string | null;
  expandedIds: Set<string>;
  allCount: number;
  uncategorizedCount: number;
  favoritesCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:selectedFolderId', id: string | null): void;
  (e: 'toggle-expand', id: string): void;
  (e: 'create-folder'): void;
  (e: 'create-sub-folder', parentId: string): void;
  (e: 'edit-folder', folder: PresetFolder): void;
  (e: 'delete-folder', folder: PresetFolder): void;
  (e: 'share-folder', folder: PresetFolder): void;
}>();

function selectFolder(id: string | null) {
  emit('update:selectedFolderId', id);
}
</script>

<template>
  <div class="preset-sidebar">
    <div class="sidebar-header">
      <h3 class="sidebar-title">预设文件夹</h3>
      <button @click="emit('create-folder')" class="add-folder-btn" title="新建根文件夹">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="11" x2="12" y2="17" stroke="currentColor" stroke-width="2"/>
          <line x1="9" y1="14" x2="15" y2="14" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
    </div>

    <div class="sidebar-content">
      <!-- 固定选项 -->
      <div class="system-folders">
        <div 
          class="sidebar-item" 
          :class="{ active: selectedFolderId === null }"
          @click="selectFolder(null)"
        >
          <span class="item-icon">📋</span>
          <span class="item-name">所有预设</span>
          <span class="item-count">{{ allCount }}</span>
        </div>

        <div 
          class="sidebar-item" 
          :class="{ active: selectedFolderId === 'favorites' }"
          @click="selectFolder('favorites')"
        >
          <span class="item-icon">❤️</span>
          <span class="item-name">我的收藏</span>
          <span class="item-count">{{ favoritesCount }}</span>
        </div>
        
        <div 
          class="sidebar-item" 
          :class="{ active: selectedFolderId === '' }"
          @click="selectFolder('')"
        >
          <span class="item-icon">📂</span>
          <span class="item-name">未分类</span>
          <span class="item-count">{{ uncategorizedCount }}</span>
        </div>
      </div>

      <div class="folder-tree-container">
        <div v-if="folderTree.length === 0" class="empty-tree">
          暂无文件夹
        </div>
        <FolderTreeItem
          v-for="folder in folderTree"
          :key="folder.id"
          :folder="folder"
          :level="0"
          :selected-folder-id="selectedFolderId"
          :expanded-ids="expandedIds"
          @select="selectFolder"
          @toggle="emit('toggle-expand', $event)"
          @create-sub="emit('create-sub-folder', $event)"
          @edit="emit('edit-folder', $event)"
          @delete="emit('delete-folder', $event)"
          @share="emit('share-folder', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.preset-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.add-folder-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-folder-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-accent);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.system-folders {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  transition: all 0.1s ease;
  margin-bottom: 0.25rem;
}

.sidebar-item:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.sidebar-item.active {
  background-color: var(--color-accent);
  color: white;
}

.sidebar-item.active .item-count {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.item-icon {
  margin-right: 0.75rem;
  font-size: 1rem;
}

.item-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}

.item-count {
  font-size: 0.75rem;
  background-color: var(--color-bg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: 99px;
  min-width: 1.25rem;
  text-align: center;
}

.empty-tree {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
  font-style: italic;
}

/* 滚动条样式优化 */
.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-text-tertiary);
}
</style>
