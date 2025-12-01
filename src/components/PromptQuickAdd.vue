<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePromptStore } from '../stores/promptStore';
import type { PromptTag } from '../types';

const emit = defineEmits<{
  (e: 'add-tag', tag: string): void
}>();

const store = usePromptStore();
const categories = computed(() => store.categories);
const currentCategory = computed(() => store.currentCategory);
const currentGroup = computed(() => store.currentGroup);
const filteredTags = computed(() => store.filteredTags);
const selectedLang = computed(() => store.selectedLang);

function selectCategory(index: number) {
  store.selectCategory(index);
}

function selectGroup(index: number) {
  store.selectGroup(index);
}

function onTagClick(tag: PromptTag) {
  emit('add-tag', tag.key);
}

function displayTrans(tag: PromptTag) {
  return tag.translation?.[selectedLang.value] ?? tag.key;
}
</script>

<template>
  <div class="pqa-root">
    <!-- Categories -->
    <div class="pqa-categories">
      <button 
        v-for="(c, i) in categories" 
        :key="c.id"
        class="pqa-tab"
        :class="{ active: i === store.selectedCategoryIndex }"
        @click="selectCategory(i)"
      >
        {{ c.name }}
      </button>
    </div>

    <!-- Groups -->
    <div class="pqa-groups" v-if="currentCategory?.groups.length">
      <button 
        v-for="(g, i) in currentCategory.groups" 
        :key="g.id"
        class="pqa-group-tab"
        :class="{ active: i === store.selectedGroupIndex }"
        :style="{ '--group-color': g.color || 'var(--color-text-secondary)' }"
        @click="selectGroup(i)"
        @mousedown.prevent
      >
        <span class="pqa-dot"></span>
        {{ g.name }}
      </button>
    </div>

    <!-- Tags -->
    <div class="pqa-tags">
      <button 
        v-for="tag in filteredTags" 
        :key="tag.key"
        class="pqa-tag"
        @click="onTagClick(tag)"
        @mousedown.prevent
        :title="tag.key"
      >
        <span class="pqa-tag-text">{{ displayTrans(tag) }}</span>
        <span class="pqa-tag-sub" v-if="displayTrans(tag) !== tag.key">{{ tag.key }}</span>
      </button>
      <div v-if="filteredTags.length === 0" class="pqa-empty">
        无相关提示词
      </div>
    </div>
  </div>
</template>

<style scoped>
.pqa-root {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.pqa-categories {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  flex-shrink: 0;
}

.pqa-categories::-webkit-scrollbar {
  height: 8px;
}
.pqa-categories::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}
.pqa-categories::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

.pqa-tab {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.pqa-tab:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
}

.pqa-tab.active {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.pqa-groups {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  flex-shrink: 0;
}

.pqa-groups::-webkit-scrollbar {
  height: 8px;
}
.pqa-groups::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}
.pqa-groups::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

.pqa-group-tab {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  white-space: nowrap;
  cursor: pointer;
  border-radius: 4px;
}

.pqa-group-tab:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.pqa-group-tab.active {
  background: var(--color-bg-secondary);
  color: var(--group-color);
  font-weight: 500;
  border: 1px solid var(--group-color);
}

.pqa-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--group-color);
}

.pqa-tags {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 0.5rem;
  padding: 0.25rem;
}

.pqa-tag {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.1s;
  max-width: 100%;
}

.pqa-tag:hover {
  background: var(--color-bg-primary);
  border-color: var(--color-accent);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.pqa-tag:active {
  transform: translateY(0);
}

.pqa-tag-text {
  font-weight: 500;
  line-height: 1.2;
}

.pqa-tag-sub {
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
  margin-top: 0.1rem;
  line-height: 1;
}

.pqa-empty {
  width: 100%;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 0.8rem;
  padding: 2rem;
}
</style>
