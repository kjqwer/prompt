<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePromptStore } from '../stores/promptStore';
import type { ExtendedPreset, PresetFolder, PresetType } from '../types';
import NotificationToast from './NotificationToast.vue';
import PresetSidebar from './preset/PresetSidebar.vue';
import PresetList from './preset/PresetList.vue';

const store = usePromptStore();

// State
const activeTab = ref<'presets' | 'folders'>('presets'); // Kept for compatibility if needed, but UI will be unified
const selectedType = ref<PresetType | 'all'>('all');
const searchQuery = ref('');
const selectedFolderId = ref<string | null>(null);
const expandedFolderIds = ref<Set<string>>(new Set());

// Dialog State
const showCreateDialog = ref(false);
const showFolderDialog = ref(false);
const editingPreset = ref<ExtendedPreset | null>(null);
const editingFolder = ref<PresetFolder | null>(null);

// Forms
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

// Notification
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

// Preset Types
const presetTypes: { value: PresetType; label: string; icon: string }[] = [
  { value: 'positive', label: '正面提示词', icon: '🪄' },
  { value: 'negative', label: '负面提示词', icon: '⛔' },
  { value: 'setting', label: '设定标签', icon: '⚙️' },
  { value: 'style', label: '风格样式', icon: '🖌️' },
  { value: 'character', label: '角色人物', icon: '🧙' },
  { value: 'scene', label: '场景环境', icon: '🏞️' },
  { value: 'custom', label: '自定义', icon: '🧩' }
];

// Computed
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

const filteredPresets = computed(() => {
  let presets = store.extendedPresets || [];
  
  // Filter by Type
  if (selectedType.value !== 'all') {
    presets = presets.filter(p => p.type === selectedType.value);
  }
  
  // Filter by Folder
  if (selectedFolderId.value) {
    presets = presets.filter(p => p.folderId === selectedFolderId.value);
  } else if (selectedFolderId.value === '') {
    // Uncategorized
    presets = presets.filter(p => !p.folderId);
  }
  // if null, show all
  
  // Filter by Search
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

const flattenedFolders = computed(() => {
  type FlatItem = { id: string; name: string; label: string; level: number; presetCount: number; hasChildren: boolean };
  const res: FlatItem[] = [];
  function walk(nodes: any[], level: number, parentPath: string) {
    nodes.forEach((node: any) => {
      const label = parentPath ? `${parentPath} / ${node.name}` : node.name;
      res.push({
        id: node.id,
        name: node.name,
        label,
        level,
        presetCount: node.presetCount,
        hasChildren: !!(node.children && node.children.length)
      });
      if (node.children && node.children.length) {
        walk(node.children, level + 1, label);
      }
    });
  }
  walk(folderTree.value, 0, '');
  return res;
});

// Parent options for folder dialog (exclude self and children)
const flattenedParentOptions = computed(() => {
  const exclude = new Set<string>();
  if (editingFolder.value) {
    exclude.add(editingFolder.value.id);
    
    // Helper to find descendants
    const all = store.presetFolders || [];
    function walk(id: string) {
      const children = all.filter(f => f.parentId === id);
      for (const c of children) {
        exclude.add(c.id);
        walk(c.id);
      }
    }
    walk(editingFolder.value.id);
  }
  return flattenedFolders.value.filter(f => !exclude.has(f.id));
});

const allPresetsCount = computed(() => (store.extendedPresets || []).length);
const uncategorizedCount = computed(() => (store.extendedPresets || []).filter(p => !p.folderId).length);

// Actions
function handleFolderSelect(id: string | null) {
  selectedFolderId.value = id;
}

function handleToggleExpand(id: string) {
  const set = new Set(expandedFolderIds.value);
  if (set.has(id)) set.delete(id); else set.add(id);
  expandedFolderIds.value = set;
}

function createFolder(parentId?: string) {
  resetFolderForm();
  if (parentId) {
    folderForm.value.parentId = parentId;
  }
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
  } else {
    if (!confirm(`确定删除文件夹「${folder.name}」吗？`)) {
      return;
    }
  }
  
  store.deletePresetFolder(folder.id);
  if (selectedFolderId.value === folder.id) {
    selectedFolderId.value = null;
  }
  showNotification(`文件夹「${folder.name}」已删除`, 'info');
}

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

async function copyPresetContent(preset: ExtendedPreset) {
  try {
    await navigator.clipboard.writeText(preset.content);
    showNotification(`预设「${preset.name}」内容已复制到剪贴板`, 'success');
  } catch (error) {
    showNotification('复制失败，请手动复制', 'error');
  }
}

function applyPreset(preset: ExtendedPreset) {
  store.setPromptTextRaw(preset.content);
  showNotification(`已应用预设「${preset.name}」`, 'success');
}

// Import/Export
function exportPresets() {
  try {
    const jsonData = store.exportPresetsToJson();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('预设已导出', 'success');
  } catch (error) {
    showNotification('导出失败', 'error');
  }
}

function importPresets(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jsonData = e.target?.result as string;
      const success = store.importPresetsFromJson(jsonData);
      
      if (success) {
        showNotification('预设导入成功', 'success');
      } else {
        showNotification('导入文件格式不正确或不是预设文件', 'error');
      }
    } catch (error) {
      showNotification('导入失败：文件格式错误', 'error');
    }
  };
  reader.readAsText(file);
  
  (event.target as HTMLInputElement).value = '';
}

// Helpers
function resetPresetForm() {
  presetForm.value = {
    name: '',
    type: 'positive',
    content: '',
    description: '',
    tags: '',
    folderId: selectedFolderId.value && selectedFolderId.value !== '' ? selectedFolderId.value : ''
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

onMounted(() => {
  store.initializeExtendedPresets();
});
</script>

<template>
  <div class="preset-manager">
    <!-- Left Sidebar -->
    <div class="pm-sidebar">
      <PresetSidebar
        :folder-tree="folderTree"
        :selected-folder-id="selectedFolderId"
        :expanded-ids="expandedFolderIds"
        :all-count="allPresetsCount"
        :uncategorized-count="uncategorizedCount"
        @update:selected-folder-id="handleFolderSelect"
        @toggle-expand="handleToggleExpand"
        @create-folder="createFolder()"
        @create-sub-folder="createFolder"
        @edit-folder="editFolder"
        @delete-folder="deleteFolder"
      />
    </div>

    <!-- Right Content -->
    <div class="pm-main">
      <div class="pm-toolbar">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
          </svg>
          <input v-model="searchQuery" placeholder="搜索预设..." />
        </div>

        <div class="filter-group">
          <select v-model="selectedType" class="type-select">
            <option value="all">所有类型</option>
            <option v-for="type in presetTypes" :key="type.value" :value="type.value">
              {{ type.icon }} {{ type.label }}
            </option>
          </select>
        </div>

        <div class="action-group">
          <button @click="createPreset" class="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
            </svg>
            新建预设
          </button>
          
          <div class="import-export">
            <button @click="exportPresets" class="btn-icon" title="导出预设">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2"/>
                <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <label class="btn-icon" title="导入预设">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2"/>
                <polyline points="17,8 12,3 7,8" stroke="currentColor" stroke-width="2"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2"/>
              </svg>
              <input type="file" accept=".json" @change="importPresets" style="display: none;">
            </label>
          </div>
        </div>
      </div>

      <div class="pm-content-area">
        <PresetList
          :presets="filteredPresets"
          :search-query="searchQuery"
          @apply="applyPreset"
          @edit="editPreset"
          @delete="deletePreset"
          @copy="copyPresetContent"
        />
      </div>
    </div>

    <!-- Create/Edit Preset Modal -->
    <div v-if="showCreateDialog" class="modal-overlay" @click.self="closePresetDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingPreset ? '编辑预设' : '新建预设' }}</h3>
          <button @click="closePresetDialog" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>名称</label>
            <input v-model="presetForm.name" placeholder="给预设起个名字" />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>类型</label>
              <select v-model="presetForm.type">
                <option v-for="t in presetTypes" :key="t.value" :value="t.value">
                  {{ t.icon }} {{ t.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>文件夹</label>
              <select v-model="presetForm.folderId">
                <option value="">(无 - 未分类)</option>
                <option v-for="f in flattenedFolders" :key="f.id" :value="f.id">
                  {{ f.label }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>内容</label>
            <textarea v-model="presetForm.content" rows="10" placeholder="预设的提示词内容..."></textarea>
          </div>
          
          <div class="form-group">
            <label>描述 (选填)</label>
            <input v-model="presetForm.description" placeholder="简短描述" />
          </div>
          
          <div class="form-group">
            <label>标签 (选填，逗号分隔)</label>
            <input v-model="presetForm.tags" placeholder="tag1, tag2, tag3" />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closePresetDialog" class="btn-secondary">取消</button>
          <button @click="savePreset" class="btn-primary">保存</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Folder Modal -->
    <div v-if="showFolderDialog" class="modal-overlay" @click.self="closeFolderDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingFolder ? '编辑文件夹' : '新建文件夹' }}</h3>
          <button @click="closeFolderDialog" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>名称</label>
            <input v-model="folderForm.name" placeholder="文件夹名称" />
          </div>
          
          <div class="form-group">
            <label>父文件夹</label>
            <select v-model="folderForm.parentId">
              <option value="">(无 - 根文件夹)</option>
              <option v-for="f in flattenedParentOptions" :key="f.id" :value="f.id">
                {{ f.label }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>描述 (选填)</label>
            <input v-model="folderForm.description" placeholder="简短描述" />
          </div>
          
          <div class="form-group">
            <label>颜色标记</label>
            <div class="color-picker">
              <div 
                v-for="color in ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b']" 
                :key="color"
                class="color-option"
                :style="{ backgroundColor: color }"
                :class="{ active: folderForm.color === color }"
                @click="folderForm.color = color"
              ></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeFolderDialog" class="btn-secondary">取消</button>
          <button @click="saveFolder" class="btn-primary">保存</button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
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
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  overflow: hidden;
}

.pm-sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  height: 100%;
}

.pm-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.pm-toolbar {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-box svg {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
}

.search-box input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.filter-group {
  display: flex;
  gap: 0.5rem;
}

.type-select {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.action-group {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.import-export {
  display: flex;
  gap: 0.25rem;
  border-left: 1px solid var(--color-border);
  padding-left: 0.75rem;
}

.pm-content-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--color-accent);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: var(--color-bg-secondary);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.btn-icon:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(2px);
}

.modal-content {
  background-color: var(--color-bg-primary);
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: modal-in 0.2s ease-out;
}

@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.75rem;
  color: var(--color-text-tertiary);
  cursor: pointer;
  line-height: 1;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.close-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-secondary);
}

.modal-body {
  padding: 1.75rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
  background-color: var(--color-bg-primary);
}

.form-group textarea {
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.9rem;
  line-height: 1.6;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.color-picker {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.color-option {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--color-text-primary);
  box-shadow: 0 0 0 2px var(--color-bg-primary);
}
</style>
