<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick, watch } from 'vue';
import { usePromptStore, splitTokens, normalizeSymbols, parseDetailedToken, constructToken } from '../stores/promptStore';
import type { LangCode, PresetFolder } from '../types';
import NotificationToast from './NotificationToast.vue';
import TranslationPopup from './TranslationPopup.vue';
import EditorToolbar from './editor/EditorToolbar.vue';
import EditorInput from './editor/EditorInput.vue';
import TokenMappingPanel from './editor/TokenMappingPanel.vue';

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
const dragOffsetX = ref(0);
const dragOffsetY = ref(0);
const dragStarted = ref(false);
const cachedTokenRects = ref<{
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
  midX: number;
}[]>([]);
let rafId: number | null = null;

const DRAG_THRESHOLD = 3; // 像素阈值，避免误触
const editingIndex = ref<number | null>(null);
const presetName = ref('');
const selectedFolderId = ref<string>('');
const viewMode = ref<'compact' | 'detail'>('compact');
const showPresetDropdown = ref(false);
const showTranslationPopup = ref(false);
const translationTargetToken = ref<string | null>(null);

const translationTokens = computed(() => {
  if (translationTargetToken.value) {
    return [translationTargetToken.value];
  }
  return unmappedTokens.value;
});
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
  const defaultFolder = store.presetManagement?.settings?.defaultFolder;
  if (defaultFolder) {
    selectedFolderId.value = defaultFolder;
  }
  store.searchQuery = ''; // Reset search query to ensure all tags are shown
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

const suggestions = ref<string[]>([]);
const editSuggestions = ref<string[]>([]);
const editorInputRef = ref<InstanceType<typeof EditorInput> | null>(null);
const tokenMappingRef = ref<InstanceType<typeof TokenMappingPanel> | null>(null);
const priorityStyle = ref<'{}' | '()' | '[]' | '<>' | 'suffix'>('{}');
const priorityStep = ref(0.1);
function splitTokensLocal(txt: string): string[] {
  return splitTokens(txt);
}
function normalizeToken(t: string): string { return t.trim().replace(/\s+/g, ' '); }
function normalizePromptLocal(txt: string): string {
  return splitTokens(txt).map(t => t.replace(/\s+/g, ' ')).join(', ');
}
function applyFullPrompt(newText: string) {
  const el = editorInputRef.value?.inputEl;
  if (!el) { text.value = newText; return; }
  el.focus();
  applyTextReplacement(el, 0, text.value.length, newText);
}
function getTokenWeight(token: string): number {
  const { core } = store.parseTokenWrappers(token);
  const idx = core.lastIndexOf(':');
  if (idx > -1) {
    const w = parseFloat(core.slice(idx + 1).trim());
    return isNaN(w) ? 1 : w;
  }
  return 1;
}
function hasWeightSuffix(token: string): boolean {
  const { core } = store.parseTokenWrappers(token);
  return /:\s*\d+(?:\.\d+)?$/.test(core);
}
function roundToDecimals(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}
function adjustWeight(core: string, delta: number): string {
  const idx = core.lastIndexOf(':');
  let base = core;
  let w: number | null = null;
  if (idx > -1) {
    const num = parseFloat(core.slice(idx + 1).trim());
    if (!isNaN(num)) { base = core.slice(0, idx); w = num; }
  }
  const stepStr = String(priorityStep.value);
  const decimals = stepStr.includes('.') ? stepStr.split('.')[1]!.length : 0;
  const cur = w == null ? 1.0 : w;
  let nw = cur + delta;

  nw = roundToDecimals(nw, decimals);

  // If weight is 1, return base without suffix
  if (nw === 1) return base;

  return base + ':' + nw;
}
const text = ref('');

watch(text, (val) => {
  store.setPromptTextRaw(val);
  updateSuggestionsFromText();
});

// 当 store.promptText 发生变化（例如点击右侧预设加载）时，主动同步到左侧输入
watch(() => store.promptText, (v) => {
  if (text.value !== v) text.value = v;
}, { immediate: true });

function updateSuggestionsFromText() {
  const el = editorInputRef.value?.inputEl;
  const txt = store.promptText;
  let pos = txt.length;
  if (el && typeof el.selectionStart === 'number') {
    pos = el.selectionStart ?? txt.length;
  }
  const leftCommaEn = txt.lastIndexOf(',', pos - 1);
  const leftCommaCn = txt.lastIndexOf('，', pos - 1);
  const left = Math.max(leftCommaEn, leftCommaCn);
  const rightCommaEn = txt.indexOf(',', pos);
  const rightCommaCn = txt.indexOf('，', pos);
  const rightCandidates = [rightCommaEn, rightCommaCn].filter(i => i !== -1);
  const right = rightCandidates.length ? Math.min(...rightCandidates) : txt.length;
  const segment = txt.slice(left < 0 ? 0 : left + 1, right).trim();
  const { core } = parseDetailedToken(segment);
  const cleanCore = core.replace(/^[\(\[\{<]+/, '').replace(/[\)\]\}>]+$/, '');
  suggestions.value = store.getSuggestions(cleanCore, 8);
}

function updateEditSuggestionsFromValue(val: string) {
  const { core } = parseDetailedToken(val);
  const cleanCore = core.replace(/^[\(\[\{<]+/, '').replace(/[\)\]\}>]+$/, '');
  editSuggestions.value = store.getSuggestions(cleanCore, 8);
}

// 统一的文本替换方法：优先使用原生插入以保留撤回栈，失败时回退
function applyTextReplacement(
  el: HTMLTextAreaElement | HTMLInputElement,
  start: number,
  end: number,
  text: string,
) {
  try {
    if (typeof el.setSelectionRange === 'function') {
      el.setSelectionRange(start, end);
    }
    const ok = (document as any).execCommand && (document as any).execCommand('insertText', false, text);
    if (ok) return;
  } catch { }
  try {
    el.setRangeText(text, start, end, 'end');
    try {
      const ie = new (window as any).InputEvent('input', { bubbles: true, data: text, inputType: 'insertReplacementText' });
      el.dispatchEvent(ie);
    } catch {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } catch {
    const value = (el as any).value as string;
    (el as any).value = value.slice(0, start) + text + value.slice(end);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}


function handleAddTag(tag: string) {
  const el = editorInputRef.value?.inputEl;
  if (!el) {
    store.setPromptTextRaw(store.promptText ? store.promptText + ', ' + tag : tag);
    return;
  }

  el.focus();

  let start = el.selectionStart ?? store.promptText.length;
  const textVal = el.value;
  const len = textVal.length;

  let tokenStart = start;
  while (tokenStart > 0 && !/[,，]/.test(textVal[tokenStart - 1] || '')) {
    tokenStart--;
  }
  let tokenEnd = start;
  while (tokenEnd < len && !/[,，]/.test(textVal[tokenEnd] || '')) {
    tokenEnd++;
  }

  const rawToken = textVal.slice(tokenStart, tokenEnd);
  const trimmedToken = rawToken.trim();

  if (trimmedToken.length > 0) {
    const tokenCenter = tokenStart + rawToken.length / 2;
    if (start < tokenCenter) {
      start = tokenStart;
    } else {
      start = tokenEnd;
    }
  }

  let prefix = '';
  let suffix = '';

  if (start > 0) {
    const prevText = textVal.slice(0, start);
    if (/[^,，\s]$/.test(prevText)) {
      prefix = ', ';
    } else if (/[,，]$/.test(prevText)) {
      prefix = ' ';
    } else if (/[,，]\s+$/.test(prevText)) {
      prefix = '';
    } else if (/\s+$/.test(prevText)) {
      const trimmedPrev = prevText.trimEnd();
      if (trimmedPrev.length > 0 && !/[,，]$/.test(trimmedPrev)) {
        if (!/[,，]\s*$/.test(prevText)) {
          prefix = ', ';
        }
      }
    }
  }

  if (start < len) {
    const nextText = textVal.slice(start);
    if (/^[^,，\s]/.test(nextText)) {
      suffix = ', ';
    } else if (/^\s+[^,，]/.test(nextText)) {
      suffix = ', ';
    }
  }

  const toInsert = prefix + tag + suffix;
  applyTextReplacement(el, start, start, toInsert);

  nextTick(() => {
    el.focus();
  });
}

async function copyLeft() {
  try {
    await navigator.clipboard.writeText(store.promptText);
    showNotification('提示词已复制到剪贴板', 'success');
  } catch (error) {
    showNotification('复制失败，请手动复制', 'error');
  }
}
function replaceCnComma() { applyFullPrompt(normalizeSymbols(text.value)); }
function formatPrompt() { applyFullPrompt(normalizePromptLocal(text.value)); }

function unifyPriorityStyle() {
  const tokens = splitTokens(text.value);
  const processed = tokens.map(token => {
    const { core, weight, wrappers } = parseDetailedToken(token);
    let result = core;
    let currentWrappers = [...wrappers];

    if (weight !== undefined && weight !== 1) {
      const lastWrapper = currentWrappers[currentWrappers.length - 1];
      if (lastWrapper === '()') {
        currentWrappers.pop();
      }
      const wStr = Number.isInteger(weight) ? weight.toString() : weight.toFixed(2).replace(/\.?0+$/, '');
      result = `(${result}:${wStr})`;
    }

    return store.wrapToken(result, currentWrappers);
  });
  applyFullPrompt(processed.join(', '));
  showNotification('已统一优先级样式', 'success');
}

// 新增功能方法
function toggleUnderscoreSpace() {
  const tokens = splitTokens(text.value);

  // 1. 统计全局倾向
  let spaceCount = 0;
  let underscoreCount = 0;

  // 预解析所有 Token
  const parsedList = tokens.map(t => parseDetailedToken(t));

  parsedList.forEach(({ core }) => {
    for (const char of core) {
      if (char === ' ') spaceCount++;
      if (char === '_') underscoreCount++;
    }
  });

  // 2. 确定目标格式
  // 逻辑：统一成“非优势”的一方。
  // 如果下划线更多（或相等），则统一变成空格（通常是为了可读性）。
  // 如果空格更多，则统一变成下划线（通常是为了作为 Tag 使用）。
  const targetIsUnderscore = spaceCount > underscoreCount;

  const newTokens = parsedList.map(({ core, weight, wrappers }) => {
    let newCore = core;

    if (targetIsUnderscore) {
      newCore = newCore.replace(/ /g, '_');
    } else {
      newCore = newCore.replace(/_/g, ' ');
    }

    // 重构 Token (保持权重和包裹层)
    let result = newCore;
    let currentWrappers = [...wrappers];

    if (weight !== undefined && weight !== 1) {
      const lastWrapper = currentWrappers[currentWrappers.length - 1];
      if (lastWrapper === '()') {
        currentWrappers.pop();
      }
      const wStr = Number.isInteger(weight) ? weight.toString() : weight.toFixed(2).replace(/\.?0+$/, '');
      result = `(${result}:${wStr})`;
    }

    return store.wrapToken(result, currentWrappers);
  });

  applyFullPrompt(newTokens.join(', '));
  showNotification(targetIsUnderscore ? '已统一为下划线格式' : '已统一为空格格式', 'success');
}

function addWrapperToToken(index: number) {
  const tokens = splitTokensLocal(text.value);
  if (index < 0 || index >= tokens.length) return;
  const token = tokens[index]!;
  const parsed = store.parseTokenWrappers(token);
  const core = parsed?.core ?? token;
  const wrappers = parsed?.wrappers ?? [];
  if (priorityStyle.value === 'suffix') {
    const newCore = adjustWeight(core, +priorityStep.value);
    tokens[index] = store.wrapToken(newCore, wrappers);
  } else {
    const newWrappers = [...wrappers, priorityStyle.value];
    tokens[index] = store.wrapToken(core, newWrappers);
  }
  applyFullPrompt(tokens.join(', '));
  showNotification('已添加优先级', 'success');
}

function removeWrapperFromToken(index: number) {
  const tokens = splitTokensLocal(text.value);
  if (index < 0 || index >= tokens.length) return;
  const token = tokens[index]!;
  const { core, wrappers } = store.parseTokenWrappers(token);
  if (priorityStyle.value === 'suffix') {
    const newCore = adjustWeight(core, -priorityStep.value);
    tokens[index] = store.wrapToken(newCore, wrappers);
  } else if (wrappers.length > 0) {
    const newWrappers = wrappers.slice(0, -1);
    tokens[index] = store.wrapToken(core, newWrappers);
  }
  applyFullPrompt(tokens.join(', '));
  showNotification('已调整优先级', 'success');
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

  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  dragOffsetX.value = e.clientX - rect.left;
  dragOffsetY.value = e.clientY - rect.top;

  dragStarted.value = false;
  isDragging.value = false;
  insertSide.value = null;

  // 缓存所有 Token 的位置信息 (相对于 dragContainer)
  const dragContainer = tokenMappingRef.value?.dragContainer;
  if (dragContainer) {
    const selector = viewMode.value === 'compact' ? '.pe-token-compact' : '.pe-token-detail';
    const elements = dragContainer.querySelectorAll(selector);
    cachedTokenRects.value = Array.from(elements).map(el => {
      const htmlEl = el as HTMLElement;
      const idx = parseInt(htmlEl.getAttribute('data-index') || '-1', 10);
      return {
        index: idx,
        left: htmlEl.offsetLeft,
        top: htmlEl.offsetTop,
        width: htmlEl.offsetWidth,
        height: htmlEl.offsetHeight,
        midX: htmlEl.offsetLeft + htmlEl.offsetWidth / 2
      };
    }).filter(item => item.index !== -1);
  }

  // 监听全局移动与抬起
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp, { once: true });
}

function handlePointerMove(e: PointerEvent) {
  lastX.value = e.clientX;
  lastY.value = e.clientY;
  const dx = e.clientX - startX.value;
  const dy = e.clientY - startY.value;

  if (!dragStarted.value) {
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      dragStarted.value = true;
      isDragging.value = true;
      if (draggingIndex.value != null) createPointerPreview(draggingIndex.value);
    }
    return;
  }

  if (!isDragging.value) return;

  // 使用 requestAnimationFrame 节流渲染
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    positionPreview(lastX.value, lastY.value);
    updateOverIndexAndSideFast(lastX.value, lastY.value);
    rafId = null;
  });
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
    const list = splitTokensLocal(text.value);
    if (to < 0) to = 0;
    if (to >= list.length) to = list.length - 1;
    const [item] = list.splice(from, 1);
    if (item != null) list.splice(to, 0, item);
    applyFullPrompt(list.join(', '));
    showNotification('已重新排序', 'success');
  }
  cleanupDrag();
}

function cleanupDrag() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  cachedTokenRects.value = [];
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
  ; (preview.style as any).contain = 'layout style paint';
  preview.style.willChange = 'transform, opacity';
  document.body.appendChild(preview);
  dragPreview.value = preview;
}

function positionPreview(x: number, y: number) {
  if (!dragPreview.value) return;
  dragPreview.value.style.transform = `translate(${x - dragOffsetX.value}px, ${y - dragOffsetY.value}px)`;
}

function updateOverIndexAndSideFast(clientX: number, clientY: number) {
  const dragContainer = tokenMappingRef.value?.dragContainer;
  if (!dragContainer) return;

  // 计算鼠标在容器内的相对坐标
  const containerRect = dragContainer.getBoundingClientRect();
  const relX = clientX - containerRect.left;
  const relY = clientY - containerRect.top;

  // 在缓存中查找命中的 Token
  // 简单碰撞检测
  const target = cachedTokenRects.value.find(item =>
    relX >= item.left && relX <= item.left + item.width &&
    relY >= item.top && relY <= item.top + item.height
  );

  if (!target || target.index === draggingIndex.value) {
    overIndex.value = null;
    insertSide.value = null;
    return;
  }

  overIndex.value = target.index;
  insertSide.value = relX < target.midX ? 'before' : 'after';
}

function commitEdit(value: string) {
  const i = tokenMappingRef.value?.editingIndex;
  if (i == null) return;
  const tokens = splitTokensLocal(text.value);
  if (i >= 0 && i < tokens.length) {
    tokens[i] = normalizeToken(value);
    applyFullPrompt(tokens.join(', '));
  }
}

function showAddMap(i: number) {
  const token = tokens.value[i];
  if (!token) return;
  translationTargetToken.value = token;
  showTranslationPopup.value = true;
}

function removeToken(i: number) {
  const tokens = splitTokensLocal(text.value);
  if (i < 0 || i >= tokens.length) return;
  tokens.splice(i, 1);
  applyFullPrompt(tokens.join(', '));
}
function addTokenAfter(i: number) {
  const tokens = splitTokensLocal(text.value);
  tokens.splice(i + 1, 0, normalizeToken('new_token'));
  applyFullPrompt(tokens.join(', '));
}

function savePreset() {
  if (!presetName.value.trim()) {
    showNotification('请输入预设名称', 'error');
    return;
  }

  const name = presetName.value.trim();

  // 只保存到新的扩展预设系统
  const folderId = selectedFolderId.value || store.presetManagement?.settings?.defaultFolder;
  store.createExtendedPreset({
    name: name,
    type: 'positive',
    content: store.promptText,
    description: '从编辑器快速保存',
    folderId: folderId
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


const unmappedTokens = computed(() => {
  return tokens.value.filter(k => isUnmapped(k));
});

function isUnmapped(key: string): boolean {
  const { core } = parseDetailedToken(key);
  const tag = store.getTagByKey(core);
  return !tag || !tag.translation?.[selectedLang.value];
}

function handleApplyTranslation(results: { key: string; trans: string }[]) {
  results.forEach(({ key, trans }) => {
    store.addMapping(key, selectedLang.value, trans);
  });
  showNotification(`已添加 ${results.length} 条映射`, 'success');
}

function displayTrans(key: string): string {
  const { core, weight, wrappers, prefix, suffix } = parseDetailedToken(key);
  const tag = store.getTagByKey(core);
  const translatedCore = tag?.translation?.[selectedLang.value] ?? tag?.key ?? core;

  return constructToken(translatedCore, weight, wrappers, prefix, suffix);
}

function isRemoveDisabled(token: string): boolean {
  const info = getTokenWrapperInfo(token);
  return info.wrapperCount === 0 && !hasWeightSuffix(token);
}
</script>

<template>
  <div class="pe-root">
    <EditorToolbar :languages="store.languages as LangCode[]" v-model:selected-lang="selectedLang"
      v-model:preset-name="presetName" v-model:selected-folder-id="selectedFolderId"
      v-model:show-preset-dropdown="showPresetDropdown" :folder-tree="folderTree" :flattened-folders="flattenedFolders"
      @copy="copyLeft" @save-preset="savePreset" @preset-load="handlePresetLoad" @preset-save="handlePresetSave"
      @preset-delete="handlePresetDelete" @preset-rename="handlePresetRename" />

    <div class="pe-main">
      <EditorInput ref="editorInputRef" v-model:text="text" v-model:priority-style="priorityStyle"
        v-model:priority-step="priorityStep" :suggestions="suggestions"
        :get-suggestions="(prefix, limit) => store.getSuggestions(prefix, limit)"
        @update-suggestions="updateSuggestionsFromText" @copy="copyLeft" @replace-cn-comma="replaceCnComma"
        @format-prompt="formatPrompt" @unify-priority="unifyPriorityStyle" @toggle-underscore="toggleUnderscoreSpace"
        @add-tag="handleAddTag" />

      <TokenMappingPanel ref="tokenMappingRef" :tokens="tokens" :selected-lang="selectedLang"
        v-model:view-mode="viewMode" :dragging-index="draggingIndex" :over-index="overIndex" :insert-side="insertSide"
        :is-dragging="isDragging" :edit-suggestions="editSuggestions" :priority-style="priorityStyle"
        :display-trans="displayTrans" :is-unmapped="isUnmapped" :get-token-wrapper-info="getTokenWrapperInfo"
        :has-weight-suffix="hasWeightSuffix" :get-suggestions="(prefix, limit) => store.getSuggestions(prefix, limit)"
        @pointer-down="onPointerDown" @begin-edit="(i) => editingIndex = i" @commit-edit="commitEdit"
        @cancel-edit="() => editingIndex = null" @show-add-map="showAddMap" @add-wrapper="addWrapperToToken"
        @remove-wrapper="removeWrapperFromToken" @remove-token="removeToken" @add-token-after="addTokenAfter"
        @show-translation-popup="() => { translationTargetToken = null; showTranslationPopup = true; }"
        @update-edit-value="updateEditSuggestionsFromValue" />
    </div>

    <!-- 翻译弹窗 -->
    <TranslationPopup :visible="showTranslationPopup" :tokens="translationTokens" :target-lang="selectedLang"
      @close="() => { showTranslationPopup = false; translationTargetToken = null; }" @apply="handleApplyTranslation" />

    <!-- 通知组件 -->
    <NotificationToast :message="notification.message" :type="notification.type" :show="notification.show" />
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

.pe-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 1;
  min-height: 0;
  gap: 1px;
  background-color: var(--color-border);
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
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
</style>