<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePromptStore } from '../stores/promptStore';
import type { LangCode, PromptGroup, PromptTag } from '../types';

const store = usePromptStore();
const draggingIndex = ref<number | null>(null);
const overIndex = ref<number | null>(null);

const languages = computed(() => store.languages);
const selectedLang = computed({
  get: () => store.selectedLang,
  set: (v: LangCode) => store.setLanguage(v),
});
const categories = computed(() => store.categories);
const currentCategory = computed(() => store.currentCategory);
const currentGroup = computed(() => store.currentGroup);
const filteredTags = computed(() => store.filteredTags);
const isSearching = computed(() => store.searchQuery.trim().length > 0);

function onDragStart(index: number) {
  if (isSearching.value) return;
  draggingIndex.value = index;
}
function onDragOver(index: number, e: DragEvent) {
  if (isSearching.value) return;
  e.preventDefault();
  overIndex.value = index;
}
function onDrop(index: number) {
  if (draggingIndex.value == null) return;
  const from = draggingIndex.value;
  const to = index;
  const grpId = currentGroup.value?.id;
  if (!grpId) return;
  store.reorderTags(grpId, from, to);
  draggingIndex.value = null;
  overIndex.value = null;
}

function displayTranslation(tag: PromptTag): string {
  return tag.translation?.[selectedLang.value] ?? tag.key;
}

function updateKey(tag: PromptTag, val: string) {
  const gid = currentGroup.value?.id;
  if (!gid) return;
  store.updateTagKey(gid, tag.key, val);
}

function updateTrans(tag: PromptTag, val: string) {
  const gid = currentGroup.value?.id;
  if (!gid) return;
  store.setTranslation(gid, tag.key, selectedLang.value, val);
}

function addTag() {
  const gid = currentGroup.value?.id;
  if (!gid) return;
  store.addTag(gid);
}

function removeTag(tag: PromptTag) {
  const gid = currentGroup.value?.id;
  if (!gid) return;
  store.removeTag(gid, tag.key);
}

function confirmRemoveTag(tag: PromptTag) {
  if (confirm(`确定要删除提示词 "${tag.key}" 吗？`)) {
    removeTag(tag);
  }
}

function toggleHidden(tag: PromptTag) {
  const gid = currentGroup.value?.id;
  if (!gid) return;
  store.toggleHidden(gid, tag.key);
}

function exportAll() {
  const json = store.exportToJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt_dataset_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importAll(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result);
      const bundle = JSON.parse(text);
      store.importFromBundle(bundle);
      alert('导入成功！');
    } catch (e) {
      alert('导入失败：JSON 格式不正确');
    } finally {
      input.value = '';
    }
  };
  reader.readAsText(file);
}

function resetDefault() {
  if (confirm('确定要重置为内置词库吗？这将丢失所有自定义更改。')) {
    store.resetToDefault();
  }
}
</script>

<template>
  <div class="pm-root">
    <!-- 工具栏 -->
    <header class="pm-toolbar">
      <div class="pm-left">
        <div class="pm-control-group">
          <label class="pm-label">语言</label>
          <select v-model="selectedLang" class="pm-select">
            <option v-for="l in languages" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
        <div class="pm-search-wrapper">
          <svg class="pm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input class="pm-search" type="search" placeholder="搜索关键字/翻译..." :value="store.searchQuery"
            @input="store.setSearch(($event.target as HTMLInputElement).value)" />
        </div>
      </div>
      <div class="pm-right">
        <button class="pm-btn" @click="exportAll" title="导出当前词库配置">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          导出 JSON
        </button>
        <label class="pm-btn pm-import-btn" title="导入词库配置">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          导入 JSON
          <input type="file" accept="application/json" @change="importAll" />
        </label>
        <button class="pm-btn pm-btn-danger" @click="resetDefault" title="重置为默认词库">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
          重置
        </button>
      </div>
    </header>

    <main class="pm-main">
      <!-- 侧边栏：分类与分组 -->
      <aside class="pm-sidebar">
        <div class="pm-sidebar-section">
          <div class="pm-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            分类
          </div>
          <ul class="pm-nav-list">
            <li v-for="(c, ci) in categories" :key="c.id" 
              class="pm-nav-item"
              :class="{ active: ci === store.selectedCategoryIndex }"
              @click="store.selectCategory(ci)">
              {{ c.name }}
            </li>
          </ul>
        </div>
        
        <div class="pm-sidebar-section">
          <div class="pm-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            分组
          </div>
          <ul class="pm-nav-list">
            <li v-for="(g, gi) in currentCategory?.groups" :key="g.id" 
              class="pm-nav-item"
              :class="{ active: gi === store.selectedGroupIndex }"
              @click="store.selectGroup(gi)">
              <span class="pm-color-dot" :style="{ background: g.color || 'var(--color-text-tertiary)' }"></span>
              {{ g.name }}
            </li>
          </ul>
        </div>
      </aside>

      <!-- 主要内容区：提示词列表 -->
      <section class="pm-content">
        <div class="pm-content-header">
          <div class="pm-group-info" v-if="currentGroup">
            <span class="pm-group-color" :style="{ background: currentGroup.color || 'var(--color-accent)' }"></span>
            <h2 class="pm-group-title">{{ currentGroup.name }}</h2>
            <span class="pm-count">{{ filteredTags.length }} 个提示词</span>
          </div>
          <div class="pm-content-actions" v-if="currentGroup">
            <button class="pm-btn-primary" @click="addTag">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              新增提示词
            </button>
          </div>
        </div>

        <div v-if="!currentGroup" class="pm-empty-state">
          <div class="pm-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <p>请从左侧选择一个分组以管理提示词</p>
        </div>
        
        <div v-else-if="filteredTags.length === 0" class="pm-empty-state">
          <p>该分组下暂无提示词</p>
          <button class="pm-btn-link" @click="addTag">点击添加第一个提示词</button>
        </div>

        <div v-else class="pm-tags-wrapper">
          <TransitionGroup name="list" tag="ul" class="pm-tags-list">
            <li v-for="(t, ti) in filteredTags" :key="t.key + '_' + ti" 
              class="pm-tag-item"
              :draggable="!isSearching" 
              @dragstart="onDragStart(ti)"
              @dragover="onDragOver(ti, $event)" 
              @drop="onDrop(ti)"
              :class="{ 
                hidden: t.hidden, 
                'pm-dragging-over': ti === overIndex 
              }">
              
              <div class="pm-tag-handle" title="拖拽排序" v-if="!isSearching">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="12" r="1"></circle>
                  <circle cx="9" cy="5" r="1"></circle>
                  <circle cx="9" cy="19" r="1"></circle>
                  <circle cx="15" cy="12" r="1"></circle>
                  <circle cx="15" cy="5" r="1"></circle>
                  <circle cx="15" cy="19" r="1"></circle>
                </svg>
              </div>

              <div class="pm-tag-inputs">
                <div class="pm-input-group">
                  <label class="pm-input-label">Key</label>
                  <input class="pm-input pm-key-input" 
                    :value="t.key" 
                    @input="updateKey(t, ($event.target as HTMLInputElement).value)" 
                    placeholder="提示词 Key"
                  />
                </div>
                <div class="pm-input-group">
                  <label class="pm-input-label">Translation</label>
                  <input class="pm-input pm-trans-input" 
                    :value="displayTranslation(t)"
                    @input="updateTrans(t, ($event.target as HTMLInputElement).value)" 
                    placeholder="翻译内容"
                  />
                </div>
              </div>

              <div class="pm-tag-actions">
                <button class="pm-icon-btn" @click="toggleHidden(t)" :title="t.hidden ? '显示' : '隐藏'">
                  <svg v-if="!t.hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
                <button class="pm-icon-btn pm-btn-delete" @click="confirmRemoveTag(t)" title="删除">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </li>
          </TransitionGroup>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.pm-root {
  display: flex;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-secondary);
}

.pm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.pm-left, .pm-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pm-control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pm-label {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.pm-select {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 14px;
  min-width: 100px;
  cursor: pointer;
  transition: all 0.2s;
}

.pm-select:hover {
  border-color: var(--color-border-hover);
}

.pm-select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

.pm-search-wrapper {
  position: relative;
  width: 280px;
}

.pm-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.pm-search {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 14px;
  transition: all 0.2s;
}

.pm-search:focus {
  outline: none;
  border-color: var(--color-accent);
  background-color: var(--color-bg-primary);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

.pm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.pm-btn:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border-hover);
}

.pm-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background-color: var(--color-accent);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.pm-btn-primary:hover {
  background-color: var(--color-accent-hover);
  transform: translateY(-1px);
}

.pm-btn-danger:hover {
  color: var(--color-error);
  border-color: var(--color-error);
  background-color: #fef2f2;
}

.pm-btn-link {
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
}

.pm-import-btn {
  position: relative;
  overflow: hidden;
}

.pm-import-btn input[type="file"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.pm-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.pm-sidebar {
  width: 260px;
  background-color: var(--color-bg-primary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.pm-sidebar-section {
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
}

.pm-sidebar-section:last-child {
  border-bottom: none;
}

.pm-section-title {
  padding: 0 16px 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-tertiary);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pm-nav-list {
  list-style: none;
  padding: 0 8px;
  margin: 0;
}

.pm-nav-item {
  padding: 8px 12px;
  margin-bottom: 2px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-secondary);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.pm-nav-item:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.pm-nav-item.active {
  background-color: var(--color-accent-light);
  color: var(--color-accent);
  font-weight: 500;
}

.pm-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pm-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-secondary);
  overflow: hidden;
}

.pm-content-header {
  padding: 24px 32px;
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pm-group-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pm-group-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.pm-group-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.pm-count {
  font-size: 13px;
  color: var(--color-text-tertiary);
  background-color: var(--color-bg-tertiary);
  padding: 2px 8px;
  border-radius: 12px;
}

.pm-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  gap: 16px;
}

.pm-empty-icon {
  color: var(--color-border);
}

.pm-tags-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.pm-tags-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative; /* 确保列表项 absolute 定位相对于列表容器 */
}

.pm-tag-item {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.pm-tag-item:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-hover);
}

.pm-tag-item.hidden {
  opacity: 0.6;
  background-color: var(--color-bg-tertiary);
}

.pm-tag-item.pm-dragging-over {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-light);
  transform: scale(1.01);
}

.pm-tag-handle {
  cursor: grab;
  color: var(--color-text-tertiary);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
}

.pm-tag-handle:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.pm-tag-handle:active {
  cursor: grabbing;
}

.pm-tag-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.pm-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pm-input-label {
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
}

.pm-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 14px;
  transition: all 0.2s;
}

.pm-input:focus {
  outline: none;
  border-color: var(--color-accent);
  background-color: var(--color-bg-primary);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

.pm-tag-actions {
  display: flex;
  gap: 8px;
}

.pm-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.pm-icon-btn:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.pm-btn-delete:hover {
  background-color: #fef2f2;
  color: var(--color-error);
  border-color: #fecaca;
}

/* Transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: opacity 1s ease, transform 1s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.list-leave-active {
  position: absolute;
  width: 100%; /* 相对于 pm-tags-list */
}
/* 响应式适配 */
@media (max-width: 768px) {
  .pm-toolbar {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  
  .pm-left, .pm-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .pm-search-wrapper {
    width: 100%;
  }

  .pm-main {
    flex-direction: column;
    overflow-y: auto;
  }
  
  .pm-sidebar {
    width: 100%;
    height: auto;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .pm-tag-inputs {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .pm-tag-item {
    grid-template-columns: 32px 1fr auto;
    align-items: flex-start;
  }
  
  .pm-tag-handle {
    margin-top: 8px;
  }
  
  .pm-tag-actions {
    flex-direction: column;
  }
}
</style>
