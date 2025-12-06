<script setup lang="ts">
import { computed } from 'vue';
import type { LangCode, PresetFolder } from '../../types';
import PresetDropdown from '../PresetDropdown.vue';
import FolderSelector from '../preset/FolderSelector.vue';

const props = defineProps<{
  languages: LangCode[];
  selectedLang: LangCode;
  presetName: string;
  selectedFolderId: string;
  folderTree: any[];
  flattenedFolders: any[];
  showPresetDropdown: boolean;
}>();

const emit = defineEmits<{
  'update:selectedLang': [value: LangCode];
  'update:presetName': [value: string];
  'update:selectedFolderId': [value: string];
  'update:showPresetDropdown': [value: boolean];
  'copy': [];
  'save-preset': [];
  'preset-load': [name: string];
  'preset-save': [name: string];
  'preset-delete': [name: string];
  'preset-rename': [oldName: string, newName: string];
}>();

const localSelectedLang = computed({
  get: () => props.selectedLang,
  set: (v: LangCode) => emit('update:selectedLang', v),
});

const localPresetName = computed({
  get: () => props.presetName,
  set: (v: string) => emit('update:presetName', v),
});

const localSelectedFolderId = computed({
  get: () => props.selectedFolderId,
  set: (v: string) => emit('update:selectedFolderId', v),
});

const localShowPresetDropdown = computed({
  get: () => props.showPresetDropdown,
  set: (v: boolean) => emit('update:showPresetDropdown', v),
});
</script>

<template>
  <header class="pe-toolbar">
    <div class="pe-toolbar-content">
      <div class="pe-left">
        <label>语言</label>
        <select v-model="localSelectedLang">
          <option v-for="l in languages" :key="l" :value="l">{{ l }}</option>
        </select>
        <button @click="emit('copy')" title="复制提示词到剪贴板">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
            <path d="m5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
          </svg>
          复制提示词
        </button>
      </div>
      <div class="pe-right">
        <div class="pe-folder-select-wrapper">
          <FolderSelector
            v-model="localSelectedFolderId"
            :tree="folderTree"
            :flattened="flattenedFolders"
            root-label="(默认)"
          />
        </div>
        <input class="pe-preset-name" placeholder="保存为预设名称" v-model="localPresetName" />
        <button @click="emit('save-preset')" title="保存当前提示词为预设">
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
            @click="localShowPresetDropdown = !localShowPresetDropdown"
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
            @close="localShowPresetDropdown = false"
            @load="(name) => emit('preset-load', name)"
            @save="(name) => emit('preset-save', name)"
            @delete="(name) => emit('preset-delete', name)"
            @rename="(oldName, newName) => emit('preset-rename', oldName, newName)"
          />
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.pe-toolbar {
  padding: 1rem 1.5rem;
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.pe-toolbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
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

.pe-folder-select-wrapper {
  width: 130px;
}

.pe-folder-select-wrapper :deep(.selector-trigger) {
  padding: 0.45rem 0.5rem;
  font-size: 0.85rem;
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

/* 保证按钮内图标不压缩文本 */
.pe-left button svg,
.pe-right button svg,
.pe-preset-toggle svg {
  flex-shrink: 0;
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
  
  .pe-preset-name {
    width: 100%;
  }
}
</style>
