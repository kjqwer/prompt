<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { parseDetailedToken, constructToken } from '../../stores/promptStore';
import type { LangCode } from '../../types';

const props = defineProps<{
  tokens: string[];
  selectedLang: LangCode;
  viewMode: 'compact' | 'detail';
  draggingIndex: number | null;
  overIndex: number | null;
  insertSide: 'before' | 'after' | null;
  isDragging: boolean;
  editSuggestions: string[];
  priorityStyle: '{}' | '()' | '[]' | '<>' | 'suffix';
  displayTrans: (key: string) => string;
  isUnmapped: (key: string) => boolean;
  getTokenWrapperInfo: (token: string) => { wrapperCount: number };
  hasWeightSuffix: (token: string) => boolean;
  getSuggestions: (prefix: string, limit: number) => string[];
}>();

const emit = defineEmits<{
  'update:viewMode': [value: 'compact' | 'detail'];
  'pointer-down': [index: number, event: PointerEvent];
  'begin-edit': [index: number];
  'commit-edit': [value: string];
  'cancel-edit': [];
  'show-add-map': [index: number];
  'add-wrapper': [index: number];
  'remove-wrapper': [index: number];
  'remove-token': [index: number];
  'add-token-after': [index: number];
  'show-translation-popup': [];
  'update-edit-value': [value: string];
}>();

const dragContainer = ref<HTMLElement | null>(null);
const editingIndex = ref<number | null>(null);
const editingValue = ref('');
const editEl = ref<HTMLInputElement | HTMLInputElement[] | null>(null);

function currentEditEl(): HTMLInputElement | null {
  const raw = editEl.value as any;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

const localViewMode = computed({
  get: () => props.viewMode,
  set: (v: 'compact' | 'detail') => emit('update:viewMode', v),
});

function beginEdit(i: number) {
  editingIndex.value = i;
  editingValue.value = props.tokens[i] ?? '';
  emit('begin-edit', i);
  nextTick(() => {
    const el = currentEditEl();
    if (el) {
      el.focus();
      try { el.setSelectionRange(0, editingValue.value.length); } catch {}
    }
  });
}

function commitEdit() {
  if (editingIndex.value == null) return;
  emit('commit-edit', editingValue.value);
  editingIndex.value = null;
}

function cancelEdit() {
  editingIndex.value = null;
  emit('cancel-edit');
}

// 统一的文本替换方法
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
  } catch {}
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

function onEditKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const el = currentEditEl();
  if (!el) return;
  const val = editingValue.value || '';
  const pos = el.selectionStart ?? val.length;
  const before = val.slice(0, pos);
  const match = before.match(/[^，,]*$/);
  const prefix = (match ? match[0] : '').trim();
  const list = props.getSuggestions(prefix, 8);
  if (list.length > 0) {
    e.preventDefault();
    const s = list[0];
    if (s) applyTextReplacement(el, 0, val.length, s);
    updateEditSuggestions();
  }
}

function applyEditSuggestion(s: string) {
  const el = currentEditEl();
  if (!el) return;
  el.focus();
  const val = editingValue.value || '';
  
  // 智能替换逻辑
  const { core, weight, wrappers } = parseDetailedToken(val);
  const cleanCore = core.replace(/^[\(\[\{<]+/, '').replace(/[\)\]\}>]+$/, '');
  
  let newVal = '';
  if (wrappers.length === 0 && weight === undefined && val !== cleanCore) {
      newVal = val.replace(cleanCore, s);
  } else {
      newVal = constructToken(s, weight, wrappers);
  }

  editingValue.value = newVal;
  emit('update-edit-value', newVal);
  nextTick(() => {
    const newCoreIndex = newVal.indexOf(s);
    if (newCoreIndex !== -1) {
      el.setSelectionRange(newCoreIndex + s.length, newCoreIndex + s.length);
    } else {
      el.setSelectionRange(newVal.length, newVal.length);
    }
    updateEditSuggestions();
  });
}

function updateEditSuggestions() {
  emit('update-edit-value', editingValue.value);
}

function isRemoveDisabled(token: string): boolean {
  const info = props.getTokenWrapperInfo(token);
  return info.wrapperCount === 0 && !props.hasWeightSuffix(token);
}

defineExpose({
  dragContainer,
  editingIndex,
});
</script>

<template>
  <section class="pe-right-pane">
    <div class="pe-section-title mode">
      <div class="pe-title-group">
        <span>提示词映射（双击修改）</span>
        <button 
          class="pe-auto-trans-btn" 
          @click="emit('show-translation-popup')"
          title="自动翻译未映射词条"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 8l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 14l6-6 2-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 5h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7 2v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M22 22l-5-13-5 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14.2 18h5.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          自动翻译
        </button>
      </div>
      <div class="pe-mode-switch">
        <button :class="{ active: viewMode==='compact' }" @click="localViewMode='compact'">精简视图</button>
        <button :class="{ active: viewMode==='detail' }" @click="localViewMode='detail'">详细视图</button>
      </div>
    </div>
    
    <div class="pe-drag-container" ref="dragContainer" :class="{ 'is-dragging': isDragging }">
    <!-- 精简视图 -->
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
        @pointerdown="emit('pointer-down', i, $event)"
        @dblclick="beginEdit(i)"
        :title="`${k} → ${displayTrans(k)}`"
      >
        <span class="pe-handle-compact">⋮⋮</span>
        <div v-if="editingIndex === i" class="pe-edit-inline">
          <input
            ref="editEl"
            class="pe-edit-input"
            v-model="editingValue"
            @keydown="onEditKeyDown"
            @keydown.enter.stop.prevent="commitEdit"
            @keydown.esc.stop.prevent="cancelEdit"
            @click="updateEditSuggestions"
            @keyup="updateEditSuggestions"
            placeholder="编辑提示词"
          />
          <ul class="pe-edit-suggest" v-if="editSuggestions.length">
            <li 
              v-for="s in editSuggestions" 
              :key="'e_'+s" 
              @mousedown.prevent 
              @click="applyEditSuggestion(s)"
            >{{ s }}</li>
          </ul>
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
          <span class="pe-trans-compact" :class="{ unmapped: isUnmapped(k) }">
            {{ displayTrans(k) }}
          </span>
        </div>
        <div class="pe-token-controls-compact">
          <button @click="emit('add-wrapper', i)" class="pe-add-wrapper-btn" :title="`添加优先级（样式：${priorityStyle}）`">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 3h3v3M8 3H5v3m0 12v3h3m8 0h3v-3" stroke="currentColor" stroke-width="2" fill="none"/>
              <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2"/>
              <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button 
            @click="emit('remove-wrapper', i)" 
            class="pe-remove-wrapper-btn" 
            title="移除优先级"
            :disabled="isRemoveDisabled(k)"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 3h3v3M8 3H5v3m0 12v3h3m8 0h3v-3" stroke="currentColor" stroke-width="2" fill="none"/>
              <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button @click="emit('remove-token', i)" class="pe-remove-btn" title="删除此词">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
              <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 详细视图 -->
    <div class="pe-tokens-detail" v-else>
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
        class="pe-token-detail"
        @pointerdown="emit('pointer-down', i, $event)"
      >
        <div class="pe-token-header">
          <span class="pe-handle-detail">⋮⋮</span>
          <div class="pe-token-main" @dblclick="beginEdit(i)">
            <span class="pe-key-detail">{{ k }}</span>
            <span class="pe-arrow-detail">→</span>
            <span class="pe-trans-detail" :class="{ unmapped: isUnmapped(k) }">{{ displayTrans(k) }}</span>
          </div>
          <div class="pe-token-controls">
            <button v-if="isUnmapped(k)" class="pe-add-map-btn" @click="emit('show-add-map', i)" title="添加映射">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
                <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button @click="emit('add-wrapper', i)" class="pe-add-wrapper-detail-btn" :title="`添加优先级（样式：${priorityStyle}）`">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 3h3v3M8 3H5v3m0 12v3h3m8 0h3v-3" stroke="currentColor" stroke-width="2" fill="none"/>
                <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2"/>
                <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button 
              @click="emit('remove-wrapper', i)" 
              class="pe-remove-wrapper-detail-btn" 
              title="移除优先级"
              :disabled="isRemoveDisabled(k)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 3h3v3M8 3H5v3m0 12v3h3m8 0h3v-3" stroke="currentColor" stroke-width="2" fill="none"/>
                <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="pe-add-after-btn" @click="emit('add-token-after', i)" title="在后添加">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2"/>
                <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="pe-remove-detail-btn" @click="emit('remove-token', i)" title="删除">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
                <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div v-if="editingIndex === i" class="pe-edit-panel">
          <input 
            ref="editEl" 
            v-model="editingValue" 
            @keydown="onEditKeyDown" 
            @keyup.enter="commitEdit" 
            @click="updateEditSuggestions" 
            @keyup="updateEditSuggestions" 
            placeholder="编辑词条..." 
          />
          <ul class="pe-edit-suggest" v-if="editSuggestions.length">
            <li 
              v-for="s in editSuggestions" 
              :key="'p_'+s" 
              @mousedown.prevent 
              @click="applyEditSuggestion(s)"
            >{{ s }}</li>
          </ul>
          <div class="pe-edit-actions">
            <button @click="commitEdit" class="pe-confirm-btn">确定</button>
            <button @click="cancelEdit" class="pe-cancel-btn">取消</button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </section>
</template>

<style scoped>
.pe-right-pane {
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

.pe-title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
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

.pe-auto-trans-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pe-auto-trans-btn:hover {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}

/* ... 省略大部分样式，与原文件相同 ... */

/* 精简视图 */
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
  user-select: none;
  transition: all 0.2s ease;
  max-width: 100%;
}

.pe-token-compact:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-sm);
}

.pe-token-compact.editing {
  cursor: default;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
  background-color: var(--color-bg-primary);
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
  user-select: text;
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

.pe-token-controls-compact {
  display: flex;
  gap: 0.125rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.pe-token-compact:hover .pe-token-controls-compact {
  opacity: 1;
}

.pe-add-wrapper-btn, .pe-remove-wrapper-btn, .pe-remove-btn {
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

.pe-token-compact:hover .pe-remove-btn {
  opacity: 1;
}

.pe-remove-btn {
  opacity: 0.7;
}

.pe-remove-btn:hover {
  background-color: var(--color-error);
  color: white;
  border-color: var(--color-error);
  transform: scale(1.05);
}

/* 详细视图 */
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
  user-select: none;
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

.pe-edit-panel {
  padding: 0.75rem;
  background-color: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
}

.pe-edit-panel input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
  user-select: text;
}

.pe-edit-panel input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
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

/* 编辑建议列表 */
.pe-edit-suggest {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.pe-edit-suggest li {
  padding: 0.25rem 0.5rem;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pe-edit-suggest li:hover {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

/* 拖拽相关样式 */
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

.pe-token-compact,
.pe-token-detail {
  will-change: transform;
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

/* 响应式 */
@media (max-width: 640px) {
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
  
  .pe-token-controls-compact {
    opacity: 1;
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
  
  .pe-trans-compact, .pe-arrow-compact {
    font-size: 0.6875rem;
  }
}
</style>

