<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick, watch } from 'vue';
import { usePromptStore } from '../stores/promptStore';
import type { LangCode } from '../types';
import NotificationToast from './NotificationToast.vue';
import PresetDropdown from './PresetDropdown.vue';

const store = usePromptStore();
const draggingIndex = ref<number | null>(null);
const overIndex = ref<number | null>(null);
const dragPreview = ref<HTMLElement | null>(null);
const isDragging = ref(false);
// 指针拖拽新增状态
const insertSide = ref<'before' | 'after' | null>(null);
const pointerId = ref<number | null>(null);
const startX = ref(0);
const startY = ref(0);
const lastX = ref(0);
const lastY = ref(0);
const dragStarted = ref(false);
const DRAG_THRESHOLD = 3; // 像素阈值，避免误触
const editingIndex = ref<number | null>(null);
const editingValue = ref('');
const addingMapIndex = ref<number | null>(null);
const addingMapValue = ref('');
const presetName = ref('');
const viewMode = ref<'compact' | 'detail'>('compact');
const showPresetDropdown = ref(false);
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

// 点击外部关闭下拉菜单
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement;
  // 检查点击是否在预设下拉区域内，包括重命名输入框和按钮
  if (!target.closest('.pe-presets') && !target.closest('.pd-dropdown')) {
    showPresetDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

// 清理事件监听器
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const selectedLang = computed({
  get: () => store.selectedLang,
  set: (v: LangCode) => store.setLanguage(v),
});

const tokens = computed(() => store.tokens);

const suggestions = ref<string[]>([]);
const inputEl = ref<HTMLTextAreaElement | null>(null);
const editEl = ref<HTMLInputElement | null>(null);
const text = ref('');

watch(text, (val) => {
  store.setPromptTextRaw(val);
  updateSuggestions();
});

// 当 store.promptText 发生变化（例如点击右侧预设加载）时，主动同步到左侧输入
watch(() => store.promptText, (v) => {
  if (text.value !== v) text.value = v;
}, { immediate: true });

function updateSuggestions() {
  const text = store.promptText;
  const last = text.split(',').pop() || '';
  const p = last.trim();
  suggestions.value = store.getSuggestions(p, 8);
}

async function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    // 在光标位置进行补全，不影响撤回
    const el = inputEl.value;
    if (!el) return;
    const pos = el.selectionStart ?? store.promptText.length;
    const before = store.promptText.slice(0, pos);
    const match = before.match(/[^，,]*$/);
    const prefix = (match ? match[0] : '').trim();
    const start = pos - (match ? match[0].length : 0);
    const list = store.getSuggestions(prefix, 8);
    if (list.length > 0) {
      e.preventDefault();
      const s = list[0];
      if (!s) return;
      const after = store.promptText.slice(pos);
      const nextText = store.promptText.slice(0, start) + s + after;
      text.value = nextText;
      await nextTick();
      // 将光标移动到补全结尾
      const newPos = start + s.length;
      el.setSelectionRange(newPos, newPos);
      updateSuggestions();
    }
  }
}

async function copyLeft() { 
  try {
    await navigator.clipboard.writeText(store.promptText);
    showNotification('提示词已复制到剪贴板', 'success');
  } catch (error) {
    showNotification('复制失败，请手动复制', 'error');
  }
}
function replaceCnComma() { store.replaceChineseComma(); text.value = store.promptText; }
function formatPrompt() { store.formatPrompt(); text.value = store.promptText; }

// 新增功能方法
function toggleUnderscoreSpace() { 
  store.toggleUnderscoreSpace(); 
  text.value = store.promptText; 
  showNotification('已切换下划线/空格格式', 'success');
}

function addWrapperToToken(index: number) { 
  store.addWrapperToToken(index, '{}'); 
  text.value = store.promptText; 
  showNotification('已添加包裹层 {}', 'success');
}

function removeWrapperFromToken(index: number) { 
  store.removeWrapperFromToken(index); 
  text.value = store.promptText; 
  showNotification('已移除外层包裹', 'success');
}

function getTokenWrapperInfo(token: string) {
  return store.getTokenWrapperInfo(token);
}

// 指针事件版拖拽：更高性能且可自定义插入指示
function onPointerDown(index: number, e: PointerEvent) {
  if (editingIndex.value === index) return;
  draggingIndex.value = index;
  pointerId.value = e.pointerId;
  startX.value = e.clientX;
  startY.value = e.clientY;
  lastX.value = e.clientX;
  lastY.value = e.clientY;
  dragStarted.value = false;
  isDragging.value = false;
  insertSide.value = null;

  // 监听全局移动与抬起
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp, { once: true });
}

function handlePointerMove(e: PointerEvent) {
  lastX.value = e.clientX; 
  lastY.value = e.clientY;
  const dx = e.clientX - startX.value;
  const dy = e.clientY - startY.value;
  if (!dragStarted.value && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    dragStarted.value = true;
    isDragging.value = true;
    if (draggingIndex.value != null) createPointerPreview(draggingIndex.value);
  }
  if (!isDragging.value) return;
  positionPreview(e.clientX, e.clientY);
  updateOverIndexAndSide(e.clientX, e.clientY);
}

function handlePointerUp(e: PointerEvent) {
  window.removeEventListener('pointermove', handlePointerMove);
  if (!dragStarted.value || draggingIndex.value == null) { 
    cleanupDrag(); 
    return; 
  }
  const from = draggingIndex.value!;
  const j = overIndex.value;
  const side = insertSide.value;
  if (j != null && side) {
    let to = j;
    if (side === 'before') {
      to = j - (from < j ? 1 : 0);
    } else {
      to = j + (from > j ? 1 : 0);
    }
    if (to < 0) to = 0;
    if (to >= tokens.value.length) to = tokens.value.length - 1;
    store.reorderTokens(from, to);
    showNotification('已重新排序', 'success');
  }
  cleanupDrag();
}

function cleanupDrag() {
  draggingIndex.value = null;
  overIndex.value = null;
  isDragging.value = false;
  insertSide.value = null;
  pointerId.value = null;
  if (dragPreview.value) {
    document.body.removeChild(dragPreview.value);
    dragPreview.value = null;
  }
}

function createPointerPreview(index: number) {
  const token = tokens.value[index] || '';
  const translation = displayTrans(token);
  const preview = document.createElement('div');
  preview.className = 'drag-preview';
  preview.innerHTML = `
    <div class="drag-preview-content">
      <span class="drag-preview-key">${token}</span>
      <span class="drag-preview-arrow">→</span>
      <span class="drag-preview-trans">${translation}</span>
    </div>
  `;
  preview.style.position = 'fixed';
  preview.style.top = '0';
  preview.style.left = '0';
  preview.style.zIndex = '1000';
  preview.style.pointerEvents = 'none';
  ;(preview.style as any).contain = 'layout style paint';
  preview.style.willChange = 'transform, opacity';
  document.body.appendChild(preview);
  dragPreview.value = preview;
}

function positionPreview(x: number, y: number) {
  if (!dragPreview.value) return;
  dragPreview.value.style.transform = `translate(${x + 12}px, ${y + 12}px)`;
}

function updateOverIndexAndSide(x: number, y: number) {
  insertSide.value = null;
  overIndex.value = null;
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el) return;
  const tokenEl = el.closest('.pe-token-compact, .pe-token-detail') as HTMLElement | null;
  if (!tokenEl) return;
  const idxAttr = tokenEl.getAttribute('data-index');
  if (idxAttr == null) return;
  const idx = parseInt(idxAttr, 10);
  if (Number.isNaN(idx)) return;
  if (idx === draggingIndex.value) { overIndex.value = null; insertSide.value = null; return; }
  const rect = tokenEl.getBoundingClientRect();
  const midX = rect.left + rect.width / 2;
  overIndex.value = idx;
  insertSide.value = x < midX ? 'before' : 'after';
}

function beginEdit(i: number) {
  editingIndex.value = i;
  editingValue.value = tokens.value[i] ?? '';
  addingMapIndex.value = null;
  nextTick(() => {
    if (editEl.value) {
      editEl.value.focus();
      try { editEl.value.setSelectionRange(0, editingValue.value.length); } catch {}
    }
  });
}
function commitEdit() {
  if (editingIndex.value == null) return;
  store.updateToken(editingIndex.value, editingValue.value);
  editingIndex.value = null;
}
function cancelEdit() { editingIndex.value = null; }

function showAddMap(i: number) {
  addingMapIndex.value = i; addingMapValue.value = '';
  editingIndex.value = null;
}
function commitAddMap() {
  if (addingMapIndex.value == null) return;
  const key = tokens.value[addingMapIndex.value];
  if (!key) return;
  store.addMapping(key, selectedLang.value, addingMapValue.value.trim());
  addingMapIndex.value = null; addingMapValue.value = '';
}

function removeToken(i: number) { store.removeToken(i); }
function addTokenAfter(i: number) { store.addTokenAfter(i, 'new_token'); }

function savePreset() {
  if (!presetName.value.trim()) { 
    showNotification('请输入预设名称', 'error'); 
    return; 
  }
  
  const name = presetName.value.trim();
  
  // 只保存到新的扩展预设系统
  const defaultFolder = store.presetManagement?.settings?.defaultFolder;
  store.createExtendedPreset({
    name: name,
    type: 'positive',
    content: store.promptText,
    description: '从编辑器快速保存',
    folderId: defaultFolder
  });
  
  showNotification(`预设「${name}」已保存到预设管理`, 'success');
  presetName.value = '';
}

// 预设下拉组件的事件处理
function handlePresetLoad(name: string) {
  // 优先从扩展预设中查找
  const extendedPreset = store.extendedPresets.find(p => p.name === name);
  if (extendedPreset) {
    store.setPromptTextRaw(extendedPreset.content);
    text.value = extendedPreset.content;
  } else {
    // 回退到旧预设系统
    store.loadPreset(name);
    text.value = store.promptText;
  }
  showNotification(`已加载预设「${name}」`, 'success');
}

function handlePresetSave(name: string) {
  store.savePreset(name);
  showNotification(`预设「${name}」已保存`, 'success');
}

function handlePresetDelete(name: string) {
  store.deletePreset(name);
  showNotification(`预设「${name}」已删除`, 'info');
}

function handlePresetRename(oldName: string, newName: string) {
  store.renamePreset(oldName, newName);
  showNotification(`预设已重命名为「${newName}」`, 'success');
}

async function applySuggestion(s: string) {
  const el = inputEl.value;
  if (!el) return;
  const pos = el.selectionStart ?? store.promptText.length;
  const before = store.promptText.slice(0, pos);
  const match = before.match(/[^，,]*$/);
  const start = pos - (match ? match[0].length : 0);
  const after = store.promptText.slice(pos);
  const nextText = store.promptText.slice(0, start) + s + after;
  text.value = nextText;
  await nextTick();
  const newPos = start + s.length;
  el.setSelectionRange(newPos, newPos);
  updateSuggestions();
}

function displayTrans(key: string): string {
  return store.getTranslation(key, selectedLang.value) ?? key;
}
</script>

<template>
  <div class="pe-root">
    <header class="pe-toolbar">
      <div class="pe-left">
        <label>语言</label>
        <select v-model="selectedLang">
          <option v-for="l in store.languages" :key="l" :value="l">{{ l }}</option>
        </select>
        <button @click="copyLeft" title="复制提示词到剪贴板">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
            <path d="m5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
          </svg>
          复制提示词
        </button>
      </div>
      <div class="pe-right">
        <input class="pe-preset-name" placeholder="保存为预设名称" v-model="presetName" />
        <button @click="savePreset" title="保存当前提示词为预设">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="2"/>
            <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" stroke-width="2"/>
            <polyline points="7,3 7,8 15,8" stroke="currentColor" stroke-width="2"/>
          </svg>
          保存预设
        </button>
        <div class="pe-presets">
          <button 
            class="pe-preset-toggle" 
            @click="showPresetDropdown = !showPresetDropdown"
            title="快速预设"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" fill="currentColor"/>
            </svg>
            快速预设
            <svg 
              width="12" height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              :class="{ 'rotate-180': showPresetDropdown }"
              class="dropdown-arrow"
            >
              <polyline points="6,9 12,15 18,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          
          <PresetDropdown 
            :show="showPresetDropdown"
            @close="showPresetDropdown = false"
            @load="handlePresetLoad"
            @save="handlePresetSave"
            @delete="handlePresetDelete"
            @rename="handlePresetRename"
          />
        </div>
      </div>
    </header>

    <main class="pe-main">
      <section class="pe-left-pane">
        <div class="pe-section-title">提示词输入（逗号分隔）</div>
        <textarea ref="inputEl" class="pe-input" v-model="text" @keydown="onKeyDown" placeholder="例如：1girl, aaa, bbb, ccc"></textarea>
        <div class="pe-input-actions">
          <button @click="replaceCnComma" title="将中文逗号替换为英文逗号">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
              <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
            </svg>
            替换中文逗号
          </button>
          <button @click="formatPrompt" title="格式化提示词为标准格式">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline points="4 7 4 4 20 4 20 7" stroke="currentColor" stroke-width="2"/>
              <line x1="9" y1="20" x2="15" y2="20" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="2"/>
            </svg>
            格式化提示词
          </button>
          <button @click="toggleUnderscoreSpace" title="切换下划线和空格格式">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12h18" stroke="currentColor" stroke-width="2"/>
              <path d="M8 8l4-4 4 4" stroke="currentColor" stroke-width="2"/>
              <path d="M8 16l4 4 4-4" stroke="currentColor" stroke-width="2"/>
            </svg>
            切换 _/空格
          </button>
        </div>
        <ul class="pe-suggest" v-if="suggestions.length">
          <li v-for="s in suggestions" :key="s" @click="applySuggestion(s)">{{ s }}</li>
        </ul>
      </section>
      
      <section class="pe-right-pane">
        <div class="pe-section-title mode">
          <span>提示词映射（双击修改）</span>
          <div class="pe-mode-switch">
            <button :class="{ active: viewMode==='compact' }" @click="viewMode='compact'">精简视图</button>
            <button :class="{ active: viewMode==='detail' }" @click="viewMode='detail'">详细视图</button>
          </div>
        </div>
        
        <div class="pe-drag-container" :class="{ 'is-dragging': isDragging }">
        <div class="pe-tokens-compact" v-if="viewMode === 'compact'">
          <div
            v-for="(k,i) in tokens"
            :key="k + '_' + i"
            :data-index="i"
            :class="{ 
              'dragging': draggingIndex === i, 
              'insert-before': overIndex === i && insertSide === 'before' && draggingIndex !== i,
              'insert-after': overIndex === i && insertSide === 'after' && draggingIndex !== i,
              'editing': editingIndex === i
            }"
            class="pe-token-compact"
            @pointerdown="onPointerDown(i, $event)"
            @dblclick="beginEdit(i)"
            :title="`${k} → ${displayTrans(k)}`"
          >
            <span class="pe-handle-compact">⋮⋮</span>
            <div v-if="editingIndex === i" class="pe-edit-inline">
              <input
                ref="editEl"
                class="pe-edit-input"
                v-model="editingValue"
                @keydown.enter.stop.prevent="commitEdit"
                @keydown.esc.stop.prevent="cancelEdit"
                placeholder="编辑提示词"
              />
              <div class="pe-edit-actions">
                <button @click="commitEdit" class="pe-edit-save-btn" title="保存">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button @click="cancelEdit" class="pe-edit-cancel-btn" title="取消">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>
            <div v-else class="pe-token-content">
              <span class="pe-key-compact">{{ k }}</span>
              <span class="pe-arrow-compact">→</span>
              <span class="pe-trans-compact" :class="{ unmapped: displayTrans(k) === k }">
                {{ displayTrans(k) }}
              </span>
            </div>
            <div class="pe-token-controls-compact">
              <button @click="addWrapperToToken(i)" class="pe-add-wrapper-btn" title="添加包裹层 {}">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 3h3v3M8 3H5v3m0 12v3h3m8 0h3v-3" stroke="currentColor" stroke-width="2" fill="none"/>
                  <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2"/>
                  <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button 
                @click="removeWrapperFromToken(i)" 
                class="pe-remove-wrapper-btn" 
                title="移除包裹层"
                :disabled="getTokenWrapperInfo(k).wrapperCount === 0"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 3h3v3M8 3H5v3m0 12v3h3m8 0h3v-3" stroke="currentColor" stroke-width="2" fill="none"/>
                  <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button @click="removeToken(i)" class="pe-remove-btn" title="删除此词">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
                  <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="pe-tokens-detail" v-else>
          <div
            v-for="(k,i) in tokens"
            :key="k + '_' + i"
            :data-index="i"
            :class="{ 
              'dragging': draggingIndex === i, 
              'insert-before': overIndex === i && insertSide === 'before' && draggingIndex !== i,
              'insert-after': overIndex === i && insertSide === 'after' && draggingIndex !== i,
              'editing': editingIndex === i || addingMapIndex === i
            }"
            class="pe-token-detail"
            @pointerdown="onPointerDown(i, $event)"
          >
            <div class="pe-token-header">
              <span class="pe-handle-detail">⋮⋮</span>
              <div class="pe-token-main" @dblclick="beginEdit(i)">
                <span class="pe-key-detail">{{ k }}</span>
                <span class="pe-arrow-detail">→</span>
                <span class="pe-trans-detail" :class="{ unmapped: displayTrans(k) === k }">{{ displayTrans(k) }}</span>
              </div>
              <div class="pe-token-controls">
                <button v-if="displayTrans(k) === k" class="pe-add-map-btn" @click="showAddMap(i)" title="添加映射">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
                    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
                <button @click="addWrapperToToken(i)" class="pe-add-wrapper-detail-btn" title="添加包裹层 {}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 3h3v3M8 3H5v3m0 12v3h3m8 0h3v-3" stroke="currentColor" stroke-width="2" fill="none"/>
                    <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2"/>
                    <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
                <button 
                  @click="removeWrapperFromToken(i)" 
                  class="pe-remove-wrapper-detail-btn" 
                  title="移除包裹层"
                  :disabled="getTokenWrapperInfo(k).wrapperCount === 0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 3h3v3M8 3H5v3m0 12v3h3m8 0h3v-3" stroke="currentColor" stroke-width="2" fill="none"/>
                    <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
                <button class="pe-add-after-btn" @click="addTokenAfter(i)" title="在后添加">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2"/>
                    <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
                <button class="pe-remove-detail-btn" @click="removeToken(i)" title="删除">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
                    <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div v-if="editingIndex === i" class="pe-edit-panel">
              <input v-model="editingValue" @keyup.enter="commitEdit" placeholder="编辑词条..." />
              <div class="pe-edit-actions">
                <button @click="commitEdit" class="pe-confirm-btn">确定</button>
                <button @click="cancelEdit" class="pe-cancel-btn">取消</button>
              </div>
            </div>
            
            <div v-if="addingMapIndex === i" class="pe-add-panel">
              <input v-model="addingMapValue" :placeholder="`请输入 ${selectedLang} 的翻译`" @keyup.enter="commitAddMap" />
              <div class="pe-add-actions">
                <button @click="commitAddMap" class="pe-confirm-btn">添加</button>
                <button @click="() => { addingMapIndex = null; addingMapValue = ''; }" class="pe-cancel-btn">取消</button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>
    </main>
    
    <!-- 通知组件 -->
    <NotificationToast 
      :message="notification.message"
      :type="notification.type"
      :show="notification.show"
    />
  </div>
</template>

<style scoped>
.pe-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
}

.pe-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  gap: 1rem;
  flex-wrap: wrap;
}

.pe-left, .pe-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.pe-left label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.pe-left select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pe-left select:hover {
  border-color: var(--color-border-hover);
}

.pe-left select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.pe-left button, .pe-right button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  line-height: 1;
}

.pe-left button:hover, .pe-right button:hover {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-border-hover);
}

.pe-preset-name {
  width: 200px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.pe-preset-name:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.pe-presets {
  position: relative;
}

.pe-preset-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pe-preset-toggle:hover {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-border-hover);
}

.dropdown-arrow {
  transition: transform 0.2s ease;
  margin-left: 0.25rem;
}

.dropdown-arrow.rotate-180 {
  transform: rotate(180deg);
}

.pe-preset-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 50;
  min-width: 320px;
  max-height: 400px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  margin-top: 0.5rem;
  overflow: hidden;
}

.pe-preset-search-wrapper {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.pe-preset-search {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.pe-preset-search:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.pe-preset-list {
  max-height: 300px;
  overflow-y: auto;
}

.pe-preset-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
}

.pe-preset-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.pe-preset-item:last-child {
  border-bottom: none;
}

.pe-preset-load {
  flex: 1;
  text-align: left;
  padding: 0.25rem 0.5rem;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.pe-preset-load:hover {
  background-color: var(--color-bg-secondary);
}

.pe-preset-meta {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.pe-preset-rename, .pe-preset-delete {
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.pe-preset-rename:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-accent);
}

.pe-preset-delete:hover {
  background-color: var(--color-error);
  color: white;
}

.pe-preset-rename-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

.pe-preset-rename-ok, .pe-preset-rename-cancel {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pe-preset-rename-ok:hover {
  background-color: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.pe-preset-rename-cancel:hover {
  background-color: var(--color-bg-tertiary);
}

.pe-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: calc(100vh - 8rem);
  gap: 1px;
  background-color: var(--color-border);
}

.pe-left-pane, .pe-right-pane {
  padding: 1.5rem;
  background-color: var(--color-bg-primary);
  overflow: auto;
}

.pe-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pe-mode-switch {
  display: flex;
  gap: 0.25rem;
  background-color: var(--color-bg-secondary);
  padding: 0.25rem;
  border-radius: var(--radius-md);
}

.pe-mode-switch button {
  padding: 0.375rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pe-mode-switch button.active {
  background-color: var(--color-accent);
  color: white;
  box-shadow: var(--shadow-sm);
}

.pe-input {
  width: 100%;
  height: 200px;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.2s ease;
}

.pe-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.pe-input-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.pe-input-actions button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  line-height: 1;
}

.pe-input-actions button:hover {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-border-hover);
}

.pe-suggest {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pe-suggest li {
  padding: 0.375rem 0.75rem;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pe-suggest li:hover {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

/* 紧凑行视图 */
.pe-tokens-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.pe-token-compact {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
  cursor: grab;
  transition: all 0.2s ease;
  max-width: 100%;
}

.pe-token-compact:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-sm);
}

/* 精简视图编辑态美化 */
.pe-token-compact.editing {
  cursor: default;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
  background-color: var(--color-bg-primary);
}

.pe-token-compact[draggable="false"] {
  cursor: default;
}

.pe-token-compact.editing .pe-handle-compact,
.pe-token-compact.editing .pe-token-content,
.pe-token-compact.editing .pe-token-controls-compact {
  display: none;
}

.pe-edit-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.pe-edit-input {
  flex: 1;
  min-width: 0;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.8125rem;
  transition: all 0.2s ease;
}

.pe-edit-input::placeholder {
  color: var(--color-text-tertiary);
}

.pe-edit-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
  background-color: var(--color-bg-primary);
}

.pe-edit-actions {
  display: flex;
  gap: 0.25rem;
}

.pe-edit-save-btn, .pe-edit-cancel-btn {
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

.pe-edit-save-btn:hover {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.pe-edit-cancel-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.pe-token-compact.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
  cursor: grabbing;
}

.pe-token-compact.drag-over {
  border-color: var(--color-accent);
  background-color: var(--color-accent-light);
}

.pe-handle-compact {
  cursor: grab;
  user-select: none;
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
  padding: 0.125rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.pe-handle-compact:hover {
  color: var(--color-text-secondary);
  background-color: var(--color-bg-tertiary);
}

.pe-handle-compact:active {
  cursor: grabbing;
}

.pe-token-content {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
}

.pe-key-compact {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  background-color: var(--color-bg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pe-arrow-compact {
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.pe-trans-compact {
  font-size: 0.75rem;
  color: var(--color-text-primary);
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pe-trans-compact.unmapped {
  color: var(--color-error);
  font-style: italic;
  opacity: 0.8;
}

.pe-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  opacity: 0.7;
}

.pe-token-compact:hover .pe-remove-btn {
  opacity: 1;
}

.pe-remove-btn:hover {
  background-color: var(--color-error);
  color: white;
  border-color: var(--color-error);
  transform: scale(1.05);
}

/* 精简视图的包裹层控制按钮 */
.pe-token-controls-compact {
  display: flex;
  gap: 0.125rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.pe-token-compact:hover .pe-token-controls-compact {
  opacity: 1;
}

.pe-add-wrapper-btn, .pe-remove-wrapper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.pe-add-wrapper-btn:hover {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.pe-remove-wrapper-btn:hover:not(:disabled) {
  background-color: var(--color-warning);
  color: white;
  border-color: var(--color-warning);
}

.pe-remove-wrapper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 详细列表视图 */
.pe-tokens-detail {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.pe-token-detail {
  position: relative;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  overflow: hidden;
}

.pe-token-detail:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-sm);
}

.pe-token-detail.editing {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.pe-token-detail.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
}

.pe-token-detail.drag-over {
  border-color: var(--color-accent);
  background-color: var(--color-accent-light);
}

.pe-token-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
}

.pe-handle-detail {
  cursor: grab;
  user-select: none;
  color: var(--color-text-tertiary);
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.pe-handle-detail:hover {
  color: var(--color-text-secondary);
  background-color: var(--color-bg-tertiary);
}

.pe-handle-detail:active {
  cursor: grabbing;
}

.pe-token-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.pe-token-main:hover {
  background-color: var(--color-bg-tertiary);
}

.pe-key-detail {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  background-color: var(--color-bg-tertiary);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.pe-arrow-detail {
  color: var(--color-text-tertiary);
  font-weight: 500;
  flex-shrink: 0;
}

.pe-trans-detail {
  color: var(--color-text-primary);
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pe-trans-detail.unmapped {
  color: var(--color-error);
  font-style: italic;
}

.pe-token-controls {
  display: flex;
  gap: 0.25rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.pe-token-detail:hover .pe-token-controls {
  opacity: 1;
}

.pe-add-map-btn, .pe-add-after-btn, .pe-remove-detail-btn, 
.pe-add-wrapper-detail-btn, .pe-remove-wrapper-detail-btn {
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

.pe-add-map-btn:hover {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.pe-add-after-btn:hover {
  background-color: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.pe-add-wrapper-detail-btn:hover {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.pe-remove-wrapper-detail-btn:hover:not(:disabled) {
  background-color: var(--color-warning);
  color: white;
  border-color: var(--color-warning);
}

.pe-remove-wrapper-detail-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pe-remove-detail-btn:hover {
  background-color: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.pe-edit-panel, .pe-add-panel {
  padding: 0.75rem;
  background-color: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
}

.pe-edit-panel input, .pe-add-panel input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
}

.pe-edit-panel input:focus, .pe-add-panel input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.pe-edit-actions, .pe-add-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.pe-confirm-btn, .pe-cancel-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pe-confirm-btn {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.pe-confirm-btn:hover {
  background-color: var(--color-accent-hover);
}

.pe-cancel-btn {
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
}

.pe-cancel-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .pe-main {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .pe-left-pane {
    border-bottom: 1px solid var(--color-border);
  }
}

@media (max-width: 768px) {
  .pe-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .pe-left, .pe-right {
    justify-content: center;
  }
  
  .pe-left-pane, .pe-right-pane {
    padding: 1rem;
  }
  
  .pe-input {
    height: 150px;
  }
  
  .pe-preset-name {
    width: 100%;
  }
  
  .pe-preset-dropdown {
    position: static;
    margin-top: 0.5rem;
    box-shadow: none;
    border: 1px solid var(--color-border);
    min-width: auto;
  }
  
  .pe-tokens-compact {
    gap: 0.375rem;
  }
  
  .pe-token-compact {
    padding: 0.375rem 0.5rem;
  }
}

@media (max-width: 640px) {
  .pe-input-actions {
    flex-direction: column;
  }
  
  .pe-input-actions button {
    width: 100%;
    justify-content: center;
  }
  
  .pe-token-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .pe-token-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
  }
  
  .pe-token-controls {
    align-self: flex-end;
    opacity: 1;
  }
  
  .pe-remove-btn {
    opacity: 1;
  }
  
  .pe-token-controls-compact {
    opacity: 1;
  }
  
  .pe-edit-actions, .pe-add-actions {
    flex-direction: column;
  }
  
  .pe-confirm-btn, .pe-cancel-btn {
    width: 100%;
  }
  
  .pe-tokens-compact {
    gap: 0.25rem;
  }
  
  .pe-token-compact {
    padding: 0.25rem 0.375rem;
    gap: 0.25rem;
  }
  
  .pe-key-compact {
    font-size: 0.6875rem;
    max-width: 80px;
  }
  
  .pe-trans-compact {
    font-size: 0.6875rem;
  }
  
  .pe-arrow-compact {
    font-size: 0.6875rem;
  }
}

/* 拖拽状态样式 */
.pe-token-compact[draggable="true"]:hover .pe-handle-compact,
.pe-token-detail[draggable="true"]:hover .pe-handle-detail {
  color: var(--color-accent);
}

/* 拖拽预览样式 */
.drag-preview {
  background-color: var(--color-bg-primary);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
  box-shadow: var(--shadow-md);
  opacity: 0.9;
}

.drag-preview-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.drag-preview-key {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  background-color: var(--color-bg-tertiary);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}

.drag-preview-arrow {
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.drag-preview-trans {
  color: var(--color-text-primary);
  font-weight: 500;
}

/* 拖拽占位符样式 */
.pe-token-compact.drag-placeholder,
.pe-token-detail.drag-placeholder {
  position: relative;
}

.pe-token-compact.drag-placeholder::before,
.pe-token-detail.drag-placeholder::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px dashed var(--color-accent);
  border-radius: var(--radius-md);
  background-color: var(--color-accent-light);
  opacity: 0.3;
  animation: pulse 1s ease-in-out infinite alternate;
}

@keyframes pulse {
  from {
    opacity: 0.2;
  }
  to {
    opacity: 0.5;
  }
}

/* 改进拖拽中的样式 */
.pe-token-compact.dragging,
.pe-token-detail.dragging {
  opacity: 0.3;
  transform: scale(0.95) rotate(2deg);
  cursor: grabbing;
  z-index: 1000;
  box-shadow: var(--shadow-lg);
}

.pe-token-compact.drag-over,
.pe-token-detail.drag-over {
  border-color: var(--color-accent);
  background-color: var(--color-accent-light);
  transform: scale(1.02);
  transition: all 0.2s ease;
}

/* 插入方向指示：目标项向前/后移动并显示清晰插入方向 */
.pe-token-compact.insert-before,
.pe-token-detail.insert-before {
  transform: translateX(10px);
  border-color: var(--color-accent);
}

.pe-token-compact.insert-after,
.pe-token-detail.insert-after {
  transform: translateX(-10px);
  border-color: var(--color-accent);
}

.pe-token-compact.insert-before::before,
.pe-token-detail.insert-before::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background-color: var(--color-accent);
  border-radius: 2px;
  opacity: 0.6;
}

.pe-token-compact.insert-after::after,
.pe-token-detail.insert-after::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background-color: var(--color-accent);
  border-radius: 2px;
  opacity: 0.6;
}

/* 拖拽容器样式 */
.pe-drag-container {
  position: relative;
  min-height: 200px;
  transition: all 0.1s ease;
}

.pe-drag-container.is-dragging {
  background-color: var(--color-bg-secondary);
  border: 2px dashed var(--color-accent);
  border-radius: var(--radius-lg);
  padding: 0.5rem;
}

.pe-drag-container.is-dragging::after {
  content: '拖拽到此处重新排序';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
  pointer-events: none;
  opacity: 0.5;
}

/* 预先启用复合层以提升拖拽流畅度 */
.pe-token-compact,
.pe-token-detail {
  will-change: transform;
}

/* 加载和过渡动画 */
.pe-token-compact, .pe-token-detail {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 下拉菜单动画 */
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

/* 滚动条样式 */
.pe-left-pane::-webkit-scrollbar,
.pe-right-pane::-webkit-scrollbar,
.pe-preset-list::-webkit-scrollbar {
  width: 6px;
}

.pe-left-pane::-webkit-scrollbar-track,
.pe-right-pane::-webkit-scrollbar-track,
.pe-preset-list::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
}

.pe-left-pane::-webkit-scrollbar-thumb,
.pe-right-pane::-webkit-scrollbar-thumb,
.pe-preset-list::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 3px;
}

.pe-left-pane::-webkit-scrollbar-thumb:hover,
.pe-right-pane::-webkit-scrollbar-thumb:hover,
.pe-preset-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}


/* 保证按钮内图标不压缩文本，提升对齐与可读性 */
.pe-left button svg,
.pe-right button svg,
.pe-input-actions button svg,
.pe-preset-toggle svg {
  flex-shrink: 0;
}
</style>