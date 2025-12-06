<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { splitTokens, parseDetailedToken, constructToken } from '../../stores/promptStore';
import PromptQuickAdd from '../PromptQuickAdd.vue';

const props = defineProps<{
  text: string;
  suggestions: string[];
  priorityStyle: '{}' | '()' | '[]' | '<>' | 'suffix';
  priorityStep: number;
  getSuggestions: (prefix: string, limit: number) => string[];
}>();

const emit = defineEmits<{
  'update:text': [value: string];
  'update:priorityStyle': [value: '{}' | '()' | '[]' | '<>' | 'suffix'];
  'update:priorityStep': [value: number];
  'update-suggestions': [];
  'copy': [];
  'replace-cn-comma': [];
  'format-prompt': [];
  'unify-priority': [];
  'toggle-underscore': [];
  'add-tag': [tag: string];
}>();

const inputEl = ref<HTMLTextAreaElement | null>(null);

const localText = computed({
  get: () => props.text,
  set: (v: string) => emit('update:text', v),
});

const localPriorityStyle = computed({
  get: () => props.priorityStyle,
  set: (v: '{}' | '()' | '[]' | '<>' | 'suffix') => emit('update:priorityStyle', v),
});

const localPriorityStep = computed({
  get: () => props.priorityStep,
  set: (v: number) => emit('update:priorityStep', v),
});

// 计算左侧输入（textarea）基于光标位置的片段替换范围（修剪前后空格）
function getTextSegmentBounds(txt: string, pos: number) {
  const leftCommaEn = txt.lastIndexOf(',', pos - 1);
  const leftCommaCn = txt.lastIndexOf('，', pos - 1);
  const left = Math.max(leftCommaEn, leftCommaCn);
  const rightCommaEn = txt.indexOf(',', pos);
  const rightCommaCn = txt.indexOf('，', pos);
  const rightCandidates = [rightCommaEn, rightCommaCn].filter(i => i !== -1);
  const right = rightCandidates.length ? Math.min(...rightCandidates) : txt.length;
  let start = left < 0 ? 0 : left + 1;
  let end = right;
  while (start < end && txt[start] && /\s/.test(txt[start]!)) start++;
  while (end > start && txt[end - 1] && /\s/.test(txt[end - 1]!)) end--;
  return { start, end };
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

async function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    // 在光标位置进行补全，不影响撤回
    const el = inputEl.value;
    if (!el) return;
    const pos = el.selectionStart ?? props.text.length;
    const { start, end } = getTextSegmentBounds(props.text, pos);
    const segment = props.text.slice(start, end);
    const { core } = parseDetailedToken(segment);
    const cleanCore = core.replace(/^[\(\[\{<]+/, '').replace(/[\)\]\}>]+$/, '');
    
    const list = props.getSuggestions(cleanCore, 8);
    if (list.length > 0) {
      e.preventDefault();
      const s = list[0];
      if (!s) return;
      
      // 智能替换：保留包裹层和权重
      const { weight, wrappers } = parseDetailedToken(segment);
      let newToken = '';
      if (wrappers.length === 0 && weight === undefined && segment !== cleanCore) {
         newToken = segment.replace(cleanCore, s);
      } else {
         newToken = constructToken(s, weight, wrappers);
      }

      applyTextReplacement(el, start, end, newToken);
      await nextTick();
      emit('update:text', el.value);
      emit('update-suggestions');
    }
  }
}

async function applySuggestion(s: string) {
  const el = inputEl.value;
  if (!el) return;
  el.focus();
  const pos = el.selectionStart ?? props.text.length;
  const { start, end } = getTextSegmentBounds(props.text, pos);
  
  // 智能替换逻辑
  const segment = props.text.slice(start, end);
  const { core, weight, wrappers } = parseDetailedToken(segment);
  const cleanCore = core.replace(/^[\(\[\{<]+/, '').replace(/[\)\]\}>]+$/, '');
  
  let newToken = '';
  if (wrappers.length === 0 && weight === undefined && segment !== cleanCore) {
     newToken = segment.replace(cleanCore, s);
  } else {
     newToken = constructToken(s, weight, wrappers);
  }

  applyTextReplacement(el, start, end, newToken);
  await nextTick();
  emit('update:text', el.value);
  emit('update-suggestions');
}

function updateSuggestions() {
  // 通知父组件更新建议
  emit('update-suggestions');
}

defineExpose({
  inputEl,
});
</script>

<template>
  <section class="pe-left-pane">
    <div class="pe-section-title">提示词输入（逗号分隔）</div>
    <textarea 
      ref="inputEl" 
      class="pe-input" 
      v-model="localText" 
      @keydown="onKeyDown" 
      @click="updateSuggestions" 
      @keyup="updateSuggestions" 
      placeholder="例如：1girl, aaa, bbb, ccc"
    ></textarea>
    <div class="pe-input-actions">
      <button @click="emit('replace-cn-comma')" title="将中文逗号、括号等替换为英文符号">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
          <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
          <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
          <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
        </svg>
        归一化符号
      </button>
      <button @click="emit('format-prompt')" title="格式化提示词为标准格式">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polyline points="4 7 4 4 20 4 20 7" stroke="currentColor" stroke-width="2"/>
          <line x1="9" y1="20" x2="15" y2="20" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="2"/>
        </svg>
        格式化
      </button>
      <button @click="emit('unify-priority')" title="统一优先级样式 (core:weight)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
           <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
           <path d="M8 12h8" stroke="currentColor" stroke-width="2"/>
           <path d="M12 8v8" stroke="currentColor" stroke-width="2"/>
        </svg>
        统一优先级
      </button>
      <button @click="emit('toggle-underscore')" title="切换下划线和空格格式">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12h18" stroke="currentColor" stroke-width="2"/>
          <path d="M8 8l4-4 4 4" stroke="currentColor" stroke-width="2"/>
          <path d="M8 16l4 4 4-4" stroke="currentColor" stroke-width="2"/>
        </svg>
        切换 _/空格
      </button>
      <div class="pe-priority-group">
        <label class="pe-priority-label">优先级样式</label>
        <select class="pe-priority-select" v-model="localPriorityStyle" title="选择新增优先级的样式">
          <option value="{}">{}</option>
          <option value="()">()</option>
          <option value="[]">[]</option>
          <option value="<>">&lt;&gt;</option>
          <option value="suffix">后缀数字</option>
        </select>
        <label class="pe-priority-label">后缀数字间隔</label>
        <input 
          type="number" 
          class="pe-priority-step" 
          v-model.number="localPriorityStep" 
          title="设置增减间隔" 
          min="0.01" 
          step="0.01" 
          placeholder="1" 
        />
      </div>
    </div>
    <ul class="pe-suggest" v-if="suggestions.length">
      <li 
        v-for="s in suggestions" 
        :key="s" 
        @mousedown.prevent 
        @click="applySuggestion(s)"
      >{{ s }}</li>
    </ul>
    <PromptQuickAdd @add-tag="(tag) => emit('add-tag', tag)" />
  </section>
</template>

<style scoped>
.pe-left-pane {
  padding: 1.5rem;
  background-color: var(--color-bg-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.pe-input-actions button svg {
  flex-shrink: 0;
}

.pe-priority-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pe-priority-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.pe-priority-select, .pe-priority-step {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pe-priority-select:hover, .pe-priority-step:hover {
  border-color: var(--color-border-hover);
}

.pe-priority-select:focus, .pe-priority-step:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
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

@media (max-width: 768px) {
  .pe-left-pane {
    padding: 1rem;
  }
  
  .pe-input {
    height: 150px;
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
}
</style>

