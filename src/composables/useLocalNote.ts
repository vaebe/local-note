import { computed, ref, shallowRef } from "vue";
import {
  createGroupRecord,
  createNoteRecord,
  deleteGroupAndMoveNotes,
  deleteNoteRecord,
  loadInitialData,
  openLocalNoteDatabase,
  setSettings,
  updateGroupRecord,
  updateNoteRecord,
} from "../data/database";
import {
  DEFAULT_GROUP_ID,
  DEFAULT_NOTE_TITLE,
  SETTING_KEYS,
  type Group,
  type Note,
  type NoteFilter,
  type SaveStatus,
} from "../domain/models";
import {
  clampTitle,
  createDefaultGroupRecord,
  filterNotes,
  groupNameErrorMessage,
  isDefaultGroup,
  isSameFilter,
  nextDefaultGroupName,
  resolveCreateNoteGroupId,
  sanitizeSettings,
  selectNextNoteAfterDelete,
  sortGroupsByOrder,
  validateGroupName,
} from "../domain/rules";
import { useAutosave } from "./useAutosave";

/** 生成稳定唯一 ID；优先使用浏览器原生 UUID */
function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 应用唯一业务状态源：协调数据库、筛选、选择、分组、笔记和设置。
 * 筛选/排序/当前笔记等派生值一律用 computed，避免重复状态。
 */
export function useLocalNote() {
  const ready = ref(false);
  const fatalError = ref<string | null>(null);
  const actionError = ref<string | null>(null);

  const groups = shallowRef<Group[]>([]);
  const notes = shallowRef<Note[]>([]);
  // shallowRef 避免把 { groupId } 做成深层 Proxy，导致 IndexedDB structured clone 失败
  const activeFilter = shallowRef<NoteFilter>("all");
  const selectedNoteId = ref<string | null>(null);
  const expandedGroupIds = ref<Set<string>>(new Set());
  const sidebarCollapsed = ref(false);
  const mobileSidebarOpen = ref(false);
  const saveStatus = ref<SaveStatus>("idle");
  /** 新建分组后需要立即进入重命名的分组 ID */
  const renamingGroupId = ref<string | null>(null);

  let db: IDBDatabase | null = null;

  const sortedGroups = computed(() => sortGroupsByOrder(groups.value));
  const visibleNotes = computed(() => filterNotes(notes.value, activeFilter.value));
  const selectedNote = computed(
    () => notes.value.find((note) => note.id === selectedNoteId.value) ?? null,
  );

  const autosave = useAutosave({
    saveStatus,
    save: async (draft) => {
      if (!db) {
        throw new Error("数据库尚未就绪");
      }
      const existing = notes.value.find((note) => note.id === draft.id);
      if (!existing) {
        throw new Error("笔记不存在，无法保存");
      }
      // updatedAt 以成功发起本次内容保存时的时间戳为准
      const next: Note = {
        ...existing,
        title: clampTitle(draft.title),
        content: draft.content,
        groupId: draft.groupId,
        updatedAt: Date.now(),
      };
      await updateNoteRecord(db, next);
      notes.value = notes.value.map((note) => (note.id === next.id ? next : note));
      return next;
    },
  });

  /** 将筛选条件转为可被 IndexedDB 克隆的纯数据 */
  function toPlainFilter(filter: NoteFilter): NoteFilter {
    if (typeof filter === "object") {
      return { groupId: filter.groupId };
    }
    return filter;
  }

  async function persistSelectionState(): Promise<void> {
    if (!db) {
      return;
    }
    try {
      await setSettings(db, [
        { key: SETTING_KEYS.activeFilter, value: toPlainFilter(activeFilter.value) },
        { key: SETTING_KEYS.selectedNoteId, value: selectedNoteId.value },
        {
          key: SETTING_KEYS.expandedGroupIds,
          value: Array.from(expandedGroupIds.value),
        },
        { key: SETTING_KEYS.sidebarCollapsed, value: sidebarCollapsed.value },
      ]);
    } catch (error) {
      console.error("保存界面设置失败", error);
    }
  }

  async function initialize(): Promise<void> {
    ready.value = false;
    fatalError.value = null;
    actionError.value = null;

    try {
      if (typeof indexedDB === "undefined") {
        throw new Error("当前浏览器不支持 IndexedDB，无法保存笔记");
      }

      db = await openLocalNoteDatabase();
      const data = await loadInitialData(db);

      // 确保默认分组存在，并把历史 null/孤立笔记迁移进去
      let nextGroups = [...data.groups];
      if (!nextGroups.some((group) => group.id === DEFAULT_GROUP_ID)) {
        const defaultGroup = createDefaultGroupRecord();
        await createGroupRecord(db, defaultGroup);
        nextGroups = [...nextGroups, defaultGroup];
      }

      const groupIdSet = new Set(nextGroups.map((group) => group.id));
      const now = Date.now();
      const nextNotes: Note[] = [];
      for (const note of data.notes) {
        // 兼容历史数据：groupId 可能为 null 或指向已删分组
        const rawGroupId = (note as Note & { groupId: string | null }).groupId;
        const needsMigrate = !rawGroupId || !groupIdSet.has(rawGroupId);
        if (needsMigrate) {
          const migrated: Note = {
            ...note,
            groupId: DEFAULT_GROUP_ID,
            updatedAt: now,
          };
          await updateNoteRecord(db, migrated);
          nextNotes.push(migrated);
        } else {
          nextNotes.push({ ...note, groupId: rawGroupId });
        }
      }

      const settings = sanitizeSettings(data.settings, nextGroups, nextNotes);

      groups.value = nextGroups;
      notes.value = nextNotes;
      activeFilter.value = settings.activeFilter;
      selectedNoteId.value = settings.selectedNoteId;
      expandedGroupIds.value = new Set(settings.expandedGroupIds);
      sidebarCollapsed.value = settings.sidebarCollapsed;
      ready.value = true;
    } catch (error) {
      console.error("初始化失败", error);
      db = null;
      fatalError.value = error instanceof Error ? error.message : "无法打开本地数据库，请稍后重试";
      ready.value = false;
    }
  }

  async function retryInitialize(): Promise<void> {
    await initialize();
  }

  async function selectFilter(filter: NoteFilter): Promise<void> {
    await autosave.flushPendingSave();
    activeFilter.value = filter;

    // 切换筛选时尽量保留当前笔记（若仍可见），否则选中筛选内最近笔记
    const current = selectedNote.value;
    if (!current || !visibleNotes.value.some((note) => note.id === current.id)) {
      selectedNoteId.value = visibleNotes.value[0]?.id ?? null;
    }

    // 选中具体分组时自动展开
    if (typeof filter === "object") {
      const next = new Set(expandedGroupIds.value);
      next.add(filter.groupId);
      expandedGroupIds.value = next;
    }

    await persistSelectionState();
  }

  async function selectNote(noteId: string): Promise<void> {
    if (noteId === selectedNoteId.value) {
      mobileSidebarOpen.value = false;
      return;
    }
    await autosave.flushPendingSave();
    selectedNoteId.value = noteId;
    mobileSidebarOpen.value = false;
    saveStatus.value = "idle";
    await persistSelectionState();
  }

  async function createNote(explicitGroupId?: string): Promise<Note | null> {
    if (!db) {
      actionError.value = "数据库尚未就绪";
      return null;
    }

    await autosave.flushPendingSave();

    const groupId =
      explicitGroupId !== undefined
        ? explicitGroupId
        : resolveCreateNoteGroupId(activeFilter.value);

    // 目标分组不存在时回退默认分组
    const safeGroupId = groups.value.some((group) => group.id === groupId)
      ? groupId
      : DEFAULT_GROUP_ID;

    const now = Date.now();
    const note: Note = {
      id: createId(),
      groupId: safeGroupId,
      title: DEFAULT_NOTE_TITLE,
      content: "",
      createdAt: now,
      updatedAt: now,
    };

    try {
      await createNoteRecord(db, note);
      notes.value = [...notes.value, note];
      selectedNoteId.value = note.id;
      saveStatus.value = "saved";
      mobileSidebarOpen.value = false;
      await persistSelectionState();
      actionError.value = null;
      return note;
    } catch (error) {
      console.error("创建笔记失败", error);
      actionError.value = toUserError(error, "创建笔记失败");
      return null;
    }
  }

  function updateNoteDraft(patch: { title?: string; content?: string }): void {
    const current = selectedNote.value;
    if (!current) {
      return;
    }

    const nextTitle = patch.title !== undefined ? clampTitle(patch.title) : current.title;
    const nextContent = patch.content !== undefined ? patch.content : current.content;

    // 先更新内存草稿，保证输入不被中断
    const draft: Note = {
      ...current,
      title: nextTitle,
      content: nextContent,
    };
    notes.value = notes.value.map((note) => (note.id === draft.id ? draft : note));
    autosave.scheduleSave(draft);
  }

  async function moveNote(noteId: string, groupId: string): Promise<boolean> {
    if (!db) {
      actionError.value = "数据库尚未就绪";
      return false;
    }

    await autosave.flushPendingSave();
    const current = notes.value.find((note) => note.id === noteId);
    if (!current) {
      return false;
    }
    if (current.groupId === groupId) {
      return true;
    }
    if (!groups.value.some((group) => group.id === groupId)) {
      actionError.value = "目标分组不存在";
      return false;
    }

    const next: Note = {
      ...current,
      groupId,
      updatedAt: Date.now(),
    };

    try {
      await updateNoteRecord(db, next);
      notes.value = notes.value.map((note) => (note.id === noteId ? next : note));
      actionError.value = null;
      return true;
    } catch (error) {
      console.error("移动笔记失败", error);
      actionError.value = toUserError(error, "移动笔记失败");
      return false;
    }
  }

  async function deleteNote(noteId: string): Promise<boolean> {
    if (!db) {
      actionError.value = "数据库尚未就绪";
      return false;
    }

    await autosave.flushPendingSave();
    const current = notes.value.find((note) => note.id === noteId);
    if (!current) {
      return false;
    }

    try {
      await deleteNoteRecord(db, noteId);
      const nextNotes = notes.value.filter((note) => note.id !== noteId);
      notes.value = nextNotes;

      if (selectedNoteId.value === noteId) {
        const nextSelected = selectNextNoteAfterDelete(nextNotes, current);
        selectedNoteId.value = nextSelected?.id ?? null;
        saveStatus.value = "idle";
      }

      await persistSelectionState();
      actionError.value = null;
      return true;
    } catch (error) {
      console.error("删除笔记失败", error);
      actionError.value = toUserError(error, "删除笔记失败");
      return false;
    }
  }

  async function createGroup(): Promise<Group | null> {
    if (!db) {
      actionError.value = "数据库尚未就绪";
      return null;
    }

    const name = nextDefaultGroupName(groups.value.map((group) => group.name));
    const now = Date.now();
    const maxOrder = groups.value.reduce((max, group) => Math.max(max, group.order), 0);
    const group: Group = {
      id: createId(),
      name,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await createGroupRecord(db, group);
      groups.value = [...groups.value, group];
      // 新建后展开并进入重命名
      const nextExpanded = new Set(expandedGroupIds.value);
      nextExpanded.add(group.id);
      expandedGroupIds.value = nextExpanded;
      renamingGroupId.value = group.id;
      activeFilter.value = { groupId: group.id };
      await persistSelectionState();
      actionError.value = null;
      return group;
    } catch (error) {
      console.error("创建分组失败", error);
      actionError.value = toUserError(error, "创建分组失败");
      return null;
    }
  }

  async function renameGroup(
    groupId: string,
    rawName: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!db) {
      return { ok: false, message: "数据库尚未就绪" };
    }

    const current = groups.value.find((group) => group.id === groupId);
    if (!current) {
      return { ok: false, message: "分组不存在" };
    }

    const existingNames = groups.value
      .filter((group) => group.id !== groupId)
      .map((group) => group.name);
    const validation = validateGroupName(rawName, existingNames);
    if (!validation.ok) {
      return { ok: false, message: groupNameErrorMessage(validation.reason) };
    }

    if (validation.name === current.name) {
      renamingGroupId.value = null;
      return { ok: true };
    }

    const next: Group = {
      ...current,
      name: validation.name,
      updatedAt: Date.now(),
    };

    try {
      await updateGroupRecord(db, next);
      groups.value = groups.value.map((group) => (group.id === groupId ? next : group));
      renamingGroupId.value = null;
      actionError.value = null;
      return { ok: true };
    } catch (error) {
      console.error("重命名分组失败", error);
      const message = toUserError(error, "重命名分组失败");
      actionError.value = message;
      return { ok: false, message };
    }
  }

  async function deleteGroup(groupId: string): Promise<boolean> {
    if (!db) {
      actionError.value = "数据库尚未就绪";
      return false;
    }

    // 默认分组受保护，不允许删除
    if (isDefaultGroup(groupId)) {
      actionError.value = "默认分组不能删除";
      return false;
    }

    await autosave.flushPendingSave();

    try {
      const migrated = await deleteGroupAndMoveNotes(db, groupId, DEFAULT_GROUP_ID);
      groups.value = groups.value.filter((group) => group.id !== groupId);

      const migratedMap = new Map(migrated.map((note) => [note.id, note]));
      notes.value = notes.value.map((note) => migratedMap.get(note.id) ?? note);

      const nextExpanded = new Set(expandedGroupIds.value);
      nextExpanded.delete(groupId);
      expandedGroupIds.value = nextExpanded;

      if (typeof activeFilter.value === "object" && activeFilter.value.groupId === groupId) {
        activeFilter.value = { groupId: DEFAULT_GROUP_ID };
      }

      if (selectedNoteId.value && !notes.value.some((note) => note.id === selectedNoteId.value)) {
        selectedNoteId.value = visibleNotes.value[0]?.id ?? null;
      }

      renamingGroupId.value = renamingGroupId.value === groupId ? null : renamingGroupId.value;

      await persistSelectionState();
      actionError.value = null;
      return true;
    } catch (error) {
      console.error("删除分组失败", error);
      actionError.value = toUserError(error, "删除分组失败");
      return false;
    }
  }

  async function toggleGroup(groupId: string): Promise<void> {
    const next = new Set(expandedGroupIds.value);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    expandedGroupIds.value = next;
    await persistSelectionState();
  }

  async function toggleSidebar(): Promise<void> {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    await persistSelectionState();
  }

  function openMobileSidebar(): void {
    mobileSidebarOpen.value = true;
  }

  function closeMobileSidebar(): void {
    mobileSidebarOpen.value = false;
  }

  async function retrySave(): Promise<void> {
    await autosave.retrySave();
  }

  async function flushPendingSave(): Promise<void> {
    await autosave.flushPendingSave();
  }

  function clearActionError(): void {
    actionError.value = null;
  }

  function clearRenamingGroup(): void {
    renamingGroupId.value = null;
  }

  function isFilterActive(filter: NoteFilter): boolean {
    return isSameFilter(activeFilter.value, filter);
  }

  function noteCountForGroup(groupId: string): number {
    return notes.value.filter((note) => note.groupId === groupId).length;
  }

  return {
    ready,
    fatalError,
    actionError,
    groups: sortedGroups,
    notes,
    activeFilter,
    visibleNotes,
    selectedNote,
    selectedNoteId,
    expandedGroupIds,
    sidebarCollapsed,
    mobileSidebarOpen,
    saveStatus,
    renamingGroupId,
    initialize,
    retryInitialize,
    selectFilter,
    selectNote,
    createNote,
    updateNoteDraft,
    moveNote,
    deleteNote,
    createGroup,
    renameGroup,
    deleteGroup,
    toggleGroup,
    toggleSidebar,
    openMobileSidebar,
    closeMobileSidebar,
    retrySave,
    flushPendingSave,
    clearActionError,
    clearRenamingGroup,
    isFilterActive,
    noteCountForGroup,
    isDefaultGroup,
  };
}

/** 将底层错误转换为用户可理解的中文提示；细节只打控制台 */
function toUserError(error: unknown, fallback: string): string {
  if (error instanceof DOMException) {
    if (error.name === "QuotaExceededError") {
      return "存储空间不足，请复制当前内容后清理浏览器空间再重试";
    }
  }
  if (error instanceof Error && error.message.includes("QuotaExceeded")) {
    return "存储空间不足，请复制当前内容后清理浏览器空间再重试";
  }
  return fallback;
}
