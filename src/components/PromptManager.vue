<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePromptStore } from '../stores/promptStore';
import type { LangCode, PromptGroup, PromptTag } from '../types';

const store = usePromptStore();
const draggingIndex = ref<number | null>(null);
const overIndex = ref<number | null>(null);

const languages = computed(() => store.languages);
const selectedLang = computed({
  get: () => store.selectedLang,
  set: (v: LangCode) => store.setLanguage(v),
});
const categories = computed(() => store.categories);
const currentCategory = computed(() => store.currentCategory);
const currentGroup = computed(() => store.currentGroup);
const filteredTags = computed(() => store.filteredTags);

function onDragStart(index: number) {
  draggingIndex.value = index;
}
function onDragOver(index: number, e: DragEvent) {
  e.preventDefault();
  overIndex.value = index;
}
function onDrop(index: number) {
  if (draggingIndex.value == null) return;
  const from = draggingIndex.value;
  const to = index;
  const grpId = currentGroup.value?.id;
  if (!grpId) return;
  store.reorderTags(grpId, from, to);
  draggingIndex.value = null;
  overIndex.value = null;
}

function displayTranslation(tag: PromptTag): string {
  return tag.translation?.[selectedLang.value] ?? tag.key;
}

function updateKey(tag: PromptTag, val: string) {
  const gid = currentGroup.value?.id;
  if (!gid) return;
  store.updateTagKey(gid, tag.key, val);
}

function updateTrans(tag: PromptTag, val: string) {
  const gid = currentGroup.value?.id;
  if (!gid) return;
  store.setTranslation(gid, tag.key, selectedLang.value, val);
}

function addTag() {
  const gid = currentGroup.value?.id;
  if (!gid) return;
  store.addTag(gid);
}

function removeTag(tag: PromptTag) {
  const gid = currentGroup.value?.id;
  if (!gid) return;
  store.removeTag(gid, tag.key);
}

function toggleHidden(tag: PromptTag) {
  const gid = currentGroup.value?.id;
  if (!gid) return;
  store.toggleHidden(gid, tag.key);
}

function exportAll() {
  const json = store.exportToJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt_dataset_${new Date().toISOString().slice(0,19)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importAll(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result);
      const bundle = JSON.parse(text);
      store.importFromBundle(bundle);
    } catch (e) {
      alert('导入失败：JSON 格式不正确');
    } finally {
      input.value = '';
    }
  };
  reader.readAsText(file);
}

function resetDefault() {
  store.resetToDefault();
}
</script>

<template>
  <div class="pm-root">
    <header class="pm-toolbar">
      <div class="pm-left">
        <label>语言</label>
        <select v-model="selectedLang">
          <option v-for="l in languages" :key="l" :value="l">{{ l }}</option>
        </select>
        <input
          class="pm-search"
          type="search"
          placeholder="搜索关键字/翻译"
          :value="store.searchQuery"
          @input="store.setSearch(($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="pm-right">
        <button class="pm-btn" @click="exportAll">导出 JSON</button>
        <span class="pm-tip">导出 JSON 仅包含词库（不包含预设）</span>
        <label class="pm-import pm-btn">导入 JSON
          <input type="file" accept="application/json" @change="importAll" />
        </label>
        <button class="pm-btn" @click="resetDefault">重置为内置词库</button>
      </div>
    </header>

    <main class="pm-main">
      <aside class="pm-cats">
        <div class="pm-section-title">分类</div>
        <ul>
          <li v-for="(c,ci) in categories" :key="c.id" :class="{ active: ci===store.selectedCategoryIndex }" @click="store.selectCategory(ci)">
            {{ c.name }}
          </li>
        </ul>
        <div class="pm-section-title">分组</div>
        <ul>
          <li v-for="(g,gi) in currentCategory?.groups" :key="g.id" :class="{ active: gi===store.selectedGroupIndex }" @click="store.selectGroup(gi)">
            <span class="pm-color" :style="{ background: g.color || 'transparent' }"></span>
            {{ g.name }}
          </li>
        </ul>
      </aside>

      <section class="pm-list">
        <div class="pm-list-toolbar">
          <button @click="addTag">新增提示词</button>
        </div>
        <div v-if="!currentGroup" class="pm-empty">请选择一个分组</div>
        <ul v-else class="pm-tags">
          <li
            v-for="(t,ti) in filteredTags"
            :key="t.key + '_' + ti"
            :draggable="true"
            @dragstart="onDragStart(ti)"
            @dragover="onDragOver(ti, $event)"
            @drop="onDrop(ti)"
            :class="{ hidden: t.hidden }"
          >
            <span class="pm-handle">⋮⋮</span>
            <input class="pm-key" :value="t.key" @input="updateKey(t, ($event.target as HTMLInputElement).value)" />
            <input class="pm-trans" :value="displayTranslation(t)" @input="updateTrans(t, ($event.target as HTMLInputElement).value)" />
            <button class="pm-hide" @click="toggleHidden(t)">{{ t.hidden ? '显示' : '隐藏' }}</button>
            <button class="pm-del" @click="removeTag(t)">删除</button>
          </li>
        </ul>
      </section>
    </main>
  </div>
  
</template>

<style scoped>
.pm-root { display: flex; flex-direction: column; height: 100vh; font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Noto Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif; }
.pm-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; gap: 12px; }
.pm-left { display: flex; align-items: center; gap: 8px; }
.pm-right { display: flex; align-items: center; gap: 8px; }
.pm-tip { font-size: 12px; color: #6b7280; }
.pm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; line-height: 1; font-size: 14px; }
.pm-import { display: inline-flex; align-items: center; gap: 6px; }
.pm-import input { display: none; }
.pm-search { width: 240px; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.pm-main { display: grid; grid-template-columns: 280px 1fr; height: calc(100vh - 50px); }
.pm-cats { border-right: 1px solid #e5e7eb; overflow: auto; padding: 8px; }
.pm-section-title { font-size: 12px; color: #6b7280; margin: 8px 0; }
.pm-cats ul { list-style: none; margin: 0; padding: 0; }
.pm-cats li { padding: 6px 8px; border-radius: 6px; cursor: pointer; }
.pm-cats li.active { background: #eef2ff; }
.pm-color { display: inline-block; width: 12px; height: 12px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
.pm-list { padding: 8px; overflow: auto; }
.pm-list-toolbar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
.pm-empty { color: #6b7280; padding: 20px; }
.pm-tags { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.pm-tags li { display: grid; grid-template-columns: 24px 1fr 1fr auto auto; align-items: center; gap: 6px; padding: 6px; border: 1px solid #e5e7eb; border-radius: 6px; }
.pm-tags li { will-change: transform; }
.pm-tags li.hidden { opacity: 0.5; }
.pm-handle { cursor: grab; user-select: none; color: #6b7280; text-align: center; }
.pm-key, .pm-trans { padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.pm-hide, .pm-del, .pm-list-toolbar button, .pm-right button { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; line-height: 1; }
.pm-hide:hover, .pm-del:hover, .pm-list-toolbar button:hover, .pm-right button:hover, .pm-btn:hover { background: #f3f4f6; }
</style>