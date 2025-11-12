import { defineStore } from 'pinia';
import { loadInitialDataset } from '../utils/yamlLoader';
import type { PromptDataset, PromptCategory, PromptGroup, PromptTag, LangCode, ExportBundle, CustomDiff, PromptPreset, ExtendedPreset, PresetFolder, PresetManagement, PresetType } from '../types';

const LS_KEY = 'ops.prompt.dataset.v1';
let saveTimer: number | null = null; // 非响应式计时器，避免递归更新
let baseline: PromptDataset | null = null; // 基线词库（从 public/sd 加载）

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const usePromptStore = defineStore('promptStore', {
  state: () => ({
    dataset: null as PromptDataset | null,
    selectedLang: 'zh_CN' as LangCode,
    selectedCategoryIndex: 0,
    selectedGroupIndex: 0,
    searchQuery: '',
    // 编辑器相关
    promptText: '',
    presets: [] as PromptPreset[],
    // 扩展预设管理
    extendedPresets: [] as ExtendedPreset[],
    presetFolders: [] as PresetFolder[],
    presetManagement: {
      folders: [],
      presets: [],
      settings: {
        autoBackup: true,
        maxPresets: 1000
      }
    } as PresetManagement,
  }),
  getters: {
    categories: (s) => s.dataset?.categories ?? [],
    currentCategory: (s) => s.dataset?.categories[s.selectedCategoryIndex] ?? null,
    currentGroup(): PromptGroup | null {
      return this.currentCategory?.groups[this.selectedGroupIndex] ?? null;
    },
    languages: (s) => s.dataset?.languages ?? ['en'],
    filteredTags(): PromptTag[] {
      const grp = this.currentGroup;
      if (!grp) return [] as PromptTag[];
      const q = this.searchQuery.trim().toLowerCase();
      const qNorm = q.replace(/_/g, ' ');
      if (!q) return grp.tags;
      return grp.tags.filter((t) => {
        const trans = t.translation?.[this.selectedLang] ?? '';
        const keyLower = t.key.toLowerCase();
        const keyNorm = keyLower.replace(/_/g, ' ');
        const transLower = trans.toLowerCase();
        const transNorm = transLower.replace(/_/g, ' ');
        return (
          keyLower.includes(q) ||
          keyNorm.includes(qNorm) ||
          transLower.includes(q) ||
          transNorm.includes(qNorm)
        );
      });
    },
    tokens(s): string[] {
      return splitTokens(s.promptText);
    },
  },
  actions: {
    async initialize() {
      // 先加载基线词库
      baseline = await loadInitialDataset();
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        try {
          const bundle = JSON.parse(raw) as ExportBundle;
          if (bundle.dataset) {
            this.dataset = bundle.dataset;
          } else if (bundle.customDiff) {
            this.dataset = this.applyDiff(deepClone(baseline!), bundle.customDiff);
          } else {
            this.dataset = deepClone(baseline!);
          }
          this.presets = bundle.presets || [];
          // 恢复扩展预设数据
          this.extendedPresets = bundle.extendedPresets || [];
          this.presetFolders = bundle.presetFolders || [];
          if (bundle.presetManagement) {
            this.presetManagement = bundle.presetManagement;
          }
          // 恢复编辑器内容与语言
          if (typeof bundle.promptText === 'string') {
            this.promptText = bundle.promptText;
          }
          if (bundle.selectedLang) {
            this.selectedLang = bundle.selectedLang as LangCode;
          }
        } catch {
          this.dataset = deepClone(baseline!);
        }
      } else {
        this.dataset = deepClone(baseline!);
      }
      // 若无恢复语言，则按数据集进行推断
      if (!this.selectedLang) {
        const guessLang: LangCode = (this.dataset.languages.includes('zh_CN') ? 'zh_CN' : 'en') as LangCode;
        this.selectedLang = guessLang;
      }
      // 初始化扩展预设管理
      this.initializeExtendedPresets();
      // 自动迁移旧预设到新系统
      this.migrateOldPresets();
      this.autoPersist();
    },
    autoPersist() {
      // 订阅状态变化并延迟保存（不写入 store，避免递归）
      this.$subscribe(() => {
        if (saveTimer) window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => {
          this.save();
        }, 400);
      }, { detached: true });
    },
    save() {
      if (!this.dataset) return;
      const bundle: ExportBundle = {
        version: 1,
        savedAt: new Date().toISOString(),
        dataset: deepClone(this.dataset),
        presets: deepClone(this.presets),
        // 扩展预设数据
        extendedPresets: deepClone(this.extendedPresets),
        presetFolders: deepClone(this.presetFolders),
        presetManagement: deepClone(this.presetManagement),
        promptText: this.promptText,
        selectedLang: this.selectedLang,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(bundle));
    },
    resetToDefault() {
      this.importFromBundle(null);
    },
    async importFromBundle(bundle: ExportBundle | null) {
      if (!bundle) {
        if (!baseline) baseline = await loadInitialDataset();
        this.dataset = deepClone(baseline!);
        // 重置时不清空预设数据，只重置词库
      } else {
        // 词库导入：只处理词库相关数据，不影响预设
        if (bundle.dataset) {
          this.dataset = bundle.dataset;
        } else if (bundle.customDiff) {
          if (!baseline) baseline = await loadInitialDataset();
          this.dataset = this.applyDiff(deepClone(baseline!), bundle.customDiff);
        }
        
        // 兼容旧版本：如果导入的是包含预设的旧格式，提示用户使用预设导入功能
        if (bundle.presets || bundle.extendedPresets || bundle.presetFolders) {
          console.warn('检测到预设数据，请使用预设管理页面的导入功能来导入预设数据');
        }
      }
      this.selectedCategoryIndex = 0;
      this.selectedGroupIndex = 0;
      this.save();
    },
    exportToJson(): string {
      // 词库导出：仅包含自定义差异（不包含公共词库和预设数据）
      const diff = this.buildDiff(baseline!, this.dataset!);
      const bundle: ExportBundle = {
        version: 1,
        savedAt: new Date().toISOString(),
        customDiff: diff,
        // 词库导出不包含预设数据
      };
      return JSON.stringify(bundle, null, 2);
    },

    // 预设导出：仅导出预设相关数据
    exportPresetsToJson(): string {
      const bundle = {
        version: 1,
        type: 'presets',
        savedAt: new Date().toISOString(),
        extendedPresets: deepClone(this.extendedPresets),
        presetFolders: deepClone(this.presetFolders),
        presetManagement: deepClone(this.presetManagement),
        // 保留旧预设以兼容
        presets: deepClone(this.presets),
      };
      return JSON.stringify(bundle, null, 2);
    },
    setLanguage(lang: LangCode) {
      this.selectedLang = lang;
    },
    selectCategory(idx: number) {
      this.selectedCategoryIndex = idx;
      this.selectedGroupIndex = 0;
    },
    selectGroup(idx: number) {
      this.selectedGroupIndex = idx;
    },
    setSearch(q: string) {
      this.searchQuery = q;
    },
    addTag(groupId: string, key = 'new_tag') {
      const grp = this.findGroupById(groupId);
      if (!grp) return;
      // 新增提示词插入到列表顶部，便于用户立即编辑
      grp.tags.unshift({ key, translation: { en: key, [this.selectedLang]: key } });
    },
    removeTag(groupId: string, key: string) {
      const grp = this.findGroupById(groupId);
      if (!grp) return;
      grp.tags = grp.tags.filter((t) => t.key !== key);
    },
    updateTagKey(groupId: string, oldKey: string, newKey: string) {
      const grp = this.findGroupById(groupId);
      if (!grp) return;
      const tag = grp.tags.find((t) => t.key === oldKey);
      if (!tag) return;
      tag.key = newKey;
      if (!tag.translation) tag.translation = {};
      tag.translation.en = newKey;
    },
    setTranslation(groupId: string, key: string, lang: LangCode, val: string) {
      const grp = this.findGroupById(groupId);
      if (!grp) return;
      const tag = grp.tags.find((t) => t.key === key);
      if (!tag) return;
      if (!tag.translation) tag.translation = {};
      tag.translation[lang] = val;
    },
    toggleHidden(groupId: string, key: string) {
      const grp = this.findGroupById(groupId);
      if (!grp) return;
      const tag = grp.tags.find((t) => t.key === key);
      if (!tag) return;
      tag.hidden = !tag.hidden;
    },
    reorderTags(groupId: string, fromIndex: number, toIndex: number) {
      const grp = this.findGroupById(groupId);
      if (!grp) return;
      const list = grp.tags;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return;
      const [item] = list.splice(fromIndex, 1);
      if (item) list.splice(toIndex, 0, item);
    },
    // —— 编辑器核心：基于左侧文本的 token 操作 ——
    setPromptText(text: string) {
      this.promptText = normalizePrompt(text);
    },
    setPromptTextRaw(text: string) {
      // 原始赋值，不做格式化，保留光标与撤回体验
      this.promptText = text;
    },
    replaceChineseComma() {
      this.promptText = this.promptText.replace(/，/g, ',');
    },
    formatPrompt() {
      this.promptText = normalizePrompt(this.promptText);
    },
    // 切换下划线和空格
    toggleUnderscoreSpace() {
      const tokens = splitTokens(this.promptText);
      const newTokens = tokens.map(token => {
        // 解析包裹层数和核心内容
        const { core, wrappers } = this.parseTokenWrappers(token);
        
        // 切换下划线和空格
        let newCore;
        if (core.includes('_')) {
          newCore = core.replace(/_/g, ' ');
        } else if (core.includes(' ')) {
          newCore = core.replace(/ /g, '_');
        } else {
          newCore = core;
        }
        
        // 重新包装
        return this.wrapToken(newCore, wrappers);
      });
      this.promptText = newTokens.join(', ');
    },
    // 为单个token添加包裹层
    addWrapperToToken(index: number, wrapperType: string = '{}') {
      const tokens = splitTokens(this.promptText);
      if (index < 0 || index >= tokens.length) return;
      
      const token = tokens[index];
      if (!token) return;
      const { core, wrappers } = this.parseTokenWrappers(token);
      const newWrappers = [...wrappers, wrapperType];
      tokens[index] = this.wrapToken(core, newWrappers);
      
      this.promptText = tokens.join(', ');
    },
    // 为单个token移除包裹层
    removeWrapperFromToken(index: number) {
      const tokens = splitTokens(this.promptText);
      if (index < 0 || index >= tokens.length) return;
      
      const token = tokens[index];
      if (!token) return;
      const { core, wrappers } = this.parseTokenWrappers(token);
      if (wrappers.length > 0) {
        const newWrappers = wrappers.slice(0, -1);
        tokens[index] = this.wrapToken(core, newWrappers);
        this.promptText = tokens.join(', ');
      }
    },
    // 获取token的包裹信息（用于显示）
    getTokenWrapperInfo(token: string): { core: string; wrappers: string[]; wrapperCount: number } {
      const { core, wrappers } = this.parseTokenWrappers(token);
      return { core, wrappers, wrapperCount: wrappers.length };
    },
    // 解析token的包裹层和核心内容
    parseTokenWrappers(token: string): { core: string; wrappers: string[] } {
      const wrapperPairs = [
        ['{}', '{', '}'],
        ['()', '(', ')'],
        ['[]', '[', ']'],
        ['<>', '<', '>']
      ];
      
      let current = token.trim();
      const wrappers: string[] = [];
      
      // 从外到内解析包裹层
      while (current.length >= 2) {
        let found = false;
        for (const [type, start, end] of wrapperPairs) {
          if (start && end && current.startsWith(start) && current.endsWith(end)) {
            if (type) wrappers.push(type);
            current = current.slice(start.length, -end.length);
            found = true;
            break;
          }
        }
        if (!found) break;
      }
      
      return { core: current, wrappers };
    },
    // 用包裹层包装token
    wrapToken(core: string, wrappers: string[]): string {
      let result = core;
      
      // 从内到外添加包裹层
      for (let i = wrappers.length - 1; i >= 0; i--) {
        const wrapper = wrappers[i];
        switch (wrapper) {
          case '{}':
            result = `{${result}}`;
            break;
          case '()':
            result = `(${result})`;
            break;
          case '[]':
            result = `[${result}]`;
            break;
          case '<>':
            result = `<${result}>`;
            break;
        }
      }
      
      return result;
    },
    updateToken(index: number, newToken: string) {
      const tokens = splitTokens(this.promptText);
      if (index < 0 || index >= tokens.length) return;
      tokens[index] = normalizeToken(newToken);
      this.promptText = tokens.join(', ');
    },
    reorderTokens(fromIndex: number, toIndex: number) {
      const tokens = splitTokens(this.promptText);
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= tokens.length || toIndex >= tokens.length) return;
      const [item] = tokens.splice(fromIndex, 1);
      tokens.splice(toIndex, 0, item!);
      this.promptText = tokens.join(', ');
    },
    removeToken(index: number) {
      const tokens = splitTokens(this.promptText);
      if (index < 0 || index >= tokens.length) return;
      tokens.splice(index, 1);
      this.promptText = tokens.join(', ');
    },
    addTokenAfter(index: number, token: string) {
      const tokens = splitTokens(this.promptText);
      tokens.splice(index + 1, 0, normalizeToken(token));
      this.promptText = tokens.join(', ');
    },
    getTagByKey(key: string): PromptTag | null {
      const target = normalizeKeyForMatch(key);
      for (const cat of this.dataset?.categories || []) {
        for (const g of cat.groups) {
          for (const t of g.tags) {
            if (t.key === key) return t; // 精确匹配优先
            if (normalizeKeyForMatch(t.key) === target) return t; // 下划线/空格归一化匹配
          }
        }
      }
      return null;
    },
    getTranslation(key: string, lang: LangCode): string | null {
      // 兼容包裹层：如 {aaa}、(aaa) 等
      const { core, wrappers } = this.parseTokenWrappers(key);
      const tag = this.getTagByKey(core);
      if (!tag) return null;
      const translatedCore = tag.translation?.[lang] ?? tag.key;
      // 保持原有包裹层结构，返回被翻译后的核心
      return this.wrapToken(translatedCore, wrappers);
    },
    getSuggestions(prefix: string, limit = 8): string[] {
      const list: string[] = [];
      const seen = new Set<string>();
      const p = prefix.trim().toLowerCase();
      const pNorm = p.replace(/_/g, ' ');
      if (!p) return [];
      for (const cat of this.dataset?.categories || []) {
        for (const g of cat.groups) {
          for (const t of g.tags) {
            const k = t.key;
            if (seen.has(k)) continue;
            const kLower = k.toLowerCase();
            const kNorm = kLower.replace(/_/g, ' ');
            if (kLower.includes(p) || kNorm.includes(pNorm)) {
              list.push(k);
              seen.add(k);
              if (list.length >= limit) return list;
            }
          }
        }
      }
      return list;
    },
    addMapping(key: string, lang: LangCode, val: string) {
      // 若 key 已存在则更新翻译；否则在自定义分组增加映射
      const exist = this.getTagByKey(key);
      if (exist) {
        if (!exist.translation) exist.translation = {};
        exist.translation[lang] = val;
        return;
      }
      const grp = this.ensureCustomGroup();
      grp.tags.push({ key, translation: { en: key, [lang]: val } });
    },
    ensureCustomGroup(): PromptGroup {
      const catName = 'Custom';
      let cat = this.dataset?.categories.find((c) => c.name === catName);
      if (!cat) {
        cat = { id: `cat_${Math.random().toString(36).slice(2, 9)}`, name: catName, groups: [] };
        this.dataset?.categories.push(cat);
      }
      let grp = cat.groups.find((g) => g.name === 'User Mapping');
      if (!grp) {
        grp = { id: `grp_${Math.random().toString(36).slice(2, 9)}`, name: 'User Mapping', color: '#6366f1', tags: [] };
        cat.groups.push(grp);
      }
      return grp;
    },
    savePreset(name: string) {
      const now = new Date().toISOString();
      const exist = this.presets.find((p) => p.name === name);
      if (exist) {
        exist.text = this.promptText;
        exist.updatedAt = now;
      } else {
        this.presets.push({ name, text: this.promptText, updatedAt: now });
      }
      this.save();
    },
    loadPreset(name: string) {
      const p = this.presets.find((x) => x.name === name);
      if (!p) return;
      this.promptText = p.text;
    },
    deletePreset(name: string) {
      this.presets = this.presets.filter((p) => p.name !== name);
      this.save();
    },
    renamePreset(oldName: string, newName: string) {
      const target = this.presets.find((p) => p.name === oldName);
      if (!target) return;
      const conflict = this.presets.find((p) => p.name === newName);
      const now = new Date().toISOString();
      if (conflict && conflict !== target) {
        // 合并到冲突项：用新名覆盖旧名文本
        conflict.text = target.text;
        conflict.updatedAt = now;
        this.deletePreset(oldName);
      } else {
        target.name = newName;
        target.updatedAt = now;
      }
      this.save();
    },
    findGroupById(id: string): PromptGroup | null {
      for (const cat of this.dataset?.categories || []) {
        const grp = cat.groups.find((g) => g.id === id);
        if (grp) return grp;
      }
      return null;
    },
    // 工具方法：构建差异与应用差异
    buildDiff(base: PromptDataset, cur: PromptDataset): CustomDiff {
      const categories: CustomDiff['categories'] = [];
      const baseCatMap = new Map(base.categories.map((c) => [c.name, c]));
      const curCatMap = new Map(cur.categories.map((c) => [c.name, c]));

      for (const [name, curCat] of curCatMap.entries()) {
        const baseCat = baseCatMap.get(name);
        const catDiff: CustomDiff['categories'][number] = { name };
        if (!baseCat) {
          catDiff.addedGroups = curCat.groups.map((g) => deepClone(g));
        } else {
          const baseGrpMap = new Map(baseCat.groups.map((g) => [g.name, g]));
          const curGrpMap = new Map(curCat.groups.map((g) => [g.name, g]));
          const groupsDiff: NonNullable<typeof catDiff.groups> = [];

          for (const [gname, curGrp] of curGrpMap.entries()) {
            const baseGrp = baseGrpMap.get(gname);
            if (!baseGrp) {
              if (!catDiff.addedGroups) catDiff.addedGroups = [];
              catDiff.addedGroups.push(deepClone(curGrp));
              continue;
            }
            const updated: { name: string; color?: string; added?: PromptTag[]; removed?: string[]; updated?: Array<{ key: string; translation?: Partial<Record<LangCode, string>>; hidden?: boolean }>; order?: string[] } = { name: gname } as any;
            if ((curGrp.color || '') !== (baseGrp.color || '')) updated.color = curGrp.color;
            const baseTagMap = new Map(baseGrp.tags.map((t) => [t.key, t]));
            const curTagMap = new Map(curGrp.tags.map((t) => [t.key, t]));

            const addList: PromptTag[] = [];
            const updList: Array<{ key: string; translation?: Partial<Record<LangCode, string>>; hidden?: boolean }> = [];
            for (const [key, curTag] of curTagMap.entries()) {
              const baseTag = baseTagMap.get(key);
              if (!baseTag) {
                addList.push(deepClone(curTag));
              } else {
                let changed = false;
                const change: { key: string; translation?: Partial<Record<LangCode, string>>; hidden?: boolean } = { key };
                for (const l of ['en', 'zh_CN', 'es_ES'] as LangCode[]) {
                  const a = baseTag.translation?.[l] ?? '';
                  const b = curTag.translation?.[l] ?? '';
                  if (a !== b) {
                    if (!change.translation) change.translation = {};
                    change.translation[l] = b;
                    changed = true;
                  }
                }
                const aHidden = !!baseTag.hidden;
                const bHidden = !!curTag.hidden;
                if (aHidden !== bHidden) { change.hidden = bHidden; changed = true; }
                if (changed) updList.push(change);
              }
            }
            const remList: string[] = [];
            for (const [key] of baseTagMap.entries()) {
              if (!curTagMap.has(key)) remList.push(key);
            }
            const baseOrder = baseGrp.tags.map((t) => t.key);
            const curOrder = curGrp.tags.map((t) => t.key);
            const orderChanged = baseOrder.length !== curOrder.length || baseOrder.some((k, i) => k !== curOrder[i]);

            if (updated.color || addList.length || remList.length || updList.length || orderChanged) {
              if (updated.color) updated.color = updated.color;
              if (addList.length) updated.added = addList;
              if (remList.length) updated.removed = remList;
              if (updList.length) updated.updated = updList;
              if (orderChanged) updated.order = curOrder;
              groupsDiff.push(updated as any);
            }
          }
          const removedGroups = baseCat.groups.filter((bg) => !curGrpMap.has(bg.name)).map((g) => g.name);
          if (removedGroups.length) catDiff.removedGroups = removedGroups;
          if (groupsDiff.length) catDiff.groups = groupsDiff;
        }
        if (catDiff.addedGroups?.length || catDiff.removedGroups?.length || catDiff.groups?.length) {
          categories.push(catDiff);
        }
      }
      for (const baseCat of base.categories) {
        if (!curCatMap.has(baseCat.name)) {
          categories.push({ name: baseCat.name, removedGroups: baseCat.groups.map((g) => g.name) });
        }
      }
      return { categories };
    },
    applyDiff(target: PromptDataset, diff: CustomDiff): PromptDataset {
      const catMap = new Map(target.categories.map((c) => [c.name, c]));
      for (const c of diff.categories || []) {
        let cat = catMap.get(c.name);
        if (!cat) {
          cat = { id: `cat_${Math.random().toString(36).slice(2, 9)}`, name: c.name, groups: [] };
          target.categories.push(cat);
          catMap.set(c.name, cat);
        }
        const grpMap = new Map(cat.groups.map((g) => [g.name, g]));
        for (const g of c.addedGroups || []) {
          const copy = deepClone(g);
          // 保持现有结构：如果没有 id，生成一个
          (copy as PromptGroup).id = `grp_${Math.random().toString(36).slice(2, 9)}`;
          (copy as PromptGroup).id = `grp_${Math.random().toString(36).slice(2, 9)}`;
          cat.groups.push(copy as PromptGroup);
          grpMap.set(copy.name, copy as PromptGroup);
        }
        for (const gname of c.removedGroups || []) {
          cat.groups = cat.groups.filter((g) => g.name !== gname);
          grpMap.delete(gname);
        }
        for (const gdiff of c.groups || []) {
          let grp = grpMap.get(gdiff.name);
          if (!grp) {
            grp = { id: `grp_${Math.random().toString(36).slice(2, 9)}`, name: gdiff.name, color: gdiff.color, tags: [] };
            cat.groups.push(grp);
            grpMap.set(grp.name, grp);
          }
          if (gdiff.color !== undefined) grp.color = gdiff.color;
          const tagMap = new Map(grp.tags.map((t) => [t.key, t]));
          for (const t of gdiff.added || []) {
            const copy = deepClone(t);
            grp.tags.push(copy);
            tagMap.set(copy.key, copy);
          }
          for (const key of gdiff.removed || []) {
            grp.tags = grp.tags.filter((t) => t.key !== key);
            tagMap.delete(key);
          }
          for (const u of gdiff.updated || []) {
            const tag = tagMap.get(u.key);
            if (!tag) continue;
            if (u.translation) tag.translation = { ...(tag.translation || {}), ...u.translation };
            if (u.hidden !== undefined) tag.hidden = u.hidden;
          }
          if (gdiff.order && gdiff.order.length) {
            const keyToTag = new Map(grp.tags.map((t) => [t.key, t]));
            const reordered: PromptTag[] = [];
            for (const key of gdiff.order) {
              const tag = keyToTag.get(key);
              if (tag) reordered.push(tag);
            }
            // 保留未列出的条目
            for (const t of grp.tags) {
              if (!gdiff.order.includes(t.key)) reordered.push(t);
            }
            grp.tags = reordered;
          }
        }
      }
      return target;
    },

    // 扩展预设管理方法
    initializeExtendedPresets() {
      // 如果没有扩展预设数据，初始化默认结构
      if (!this.extendedPresets) {
        this.extendedPresets = [];
      }
      if (!this.presetFolders) {
        this.presetFolders = [];
      }
      if (!this.presetManagement) {
        this.presetManagement = {
          folders: [],
          presets: [],
          settings: {
            autoBackup: true,
            maxPresets: 1000
          }
        };
      }
      
      // 确保有默认文件夹
      if (this.presetFolders.length === 0) {
        const defaultFolder = this.createPresetFolder({
          name: '默认文件夹',
          description: '系统默认预设文件夹',
          color: '#6366f1'
        });
        
        // 设置为默认文件夹
        if (this.presetManagement.settings) {
          this.presetManagement.settings.defaultFolder = defaultFolder.id;
        }
      }
    },

    createExtendedPreset(data: Omit<ExtendedPreset, 'id' | 'createdAt' | 'updatedAt'>) {
      const now = new Date().toISOString();
      const preset: ExtendedPreset = {
        id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: now,
        updatedAt: now,
        ...data
      };
      
      this.extendedPresets.push(preset);
      this.save();
      return preset;
    },

    updateExtendedPreset(id: string, data: Partial<Omit<ExtendedPreset, 'id' | 'createdAt'>>) {
      const preset = this.extendedPresets.find(p => p.id === id);
      if (!preset) return false;
      
      Object.assign(preset, data, { updatedAt: new Date().toISOString() });
      this.save();
      return true;
    },

    deleteExtendedPreset(id: string) {
      const index = this.extendedPresets.findIndex(p => p.id === id);
      if (index === -1) return false;
      
      this.extendedPresets.splice(index, 1);
      this.save();
      return true;
    },

    createPresetFolder(data: Omit<PresetFolder, 'id' | 'createdAt' | 'updatedAt'>) {
      const now = new Date().toISOString();
      const folder: PresetFolder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: now,
        updatedAt: now,
        ...data
      };
      
      this.presetFolders.push(folder);
      this.save();
      return folder;
    },

    updatePresetFolder(id: string, data: Partial<Omit<PresetFolder, 'id' | 'createdAt'>>) {
      const folder = this.presetFolders.find(f => f.id === id);
      if (!folder) return false;
      
      Object.assign(folder, data, { updatedAt: new Date().toISOString() });
      this.save();
      return true;
    },

    deletePresetFolder(id: string) {
      const index = this.presetFolders.findIndex(f => f.id === id);
      if (index === -1) return false;
      
      // 将该文件夹下的预设移动到未分类
      this.extendedPresets.forEach(preset => {
        if (preset.folderId === id) {
          preset.folderId = undefined;
          preset.updatedAt = new Date().toISOString();
        }
      });
      
      // 删除子文件夹或将其移动到父级
      const folder = this.presetFolders[index];
      if (folder) {
        this.presetFolders.forEach(f => {
          if (f.parentId === id) {
            f.parentId = folder.parentId;
            f.updatedAt = new Date().toISOString();
          }
        });
      }
      
      this.presetFolders.splice(index, 1);
      this.save();
      return true;
    },

    importExtendedPresets(data: { folders?: PresetFolder[]; presets?: ExtendedPreset[] }) {
      if (data.folders) {
        // 合并文件夹，避免ID冲突
        data.folders.forEach(folder => {
          const existingFolder = this.presetFolders.find(f => f.name === folder.name);
          if (existingFolder) {
            // 更新现有文件夹
            Object.assign(existingFolder, folder, { 
              id: existingFolder.id,
              updatedAt: new Date().toISOString() 
            });
          } else {
            // 创建新文件夹，重新生成ID
            const newFolder = {
              ...folder,
              id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            this.presetFolders.push(newFolder);
          }
        });
      }
      
      if (data.presets) {
        // 合并预设，避免ID冲突
        data.presets.forEach(preset => {
          const existingPreset = this.extendedPresets.find(p => p.name === preset.name && p.type === preset.type);
          if (existingPreset) {
            // 更新现有预设
            Object.assign(existingPreset, preset, { 
              id: existingPreset.id,
              updatedAt: new Date().toISOString() 
            });
          } else {
            // 创建新预设，重新生成ID
            const newPreset = {
              ...preset,
              id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            this.extendedPresets.push(newPreset);
          }
        });
      }
      
      this.save();
    },

    // 预设导入：专门处理预设导入文件
    importPresetsFromJson(jsonData: string): boolean {
      try {
        const data = JSON.parse(jsonData);

        // 仅处理预设相关的导入文件
        if (!(data.type === 'presets' || data.extendedPresets || data.presetFolders || data.presets)) {
          return false;
        }

        // 1) 构建旧ID到新ID的映射，按名称合并已存在的文件夹
        const idMap = new Map<string, string>();
        const existingByName = new Map((this.presetFolders || []).map((f) => [f.name, f]));

        const foldersToCreate: any[] = [];
        const incomingFolders: any[] = Array.isArray(data.presetFolders) ? data.presetFolders : [];

        // 先确定每个旧ID对应的新ID（复用同名文件夹，否则生成新ID）
        for (const folder of incomingFolders) {
          const sameName = existingByName.get(folder.name);
          if (sameName) {
            idMap.set(folder.id, sameName.id);
            // 更新同名文件夹的基础信息（不改ID）
            Object.assign(sameName, {
              description: folder.description ?? sameName.description,
              color: folder.color ?? sameName.color,
              updatedAt: new Date().toISOString(),
            });
          } else {
            const newId = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            idMap.set(folder.id, newId);
            foldersToCreate.push({ ...folder, id: newId });
          }
        }

        // 创建不存在的文件夹，修正其父子关系（父ID按映射转换）
        for (const folder of foldersToCreate) {
          const created = {
            id: folder.id,
            name: folder.name,
            description: folder.description ?? undefined,
            color: folder.color ?? '#6366f1',
            parentId: folder.parentId ? idMap.get(folder.parentId) : undefined,
            createdAt: folder.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as PresetFolder;
          this.presetFolders.push(created);
        }

        // 2) 导入扩展预设，修正其 folderId 指向到新ID
        const incomingPresets: any[] = Array.isArray(data.extendedPresets) ? data.extendedPresets : [];
        for (const preset of incomingPresets) {
          // 如果已存在同名同类型，则更新；否则创建新预设
          const existing = (this.extendedPresets || []).find((p) => p.name === preset.name && p.type === preset.type);
          const mappedFolderId = preset.folderId ? idMap.get(preset.folderId) : undefined;

          if (existing) {
            Object.assign(existing, {
              content: preset.content,
              description: preset.description ?? existing.description,
              tags: Array.isArray(preset.tags) ? preset.tags : existing.tags,
              folderId: mappedFolderId ?? existing.folderId,
              updatedAt: new Date().toISOString(),
            });
          } else {
            this.extendedPresets.push({
              id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              name: preset.name,
              type: preset.type,
              content: preset.content,
              description: preset.description ?? undefined,
              tags: Array.isArray(preset.tags) ? preset.tags : undefined,
              folderId: mappedFolderId,
              createdAt: preset.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as ExtendedPreset);
          }
        }

        // 3) 合并预设管理配置（不覆盖现有设置），无需变更 defaultFolder
        if (data.presetManagement) {
          this.presetManagement = {
            ...this.presetManagement,
            folders: [...(this.presetManagement?.folders || []), ...(data.presetManagement.folders || [])],
            presets: [...(this.presetManagement?.presets || []), ...(data.presetManagement.presets || [])],
            settings: { ...(this.presetManagement?.settings || {}) },
          };
        }

        // 4) 兼容旧预设格式（旧格式只含 presets: [{ name, text }...]）
        if (Array.isArray(data.presets)) {
          for (const oldPreset of data.presets) {
            this.extendedPresets.push({
              id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              name: oldPreset.name,
              type: 'positive' as PresetType,
              content: oldPreset.text,
              description: '从旧格式导入',
              createdAt: oldPreset.updatedAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as ExtendedPreset);
          }
        }

        this.save();
        return true;
      } catch (error) {
        console.error('预设导入失败:', error);
        return false;
      }
    },

    // 兼容性：从旧预设迁移到新预设系统
    migrateOldPresets() {
      if (this.presets.length === 0) return; // 没有旧预设需要迁移
      
      console.log(`开始迁移 ${this.presets.length} 个旧预设到新系统...`);
      
      let migratedCount = 0;
      const defaultFolder = this.presetManagement?.settings?.defaultFolder;
      
      this.presets.forEach(oldPreset => {
        const existingExtended = this.extendedPresets.find(p => 
          p.name === oldPreset.name && p.type === 'positive'
        );
        
        if (!existingExtended) {
          // 创建新的扩展预设，但不触发保存（避免递归）
          const now = new Date().toISOString();
          const preset: ExtendedPreset = {
            id: `migrated_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name: oldPreset.name,
            type: 'positive',
            content: oldPreset.text,
            description: '从旧版快速预设自动迁移',
            folderId: defaultFolder,
            createdAt: oldPreset.updatedAt,
            updatedAt: oldPreset.updatedAt
          };
          
          this.extendedPresets.push(preset);
          migratedCount++;
        }
      });
      
      if (migratedCount > 0) {
        console.log(`成功迁移 ${migratedCount} 个预设到新系统`);
        // 清空旧预设数组，完成迁移
        this.presets = [];
        console.log('旧预设已清空，迁移完成');
      }
    },

    // 检查并处理版本兼容性
    ensureCompatibility(bundle: ExportBundle) {
      // 如果是旧版本的导出文件，确保新字段存在
      if (!bundle.extendedPresets && bundle.presets && bundle.presets.length > 0) {
        // 自动迁移旧预设到新系统
        bundle.extendedPresets = bundle.presets.map(preset => ({
          id: `migrated_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name: preset.name,
          type: 'positive' as PresetType,
          content: preset.text,
          description: '从旧版本自动迁移',
          createdAt: preset.updatedAt,
          updatedAt: preset.updatedAt
        }));
      }
      
      if (!bundle.presetFolders) {
        bundle.presetFolders = [];
      }
      
      if (!bundle.presetManagement) {
        bundle.presetManagement = {
          folders: [],
          presets: [],
          settings: {
            autoBackup: true,
            maxPresets: 1000
          }
        };
      }
      
      return bundle;
    },
  },
});
// —— 工具方法 ——
function splitTokens(text: string): string[] {
  return text
    .split(/[，,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
function normalizeToken(t: string): string {
  return t.trim();
}
function normalizePrompt(text: string): string {
  return splitTokens(text).join(', ');
}

// 归一化用于匹配的 key：统一大小写与下划线/空格
function normalizeKeyForMatch(s: string): string {
  return s.trim().toLowerCase().replace(/_/g, ' ');
}