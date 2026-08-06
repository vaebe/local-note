import {
  DEFAULT_GROUP_ID,
  DEFAULT_GROUP_LABEL,
  DEFAULT_GROUP_NAME,
  GROUP_NAME_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type Group,
  type Note,
  type NoteFilter,
} from "./models";

/** 去除首尾空格后的分组名称；不在此处做合法性判断 */
export function normalizeGroupName(name: string): string {
  return name.trim();
}

export type GroupNameValidation =
  | { ok: true; name: string }
  | { ok: false; reason: "empty" | "too_long" | "duplicate" };

/**
 * 校验分组名称：非空、最长 40 字符、与已有名称完全重复（忽略首尾空格后比较）。
 * @param existingNames 已有分组名称；重命名时应排除自身旧名称
 */
export function validateGroupName(
  rawName: string,
  existingNames: readonly string[],
): GroupNameValidation {
  const name = normalizeGroupName(rawName);
  if (!name) {
    return { ok: false, reason: "empty" };
  }
  if (name.length > GROUP_NAME_MAX_LENGTH) {
    return { ok: false, reason: "too_long" };
  }
  const normalizedExisting = existingNames.map((item) => normalizeGroupName(item));
  if (normalizedExisting.includes(name)) {
    return { ok: false, reason: "duplicate" };
  }
  return { ok: true, name };
}

/** 将标题截断到产品上限，避免写入超长值 */
export function clampTitle(title: string): string {
  if (title.length <= TITLE_MAX_LENGTH) {
    return title;
  }
  return title.slice(0, TITLE_MAX_LENGTH);
}

/** 判断标题是否已达上限（用于输入时给出轻提示） */
export function isTitleAtLimit(title: string): boolean {
  return title.length >= TITLE_MAX_LENGTH;
}

/** 按 updatedAt 倒序；相同时间时用 id 稳定排序，避免列表抖动 */
export function sortNotesByUpdatedAt(notes: readonly Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (b.updatedAt !== a.updatedAt) {
      return b.updatedAt - a.updatedAt;
    }
    return a.id.localeCompare(b.id);
  });
}

/** 是否为系统默认分组（不可删除） */
export function isDefaultGroup(groupId: string): boolean {
  return groupId === DEFAULT_GROUP_ID;
}

/** 按 order 升序排列分组；默认分组始终置顶 */
export function sortGroupsByOrder(groups: readonly Group[]): Group[] {
  return [...groups].sort((a, b) => {
    if (a.id === DEFAULT_GROUP_ID) {
      return -1;
    }
    if (b.id === DEFAULT_GROUP_ID) {
      return 1;
    }
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.id.localeCompare(b.id);
  });
}

/** 判断笔记是否属于当前筛选条件 */
export function noteMatchesFilter(note: Note, filter: NoteFilter): boolean {
  if (filter === "all") {
    return true;
  }
  return note.groupId === filter.groupId;
}

/** 根据筛选条件过滤笔记并按更新时间倒序 */
export function filterNotes(notes: readonly Note[], filter: NoteFilter): Note[] {
  return sortNotesByUpdatedAt(notes.filter((note) => noteMatchesFilter(note, filter)));
}

/** 比较两个筛选条件是否相同 */
export function isSameFilter(a: NoteFilter, b: NoteFilter): boolean {
  if (a === "all") {
    return b === "all";
  }
  return typeof b === "object" && b.groupId === a.groupId;
}

/**
 * 删除当前笔记后选择下一篇。
 * 优先取同 groupId 中按 updatedAt 倒序的第一篇；没有则返回 null。
 */
export function selectNextNoteAfterDelete(notes: readonly Note[], deletedNote: Note): Note | null {
  const remaining = sortNotesByUpdatedAt(
    notes.filter((note) => note.id !== deletedNote.id && note.groupId === deletedNote.groupId),
  );
  return remaining[0] ?? null;
}

/**
 * 生成不重复的用户新建分组名：“新建分组”“新建分组 2”…
 * 避免直接创建失败，并立刻进入重命名。
 */
export function nextDefaultGroupName(existingNames: readonly string[]): string {
  const used = new Set(existingNames.map((name) => normalizeGroupName(name)));
  if (!used.has(DEFAULT_GROUP_NAME)) {
    return DEFAULT_GROUP_NAME;
  }
  let index = 2;
  while (used.has(`${DEFAULT_GROUP_NAME} ${index}`)) {
    index += 1;
  }
  return `${DEFAULT_GROUP_NAME} ${index}`;
}

/**
 * 根据当前筛选决定新建笔记所属分组：
 * 选中具体分组时进入该分组，否则进入默认分组。
 */
export function resolveCreateNoteGroupId(
  filter: NoteFilter,
  defaultGroupId: string = DEFAULT_GROUP_ID,
): string {
  if (typeof filter === "object") {
    return filter.groupId;
  }
  return defaultGroupId;
}

/** 创建系统默认分组记录（固定 ID，order 最低） */
export function createDefaultGroupRecord(now: number = Date.now()): Group {
  return {
    id: DEFAULT_GROUP_ID,
    name: DEFAULT_GROUP_LABEL,
    order: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** 将无效或引用已删除记录的设置回退到安全默认值 */
export function sanitizeSettings(
  raw: Partial<{
    activeFilter: unknown;
    selectedNoteId: unknown;
    expandedGroupIds: unknown;
    sidebarCollapsed: unknown;
  }>,
  groups: readonly Group[],
  notes: readonly Note[],
): {
  activeFilter: NoteFilter;
  selectedNoteId: string | null;
  expandedGroupIds: string[];
  sidebarCollapsed: boolean;
} {
  const groupIds = new Set(groups.map((group) => group.id));
  const noteIds = new Set(notes.map((note) => note.id));

  let activeFilter: NoteFilter = "all";
  const rawFilter = raw.activeFilter;
  // 历史 “ungrouped” 设置回退为全部笔记
  if (rawFilter === "all" || rawFilter === "ungrouped") {
    activeFilter = "all";
  } else if (
    rawFilter &&
    typeof rawFilter === "object" &&
    "groupId" in rawFilter &&
    typeof (rawFilter as { groupId: unknown }).groupId === "string" &&
    groupIds.has((rawFilter as { groupId: string }).groupId)
  ) {
    activeFilter = { groupId: (rawFilter as { groupId: string }).groupId };
  }

  let selectedNoteId: string | null = null;
  if (typeof raw.selectedNoteId === "string" && noteIds.has(raw.selectedNoteId)) {
    selectedNoteId = raw.selectedNoteId;
  } else {
    // 最后笔记不存在时，回退到当前筛选中最近更新的笔记
    const visible = filterNotes(notes, activeFilter);
    selectedNoteId = visible[0]?.id ?? null;
  }

  const expandedGroupIds = Array.isArray(raw.expandedGroupIds)
    ? raw.expandedGroupIds.filter((id): id is string => typeof id === "string" && groupIds.has(id))
    : [];

  const sidebarCollapsed = typeof raw.sidebarCollapsed === "boolean" ? raw.sidebarCollapsed : false;

  return {
    activeFilter,
    selectedNoteId,
    expandedGroupIds,
    sidebarCollapsed,
  };
}

/** 将分组名校验失败原因转为用户可读文案 */
export function groupNameErrorMessage(reason: "empty" | "too_long" | "duplicate"): string {
  switch (reason) {
    case "empty":
      return "分组名称不能为空";
    case "too_long":
      return `分组名称不能超过 ${GROUP_NAME_MAX_LENGTH} 个字符`;
    case "duplicate":
      return "已存在同名分组";
  }
}
