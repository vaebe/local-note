<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import ActionDialog from "./components/ActionDialog.vue";
import AppIcon from "./components/AppIcon.vue";
import AppSidebar from "./components/AppSidebar.vue";
import EmptyState from "./components/EmptyState.vue";
import NoteEditor from "./components/NoteEditor.vue";
import { useLocalNote } from "./composables/useLocalNote";
import type { Group, Note } from "./domain/models";

/**
 * 页面组合层：连接侧边栏、编辑器、空状态与确认对话框。
 * 不直接操作 IndexedDB，也不实现防抖计时器。
 */
const noteApp = useLocalNote();

const sidebarRef = ref<InstanceType<typeof AppSidebar> | null>(null);

type DialogState =
  | { type: "none" }
  | { type: "delete-note"; note: Note }
  | { type: "delete-group"; group: Group; noteCount: number }
  | { type: "data-risk" }
  | { type: "action-error"; message: string };

const dialog = ref<DialogState>({ type: "none" });

const totalNoteCount = computed(() => noteApp.notes.value.length);
const noteCountByGroup = computed(() => {
  const map: Record<string, number> = {};
  for (const group of noteApp.groups.value) {
    map[group.id] = noteApp.noteCountForGroup(group.id);
  }
  return map;
});

const emptyState = computed(() => {
  if (!noteApp.ready.value) {
    return null;
  }
  if (noteApp.notes.value.length === 0) {
    return {
      title: "开始记录你的想法",
      description: "笔记仅保存在当前浏览器，打开即可书写。",
      actionLabel: "新建第一篇笔记",
    };
  }
  if (!noteApp.selectedNote.value) {
    if (noteApp.visibleNotes.value.length === 0) {
      return {
        title: "当前没有笔记",
        description: "可以新建一篇，或切换到其他筛选查看。",
        actionLabel: "新建笔记",
      };
    }
    return {
      title: "选择一篇笔记",
      description: "从左侧列表打开笔记，或新建一篇。",
      actionLabel: "新建笔记",
    };
  }
  return null;
});

const dialogOpen = computed(() => dialog.value.type !== "none");
const dialogTitle = computed(() => {
  switch (dialog.value.type) {
    case "delete-note":
      return "删除笔记";
    case "delete-group":
      return "删除分组";
    case "data-risk":
      return "关于本地数据";
    case "action-error":
      return "操作失败";
    default:
      return "";
  }
});
const dialogDescription = computed(() => {
  switch (dialog.value.type) {
    case "delete-note":
      return "删除后不可恢复，确定删除这篇笔记吗？";
    case "delete-group": {
      const count = dialog.value.noteCount;
      if (count === 0) {
        return `确定删除分组「${dialog.value.group.name}」吗？`;
      }
      return `删除分组「${dialog.value.group.name}」后，其中的 ${count} 篇笔记将移动到「默认分组」。笔记本身不会被删除。`;
    }
    case "data-risk":
      return "所有笔记仅保存在当前浏览器的本地存储中，不会自动同步到其他设备。清除站点数据、使用隐私模式或浏览器回收存储空间，都可能导致数据丢失。建议重要内容另行备份。";
    case "action-error":
      return dialog.value.message;
    default:
      return "";
  }
});
const dialogConfirmLabel = computed(() => {
  if (dialog.value.type === "delete-note" || dialog.value.type === "delete-group") {
    return "删除";
  }
  if (dialog.value.type === "action-error") {
    return "知道了";
  }
  return "确认";
});
const dialogDestructive = computed(
  () => dialog.value.type === "delete-note" || dialog.value.type === "delete-group",
);
const dialogInfoOnly = computed(
  () => dialog.value.type === "data-risk" || dialog.value.type === "action-error",
);

onMounted(() => {
  void noteApp.initialize();
  window.addEventListener("keydown", onGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onGlobalKeydown);
});

/** 快捷键：仅在页面可处理且不破坏输入编辑时拦截 */
function onGlobalKeydown(event: KeyboardEvent): void {
  if (dialogOpen.value) {
    return;
  }

  const meta = event.metaKey || event.ctrlKey;
  if (!meta) {
    return;
  }

  const key = event.key.toLowerCase();

  // Ctrl/Cmd + Shift + N：新建分组
  if (key === "n" && event.shiftKey) {
    event.preventDefault();
    void noteApp.createGroup();
    return;
  }

  // Ctrl/Cmd + N：新建笔记
  if (key === "n" && !event.shiftKey) {
    event.preventDefault();
    void noteApp.createNote();
    return;
  }

  // Ctrl/Cmd + B：展开/收起侧边栏
  if (key === "b") {
    event.preventDefault();
    if (window.matchMedia("(max-width: 1023px)").matches) {
      if (noteApp.mobileSidebarOpen.value) {
        noteApp.closeMobileSidebar();
      } else {
        noteApp.openMobileSidebar();
      }
    } else {
      void noteApp.toggleSidebar();
    }
  }
}

async function handleRenameGroup(groupId: string, name: string): Promise<void> {
  // 从菜单点“重命名”时，name 为当前名且尚未进入 renaming 状态
  if (noteApp.renamingGroupId.value !== groupId) {
    noteApp.renamingGroupId.value = groupId;
    return;
  }

  const result = await noteApp.renameGroup(groupId, name);
  if (!result.ok) {
    sidebarRef.value?.setGroupRenameError(groupId, result.message);
  }
}

function requestDeleteNote(noteId: string): void {
  const note = noteApp.notes.value.find((item) => item.id === noteId);
  if (!note) {
    return;
  }
  dialog.value = { type: "delete-note", note };
}

function requestDeleteGroup(groupId: string): void {
  const group = noteApp.groups.value.find((item) => item.id === groupId);
  if (!group) {
    return;
  }
  dialog.value = {
    type: "delete-group",
    group,
    noteCount: noteApp.noteCountForGroup(groupId),
  };
}

async function onDialogConfirm(): Promise<void> {
  const current = dialog.value;
  dialog.value = { type: "none" };

  if (current.type === "delete-note") {
    const ok = await noteApp.deleteNote(current.note.id);
    if (!ok && noteApp.actionError.value) {
      dialog.value = { type: "action-error", message: noteApp.actionError.value };
    }
    return;
  }

  if (current.type === "delete-group") {
    const ok = await noteApp.deleteGroup(current.group.id);
    if (!ok && noteApp.actionError.value) {
      dialog.value = { type: "action-error", message: noteApp.actionError.value };
    }
  }
}

function onDialogCancel(): void {
  dialog.value = { type: "none" };
}

async function handleMoveNote(noteId: string, groupId: string): Promise<void> {
  const ok = await noteApp.moveNote(noteId, groupId);
  if (!ok && noteApp.actionError.value) {
    dialog.value = { type: "action-error", message: noteApp.actionError.value };
  }
}

async function handleCreateNote(groupId?: string): Promise<void> {
  const note = await noteApp.createNote(groupId);
  if (!note && noteApp.actionError.value) {
    dialog.value = { type: "action-error", message: noteApp.actionError.value };
  }
}

async function handleCreateGroup(): Promise<void> {
  const group = await noteApp.createGroup();
  if (!group && noteApp.actionError.value) {
    dialog.value = { type: "action-error", message: noteApp.actionError.value };
  }
}
</script>

<template>
  <div class="app-root">
    <!-- 初始化失败：阻断式错误，不允许进入无法保存的编辑器 -->
    <div v-if="noteApp.fatalError.value" class="fatal-screen">
      <h1>无法打开本地数据库</h1>
      <p>{{ noteApp.fatalError.value }}</p>
      <button type="button" class="btn btn--primary" @click="noteApp.retryInitialize()">
        重试
      </button>
    </div>

    <div v-else-if="!noteApp.ready.value" class="loading-screen" role="status">
      正在加载本地笔记…
    </div>

    <div v-else class="app-shell" :class="{ 'sidebar-collapsed': noteApp.sidebarCollapsed.value }">
      <button
        v-if="noteApp.sidebarCollapsed.value"
        type="button"
        class="sidebar-launch sidebar-launch--desktop"
        aria-label="打开侧边栏"
        @click="noteApp.toggleSidebar()"
      >
        <AppIcon name="panel-left-open" />
      </button>

      <button
        type="button"
        class="sidebar-launch sidebar-launch--mobile"
        aria-label="打开侧边栏"
        @click="noteApp.openMobileSidebar()"
      >
        <AppIcon name="menu" />
      </button>

      <AppSidebar
        ref="sidebarRef"
        :groups="noteApp.groups.value"
        :visible-notes="noteApp.visibleNotes.value"
        :active-filter="noteApp.activeFilter.value"
        :selected-note-id="noteApp.selectedNoteId.value"
        :expanded-group-ids="noteApp.expandedGroupIds.value"
        :collapsed="noteApp.sidebarCollapsed.value"
        :mobile-open="noteApp.mobileSidebarOpen.value"
        :renaming-group-id="noteApp.renamingGroupId.value"
        :total-note-count="totalNoteCount"
        :note-count-by-group="noteCountByGroup"
        @select-filter="noteApp.selectFilter"
        @select-note="noteApp.selectNote"
        @create-note="handleCreateNote"
        @create-group="handleCreateGroup"
        @rename-group="handleRenameGroup"
        @delete-group="requestDeleteGroup"
        @toggle-group="noteApp.toggleGroup"
        @move-note="handleMoveNote"
        @delete-note="requestDeleteNote"
        @toggle-sidebar="noteApp.toggleSidebar"
        @close-mobile="noteApp.closeMobileSidebar"
        @show-data-risk="dialog = { type: 'data-risk' }"
        @cancel-rename-group="noteApp.clearRenamingGroup"
        @start-rename-group="(id) => (noteApp.renamingGroupId.value = id)"
      />

      <main class="main-pane">
        <NoteEditor
          v-if="noteApp.selectedNote.value"
          :note="noteApp.selectedNote.value"
          :save-status="noteApp.saveStatus.value"
          @update-title="(title) => noteApp.updateNoteDraft({ title })"
          @update-content="(content) => noteApp.updateNoteDraft({ content })"
          @retry-save="noteApp.retrySave"
        />
        <EmptyState
          v-else-if="emptyState"
          :title="emptyState.title"
          :description="emptyState.description"
          :action-label="emptyState.actionLabel"
          @action="handleCreateNote()"
        />
      </main>
    </div>

    <ActionDialog
      :open="dialogOpen"
      :title="dialogTitle"
      :description="dialogDescription"
      :confirm-label="dialogConfirmLabel"
      :destructive="dialogDestructive"
      :info-only="dialogInfoOnly"
      :cancelable="!dialogInfoOnly"
      @confirm="onDialogConfirm"
      @cancel="onDialogCancel"
    />
  </div>
</template>
