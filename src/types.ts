export type LangCode = 'en' | 'zh_CN' | 'es_ES';

export interface PromptTag {
  key: string;
  translation?: Partial<Record<LangCode, string>>;
  hidden?: boolean;
}

export interface PromptGroup {
  id: string;
  name: string;
  color?: string;
  tags: PromptTag[];
}

export interface PromptCategory {
  id: string;
  name: string;
  groups: PromptGroup[];
}

export interface PromptDataset {
  categories: PromptCategory[];
  languages: LangCode[];
  updatedAt?: string;
}

export interface ExportBundle {
  version: number;
  savedAt: string;
  dataset?: PromptDataset; // full snapshot (used for localStorage persistence)
  customDiff?: CustomDiff; // only user-defined changes for export/import
  presets?: PromptPreset[]; // saved prompt texts by name
  // editor state persistence
  promptText?: string;
  selectedLang?: LangCode;
}

export interface CustomDiff {
  categories: Array<{
    name: string;
    addedGroups?: Array<{
      name: string;
      color?: string;
      tags: PromptTag[];
    }>;
    removedGroups?: string[];
    groups?: Array<{
      name: string;
      color?: string;
      added?: PromptTag[];
      removed?: string[]; // tag keys
      updated?: Array<{
        key: string;
        translation?: Partial<Record<LangCode, string>>;
        hidden?: boolean;
      }>;
      order?: string[]; // tag keys in desired order
    }>;
  }>;
}

export interface PromptPreset {
  name: string;
  text: string;
  updatedAt: string;
}