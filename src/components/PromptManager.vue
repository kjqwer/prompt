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
        <select v-model="selectedLang" class="pm-select pm-lang">
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
          <button class="pm-btn-primary" @click="addTag">新增提示词</button>
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
            :class="{ hidden: t.hidden, 'pm-over': ti===overIndex }"
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
.pm-root { display: flex; flex-direction: column; height: 100vh; }
.pm-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--color-border); gap: 12px; background-color: var(--color-bg-primary); }
.pm-left { display: flex; align-items: center; gap: 8px; }
.pm-right { display: flex; align-items: center; gap: 8px; }
.pm-tip { font-size: 12px; color: var(--color-text-tertiary); }

/* 按钮与输入样式，与 PresetManager 保持一致 */
.pm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg-primary); cursor: pointer; line-height: 1; font-size: 14px; color: var(--color-text-primary); transition: all 0.2s ease; }
.pm-btn:hover { background-color: var(--color-bg-tertiary); border-color: var(--color-border-hover); }
.pm-btn-primary, .pm-btn-secondary { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; line-height: 1; }
.pm-btn-primary { background-color: var(--color-accent); color: var(--color-text-primary); border-color: var(--color-accent); }
.pm-btn-primary:hover { background-color: var(--color-accent-hover); }
.pm-btn-secondary { background-color: var(--color-bg-primary); color: var(--color-text-primary); }
.pm-btn-secondary:hover { background-color: var(--color-bg-tertiary); border-color: var(--color-border-hover); }

.pm-import { display: inline-flex; align-items: center; gap: 6px; }
.pm-import input { display: none; }
.pm-search { width: 240px; padding: 6px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background-color: var(--color-bg-secondary); color: var(--color-text-primary); }
.pm-search:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-light); }
.pm-select { appearance: none; -webkit-appearance: none; -moz-appearance: none; background-color: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 6px 10px; height: 32px; line-height: 20px; font-size: 14px; color: var(--color-text-primary); }
.pm-select:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-light); }

.pm-main { display: grid; grid-template-columns: 280px 1fr; height: calc(100vh - 50px); }
.pm-cats { border-right: 1px solid var(--color-border); overflow: auto; padding: 8px; background-color: var(--color-bg-primary); }
.pm-section-title { font-size: 12px; color: var(--color-text-tertiary); margin: 8px 0; }
.pm-cats ul { list-style: none; margin: 0; padding: 0; }
.pm-cats li { padding: 6px 8px; border-radius: var(--radius-md); cursor: pointer; }
.pm-cats li.active { background-color: var(--color-accent-light); }
.pm-color { display: inline-block; width: 12px; height: 12px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
.pm-list { padding: 8px; overflow: auto; }
.pm-list-toolbar { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-bottom: 8px; }
.pm-empty { color: var(--color-text-tertiary); padding: 20px; }
.pm-tags { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.pm-tags li { display: grid; grid-template-columns: 24px 1fr 1fr auto auto; align-items: center; gap: 6px; padding: 6px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background-color: var(--color-bg-primary); }
.pm-tags li { will-change: transform; }
.pm-tags li.hidden { opacity: 0.5; }
.pm-tags li.pm-over { border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-light); }
.pm-handle { cursor: grab; user-select: none; color: var(--color-text-tertiary); text-align: center; }
.pm-key, .pm-trans { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background-color: var(--color-bg-secondary); color: var(--color-text-primary); }
.pm-key:focus, .pm-trans:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-light); }
.pm-hide, .pm-del, .pm-list-toolbar button, .pm-right button { padding: 6px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg-primary); cursor: pointer; line-height: 1; }
.pm-hide:hover, .pm-del:hover, .pm-list-toolbar button:hover, .pm-right button:hover, .pm-btn:hover { background: var(--color-bg-tertiary); border-color: var(--color-border-hover); }

/* 手机端适配 */
@media (max-width: 768px) {
  .pm-toolbar { flex-direction: column; align-items: stretch; gap: 10px; }
  .pm-left, .pm-right { flex-wrap: wrap; width: 100%; }
  .pm-search { width: 100%; }
  .pm-tip { display: none; }
  .pm-main { grid-template-columns: 1fr; height: auto; }
  .pm-cats { border-right: 0; border-bottom: 1px solid var(--color-border); }
  .pm-tags li { grid-template-columns: 1fr; gap: 8px; }
  .pm-handle { text-align: left; }
  .pm-key, .pm-trans { width: 100%; }
}
</style>