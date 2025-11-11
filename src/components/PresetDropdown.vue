<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePromptStore } from '../stores/promptStore';
import type { PromptPreset } from '../types';

const store = usePromptStore();

// Props
const props = defineProps<{
  show: boolean;
}>();

// Emits
const emit = defineEmits<{
  close: [];
  load: [name: string];
  save: [name: string];
  delete: [name: string];
  rename: [oldName: string, newName: string];
}>();

// 组件状态
const presetSearch = ref('');
const renamingPreset = ref<string | null>(null);
const renamingValue = ref('');
const newPresetName = ref('');
const showCreateForm = ref(false);
const sortBy = ref<'name' | 'date'>('date');
const sortOrder = ref<'asc' | 'desc'>('desc');

// 计算属性
const filteredPresets = computed(() => {
  const q = presetSearch.value.trim().toLowerCase();
  // 合并旧预设和新预设，优先显示新预设
  let list = [
    ...store.extendedPresets.map(p => ({
      name: p.name,
      text: p.content,
      updatedAt: p.updatedAt,
      type: p.type,
      description: p.description,
      isExtended: true
    })),
    ...store.presets.map(p => ({
      name: p.name,
      text: p.text,
      updatedAt: p.updatedAt,
      type: 'positive' as const,
      description: undefined,
      isExtended: false
    }))
  ];
  
  // 去重（如果新旧预设有同名的，优先保留新预设）
  const seen = new Set();
  list = list.filter(p => {
    const key = `${p.name}_${p.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // 搜索过滤 - 支持名称、内容、描述、标签、文件夹搜索
  if (q) {
    list = list.filter((p) => {
      // 基本搜索：名称、内容、描述
      const basicMatch = p.name.toLowerCase().includes(q) ||
                        p.text.toLowerCase().includes(q) ||
                        p.description?.toLowerCase().includes(q);
      
      // 标签搜索（如果是扩展预设）
      let tagMatch = false;
      if (p.isExtended) {
        const extendedPreset = store.extendedPresets.find(ep => ep.name === p.name && ep.type === p.type);
        if (extendedPreset?.tags) {
          tagMatch = extendedPreset.tags.some(tag => tag.toLowerCase().includes(q));
        }
      }
      
      // 文件夹搜索（如果是扩展预设）
      let folderMatch = false;
      if (p.isExtended) {
        const extendedPreset = store.extendedPresets.find(ep => ep.name === p.name && ep.type === p.type);
        if (extendedPreset?.folderId) {
          const folder = store.presetFolders.find(f => f.id === extendedPreset.folderId);
          if (folder) {
            folderMatch = folder.name.toLowerCase().includes(q);
          }
        }
      }
      
      // 类型搜索
      const typeMatch = getTypeLabel(p.type).toLowerCase().includes(q);
      
      return basicMatch || tagMatch || folderMatch || typeMatch;
    });
  }
  
  // 排序
  list.sort((a, b) => {
    let comparison = 0;
    
    if (sortBy.value === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else {
      comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });
  
  return list;
});

const presetStats = computed(() => {
  const totalOld = store.presets.length;
  const totalExtended = store.extendedPresets.length;
  const dayAgo = new Date();
  dayAgo.setDate(dayAgo.getDate() - 1);
  
  const recentOld = store.presets.filter(p => new Date(p.updatedAt) > dayAgo).length;
  const recentExtended = store.extendedPresets.filter(p => new Date(p.updatedAt) > dayAgo).length;
  
  return {
    total: totalOld + totalExtended,
    recent: recentOld + recentExtended
  };
});

// 方法
function loadPreset(name: string) {
  emit('load', name);
  emit('close');
}

function saveNewPreset() {
  const name = newPresetName.value.trim();
  if (!name) return;
  
  // 只保存到新的扩展预设系统
  const defaultFolder = store.presetManagement?.settings?.defaultFolder;
  store.createExtendedPreset({
    name: name,
    type: 'positive',
    content: store.promptText,
    description: '从快速预设创建',
    folderId: defaultFolder
  });
  
  newPresetName.value = '';
  showCreateForm.value = false;
}

function deletePreset(preset: any) {
  if (confirm(`确定删除预设「${preset.name}」吗？`)) {
    // 删除旧系统中的预设
    if (!preset.isExtended) {
      emit('delete', preset.name);
    }
    
    // 删除扩展预设系统中的预设
    if (preset.isExtended) {
      const extendedPreset = store.extendedPresets.find(p => p.name === preset.name && p.type === preset.type);
      if (extendedPreset) {
        store.deleteExtendedPreset(extendedPreset.id);
      }
    }
  }
}

function beginRename(name: string) {
  renamingPreset.value = name;
  renamingValue.value = name;
}

function commitRename() {
  if (!renamingPreset.value) return;
  
  const oldName = renamingPreset.value;
  const newName = renamingValue.value.trim();
  
  if (!newName) {
    alert('预设名称不能为空');
    return;
  }
  
  if (newName !== oldName) {
    emit('rename', oldName, newName);
  }
  
  cancelRename();
}

function cancelRename() {
  renamingPreset.value = null;
  renamingValue.value = '';
}

function duplicatePreset(preset: any) {
  const newName = `${preset.name} - 副本`;
  
  // 只复制到扩展预设系统
  const defaultFolder = store.presetManagement?.settings?.defaultFolder;
  store.createExtendedPreset({
    name: newName,
    type: preset.type || 'positive',
    content: preset.text,
    description: preset.description || '复制的预设',
    folderId: defaultFolder
  });
}

function exportPreset(preset: any) {
  const data = {
    name: preset.name,
    text: preset.text,
    type: preset.type,
    description: preset.description,
    updatedAt: preset.updatedAt,
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `preset-${preset.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importPreset(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      if (data.name && data.text) {
        const existingIndex = store.presets.findIndex(p => p.name === data.name);
        if (existingIndex >= 0) {
          if (confirm(`预设「${data.name}」已存在，是否覆盖？`)) {
            store.presets[existingIndex] = {
              name: data.name,
              text: data.text,
              updatedAt: new Date().toISOString()
            };
          }
        } else {
          store.presets.push({
            name: data.name,
            text: data.text,
            updatedAt: new Date().toISOString()
          });
        }
        store.save();
      }
    } catch (error) {
      alert('导入失败，请检查文件格式');
    }
  };
  reader.readAsText(file);
  
  // 重置文件输入
  (event.target as HTMLInputElement).value = '';
}

function getTypeLabel(type: string) {
  const typeMap: Record<string, string> = {
    'positive': '正面',
    'negative': '负面',
    'setting': '设定',
    'style': '风格',
    'character': '角色',
    'scene': '场景',
    'custom': '自定义'
  };
  return typeMap[type] || type;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

function getPresetPreview(text: string, maxLength = 50) {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function toggleSort(field: 'name' | 'date') {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = field;
    sortOrder.value = field === 'name' ? 'asc' : 'desc';
  }
}

// 键盘事件处理
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Transition name="dropdown">
    <div v-if="show" class="pd-dropdown">
      <!-- 头部统计和操作 -->
      <div class="pd-header">
        <div class="pd-stats">
          <span class="pd-stat-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="2"/>
            </svg>
            {{ presetStats.total }} 个预设
          </span>
          <span v-if="presetStats.recent > 0" class="pd-stat-item pd-recent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
            </svg>
            {{ presetStats.recent }} 个最近更新
          </span>
        </div>
        
        <div class="pd-header-actions">
          <label class="pd-import-btn" title="导入预设">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2"/>
              <polyline points="17,8 12,3 7,8" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2"/>
            </svg>
            <input type="file" accept=".json" @change="importPreset" style="display: none;">
          </label>
          
          <button @click="showCreateForm = !showCreateForm" class="pd-create-btn" title="创建新预设">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 快速创建表单 -->
      <Transition name="slide-down">
        <div v-if="showCreateForm" class="pd-create-form">
          <div class="pd-create-input">
            <input 
              v-model="newPresetName" 
              placeholder="输入预设名称..." 
              @keyup.enter="saveNewPreset"
              @keyup.escape="showCreateForm = false"
            />
            <div class="pd-create-actions">
              <button @click="saveNewPreset" class="pd-create-confirm" title="保存">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click="showCreateForm = false" class="pd-create-cancel" title="取消">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 搜索和排序 -->
      <div class="pd-search-wrapper">
        <div class="pd-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
          </svg>
          <input v-model="presetSearch" placeholder="搜索预设名称、内容、标签、文件夹..." />
        </div>
        
        <div class="pd-sort-controls">
          <button 
            @click="toggleSort('name')" 
            :class="{ active: sortBy === 'name' }"
            class="pd-sort-btn"
            title="按名称排序"
          >
            名称
            <svg v-if="sortBy === 'name'" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline :points="sortOrder === 'asc' ? '6,9 12,15 18,9' : '18,15 12,9 6,15'" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button 
            @click="toggleSort('date')" 
            :class="{ active: sortBy === 'date' }"
            class="pd-sort-btn"
            title="按时间排序"
          >
            时间
            <svg v-if="sortBy === 'date'" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline :points="sortOrder === 'asc' ? '6,9 12,15 18,9' : '18,15 12,9 6,15'" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 预设列表 -->
      <div class="pd-list">
        <div v-if="filteredPresets.length === 0" class="pd-empty">
          <div class="pd-empty-icon">📝</div>
          <span>{{ presetSearch ? '未找到匹配的预设' : '暂无预设' }}</span>
        </div>
        
        <div v-for="p in filteredPresets" :key="`${p.name}_${p.type}`" class="pd-item">
          <template v-if="renamingPreset !== p.name">
            <div class="pd-item-main" @click="loadPreset(p.name)">
              <div class="pd-item-header">
                <div class="pd-item-title">
                  <span class="pd-item-name">{{ p.name }}</span>
                  <span v-if="p.isExtended" class="pd-item-type" :class="`type-${p.type}`">
                    {{ getTypeLabel(p.type) }}
                  </span>
                </div>
                <span class="pd-item-date">{{ formatDate(p.updatedAt) }}</span>
              </div>
              <div class="pd-item-preview">{{ getPresetPreview(p.text) }}</div>
              <div v-if="p.description" class="pd-item-description">{{ p.description }}</div>
            </div>
            
            <div class="pd-item-actions">
              <button @click.stop="duplicatePreset(p)" class="pd-action-btn" title="复制">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <path d="m5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click.stop="exportPreset(p)" class="pd-action-btn" title="导出">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2"/>
                  <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
                  <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click.stop="beginRename(p.name)" class="pd-action-btn" title="重命名">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
                  <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click.stop="deletePreset(p)" class="pd-action-btn pd-delete" title="删除">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
                  <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </template>
          
          <template v-else>
            <div class="pd-rename-form">
              <input 
                v-model="renamingValue" 
                @keyup.enter="commitRename" 
                @keyup.escape="cancelRename"
                @click.stop
                class="pd-rename-input"
              />
              <div class="pd-rename-actions">
                <button @click.stop="commitRename" class="pd-rename-confirm" title="确定">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
                <button @click.stop="cancelRename" class="pd-rename-cancel" title="取消">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="pd-footer">
        <div class="pd-tips">
          <span>💡 双击预设名称快速加载</span>
          <span>🔍 支持搜索名称、内容、标签、文件夹</span>
          <span>⌨️ ESC 关闭面板</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pd-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 50;
  min-width: 380px;
  max-width: 500px;
  max-height: 500px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  margin-top: 0.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
}

.pd-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
}

.pd-stat-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--color-text-secondary);
}

.pd-stat-item.pd-recent {
  color: var(--color-accent);
}

.pd-header-actions {
  display: flex;
  gap: 0.25rem;
}

.pd-import-btn, .pd-create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pd-import-btn:hover, .pd-create-btn:hover {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.pd-create-form {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
}

.pd-create-input {
  display: flex;
  gap: 0.5rem;
}

.pd-create-input input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

.pd-create-input input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

.pd-create-actions {
  display: flex;
  gap: 0.25rem;
}

.pd-create-confirm, .pd-create-cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pd-create-confirm {
  background-color: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.pd-create-confirm:hover {
  background-color: var(--color-success-hover);
}

.pd-create-cancel {
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
}

.pd-create-cancel:hover {
  background-color: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.pd-search-wrapper {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.pd-search {
  position: relative;
  flex: 1;
}

.pd-search svg {
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
}

.pd-search input {
  width: 100%;
  padding: 0.375rem 0.5rem 0.375rem 2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.pd-search input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

.pd-sort-controls {
  display: flex;
  gap: 0.25rem;
}

.pd-sort-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pd-sort-btn:hover {
  background-color: var(--color-bg-tertiary);
}

.pd-sort-btn.active {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.pd-list {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
}

.pd-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
}

.pd-empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.pd-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.pd-item:last-child {
  border-bottom: none;
}

.pd-item:hover {
  background-color: var(--color-bg-secondary);
}

.pd-item-main {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.pd-item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.pd-item-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.pd-item-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.pd-item-type {
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
  font-weight: 500;
  flex-shrink: 0;
}

.pd-item-type.type-positive {
  background-color: #dcfce7;
  color: #166534;
}

.pd-item-type.type-negative {
  background-color: #fee2e2;
  color: #991b1b;
}

.pd-item-type.type-setting {
  background-color: #e0e7ff;
  color: #3730a3;
}

.pd-item-type.type-style {
  background-color: #fef3c7;
  color: #92400e;
}

.pd-item-type.type-character {
  background-color: #f3e8ff;
  color: #6b21a8;
}

.pd-item-type.type-scene {
  background-color: #ecfdf5;
  color: #047857;
}

.pd-item-type.type-custom {
  background-color: #f1f5f9;
  color: #475569;
}

.pd-item-date {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.pd-item-preview {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 0.25rem;
}

.pd-item-description {
  font-size: 0.6875rem;
  color: var(--color-text-tertiary);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
}

.pd-item-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  margin-left: 0.5rem;
}

.pd-item:hover .pd-item-actions {
  opacity: 1;
}

.pd-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pd-action-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.pd-action-btn.pd-delete:hover {
  background-color: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.pd-rename-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.pd-rename-input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

.pd-rename-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

.pd-rename-actions {
  display: flex;
  gap: 0.25rem;
}

.pd-rename-confirm, .pd-rename-cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pd-rename-confirm {
  background-color: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.pd-rename-confirm:hover {
  background-color: var(--color-success-hover);
}

.pd-rename-cancel {
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
}

.pd-rename-cancel:hover {
  background-color: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.pd-footer {
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
}

.pd-tips {
  display: flex;
  gap: 1rem;
  font-size: 0.6875rem;
  color: var(--color-text-tertiary);
}

/* 动画 */
.dropdown-enter-active {
  transition: all 0.2s ease-out;
}

.dropdown-leave-active {
  transition: all 0.2s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.slide-down-enter-active {
  transition: all 0.2s ease-out;
}

.slide-down-leave-active {
  transition: all 0.2s ease-in;
}

.slide-down-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

/* 滚动条样式 */
.pd-list::-webkit-scrollbar {
  width: 6px;
}

.pd-list::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
}

.pd-list::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 3px;
}

.pd-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .pd-dropdown {
    min-width: 320px;
    max-width: 90vw;
  }
  
  .pd-search-wrapper {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .pd-sort-controls {
    justify-content: center;
  }
  
  .pd-tips {
    flex-direction: column;
    gap: 0.25rem;
    text-align: center;
  }
  
  .pd-item-actions {
    opacity: 1;
  }
}
</style>
