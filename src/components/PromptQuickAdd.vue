<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { usePromptStore } from '../stores/promptStore';
import type { PromptTag } from '../types';

const emit = defineEmits<{
  (e: 'add-tag', tag: string): void
  (e: 'drag-tag-start', tag: string): void
  (e: 'drag-tag-end'): void
}>();

const store = usePromptStore();
const categories = computed(() => store.categories);
const currentCategory = computed(() => store.currentCategory);
const currentGroup = computed(() => store.currentGroup);
const selectedLang = computed(() => store.selectedLang);

const PAGE_SIZE = 50;
const QUICK_ADD_STATE_KEY = 'prompt-quick-add-view-state';
const QUICK_ADD_RECENT_KEY = 'prompt-quick-add-recent-tags';
const QUICK_ADD_FAVORITE_KEY = 'prompt-quick-add-favorite-tags';
const visibleCount = ref(PAGE_SIZE);
const tagsContainer = ref<HTMLElement | null>(null);
const draggedTagKey = ref<string | null>(null);
const isRestoringState = ref(false);
const localSearch = ref('');
const recentKeys = ref<string[]>([]);
const favoriteKeys = ref<string[]>([]);

type QuickAddItem = {
  key: string;
  translation: string;
  categoryName?: string;
  groupName?: string;
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase().replace(/_/g, ' ');
}

function matchesQuery(tag: PromptTag, query: string, queryNorm: string) {
  const translation = tag.translation?.[selectedLang.value] ?? tag.key;
  const keyLower = tag.key.toLowerCase();
  const keyNorm = keyLower.replace(/_/g, ' ');
  const transLower = translation.toLowerCase();
  const transNorm = transLower.replace(/_/g, ' ');
  return (
    keyLower.includes(query) ||
    keyNorm.includes(queryNorm) ||
    transLower.includes(query) ||
    transNorm.includes(queryNorm)
  );
}

const currentGroupItems = computed<QuickAddItem[]>(() => {
  const group = currentGroup.value;
  if (!group) return [];
  return group.tags.map(tag => ({
    key: tag.key,
    translation: tag.translation?.[selectedLang.value] ?? tag.key,
    categoryName: currentCategory.value?.name,
    groupName: group.name,
  }));
});

const searchResults = computed<QuickAddItem[]>(() => {
  const query = localSearch.value.trim().toLowerCase();
  const queryNorm = normalizeQuery(localSearch.value);
  if (!query) return [];
  const deduped = new Map<string, QuickAddItem>();
  for (const category of categories.value) {
    for (const group of category.groups) {
      for (const tag of group.tags) {
        if (!matchesQuery(tag, query, queryNorm)) continue;
        if (deduped.has(tag.key)) continue;
        deduped.set(tag.key, {
          key: tag.key,
          translation: tag.translation?.[selectedLang.value] ?? tag.key,
          categoryName: category.name,
          groupName: group.name,
        });
      }
    }
  }
  return Array.from(deduped.values()).sort((a, b) => {
    const af = favoriteKeys.value.includes(a.key) ? 0 : 1;
    const bf = favoriteKeys.value.includes(b.key) ? 0 : 1;
    if (af !== bf) return af - bf;
    return a.translation.localeCompare(b.translation, 'zh-CN');
  });
});

const allVisibleItems = computed<QuickAddItem[]>(() => {
  return localSearch.value.trim() ? searchResults.value : currentGroupItems.value;
});

const visibleItems = computed(() => {
  return allVisibleItems.value.slice(0, visibleCount.value);
});

const recentItems = computed<QuickAddItem[]>(() => {
  const tagMap = new Map<string, QuickAddItem>();
  for (const category of categories.value) {
    for (const group of category.groups) {
      for (const tag of group.tags) {
        if (!tagMap.has(tag.key)) {
          tagMap.set(tag.key, {
            key: tag.key,
            translation: tag.translation?.[selectedLang.value] ?? tag.key,
            categoryName: category.name,
            groupName: group.name,
          });
        }
      }
    }
  }
  return recentKeys.value
    .map(key => tagMap.get(key))
    .filter((item): item is QuickAddItem => !!item);
});

const favoriteItems = computed<QuickAddItem[]>(() => {
  const tagMap = new Map<string, QuickAddItem>();
  for (const category of categories.value) {
    for (const group of category.groups) {
      for (const tag of group.tags) {
        if (!tagMap.has(tag.key)) {
          tagMap.set(tag.key, {
            key: tag.key,
            translation: tag.translation?.[selectedLang.value] ?? tag.key,
            categoryName: category.name,
            groupName: group.name,
          });
        }
      }
    }
  }
  return favoriteKeys.value
    .map(key => tagMap.get(key))
    .filter((item): item is QuickAddItem => !!item);
});

const panelSummary = computed(() => {
  if (localSearch.value.trim()) {
    return `全局搜索结果 ${searchResults.value.length} 个`;
  }
  const category = currentCategory.value?.name ?? '未选择分类';
  const group = currentGroup.value?.name ?? '未选择分组';
  return `${category} / ${group} · ${currentGroupItems.value.length} 个`;
});

watch(() => [allVisibleItems.value.length, localSearch.value], () => {
  if (isRestoringState.value) return;
  visibleCount.value = PAGE_SIZE;
  if (tagsContainer.value) {
    tagsContainer.value.scrollTop = 0;
  }
  persistQuickAddState();
});

function onScroll() {
  const el = tagsContainer.value;
  if (!el) return;
  // Simple infinite scroll trigger
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
    if (visibleCount.value < allVisibleItems.value.length) {
      visibleCount.value += PAGE_SIZE;
    }
  }
  persistQuickAddState();
}

function selectCategory(index: number) {
  store.selectCategory(index);
  persistQuickAddState();
}

function selectGroup(index: number) {
  store.selectGroup(index);
  persistQuickAddState();
}

function onTagClick(tag: PromptTag) {
  if (draggedTagKey.value === tag.key) return;
  emit('add-tag', tag.key);
  rememberRecentTag(tag.key);
}

function onTagDragStart(tag: PromptTag, event: DragEvent) {
  if (!event.dataTransfer) return;
  draggedTagKey.value = tag.key;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', tag.key);
  event.dataTransfer.setData('application/x-prompt-tag', tag.key);
  emit('drag-tag-start', tag.key);
}

function onTagDragEnd() {
  emit('drag-tag-end');
  window.setTimeout(() => {
    draggedTagKey.value = null;
  }, 0);
}

function onQuickAddItemClick(item: QuickAddItem) {
  onTagClick({ key: item.key, translation: { [selectedLang.value]: item.translation } });
}

function onQuickAddItemDragStart(item: QuickAddItem, event: DragEvent) {
  onTagDragStart({ key: item.key, translation: { [selectedLang.value]: item.translation } }, event);
}

function rememberRecentTag(tagKey: string) {
  recentKeys.value = [tagKey, ...recentKeys.value.filter(key => key !== tagKey)].slice(0, 12);
  persistRecentTags();
}

function isFavorite(tagKey: string) {
  return favoriteKeys.value.includes(tagKey);
}

function toggleFavorite(tagKey: string) {
  if (isFavorite(tagKey)) {
    favoriteKeys.value = favoriteKeys.value.filter(key => key !== tagKey);
  } else {
    favoriteKeys.value = [tagKey, ...favoriteKeys.value].slice(0, 30);
  }
  persistFavoriteTags();
}

function clearSearch() {
  localSearch.value = '';
}

function persistRecentTags() {
  window.localStorage.setItem(QUICK_ADD_RECENT_KEY, JSON.stringify(recentKeys.value));
}

function persistFavoriteTags() {
  window.localStorage.setItem(QUICK_ADD_FAVORITE_KEY, JSON.stringify(favoriteKeys.value));
}

function restoreRecentTags() {
  const raw = window.localStorage.getItem(QUICK_ADD_RECENT_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      recentKeys.value = parsed.filter((value): value is string => typeof value === 'string').slice(0, 12);
    }
  } catch {
    recentKeys.value = [];
  }
}

function restoreFavoriteTags() {
  const raw = window.localStorage.getItem(QUICK_ADD_FAVORITE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      favoriteKeys.value = parsed.filter((value): value is string => typeof value === 'string').slice(0, 30);
    }
  } catch {
    favoriteKeys.value = [];
  }
}

function persistQuickAddState() {
  const payload = {
    categoryIndex: store.selectedCategoryIndex,
    groupIndex: store.selectedGroupIndex,
    visibleCount: visibleCount.value,
    scrollTop: tagsContainer.value?.scrollTop ?? 0,
    search: localSearch.value,
  };
  window.sessionStorage.setItem(QUICK_ADD_STATE_KEY, JSON.stringify(payload));
}

async function restoreQuickAddState() {
  const raw = window.sessionStorage.getItem(QUICK_ADD_STATE_KEY);
  if (!raw) return;
  try {
    const state = JSON.parse(raw) as {
      categoryIndex?: number;
      groupIndex?: number;
      visibleCount?: number;
      scrollTop?: number;
      search?: string;
    };
    isRestoringState.value = true;
    const categoryCount = categories.value.length;
    const nextCategoryIndex = Math.min(Math.max(state.categoryIndex ?? 0, 0), Math.max(categoryCount - 1, 0));
    store.selectCategory(nextCategoryIndex);
    const groupCount = currentCategory.value?.groups.length ?? 0;
    const nextGroupIndex = Math.min(Math.max(state.groupIndex ?? 0, 0), Math.max(groupCount - 1, 0));
    store.selectGroup(nextGroupIndex);
    localSearch.value = state.search ?? '';
    visibleCount.value = Math.max(PAGE_SIZE, state.visibleCount ?? PAGE_SIZE);
    await nextTick();
    if (tagsContainer.value) {
      tagsContainer.value.scrollTop = Math.max(0, state.scrollTop ?? 0);
    }
  } catch {
    // Ignore broken persisted state and continue with defaults.
  } finally {
    isRestoringState.value = false;
    persistQuickAddState();
  }
}

watch(
  () => [store.selectedCategoryIndex, store.selectedGroupIndex, visibleCount.value],
  () => {
    if (!isRestoringState.value) {
      persistQuickAddState();
    }
  }
);

onMounted(() => {
  restoreFavoriteTags();
  restoreRecentTags();
  restoreQuickAddState();
});

onUnmounted(() => {
  persistQuickAddState();
});
</script>

<template>
  <div class="pqa-root">
    <div class="pqa-toolbar">
      <div class="pqa-search-wrap">
        <input
          v-model="localSearch"
          class="pqa-search"
          type="search"
          placeholder="搜索提示词或翻译..."
        />
        <button v-if="localSearch" class="pqa-search-clear" @click="clearSearch" title="清空搜索">
          ×
        </button>
      </div>
      <div class="pqa-summary">{{ panelSummary }}</div>
    </div>

    <div v-if="favoriteItems.length" class="pqa-favorites">
      <div class="pqa-favorites-title">收藏词</div>
      <div class="pqa-chip-list">
        <div
          v-for="item in favoriteItems"
          :key="'favorite_' + item.key"
          class="pqa-chip-card"
        >
          <button
            class="pqa-chip pqa-chip-favorite"
            draggable="true"
            @click="onQuickAddItemClick(item)"
            @dragstart="onQuickAddItemDragStart(item, $event)"
            @dragend="onTagDragEnd"
            :title="item.key"
          >
            {{ item.translation }}
          </button>
          <button
            class="pqa-fav-btn active"
            type="button"
            title="取消收藏"
            @click.stop="toggleFavorite(item.key)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52 6.12 20.61l1.12-6.55L2.48 9.42l6.58-.96L12 2.5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Categories -->
    <div class="pqa-categories">
      <button v-for="(c, i) in categories" :key="c.id" class="pqa-tab"
        :class="{ active: i === store.selectedCategoryIndex }" @click="selectCategory(i)">
        {{ c.name }}
      </button>
    </div>

    <!-- Groups -->
    <div class="pqa-groups" v-if="currentCategory?.groups.length">
      <button v-for="(g, i) in currentCategory.groups" :key="g.id" class="pqa-group-tab"
        :class="{ active: i === store.selectedGroupIndex }" :style="{
          '--group-color':
            g.color && g.color !== 'rgba(0, 0, 0, .0)'
              ? g.color
              : 'var(--color-text-secondary)'
        }" @click="selectGroup(i)" @mousedown.prevent>
        <span class="pqa-dot"></span>
        {{ g.name }}
      </button>
    </div>

    <div v-if="recentItems.length" class="pqa-recent">
      <div class="pqa-recent-title">最近使用</div>
      <div class="pqa-chip-list">
        <div
          v-for="item in recentItems"
          :key="'recent_' + item.key"
          class="pqa-chip-card"
        >
          <button
            class="pqa-chip"
            draggable="true"
            @click="onQuickAddItemClick(item)"
            @dragstart="onQuickAddItemDragStart(item, $event)"
            @dragend="onTagDragEnd"
            :title="item.key"
          >
            {{ item.translation }}
          </button>
          <button
            class="pqa-fav-btn"
            :class="{ active: isFavorite(item.key) }"
            type="button"
            :title="isFavorite(item.key) ? '取消收藏' : '收藏词条'"
            @click.stop="toggleFavorite(item.key)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" :fill="isFavorite(item.key) ? 'currentColor' : 'none'" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52 6.12 20.61l1.12-6.55L2.48 9.42l6.58-.96L12 2.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Tags -->
    <div class="pqa-tags" ref="tagsContainer" @scroll="onScroll">
      <div v-for="item in visibleItems" :key="item.key" class="pqa-tag-card">
        <button class="pqa-tag" draggable="true" @click="onQuickAddItemClick(item)"
          @dragstart="onQuickAddItemDragStart(item, $event)" @dragend="onTagDragEnd"
          :title="item.key">
          <span class="pqa-tag-text">{{ item.translation }}</span>
          <span class="pqa-tag-sub" v-if="item.translation !== item.key">{{ item.key }}</span>
          <span class="pqa-tag-path" v-if="localSearch && item.categoryName && item.groupName">
            {{ item.categoryName }} / {{ item.groupName }}
          </span>
        </button>
        <button
          class="pqa-fav-btn"
          :class="{ active: isFavorite(item.key) }"
          type="button"
          :title="isFavorite(item.key) ? '取消收藏' : '收藏词条'"
          @click.stop="toggleFavorite(item.key)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" :fill="isFavorite(item.key) ? 'currentColor' : 'none'" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52 6.12 20.61l1.12-6.55L2.48 9.42l6.58-.96L12 2.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div v-if="allVisibleItems.length === 0" class="pqa-empty">
        无相关提示词
      </div>
      <div v-if="visibleCount < allVisibleItems.length" class="pqa-loading-more">
        ...
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

.pqa-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

.pqa-search-wrap {
  position: relative;
}

.pqa-search {
  width: 100%;
  padding: 0.6rem 2.25rem 0.6rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.8125rem;
  transition: all 0.2s ease;
}

.pqa-search:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.pqa-search-clear {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pqa-search-clear:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.pqa-summary {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.pqa-favorites,
.pqa-recent {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex-shrink: 0;
}

.pqa-favorites-title,
.pqa-recent-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
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

.pqa-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.pqa-chip-card {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 100%;
}

.pqa-chip {
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pqa-chip:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-bg-secondary);
}

.pqa-chip-favorite {
  border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
  background: color-mix(in srgb, var(--color-accent-light) 45%, var(--color-bg-primary));
  color: var(--color-accent);
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

.pqa-tag-card {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  max-width: 100%;
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
  text-align: left;
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

.pqa-tag-path {
  margin-top: 0.2rem;
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
  line-height: 1.2;
}

.pqa-fav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7rem;
  height: 1.7rem;
  margin-top: 0.1rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg-primary);
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.pqa-fav-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-bg-secondary);
}

.pqa-fav-btn.active {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
  background: color-mix(in srgb, var(--color-accent-light) 55%, var(--color-bg-primary));
  color: var(--color-accent);
}

.pqa-empty {
  width: 100%;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 0.8rem;
  padding: 2rem;
}

.pqa-loading-more {
  width: 100%;
  text-align: center;
  color: var(--color-text-tertiary);
  padding: 0.5rem;
  font-size: 0.8rem;
}
</style>
