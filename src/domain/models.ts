/** 一级分组：只能直接包含笔记，不能嵌套子分组 */
export interface Group {
  id: string;
  name: string;
  /** 同级排序值，MVP 按创建顺序递增，为后续拖拽预留 */
  order: number;
  createdAt: number;
  updatedAt: number;
}

/** 单篇笔记；必须属于某个分组（无选择时进入默认分组） */
export interface Note {
  id: string;
  groupId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 侧边栏筛选条件。
 * “全部笔记”是系统入口；具体分组用 groupId 标识。
 */
export type NoteFilter = "all" | { groupId: string };

/** 当前笔记的自动保存状态 */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** 需要持久化的界面设置 */
export interface AppSettings {
  activeFilter: NoteFilter;
  selectedNoteId: string | null;
  expandedGroupIds: string[];
  sidebarCollapsed: boolean;
}

/** 设置仓库中的固定键名 */
export const SETTING_KEYS = {
  activeFilter: "activeFilter",
  selectedNoteId: "selectedNoteId",
  expandedGroupIds: "expandedGroupIds",
  sidebarCollapsed: "sidebarCollapsed",
} as const;

/** 标题最大长度（产品约束） */
export const TITLE_MAX_LENGTH = 120;

/** 分组名称最大长度（产品约束） */
export const GROUP_NAME_MAX_LENGTH = 40;

/** 自动保存防抖间隔（毫秒） */
export const AUTOSAVE_DELAY_MS = 500;

/** 新建笔记默认标题 */
export const DEFAULT_NOTE_TITLE = "无标题笔记";

/** 新建分组默认名称前缀 */
export const DEFAULT_GROUP_NAME = "新建分组";

/**
 * 系统默认分组的固定 ID。
 * 用于识别不可删除的默认分组，并迁移历史 null/孤立笔记。
 */
export const DEFAULT_GROUP_ID = "__default__";

/** 默认分组初始显示名（允许用户重命名） */
export const DEFAULT_GROUP_LABEL = "默认分组";
