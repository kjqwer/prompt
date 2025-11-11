<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePromptStore } from '../stores/promptStore';
import type { ExtendedPreset, PresetFolder, PresetType } from '../types';
import NotificationToast from './NotificationToast.vue';

const store = usePromptStore();

// 组件状态
const activeTab = ref<'presets' | 'folders'>('presets');
const selectedType = ref<PresetType | 'all'>('all');
const searchQuery = ref('');
const selectedFolder = ref<string | null>(null);
const showCreateDialog = ref(false);
const showFolderDialog = ref(false);
const editingPreset = ref<ExtendedPreset | null>(null);
const editingFolder = ref<PresetFolder | null>(null);

// 表单数据
const presetForm = ref({
  name: '',
  type: 'positive' as PresetType,
  content: '',
  description: '',
  tags: '',
  folderId: ''
});

const folderForm = ref({
  name: '',
  description: '',
  color: '#6366f1',
  parentId: ''
});

// 通知
const notification = ref<{ message: string; type: 'success' | 'error' | 'info'; show: boolean }>({ 
  message: '', 
  type: 'info', 
  show: false 
});

function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  notification.value = { message, type, show: true };
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
}

// 预设类型选项
const presetTypes: { value: PresetType; label: string; icon: string }[] = [
  { value: 'positive', label: '正面提示词', icon: '👍' },
  { value: 'negative', label: '负面提示词', icon: '👎' },
  { value: 'setting', label: '设定标签', icon: '⚙️' },
  { value: 'style', label: '风格样式', icon: '🎨' },
  { value: 'character', label: '角色人物', icon: '👤' },
  { value: 'scene', label: '场景环境', icon: '🌍' },
  { value: 'custom', label: '自定义', icon: '📝' }
];

// 计算属性
const filteredPresets = computed(() => {
  let presets = store.extendedPresets || [];
  
  // 按类型过滤
  if (selectedType.value !== 'all') {
    presets = presets.filter(p => p.type === selectedType.value);
  }
  
  // 按文件夹过滤
  if (selectedFolder.value) {
    presets = presets.filter(p => p.folderId === selectedFolder.value);
  } else if (selectedFolder.value === null) {
    // 显示未分类的预设
    presets = presets.filter(p => !p.folderId);
  }
  
  // 按搜索关键词过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    presets = presets.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }
  
  return presets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
});

const folderTree = computed(() => {
  const folders = store.presetFolders || [];
  const rootFolders = folders.filter(f => !f.parentId);
  
  function buildTree(parentFolders: PresetFolder[]): any[] {
    return parentFolders.map(folder => ({
      ...folder,
      children: buildTree(folders.filter(f => f.parentId === folder.id)),
      presetCount: (store.extendedPresets || []).filter(p => p.folderId === folder.id).length
    }));
  }
  
  return buildTree(rootFolders);
});

// 预设操作
function createPreset() {
  resetPresetForm();
  showCreateDialog.value = true;
}

function editPreset(preset: ExtendedPreset) {
  editingPreset.value = preset;
  presetForm.value = {
    name: preset.name,
    type: preset.type,
    content: preset.content,
    description: preset.description || '',
    tags: preset.tags?.join(', ') || '',
    folderId: preset.folderId || ''
  };
  showCreateDialog.value = true;
}

function savePreset() {
  if (!presetForm.value.name.trim() || !presetForm.value.content.trim()) {
    showNotification('请填写预设名称和内容', 'error');
    return;
  }
  
  const presetData = {
    name: presetForm.value.name.trim(),
    type: presetForm.value.type,
    content: presetForm.value.content.trim(),
    description: presetForm.value.description.trim() || undefined,
    tags: presetForm.value.tags.trim() ? presetForm.value.tags.split(',').map(t => t.trim()) : undefined,
    folderId: presetForm.value.folderId || undefined
  };
  
  if (editingPreset.value) {
    store.updateExtendedPreset(editingPreset.value.id, presetData);
    showNotification(`预设「${presetData.name}」已更新`, 'success');
  } else {
    store.createExtendedPreset(presetData);
    showNotification(`预设「${presetData.name}」已创建`, 'success');
  }
  
  closePresetDialog();
}

function deletePreset(preset: ExtendedPreset) {
  if (confirm(`确定删除预设「${preset.name}」吗？`)) {
    store.deleteExtendedPreset(preset.id);
    showNotification(`预设「${preset.name}」已删除`, 'info');
  }
}

function duplicatePreset(preset: ExtendedPreset) {
  const newPreset = {
    name: `${preset.name} - 副本`,
    type: preset.type,
    content: preset.content,
    description: preset.description,
    tags: preset.tags,
    folderId: preset.folderId
  };
  store.createExtendedPreset(newPreset);
  showNotification(`预设「${newPreset.name}」已创建`, 'success');
}

function applyPreset(preset: ExtendedPreset) {
  store.setPromptTextRaw(preset.content);
  showNotification(`已应用预设「${preset.name}」`, 'success');
}

// 文件夹操作
function createFolder() {
  resetFolderForm();
  showFolderDialog.value = true;
}

function editFolder(folder: PresetFolder) {
  editingFolder.value = folder;
  folderForm.value = {
    name: folder.name,
    description: folder.description || '',
    color: folder.color || '#6366f1',
    parentId: folder.parentId || ''
  };
  showFolderDialog.value = true;
}

function saveFolder() {
  if (!folderForm.value.name.trim()) {
    showNotification('请填写文件夹名称', 'error');
    return;
  }
  
  const folderData = {
    name: folderForm.value.name.trim(),
    description: folderForm.value.description.trim() || undefined,
    color: folderForm.value.color,
    parentId: folderForm.value.parentId || undefined
  };
  
  if (editingFolder.value) {
    store.updatePresetFolder(editingFolder.value.id, folderData);
    showNotification(`文件夹「${folderData.name}」已更新`, 'success');
  } else {
    store.createPresetFolder(folderData);
    showNotification(`文件夹「${folderData.name}」已创建`, 'success');
  }
  
  closeFolderDialog();
}

function deleteFolder(folder: PresetFolder) {
  const presetCount = (store.extendedPresets || []).filter(p => p.folderId === folder.id).length;
  if (presetCount > 0) {
    if (!confirm(`文件夹「${folder.name}」中有 ${presetCount} 个预设，删除后这些预设将移动到未分类。确定删除吗？`)) {
      return;
    }
  }
  
  store.deletePresetFolder(folder.id);
  showNotification(`文件夹「${folder.name}」已删除`, 'info');
}

// 工具函数
function resetPresetForm() {
  presetForm.value = {
    name: '',
    type: 'positive',
    content: '',
    description: '',
    tags: '',
    folderId: selectedFolder.value || ''
  };
  editingPreset.value = null;
}

function resetFolderForm() {
  folderForm.value = {
    name: '',
    description: '',
    color: '#6366f1',
    parentId: ''
  };
  editingFolder.value = null;
}

function closePresetDialog() {
  showCreateDialog.value = false;
  resetPresetForm();
}

function closeFolderDialog() {
  showFolderDialog.value = false;
  resetFolderForm();
}

function getTypeLabel(type: PresetType) {
  return presetTypes.find(t => t.value === type)?.label || type;
}

function getTypeIcon(type: PresetType) {
  return presetTypes.find(t => t.value === type)?.icon || '📝';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

// 导入导出
function exportPresets() {
  const data = {
    folders: store.presetFolders || [],
    presets: store.extendedPresets || [],
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `presets-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('预设已导出', 'success');
}

function importPresets(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      if (data.folders && data.presets) {
        store.importExtendedPresets(data);
        showNotification('预设导入成功', 'success');
      } else {
        showNotification('导入文件格式不正确', 'error');
      }
    } catch (error) {
      showNotification('导入失败，请检查文件格式', 'error');
    }
  };
  reader.readAsText(file);
}

onMounted(() => {
  // 初始化扩展预设管理
  store.initializeExtendedPresets();
});
</script>

<template>
  <div class="preset-manager">
    <!-- 头部工具栏 -->
    <div class="pm-header">
      <div class="pm-tabs">
        <button 
          :class="{ active: activeTab === 'presets' }" 
          @click="activeTab = 'presets'"
        >
          📋 预设管理
        </button>
        <button 
          :class="{ active: activeTab === 'folders' }" 
          @click="activeTab = 'folders'"
        >
          📁 文件夹
        </button>
      </div>
      
      <div class="pm-actions">
        <button @click="createPreset" class="pm-btn-primary" title="创建新预设">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
          </svg>
          新建预设
        </button>
        <button @click="createFolder" class="pm-btn-secondary" title="创建文件夹">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="11" x2="12" y2="17" stroke="currentColor" stroke-width="2"/>
            <line x1="9" y1="14" x2="15" y2="14" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <div class="pm-import-export">
          <button @click="exportPresets" class="pm-btn-secondary" title="导出预设">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2"/>
              <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <label class="pm-btn-secondary" title="导入预设">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2"/>
              <polyline points="17,8 12,3 7,8" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2"/>
            </svg>
            <input type="file" accept=".json" @change="importPresets" style="display: none;">
          </label>
        </div>
      </div>
    </div>

    <!-- 预设管理标签页 -->
    <div v-if="activeTab === 'presets'" class="pm-content">
      <!-- 过滤器 -->
      <div class="pm-filters">
        <div class="pm-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
          </svg>
          <input v-model="searchQuery" placeholder="搜索预设..." />
        </div>
        
        <select v-model="selectedType" class="pm-type-filter">
          <option value="all">所有类型</option>
          <option v-for="type in presetTypes" :key="type.value" :value="type.value">
            {{ type.icon }} {{ type.label }}
          </option>
        </select>
        
        <select v-model="selectedFolder" class="pm-folder-filter">
          <option :value="null">未分类</option>
          <option v-for="folder in folderTree" :key="folder.id" :value="folder.id">
            📁 {{ folder.name }} ({{ folder.presetCount }})
          </option>
        </select>
      </div>

      <!-- 预设列表 -->
      <div class="pm-preset-list">
        <div v-if="filteredPresets.length === 0" class="pm-empty">
          <div class="pm-empty-icon">📝</div>
          <div class="pm-empty-text">
            {{ searchQuery ? '未找到匹配的预设' : '暂无预设，点击上方按钮创建第一个预设' }}
          </div>
        </div>
        
        <div v-for="preset in filteredPresets" :key="preset.id" class="pm-preset-item">
          <div class="pm-preset-header">
            <div class="pm-preset-info">
              <span class="pm-preset-type">{{ getTypeIcon(preset.type) }}</span>
              <div class="pm-preset-title">
                <h4>{{ preset.name }}</h4>
                <span class="pm-preset-meta">{{ getTypeLabel(preset.type) }} · {{ formatDate(preset.updatedAt) }}</span>
              </div>
            </div>
            <div class="pm-preset-actions">
              <button @click="applyPreset(preset)" class="pm-action-btn pm-apply" title="应用预设">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click="duplicatePreset(preset)" class="pm-action-btn" title="复制预设">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <path d="m5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click="editPreset(preset)" class="pm-action-btn" title="编辑预设">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
                  <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click="deletePreset(preset)" class="pm-action-btn pm-delete" title="删除预设">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
                  <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div v-if="preset.description" class="pm-preset-description">
            {{ preset.description }}
          </div>
          
          <div class="pm-preset-content">
            {{ preset.content }}
          </div>
          
          <div v-if="preset.tags && preset.tags.length" class="pm-preset-tags">
            <span v-for="tag in preset.tags" :key="tag" class="pm-tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件夹管理标签页 -->
    <div v-if="activeTab === 'folders'" class="pm-content">
      <!-- 文件夹统计信息 -->
      <div class="pm-folder-stats">
        <div class="pm-stat-card">
          <div class="pm-stat-icon">📁</div>
          <div class="pm-stat-info">
            <div class="pm-stat-number">{{ folderTree.length }}</div>
            <div class="pm-stat-label">文件夹总数</div>
          </div>
        </div>
        <div class="pm-stat-card">
          <div class="pm-stat-icon">📋</div>
          <div class="pm-stat-info">
            <div class="pm-stat-number">{{ (store.extendedPresets || []).length }}</div>
            <div class="pm-stat-label">预设总数</div>
          </div>
        </div>
        <div class="pm-stat-card">
          <div class="pm-stat-icon">📂</div>
          <div class="pm-stat-info">
            <div class="pm-stat-number">{{ (store.extendedPresets || []).filter(p => !p.folderId).length }}</div>
            <div class="pm-stat-label">未分类预设</div>
          </div>
        </div>
      </div>
      
      <div class="pm-folder-list">
        <div v-if="folderTree.length === 0" class="pm-empty">
          <div class="pm-empty-icon">📁</div>
          <div class="pm-empty-text">
            <h3>暂无文件夹</h3>
            <p>创建文件夹来组织您的预设</p>
            <p>点击上方的"新建文件夹"按钮开始</p>
          </div>
        </div>
        
        <div v-for="folder in folderTree" :key="folder.id" class="pm-folder-item">
          <div class="pm-folder-header">
            <div class="pm-folder-info">
              <div class="pm-folder-icon" :style="{ backgroundColor: folder.color }">📁</div>
              <div class="pm-folder-details">
                <h4>{{ folder.name }}</h4>
                <span class="pm-folder-meta">{{ folder.presetCount }} 个预设 · {{ formatDate(folder.updatedAt) }}</span>
              </div>
            </div>
            <div class="pm-folder-actions">
              <button @click="editFolder(folder)" class="pm-action-btn" title="编辑文件夹">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
                  <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click="deleteFolder(folder)" class="pm-action-btn pm-delete" title="删除文件夹">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
                  <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div v-if="folder.description" class="pm-folder-description">
            {{ folder.description }}
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑预设对话框 -->
    <div v-if="showCreateDialog" class="pm-modal-overlay" @click="closePresetDialog">
      <div class="pm-modal" @click.stop>
        <div class="pm-modal-header">
          <h3>{{ editingPreset ? '编辑预设' : '创建预设' }}</h3>
          <button @click="closePresetDialog" class="pm-modal-close">×</button>
        </div>
        
        <div class="pm-modal-body">
          <div class="pm-form-group">
            <label>预设名称 *</label>
            <input v-model="presetForm.name" placeholder="输入预设名称..." />
          </div>
          
          <div class="pm-form-row">
            <div class="pm-form-group">
              <label>预设类型</label>
              <select v-model="presetForm.type">
                <option v-for="type in presetTypes" :key="type.value" :value="type.value">
                  {{ type.icon }} {{ type.label }}
                </option>
              </select>
            </div>
            
            <div class="pm-form-group">
              <label>所属文件夹</label>
              <select v-model="presetForm.folderId">
                <option value="">未分类</option>
                <option v-for="folder in folderTree" :key="folder.id" :value="folder.id">
                  📁 {{ folder.name }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="pm-form-group">
            <label>预设内容 *</label>
            <textarea v-model="presetForm.content" placeholder="输入预设内容..." rows="6"></textarea>
          </div>
          
          <div class="pm-form-group">
            <label>描述</label>
            <textarea v-model="presetForm.description" placeholder="输入预设描述..." rows="2"></textarea>
          </div>
          
          <div class="pm-form-group">
            <label>标签</label>
            <input v-model="presetForm.tags" placeholder="输入标签，用逗号分隔..." />
          </div>
        </div>
        
        <div class="pm-modal-footer">
          <button @click="closePresetDialog" class="pm-btn-secondary">取消</button>
          <button @click="savePreset" class="pm-btn-primary">{{ editingPreset ? '更新' : '创建' }}</button>
        </div>
      </div>
    </div>

    <!-- 创建/编辑文件夹对话框 -->
    <div v-if="showFolderDialog" class="pm-modal-overlay" @click="closeFolderDialog">
      <div class="pm-modal" @click.stop>
        <div class="pm-modal-header">
          <h3>{{ editingFolder ? '编辑文件夹' : '创建文件夹' }}</h3>
          <button @click="closeFolderDialog" class="pm-modal-close">×</button>
        </div>
        
        <div class="pm-modal-body">
          <div class="pm-form-group">
            <label>文件夹名称 *</label>
            <input v-model="folderForm.name" placeholder="输入文件夹名称..." />
          </div>
          
          <div class="pm-form-row">
            <div class="pm-form-group">
              <label>颜色</label>
              <input v-model="folderForm.color" type="color" />
            </div>
            
            <div class="pm-form-group">
              <label>父文件夹</label>
              <select v-model="folderForm.parentId">
                <option value="">根目录</option>
                <option v-for="folder in folderTree" :key="folder.id" :value="folder.id">
                  📁 {{ folder.name }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="pm-form-group">
            <label>描述</label>
            <textarea v-model="folderForm.description" placeholder="输入文件夹描述..." rows="3"></textarea>
          </div>
        </div>
        
        <div class="pm-modal-footer">
          <button @click="closeFolderDialog" class="pm-btn-secondary">取消</button>
          <button @click="saveFolder" class="pm-btn-primary">{{ editingFolder ? '更新' : '创建' }}</button>
        </div>
      </div>
    </div>

    <!-- 通知组件 -->
    <NotificationToast 
      :message="notification.message"
      :type="notification.type"
      :show="notification.show"
    />
  </div>
</template>

<style scoped>
.preset-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-primary);
}

.pm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  gap: 1rem;
  flex-wrap: wrap;
}

.pm-tabs {
  display: flex;
  gap: 0.25rem;
  background-color: var(--color-bg-secondary);
  padding: 0.25rem;
  border-radius: var(--radius-md);
}

.pm-tabs button {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.pm-tabs button.active {
  background-color: var(--color-accent);
  color: white;
  box-shadow: var(--shadow-sm);
}

.pm-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pm-import-export {
  display: flex;
  gap: 0.25rem;
}

.pm-btn-primary, .pm-btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  line-height: 1;
}

.pm-btn-primary {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.pm-btn-primary:hover {
  background-color: var(--color-accent-hover);
}

.pm-btn-secondary {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.pm-btn-secondary:hover {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-border-hover);
}

.pm-content {
  flex: 1;
  padding: 1rem;
  overflow: auto;
}

.pm-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.pm-search {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.pm-search svg {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
}

.pm-search input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.pm-search input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.pm-type-filter, .pm-folder-filter {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.pm-type-filter:focus, .pm-folder-filter:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

/* 文件夹统计卡片 */
.pm-folder-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 2rem;
}

.pm-stat-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all 0.2s ease;
}

.pm-stat-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-sm);
}

.pm-stat-icon {
  font-size: 2rem;
  opacity: 0.8;
}

.pm-stat-info {
  flex: 1;
}

.pm-stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}

.pm-stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

.pm-preset-list, .pm-folder-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 400px;
}

.pm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-tertiary);
  flex: 1;
  min-height: 300px;
}

.pm-empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.pm-empty-text {
  font-size: 0.875rem;
  line-height: 1.5;
}

.pm-empty-text h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.pm-empty-text p {
  margin: 0 0 0.25rem 0;
  color: var(--color-text-tertiary);
}

.pm-empty-text p:last-child {
  margin-bottom: 0;
}

.pm-preset-item, .pm-folder-item {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  transition: all 0.2s ease;
}

.pm-preset-item:hover, .pm-folder-item:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-sm);
}

.pm-preset-header, .pm-folder-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.pm-preset-info, .pm-folder-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.pm-preset-type {
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.pm-folder-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.pm-preset-title, .pm-folder-details {
  flex: 1;
  min-width: 0;
}

.pm-preset-title h4, .pm-folder-details h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pm-preset-meta, .pm-folder-meta {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.pm-preset-actions, .pm-folder-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.pm-preset-item:hover .pm-preset-actions,
.pm-folder-item:hover .pm-folder-actions {
  opacity: 1;
}

.pm-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pm-action-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.pm-action-btn.pm-apply:hover {
  background-color: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.pm-action-btn.pm-delete:hover {
  background-color: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.pm-preset-description, .pm-folder-description {
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.pm-preset-content {
  background-color: var(--color-bg-tertiary);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 0.75rem;
  max-height: 120px;
  overflow-y: auto;
}

.pm-preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.pm-tag {
  padding: 0.25rem 0.5rem;
  background-color: var(--color-accent-light);
  color: var(--color-accent);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

/* 模态框样式 */
.pm-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.pm-modal {
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pm-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.pm-modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.pm-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.pm-modal-close:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.pm-modal-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.pm-form-group {
  margin-bottom: 1rem;
}

.pm-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.pm-form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.pm-form-group input,
.pm-form-group select,
.pm-form-group textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  transition: all 0.2s ease;
  font-family: inherit;
}

.pm-form-group input:focus,
.pm-form-group select:focus,
.pm-form-group textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.pm-form-group textarea {
  resize: vertical;
  min-height: 80px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  line-height: 1.4;
}

.pm-form-group input[type="color"] {
  width: 60px;
  height: 40px;
  padding: 0.25rem;
  cursor: pointer;
}

.pm-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--color-border);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .pm-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .pm-actions {
    justify-content: center;
  }
  
  .pm-filters {
    flex-direction: column;
  }
  
  .pm-search {
    min-width: auto;
  }
  
  .pm-preset-header,
  .pm-folder-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .pm-preset-actions,
  .pm-folder-actions {
    align-self: flex-end;
    opacity: 1;
  }
  
  .pm-form-row {
    grid-template-columns: 1fr;
  }
  
  .pm-modal {
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
  }
}

@media (max-width: 768px) {
  .pm-folder-stats {
    grid-template-columns: 1fr;
  }
  
  .pm-stat-card {
    padding: 0.75rem;
  }
  
  .pm-stat-icon {
    font-size: 1.5rem;
  }
  
  .pm-stat-number {
    font-size: 1.25rem;
  }
}

@media (max-width: 640px) {
  .pm-content {
    padding: 0.75rem;
  }
  
  .pm-preset-item,
  .pm-folder-item {
    padding: 0.75rem;
  }
  
  .pm-folder-stats {
    margin-bottom: 1rem;
  }
  
  .pm-modal-header,
  .pm-modal-body,
  .pm-modal-footer {
    padding: 1rem;
  }
}
</style>
