export type LangCode = 'en' | 'zh_CN';

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
  // 新的扩展预设管理
  extendedPresets?: ExtendedPreset[];
  presetFolders?: PresetFolder[];
  presetManagement?: PresetManagement;
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

// 新的预设类型枚举
export type PresetType = 'positive' | 'negative' | 'setting' | 'style' | 'character' | 'scene' | 'custom';

// 扩展的预设接口
export interface ExtendedPreset {
  id: string;
  name: string;
  type: PresetType;
  content: string;
  description?: string;
  tags?: string[];
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  author?: string;
}

// 预设文件夹
export interface PresetFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

// 预设管理数据结构
export interface PresetManagement {
  folders: PresetFolder[];
  presets: ExtendedPreset[];
  settings: {
    defaultFolder?: string;
    autoBackup: boolean;
    maxPresets: number;
  };
}