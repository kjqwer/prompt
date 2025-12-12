<script setup lang="ts">
import { computed } from 'vue';
import type { ExtendedPreset, PresetType } from '../../types';

const props = defineProps<{
  presets: ExtendedPreset[];
  searchQuery: string;
}>();

const emit = defineEmits<{
  (e: 'apply', preset: ExtendedPreset): void;
  (e: 'edit', preset: ExtendedPreset): void;
  (e: 'delete', preset: ExtendedPreset): void;
  (e: 'copy', preset: ExtendedPreset): void;
  (e: 'share', preset: ExtendedPreset): void;
  (e: 'toggle-favorite', preset: ExtendedPreset): void;
}>();

function getTypeIcon(type: PresetType) {
  const icons: Record<string, string> = {
    positive: '🪄',
    negative: '⛔',
    setting: '⚙️',
    style: '🖌️',
    character: '🧙',
    scene: '🏞️',
    custom: '🧩'
  };
  return icons[type] || '🧩';
}

function getTypeLabel(type: PresetType) {
  const labels: Record<string, string> = {
    positive: '正面',
    negative: '负面',
    setting: '设定',
    style: '风格',
    character: '角色',
    scene: '场景',
    custom: '自定义'
  };
  return labels[type] || type;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
</script>

<template>
  <div class="preset-list-container">
    <div v-if="presets.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <p class="empty-text">暂无预设</p>
    </div>

    <div v-else class="preset-grid">
      <div v-for="preset in presets" :key="preset.id" class="preset-card">
        <div class="card-header">
          <div class="preset-type" :title="getTypeLabel(preset.type)">
            {{ getTypeIcon(preset.type) }}
          </div>
          <h4 class="preset-name" :title="preset.name">{{ preset.name }}</h4>
          <div class="preset-actions">
            <button @click="emit('toggle-favorite', preset)" class="action-btn" :class="{ 'is-favorite': preset.isFavorite }" title="收藏">
              <svg width="14" height="14" viewBox="0 0 24 24" :fill="preset.isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            <button @click="emit('apply', preset)" class="action-btn apply-btn" title="应用预设">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </button>
            <button @click="emit('copy', preset)" class="action-btn" title="复制内容">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="m5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <div class="dropdown-menu">
              <button class="action-btn more-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="19" cy="12" r="1"/>
                  <circle cx="5" cy="12" r="1"/>
                </svg>
              </button>
              <div class="dropdown-content">
                <button @click="emit('share', preset)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  分享
                </button>
                <button @click="emit('edit', preset)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  编辑
                </button>
                <button @click="emit('delete', preset)" class="delete-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="preset-preview">{{ preset.content }}</div>
          <div v-if="preset.description" class="preset-desc">{{ preset.description }}</div>
        </div>

        <div class="card-footer">
          <div class="tags-list" v-if="preset.tags && preset.tags.length">
            <span v-for="tag in preset.tags.slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
            <span v-if="preset.tags.length > 3" class="tag-more">+{{ preset.tags.length - 3 }}</span>
          </div>
          <div class="date-info" v-else>
            {{ formatDate(preset.updatedAt) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preset-list-container {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-tertiary);
  opacity: 0.6;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.preset-card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
  position: relative;
}

.preset-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-hover);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
}

.preset-type {
  font-size: 1.25rem;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.preset-name {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preset-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.preset-card:hover .preset-actions {
  opacity: 1;
}

@media (max-width: 768px) {
  .preset-actions {
    opacity: 1;
  }
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.apply-btn:hover {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.is-favorite {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
  background-color: rgba(239, 68, 68, 0.1);
}

.is-favorite:hover {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* Dropdown menu implementation */
.dropdown-menu {
  position: relative;
  height: 1.75rem; /* Match button height to ensure alignment */
}

.dropdown-menu::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  height: 0.5rem; /* Bridge the gap */
}

.dropdown-content {
  display: none;
  position: absolute;
  right: 0;
  top: calc(100% + 0.25rem);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 120px;
  z-index: 10;
  padding: 0.25rem;
}

.dropdown-menu:hover .dropdown-content,
.dropdown-menu:focus-within .dropdown-content {
  display: block;
}

.dropdown-content button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.dropdown-content button:hover {
  background-color: var(--color-bg-secondary);
}

.dropdown-content button.delete-item:hover {
  color: var(--color-error);
  background-color: rgba(239, 68, 68, 0.1);
}

.card-body {
  flex: 1;
  margin-bottom: 0.75rem;
  min-height: 4rem;
}

.preset-preview {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-tertiary);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  height: 7rem;
  overflow-y: auto;
  margin-bottom: 0.5rem;
  word-break: break-word;
  white-space: pre-wrap;
}

.preset-preview::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.preset-preview::-webkit-scrollbar-thumb {
  background-color: var(--color-border-hover);
  border-radius: 2px;
}

.preset-preview::-webkit-scrollbar-track {
  background: transparent;
}

.preset-desc {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2; 
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.tags-list {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.tag {
  background-color: var(--color-bg-secondary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.tag-more {
  background-color: var(--color-bg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
}
</style>
