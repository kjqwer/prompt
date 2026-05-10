<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { ExtendedPreset, PresetType } from '../../types';
import IconPresetType from '../icons/IconPresetType.vue';
import IconArrowLeft from '../icons/IconArrowLeft.vue';
import IconArrowRight from '../icons/IconArrowRight.vue';
import IconHeart from '../icons/IconHeart.vue';
import IconCheck from '../icons/IconCheck.vue';
import IconCopy from '../icons/IconCopy.vue';
import IconMore from '../icons/IconMore.vue';
import IconShare from '../icons/IconShare.vue';
import IconEditor from '../icons/IconEditor.vue';
import IconTrash from '../icons/IconTrash.vue';
import IconEmptyState from '../icons/IconEmptyState.vue';

const props = defineProps<{
  presets: ExtendedPreset[];
  searchQuery: string;
  resetKey: string;
  enableReorder?: boolean;
}>();

const emit = defineEmits<{
  (e: 'apply', preset: ExtendedPreset): void;
  (e: 'edit', preset: ExtendedPreset): void;
  (e: 'delete', preset: ExtendedPreset): void;
  (e: 'copy', preset: ExtendedPreset): void;
  (e: 'share', preset: ExtendedPreset): void;
  (e: 'toggle-favorite', preset: ExtendedPreset): void;
  (e: 'reorder', payload: { draggedId: string; targetId: string; side: 'before' | 'after' }): void;
  (e: 'view-state-change'): void;
}>();

// Pagination Logic
const PAGE_SIZE = 24;
const currentPage = ref(1);
const containerRef = ref<HTMLElement | null>(null);
const draggingPresetId = ref<string | null>(null);
const overPresetId = ref<string | null>(null);
const dropSide = ref<'before' | 'after' | null>(null);

const totalPages = computed(() => Math.ceil(props.presets.length / PAGE_SIZE));

const displayedPresets = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  return props.presets.slice(start, end);
});

watch(() => props.resetKey, () => {
  currentPage.value = 1;
  if (containerRef.value) {
    containerRef.value.scrollTop = 0;
  }
  emit('view-state-change');
});

watch(() => props.presets.length, () => {
  const fallbackMax = totalPages.value || 1;
  if (currentPage.value > fallbackMax) {
    currentPage.value = fallbackMax;
  }
});

function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  if (containerRef.value) {
    containerRef.value.scrollTop = 0;
  }
  emit('view-state-change');
}

function setCurrentPage(page: number, resetScroll = false) {
  const fallbackMax = totalPages.value || 1;
  currentPage.value = Math.min(Math.max(page, 1), fallbackMax);
  if (resetScroll && containerRef.value) {
    containerRef.value.scrollTop = 0;
  }
}

function getCurrentPage() {
  return currentPage.value;
}

defineExpose({
  containerRef,
  setCurrentPage,
  getCurrentPage,
});

function onDragStart(preset: ExtendedPreset, event: DragEvent) {
  if (!props.enableReorder) {
    event.preventDefault();
    return;
  }
  draggingPresetId.value = preset.id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', preset.id);
  }
}

function onDragOver(preset: ExtendedPreset, event: DragEvent) {
  if (!props.enableReorder) return;
  if (!draggingPresetId.value || draggingPresetId.value === preset.id) return;
  event.preventDefault();
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const side = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  overPresetId.value = preset.id;
  dropSide.value = side;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function onDrop(preset: ExtendedPreset, event: DragEvent) {
  if (!props.enableReorder) {
    cleanupDragState();
    return;
  }
  if (!draggingPresetId.value || draggingPresetId.value === preset.id || !dropSide.value) {
    cleanupDragState();
    return;
  }
  event.preventDefault();
  emit('reorder', {
    draggedId: draggingPresetId.value,
    targetId: preset.id,
    side: dropSide.value,
  });
  cleanupDragState();
}

function cleanupDragState() {
  draggingPresetId.value = null;
  overPresetId.value = null;
  dropSide.value = null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

function handleKeydown(event: KeyboardEvent) {
  if (totalPages.value <= 1) return;
  if (isTypingTarget(event.target)) return;

  if (event.key === 'PageDown') {
    event.preventDefault();
    changePage(currentPage.value + 1);
    return;
  }

  if (event.key === 'PageUp') {
    event.preventDefault();
    changePage(currentPage.value - 1);
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

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
  <div class="preset-list-container" ref="containerRef" @scroll="emit('view-state-change')">
        <div v-if="presets.length === 0" class="empty-state">
      <IconEmptyState class="empty-icon" />
      <p class="empty-text">暂无预设</p>
    </div>

    <template v-else>
      <div v-if="totalPages > 1" class="pagination-controls pagination-top">
        <button 
          :disabled="currentPage === 1" 
          @click="changePage(currentPage - 1)"
          class="page-btn nav-btn prev-page"
          title="上一页 (PageUp)"
        >
          <IconArrowLeft width="16" height="16" />
        </button>
        
        <div class="page-numbers">
          <span class="page-info">第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
          <span class="total-count">PageUp / PageDown</span>
        </div>
        
        <button 
          :disabled="currentPage === totalPages" 
          @click="changePage(currentPage + 1)"
          class="page-btn nav-btn next-page"
          title="下一页 (PageDown)"
        >
          <IconArrowRight width="16" height="16" />
        </button>
      </div>

      <div class="preset-grid">
        <div v-for="preset in displayedPresets" :key="preset.id" class="preset-card nav-btn" :draggable="!!enableReorder"
          :class="{
            dragging: draggingPresetId === preset.id,
            'insert-before': overPresetId === preset.id && dropSide === 'before' && draggingPresetId !== preset.id,
            'insert-after': overPresetId === preset.id && dropSide === 'after' && draggingPresetId !== preset.id,
            'reorder-disabled': !enableReorder
          }"
          @dragstart="onDragStart(preset, $event)" @dragover="onDragOver(preset, $event)"
          @drop="onDrop(preset, $event)" @dragend="cleanupDragState">
          <div class="card-header">
            <div class="preset-type" :title="getTypeLabel(preset.type)">
              <IconPresetType :type="preset.type" width="24" height="24" />
            </div>
          <h4 class="preset-name" :title="preset.name">{{ preset.name }}</h4>
          <div class="preset-actions">
                        <button @click="emit('toggle-favorite', preset)" class="action-btn" :class="{ 'is-favorite': preset.isFavorite }" title="收藏">
              <IconHeart :active="preset.isFavorite" width="14" height="14" />
            </button>
                        <button @click="emit('apply', preset)" class="action-btn apply-btn" title="应用到提示词">
              <IconCheck width="14" height="14" />
            </button>
                        <button @click="emit('copy', preset)" class="action-btn" title="复制内容">
              <IconCopy width="14" height="14" />
            </button>
            <div class="dropdown-menu">
                            <button class="action-btn more-btn">
                <IconMore width="14" height="14" />
              </button>
              <div class="dropdown-content">
                                <button @click="emit('share', preset)">
                  <IconShare width="14" height="14" />
                  分享
                </button>
                                <button @click="emit('edit', preset)">
                  <IconEditor width="14" height="14" />
                  编辑
                </button>
                                <button @click="emit('delete', preset)" class="delete-item">
                  <IconTrash width="14" height="14" />
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
    
    <div v-if="totalPages > 1" class="pagination-controls">
      <button 
        :disabled="currentPage === 1" 
        @click="changePage(currentPage - 1)"
        class="page-btn nav-btn prev-page"
        title="上一页 (PageUp)"
      >
        <IconArrowLeft width="16" height="16" />
      </button>
      
      <div class="page-numbers">
        <span class="page-info">第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
        <span class="total-count">({{ presets.length }} 个预设)</span>
      </div>
      
      <button 
        :disabled="currentPage === totalPages" 
        @click="changePage(currentPage + 1)"
        class="page-btn nav-btn next-page"
        title="下一页 (PageDown)"
      >
        <IconArrowRight width="16" height="16" />
      </button>
    </div>
  </template>
  </div>
</template>

<style scoped>
.preset-list-container {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
  scrollbar-gutter: stable;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-tertiary);
  opacity: 0.6;
}

.empty-icon {
  margin-bottom: 1rem;
  color: var(--color-text-tertiary);
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
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  transition: all 0.2s ease;
  position: relative;
  text-align: left;
  cursor: grab;
}

.preset-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-hover);
}

.preset-card.dragging {
  opacity: 0.55;
  cursor: grabbing;
}

.preset-card.reorder-disabled {
  cursor: default;
}

.preset-card.insert-before {
  border-top: 3px solid var(--color-accent);
}

.preset-card.insert-after {
  border-bottom: 3px solid var(--color-accent);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
}

.preset-type {
  font-size: 1.25rem;
  margin-right: 0.5rem;
  flex-shrink: 0;
  line-height: 1;
  display: flex;
  align-items: center;
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

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 0 0.5rem 0;
  gap: 1rem;
  margin-top: auto;
}

.pagination-top {
  position: sticky;
  top: -1rem;
  z-index: 5;
  margin: -1rem -1rem 1rem;
  padding: 0.75rem 1rem;
  background: color-mix(in srgb, var(--color-bg-primary) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border-color: var(--color-border-hover);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--color-bg-primary);
}

.page-numbers {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.page-info {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.total-count {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.prev-page:hover:not(:disabled) :deep(.arrow-path) {
  transform: translateX(-4px) scale(1.15);
}

.next-page:hover:not(:disabled) :deep(.arrow-path) {
  transform: translateX(4px) scale(1.15);
}
</style>
