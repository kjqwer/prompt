import YAML from 'yaml';
import type { PromptDataset, PromptCategory, PromptGroup, PromptTag, LangCode } from '../types';

type YamlGroup = {
  name: string;
  color?: string;
  tags: Record<string, string | null>;
};

type YamlCategory = {
  name: string;
  groups: YamlGroup[];
};

async function fetchYaml(path: string): Promise<YamlCategory[]> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  const text = await res.text();
  const parsed = YAML.parse(text) as YamlCategory[];
  return parsed;
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function collectTranslations(root: YamlCategory[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cat of root) {
    for (const grp of cat.groups || []) {
      const entries = grp.tags || {};
      for (const [key, val] of Object.entries(entries)) {
        if (key && typeof key === 'string') {
          const value = val == null ? '' : String(val);
          map[key] = value;
        }
      }
    }
  }
  return map;
}

function buildBaseStructure(defaultYaml: YamlCategory[]): PromptCategory[] {
  const categories: PromptCategory[] = [];
  for (const cat of defaultYaml) {
    const groups: PromptGroup[] = [];
    for (const grp of cat.groups || []) {
      const tags: PromptTag[] = [];
      const entries = grp.tags || {};
      for (const key of Object.keys(entries)) {
        tags.push({ key, translation: { en: key } });
      }
      groups.push({ id: uid('grp'), name: grp.name, color: grp.color, tags });
    }
    categories.push({ id: uid('cat'), name: cat.name, groups });
  }
  return categories;
}

function mergeLanguage(dataset: PromptDataset, translations: Record<string, string>, lang: LangCode) {
  for (const cat of dataset.categories) {
    for (const grp of cat.groups) {
      for (const tag of grp.tags) {
        const t = translations[tag.key];
        if (typeof t === 'string') {
          if (!tag.translation) tag.translation = {};
          tag.translation[lang] = t || tag.key;
        }
      }
    }
  }
}

export async function loadInitialDataset(): Promise<PromptDataset> {
  // Base: default.yaml defines structure and keys
  const defaultYaml = await fetchYaml('/sd/default.yaml');
  const baseCategories = buildBaseStructure(defaultYaml);
  const dataset: PromptDataset = {
    categories: baseCategories,
    languages: ['en'],
    updatedAt: new Date().toISOString(),
  };

  // zh_CN and es_ES translations are optional
  try {
    const zhRoot = await fetchYaml('/sd/zh_CN.yaml');
    const zhMap = collectTranslations(zhRoot);
    mergeLanguage(dataset, zhMap, 'zh_CN');
    if (!dataset.languages.includes('zh_CN')) dataset.languages.push('zh_CN');
  } catch (err) {
    // ignore if missing
    console.warn('zh_CN.yaml not found or invalid', err);
  }

  try {
    const esRoot = await fetchYaml('/sd/es_ES.yaml');
    const esMap = collectTranslations(esRoot);
    mergeLanguage(dataset, esMap, 'es_ES');
    if (!dataset.languages.includes('es_ES')) dataset.languages.push('es_ES');
  } catch (err) {
    // ignore if missing
    console.warn('es_ES.yaml not found or invalid', err);
  }

  return dataset;
}