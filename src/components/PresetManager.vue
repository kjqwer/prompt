<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import { usePromptStore } from '../stores/promptStore';
import type { ExtendedPreset, PresetFolder, PresetType } from '../types';
import NotificationToast from './NotificationToast.vue';
import PresetSidebar from './preset/PresetSidebar.vue';
import PresetList from './preset/PresetList.vue';
import FolderSelector from './preset/FolderSelector.vue';
import TypeSelector from './preset/TypeSelector.vue';

const store = usePromptStore();
const PRESET_MANAGER_VIEW_STATE_KEY = 'preset-manager-view-state';

// State
const activeTab = ref<'presets' | 'folders'>('presets'); // Kept for compatibility if needed, but UI will be unified
const selectedType = ref<PresetType | 'all'>('all');
const searchQuery = ref('');
const selectedFolderId = ref<string | null>(null);
const expandedFolderIds = ref<Set<string>>(new Set());
const presetSidebarRef = ref<InstanceType<typeof PresetSidebar> | null>(null);
const presetListRef = ref<InstanceType<typeof PresetList> | null>(null);
const isRestoringViewState = ref(false);

// Dialog State
const showMobileSidebar = ref(false);
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
const presetTypes: { value: PresetType; label: string }[] = [
  { value: 'positive', label: '正面提示词' },
  { value: 'negative', label: '负面提示词' },
  { value: 'setting', label: '设定标签' },
  { value: 'style', label: '风格样式' },
  { value: 'character', label: '角色人物' },
  { value: 'scene', label: '场景环境' },
  { value: 'custom', label: '自定义' }
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

const filterOptions = computed<{ value: PresetType | 'all'; label: string }[]>(() => [
  { value: 'all', label: '所有类型' },
  ...presetTypes
]);

const filteredPresets = computed(() => {
  let presets = [...(store.extendedPresets || [])];
  
  // Filter by Type
  if (selectedType.value !== 'all') {
    presets = presets.filter(p => p.type === selectedType.value);
  }
  
  // Filter by Folder
  if (selectedFolderId.value === 'favorites') {
    presets = presets.filter(p => p.isFavorite);
  } else if (selectedFolderId.value) {
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
  
  return presets.sort((a, b) => {
    const ao = typeof a.sortOrder === 'number' ? a.sortOrder : Number.POSITIVE_INFINITY;
    const bo = typeof b.sortOrder === 'number' ? b.sortOrder : Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
});

const presetListResetKey = computed(() => JSON.stringify({
  selectedType: selectedType.value,
  searchQuery: searchQuery.value,
  selectedFolderId: selectedFolderId.value,
}));

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

const allPresetsCount = computed(() => (store.extendedPresets || []).length);
const uncategorizedCount = computed(() => (store.extendedPresets || []).filter(p => !p.folderId).length);
const favoritesCount = computed(() => (store.extendedPresets || []).filter(p => p.isFavorite).length);

function persistPresetManagerViewState() {
  if (isRestoringViewState.value) return;
  const payload = {
    activeTab: activeTab.value,
    selectedType: selectedType.value,
    searchQuery: searchQuery.value,
    selectedFolderId: selectedFolderId.value,
    expandedFolderIds: Array.from(expandedFolderIds.value),
    sidebarScrollTop: presetSidebarRef.value?.contentRef?.scrollTop ?? 0,
    listScrollTop: presetListRef.value?.containerRef?.scrollTop ?? 0,
    currentPage: presetListRef.value?.getCurrentPage?.() ?? 1,
  };
  window.sessionStorage.setItem(PRESET_MANAGER_VIEW_STATE_KEY, JSON.stringify(payload));
}

async function restorePresetManagerViewState() {
  const raw = window.sessionStorage.getItem(PRESET_MANAGER_VIEW_STATE_KEY);
  if (!raw) return;
  try {
    isRestoringViewState.value = true;
    const state = JSON.parse(raw) as {
      activeTab?: 'presets' | 'folders';
      selectedType?: PresetType | 'all';
      searchQuery?: string;
      selectedFolderId?: string | null;
      expandedFolderIds?: string[];
      sidebarScrollTop?: number;
      listScrollTop?: number;
      currentPage?: number;
    };
    if (state.activeTab === 'presets' || state.activeTab === 'folders') {
      activeTab.value = state.activeTab;
    }
    selectedType.value = state.selectedType ?? 'all';
    searchQuery.value = state.searchQuery ?? '';
    selectedFolderId.value = state.selectedFolderId ?? null;
    expandedFolderIds.value = new Set(state.expandedFolderIds ?? []);
    await nextTick();
    if (typeof state.currentPage === 'number') {
      presetListRef.value?.setCurrentPage?.(state.currentPage, false);
    }
    await nextTick();
    if (presetSidebarRef.value?.contentRef) {
      presetSidebarRef.value.contentRef.scrollTop = Math.max(0, state.sidebarScrollTop ?? 0);
    }
    if (presetListRef.value?.containerRef) {
      presetListRef.value.containerRef.scrollTop = Math.max(0, state.listScrollTop ?? 0);
    }
  } catch {
    // Ignore broken persisted state and continue with defaults.
  } finally {
    isRestoringViewState.value = false;
    persistPresetManagerViewState();
  }
}

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

function toggleFavorite(preset: ExtendedPreset) {
  store.updateExtendedPreset(preset.id, { isFavorite: !preset.isFavorite });
  if (!preset.isFavorite) {
    showNotification(`已添加到收藏`, 'success');
  }
}

function handleReorderPresets(payload: { draggedId: string; targetId: string; side: 'before' | 'after' }) {
  const visibleIds = filteredPresets.value.map(preset => preset.id);
  const from = visibleIds.indexOf(payload.draggedId);
  const target = visibleIds.indexOf(payload.targetId);
  if (from === -1 || target === -1) return;
  const reordered = [...visibleIds];
  const [draggedId] = reordered.splice(from, 1);
  if (!draggedId) return;
  let insertAt = target;
  if (payload.side === 'after') {
    insertAt += from < target ? 0 : 1;
  } else if (from < target) {
    insertAt -= 1;
  }
  insertAt = Math.max(0, Math.min(insertAt, reordered.length));
  reordered.splice(insertAt, 0, draggedId);
  if (store.reorderExtendedPresets(reordered)) {
    persistPresetManagerViewState();
    showNotification('已调整预设顺序', 'success');
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

// Share & Cloud
const showShareDialog = ref(false);
const shareTab = ref<'create' | 'import'>('create');
const shareLoading = ref(false);
const shareResultCode = ref('');
const shareImportCode = ref('');
const shareSinglePreset = ref<ExtendedPreset | null>(null);
const shareFolder = ref<PresetFolder | null>(null);

function openShareDialog(preset?: ExtendedPreset, folder?: PresetFolder) {
  shareSinglePreset.value = preset || null;
  shareFolder.value = folder || null;
  shareTab.value = 'create';
  shareResultCode.value = '';
  shareImportCode.value = '';
  showShareDialog.value = true;
}

function handleShare(preset: ExtendedPreset) {
  openShareDialog(preset);
}

function handleShareFolder(folder: PresetFolder) {
  openShareDialog(undefined, folder);
}

async function generateShareCode() {
  shareLoading.value = true;
  try {
    let data;
    let type = 'all';
    
    if (shareSinglePreset.value) {
      data = shareSinglePreset.value;
      type = 'single';
    } else if (shareFolder.value) {
      // Find all presets in this folder and its subfolders? 
      // User likely just wants this folder and its direct contents, OR the whole tree.
      // Simplest is recursive export of folder + subfolders + presets inside them.
      
      const folderIds = new Set<string>();
      const foldersToExport: PresetFolder[] = [];
      
      const collectFolders = (id: string) => {
        const folder = store.presetFolders.find(f => f.id === id);
        if (folder) {
          folderIds.add(id);
          foldersToExport.push(folder);
          // Find subfolders
          store.presetFolders.filter(f => f.parentId === id).forEach(f => collectFolders(f.id));
        }
      };
      
      collectFolders(shareFolder.value.id);
      
      const presetsToExport = store.extendedPresets.filter(p => p.folderId && folderIds.has(p.folderId));
      
      data = {
        presetFolders: foldersToExport,
        extendedPresets: presetsToExport
      };
      type = 'folder';
    } else {
      const jsonString = store.exportPresetsToJson();
      try {
        data = JSON.parse(jsonString);
      } catch (e) {
        data = {};
      }
    }
    
    const response = await fetch('https://sywb.top/api/share/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data, type })
    });
    
    const result = await response.json();
    
    if (result.success) {
      shareResultCode.value = result.code;
      showNotification('分享码生成成功', 'success');
    } else {
      showNotification(result.error || '生成失败', 'error');
    }
  } catch (error) {
    console.error(error);
    showNotification('网络错误，无法生成分享码', 'error');
  } finally {
    shareLoading.value = false;
  }
}

// Import Analysis State
const showImportPreview = ref(false);
const importPreview = ref<{
  totalPresets: number;
  totalFolders: number;
  newPresets: any[];
  duplicatePresets: any[]; // Same content
  conflictingPresets: any[]; // Same name, diff content
  foldersToCreate: any[];
  foldersToMerge: any[];
  data: any;
}>({
  totalPresets: 0,
  totalFolders: 0,
  newPresets: [],
  duplicatePresets: [],
  conflictingPresets: [],
  foldersToCreate: [],
  foldersToMerge: [],
  data: null
});

const importOptions = ref({
  skipDuplicates: true,
  renameConflicts: true // if false, overwrite
});

async function importFromShareCode() {
  if (!shareImportCode.value || shareImportCode.value.length !== 6) {
    showNotification('请输入有效的6位分享码', 'error');
    return;
  }

  shareLoading.value = true;
  try {
    const response = await fetch(`https://sywb.top/api/share/${shareImportCode.value}`);
    const result = await response.json();

    if (result.success) {
      const data = result.data;
      
      // Analyze Import
      analyzeImport(data);
      showImportPreview.value = true;
      closeShareDialog();
    } else {
      showNotification(result.error || '分享码无效或已过期', 'error');
    }
  } catch (error) {
    console.error(error);
    showNotification('网络错误，无法导入', 'error');
  } finally {
    shareLoading.value = false;
  }
}

function analyzeImport(data: any) {
  const incomingPresets = Array.isArray(data.extendedPresets) ? data.extendedPresets : (Array.isArray(data.presets) ? data.presets.map((p: any) => ({
    ...p,
    type: 'positive',
    content: p.text,
    description: '从旧格式导入'
  })) : []);
  
  const incomingFolders = Array.isArray(data.presetFolders) ? data.presetFolders : [];

  const existingContentSet = new Set(store.extendedPresets.map(p => p.content));
  const existingNameTypeSet = new Set(store.extendedPresets.map(p => `${p.name}:${p.type}`));
  const existingFolderMap = new Map(store.presetFolders.map(f => [f.name, f]));

  const preview = {
    totalPresets: incomingPresets.length,
    totalFolders: incomingFolders.length,
    newPresets: [] as any[],
    duplicatePresets: [] as any[],
    conflictingPresets: [] as any[],
    foldersToCreate: [] as any[],
    foldersToMerge: [] as any[],
    data
  };

  // Analyze Folders
  for (const folder of incomingFolders) {
    if (existingFolderMap.has(folder.name)) {
      preview.foldersToMerge.push(folder);
    } else {
      preview.foldersToCreate.push(folder);
    }
  }

  // Analyze Presets
  for (const preset of incomingPresets) {
    const isContentDuplicate = existingContentSet.has(preset.content);
    const isNameConflict = existingNameTypeSet.has(`${preset.name}:${preset.type}`);

    if (isContentDuplicate) {
      preview.duplicatePresets.push(preset);
    } else if (isNameConflict) {
      preview.conflictingPresets.push(preset);
    } else {
      preview.newPresets.push(preset);
    }
  }

  importPreview.value = preview;
}

function executeSmartImport() {
  const { data, foldersToCreate, foldersToMerge } = importPreview.value;
  const { skipDuplicates, renameConflicts } = importOptions.value;
  
  // 1. Handle Folders
  const idMap = new Map<string, string>();
  
  // Map merged folders
  for (const folder of foldersToMerge) {
    const existing = store.presetFolders.find(f => f.name === folder.name);
    if (existing) {
      idMap.set(folder.id, existing.id);
    }
  }
  
  // Create new folders
  for (const folder of foldersToCreate) {
    const newId = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    idMap.set(folder.id, newId);
    
    const parentId = folder.parentId ? idMap.get(folder.parentId) : undefined;
    
    store.presetFolders.push({
      ...folder,
      id: newId,
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // 2. Handle Presets
  const presetsToImport = [
    ...importPreview.value.newPresets,
    ...(skipDuplicates ? [] : importPreview.value.duplicatePresets),
    ...importPreview.value.conflictingPresets
  ];

  let importedCount = 0;

  for (const preset of presetsToImport) {
    const isConflict = importPreview.value.conflictingPresets.includes(preset);
    let finalName = preset.name;
    
    if (isConflict && renameConflicts) {
      finalName = `${preset.name} (Imported)`;
      // Ensure unique name if (Imported) also exists
      let counter = 1;
      while (store.extendedPresets.some(p => p.name === finalName && p.type === preset.type)) {
        counter++;
        finalName = `${preset.name} (Imported ${counter})`;
      }
    } else if (isConflict && !renameConflicts) {
      // Overwrite: Find and update
      const existing = store.extendedPresets.find(p => p.name === preset.name && p.type === preset.type);
      if (existing) {
         Object.assign(existing, {
           content: preset.content,
           description: preset.description ?? existing.description,
           tags: preset.tags ?? existing.tags,
           updatedAt: new Date().toISOString()
         });
         importedCount++;
         continue; // Skip creation
      }
    }

    // Map folder ID
    const mappedFolderId = preset.folderId ? idMap.get(preset.folderId) : undefined;

    store.extendedPresets.push({
      id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: finalName,
      type: preset.type,
      content: preset.content,
      description: preset.description,
      tags: preset.tags,
      folderId: mappedFolderId,
      createdAt: preset.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: preset.author
    });
    importedCount++;
  }

  store.save();
  showNotification(`成功导入 ${importedCount} 个预设`, 'success');
  showImportPreview.value = false;
}

function closeImportPreview() {
  showImportPreview.value = false;
  importPreview.value.data = null;
}

function copyShareCode() {
  navigator.clipboard.writeText(shareResultCode.value);
  showNotification('分享码已复制', 'success');
}

function closeShareDialog() {
  showShareDialog.value = false;
  shareResultCode.value = '';
  shareImportCode.value = '';
  shareSinglePreset.value = null;
  shareFolder.value = null;
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
  nextTick(() => {
    restorePresetManagerViewState();
  });
});

watch(
  () => [
    activeTab.value,
    selectedType.value,
    searchQuery.value,
    selectedFolderId.value,
    Array.from(expandedFolderIds.value).sort().join('|'),
  ],
  () => {
    persistPresetManagerViewState();
  }
);

onBeforeUnmount(() => {
  persistPresetManagerViewState();
});
</script>

<template>
  <div class="preset-manager">
    <!-- Mobile Sidebar Overlay -->
    <div v-if="showMobileSidebar" class="mobile-sidebar-overlay" @click="showMobileSidebar = false"></div>

    <!-- Left Sidebar -->
    <div class="pm-sidebar" :class="{ 'mobile-open': showMobileSidebar }">
      <button v-if="showMobileSidebar" class="mobile-sidebar-close" @click="showMobileSidebar = false">×</button>
      <PresetSidebar
        ref="presetSidebarRef"
        :folder-tree="folderTree"
        :selected-folder-id="selectedFolderId"
        :expanded-ids="expandedFolderIds"
        :all-count="allPresetsCount"
        :uncategorized-count="uncategorizedCount"
        :favorites-count="favoritesCount"
        @update:selected-folder-id="handleFolderSelect"
        @toggle-expand="handleToggleExpand"
        @create-folder="createFolder()"
        @create-sub-folder="createFolder"
        @edit-folder="editFolder"
        @delete-folder="deleteFolder"
        @share-folder="handleShareFolder"
        @view-state-change="persistPresetManagerViewState"
      />
    </div>

    <!-- Right Content -->
    <div class="pm-main">
      <div class="pm-toolbar">
        <button class="btn-icon mobile-menu-btn" @click="showMobileSidebar = true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
          </svg>
          <input v-model="searchQuery" placeholder="搜索预设..." />
        </div>

        <div class="filter-group">
          <TypeSelector
            v-model="selectedType"
            :options="filterOptions"
          />
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
            <button @click="openShareDialog()" class="btn-icon" title="云端分享/导入">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
              </svg>
            </button>
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
            ref="presetListRef"
            :presets="filteredPresets"
            :search-query="searchQuery"
            :reset-key="presetListResetKey"
            @apply="applyPreset"
            @edit="editPreset"
            @delete="deletePreset"
            @copy="copyPresetContent"
            @share="handleShare"
            @toggle-favorite="toggleFavorite"
            @reorder="handleReorderPresets"
            @view-state-change="persistPresetManagerViewState"
          />
      </div>
    </div>

    <!-- Create/Edit Preset Modal -->
    <div v-if="showCreateDialog" class="modal-overlay">
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
              <TypeSelector
                :modelValue="presetForm.type"
                @update:modelValue="val => presetForm.type = val as PresetType"
                :options="presetTypes"
              />
            </div>
            <div class="form-group">
              <label>文件夹</label>
              <FolderSelector
                v-model="presetForm.folderId"
                :tree="folderTree"
                :flattened="flattenedFolders"
                root-label="(无 - 未分类)"
              />
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
            <FolderSelector
              v-model="folderForm.parentId"
              :tree="folderTree"
              :flattened="flattenedFolders"
              :exclude-id="editingFolder?.id"
              root-label="(无 - 根文件夹)"
            />
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

    <!-- Share/Import Modal -->
    <div v-if="showShareDialog" class="modal-overlay" @click.self="closeShareDialog">
      <div class="modal-content share-modal">
        <div class="modal-header">
          <h3>云端分享与导入</h3>
          <button @click="closeShareDialog" class="close-btn">×</button>
        </div>
        
        <div class="share-tabs">
          <button 
            :class="{ active: shareTab === 'create' }" 
            @click="shareTab = 'create'"
          >
            创建分享
          </button>
          <button 
            :class="{ active: shareTab === 'import' }" 
            @click="shareTab = 'import'"
          >
            导入预设
          </button>
        </div>
        
        <div class="modal-body">
          <!-- Create Share -->
          <div v-if="shareTab === 'create'" class="share-panel">
            <div class="share-info">
              <p v-if="shareSinglePreset">
                正在分享预设: <strong>{{ shareSinglePreset.name }}</strong>
              </p>
              <p v-else-if="shareFolder">
                正在分享文件夹: <strong>{{ shareFolder.name }}</strong>
              </p>
              <p v-else>
                正在分享: <strong>所有预设数据</strong>
              </p>
              <p class="text-muted">生成一个6位数的分享码，有效期24小时。</p>
            </div>
            
            <div v-if="shareResultCode" class="share-result">
              <div class="code-display">{{ shareResultCode }}</div>
              <button @click="copyShareCode" class="btn-secondary">复制分享码</button>
            </div>
            
            <div v-else class="share-action">
              <button 
                @click="generateShareCode" 
                class="btn-primary full-width" 
                :disabled="shareLoading"
              >
                {{ shareLoading ? '生成中...' : '生成分享码' }}
              </button>
            </div>
          </div>
          
          <!-- Import Share -->
          <div v-if="shareTab === 'import'" class="share-panel">
            <div class="form-group">
              <label>输入6位分享码</label>
              <input 
                v-model="shareImportCode" 
                placeholder="例如: 123456" 
                maxlength="6"
                class="code-input"
              />
            </div>
            <div class="share-action">
              <button 
                @click="importFromShareCode" 
                class="btn-primary full-width"
                :disabled="shareLoading || shareImportCode.length !== 6"
              >
                {{ shareLoading ? '导入中...' : '导入' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Import Preview Dialog -->
    <div v-if="showImportPreview" class="modal-overlay" @click.self="closeImportPreview">
      <div class="modal-content import-preview-modal">
        <div class="modal-header">
          <h3>导入预览</h3>
          <button @click="closeImportPreview" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="preview-summary">
            <div class="summary-item">
              <div class="label">找到预设</div>
              <div class="value">{{ importPreview.totalPresets }}</div>
            </div>
            <div class="summary-item">
              <div class="label">找到文件夹</div>
              <div class="value">{{ importPreview.totalFolders }}</div>
            </div>
          </div>
          
          <div class="preview-details">
            <div class="detail-group success">
              <h4>✅ 新增 ({{ importPreview.newPresets.length }})</h4>
              <div class="detail-list" v-if="importPreview.newPresets.length > 0">
                <span v-for="p in importPreview.newPresets.slice(0, 3)" :key="p.id || p.name">{{ p.name }}</span>
                <span v-if="importPreview.newPresets.length > 3">...等 {{ importPreview.newPresets.length }} 个</span>
              </div>
            </div>
            
            <div class="detail-group warning" v-if="importPreview.conflictingPresets.length > 0">
              <h4>⚠️ 命名冲突 ({{ importPreview.conflictingPresets.length }})</h4>
              <p class="help-text">名称相同但内容不同</p>
              <div class="detail-list">
                <span v-for="p in importPreview.conflictingPresets.slice(0, 3)" :key="p.id || p.name">{{ p.name }}</span>
                <span v-if="importPreview.conflictingPresets.length > 3">...等</span>
              </div>
              <div class="option-check">
                <label>
                  <input type="checkbox" v-model="importOptions.renameConflicts">
                  自动重命名 (添加 Imported 后缀)
                </label>
                <div class="sub-text" v-if="!importOptions.renameConflicts">将覆盖现有同名预设的内容</div>
              </div>
            </div>
            
            <div class="detail-group info" v-if="importPreview.duplicatePresets.length > 0">
              <h4>♻️ 完全重复 ({{ importPreview.duplicatePresets.length }})</h4>
              <p class="help-text">内容完全一致</p>
              <div class="option-check">
                <label>
                  <input type="checkbox" v-model="importOptions.skipDuplicates">
                  跳过导入 (推荐)
                </label>
              </div>
            </div>
            
            <div class="detail-group info" v-if="importPreview.foldersToCreate.length > 0">
              <h4>📁 文件夹结构</h4>
              <p>将创建 {{ importPreview.foldersToCreate.length }} 个新文件夹，合并 {{ importPreview.foldersToMerge.length }} 个现有文件夹。</p>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeImportPreview" class="btn-secondary">取消</button>
          <button @click="executeSmartImport" class="btn-primary">确认导入</button>
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

.share-modal {
  max-width: 400px;
}

.share-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1rem;
}

.share-tabs button {
  flex: 1;
  padding: 0.75rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-weight: 500;
}

.share-tabs button.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.share-info {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--color-text-primary);
}

.share-info p {
  margin: 0.5rem 0;
}

.text-muted {
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
}

.share-result {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.code-display {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.25rem;
  color: var(--color-accent);
  padding: 1rem;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  width: 100%;
  text-align: center;
}

.code-input {
  font-size: 1.5rem;
  text-align: center;
  letter-spacing: 0.25rem;
  padding: 0.75rem;
}

.full-width {
  width: 100%;
  justify-content: center;
  padding: 0.75rem;
}

/* Import Preview Styles */
.import-preview-modal {
  max-width: 600px;
}

.preview-summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.summary-item {
  flex: 1;
  text-align: center;
}

.summary-item .label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.summary-item .value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary);
}

.preview-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.detail-group {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
}

.detail-group.success { border-left: 4px solid #10b981; }
.detail-group.warning { border-left: 4px solid #f59e0b; }
.detail-group.info { border-left: 4px solid #3b82f6; }

.detail-group h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.detail-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.detail-list span {
  background-color: var(--color-bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.help-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem 0;
}

.option-check {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.option-check label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  cursor: pointer;
}

.sub-text {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

/* Mobile Responsive Styles */
.mobile-sidebar-overlay {
  display: none;
}

.mobile-menu-btn {
  display: none;
}

.mobile-sidebar-close {
  display: none;
}

@media (max-width: 768px) {
  .mobile-menu-btn {
    display: flex;
    margin-right: 0.5rem;
  }

  .mobile-sidebar-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 99;
    backdrop-filter: blur(2px);
  }

  .pm-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 80%;
    max-width: 300px;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    background-color: var(--color-bg-primary);
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
  }

  .pm-sidebar.mobile-open {
    transform: translateX(0);
  }

  .mobile-sidebar-close {
    display: block;
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: var(--color-text-tertiary);
    cursor: pointer;
    z-index: 101;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pm-toolbar {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .search-box {
    order: 1;
    min-width: 150px;
    flex: 1;
  }
  
  .mobile-menu-btn {
    order: 0;
  }

  .filter-group {
    order: 2;
    flex: 1 1 45%;
    min-width: 120px;
  }
  
  .type-select {
    width: 100%;
  }

  .action-group {
    order: 3;
    flex: 1 1 45%;
    justify-content: flex-end;
    margin-left: 0;
  }
  
  .btn-primary {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .modal-content {
    width: 95%;
    max-height: 95vh;
  }
  
  .modal-header, .modal-footer {
    padding: 1rem;
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .search-box {
    min-width: 100%;
    order: 2;
    margin-top: 0.5rem;
  }
  
  .filter-group {
    order: 1;
  }
  
  .action-group {
    order: 1;
  }
}
</style>
