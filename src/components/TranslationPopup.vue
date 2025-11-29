<template>
  <div v-if="visible" class="tp-overlay" @click.self="close">
    <div class="tp-modal">
      <div class="tp-header">
        <h3>自动翻译</h3>
        <button class="tp-close-btn" @click="close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
      
      <div class="tp-body">
        <div class="tp-controls">
          <div class="tp-info">
            共 {{ tokens.length }} 个未映射词条
          </div>
          <div class="tp-actions">
            <button @click="startTranslation" :disabled="loading" class="tp-btn primary">
              {{ loading ? '翻译中...' : '开始翻译' }}
            </button>
          </div>
        </div>

        <div class="tp-list">
          <div class="tp-list-header">
            <label class="tp-checkbox-wrapper">
              <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              <span>全选</span>
            </label>
            <span>原词</span>
            <span>翻译结果</span>
          </div>
          
          <div v-for="token in tokens" :key="token" class="tp-item" :class="{ selected: selected.has(token) }">
            <label class="tp-checkbox-wrapper">
              <input 
                type="checkbox" 
                :checked="selected.has(token)" 
                @change="toggleSelect(token)"
              />
            </label>
            <div class="tp-item-key" :title="token">{{ token }}</div>
            <div class="tp-item-trans">
              <div v-if="results[token]" class="tp-trans-result">
                <input 
                  v-model="results[token]" 
                  class="tp-trans-input" 
                  placeholder="翻译结果"
                />
              </div>
              <div v-else-if="translating.has(token)" class="tp-status loading">
                <span class="spinner"></span>
              </div>
              <div v-else class="tp-status pending">待翻译</div>
            </div>
          </div>
        </div>
      </div>

      <div class="tp-footer">
        <button @click="close" class="tp-btn">取消</button>
        <button @click="apply" class="tp-btn primary" :disabled="selected.size === 0">
          应用选中 ({{ selected.size }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';

const props = defineProps<{
  visible: boolean;
  tokens: string[];
  targetLang: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', results: { key: string; trans: string }[]): void;
}>();

const results = reactive<Record<string, string>>({});
const translating = reactive(new Set<string>());
const selected = reactive(new Set<string>());
const loading = ref(false);

// 临时缓存，防止重复翻译
const cache = reactive<Record<string, string>>({});

watch(() => props.visible, (val) => {
  if (val) {
    // 初始化选中状态
    selected.clear();
    props.tokens.forEach(t => selected.add(t));
    // 检查缓存
    props.tokens.forEach(t => {
      if (cache[t]) {
        results[t] = cache[t];
      }
    });
  }
});

const isAllSelected = computed(() => {
  return props.tokens.length > 0 && props.tokens.every(t => selected.has(t));
});

function toggleSelectAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  if (checked) {
    props.tokens.forEach(t => selected.add(t));
  } else {
    selected.clear();
  }
}

function toggleSelect(token: string) {
  if (selected.has(token)) {
    selected.delete(token);
  } else {
    selected.add(token);
  }
}

function close() {
  emit('close');
}

async function startTranslation() {
  if (loading.value) return;
  loading.value = true;
  
  const toTranslate = props.tokens.filter(t => !results[t]);
  
  // 使用换行符作为分隔符，大多数翻译 API 能正确处理多行文本
  const SEPARATOR = '\n';
  // 限制 URL 长度，批量处理
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    
    // 标记为正在翻译
    batch.forEach(t => translating.add(t));
    
    try {
      let target = props.targetLang;
      if (target === 'zh_CN') target = 'zh';
      
      // 预处理：移除下划线
      const cleanTokens = batch.map(t => t.replace(/_/g, ' '));
      const text = cleanTokens.join(SEPARATOR);
      
      const url = `https://sywb.top/api/translate2?text=${encodeURIComponent(text)}&sourceLang=auto&targetLang=${target}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success && data.translation) {
        const translations = data.translation.split(SEPARATOR);
        
        batch.forEach((token, idx) => {
          const trans = translations[idx] ? translations[idx].trim() : '';
          if (trans) {
            results[token] = trans;
            cache[token] = trans;
          }
        });
      }
    } catch (e) {
      console.error('Batch translation failed', e);
    } finally {
      batch.forEach(t => translating.delete(t));
    }
  }
  
  loading.value = false;
}

function apply() {
  const list: { key: string; trans: string }[] = [];
  for (const key of selected) {
    if (results[key]) {
      list.push({ key, trans: results[key] });
    }
  }
  emit('apply', list);
  close();
}
</script>

<style scoped>
.tp-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  transition: all 0.3s ease;
}

.tp-modal {
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 90%;
  max-width: 800px; /* Increased width */
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.tp-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.tp-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tp-close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tp-close-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-tertiary);
}

.tp-body {
  padding: 1.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 1;
}

.tp-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.tp-info {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  background-color: var(--color-bg-secondary);
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
}

.tp-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow-y: auto;
  flex: 1;
  background-color: var(--color-bg-primary);
  display: flex;
  flex-direction: column;
}

/* Scrollbar styling */
.tp-list::-webkit-scrollbar {
  width: 8px;
}
.tp-list::-webkit-scrollbar-track {
  background: transparent;
}
.tp-list::-webkit-scrollbar-thumb {
  background-color: var(--color-border-hover);
  border-radius: 4px;
  border: 2px solid var(--color-bg-primary);
}
.tp-list::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-text-tertiary);
}

.tp-list-header {
  display: grid;
  grid-template-columns: 80px 1fr 1.2fr; /* Wider layout */
  gap: 1rem;
  padding: 0.875rem 1rem;
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: sticky;
  top: 0;
  z-index: 10;
  align-items: center;
}

.tp-item {
  display: grid;
  grid-template-columns: 80px 1fr 1.2fr; /* Matching header */
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  align-items: center;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.tp-item:last-child {
  border-bottom: none;
}

.tp-item:hover {
  background-color: var(--color-bg-secondary);
}

.tp-item.selected {
  background-color: var(--color-bg-tertiary);
}

.tp-checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  cursor: pointer;
  height: 100%;
}

.tp-checkbox-wrapper input[type="checkbox"] {
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 4px;
  cursor: pointer;
  accent-color: var(--color-accent);
}

.tp-item-key {
  word-break: break-word;
  color: var(--color-text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  line-height: 1.4;
}

.tp-item-trans {
  display: flex;
  align-items: center;
}

.tp-trans-result {
  width: 100%;
}

.tp-trans-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  transition: all 0.2s;
}

.tp-trans-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.tp-status {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
}

.tp-status.loading {
  color: var(--color-accent);
  background-color: var(--color-accent-light);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tp-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background-color: var(--color-bg-secondary);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.tp-btn {
  padding: 0.5rem 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tp-btn:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
}

.tp-btn:active:not(:disabled) {
  transform: translateY(0);
}

.tp-btn.primary {
  background-color: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
}

.tp-btn.primary:hover:not(:disabled) {
  background-color: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
  box-shadow: var(--shadow-md);
}

.tp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
</style>
