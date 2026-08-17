<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { Group, Note, NoteFilter } from "../domain/models";
import { isDefaultGroup } from "../domain/rules";
import { placeAnchoredMenu, useSharedMenuDismiss } from "../composables/useAnchoredMenu";
import AppIcon from "./AppIcon.vue";
import GroupSection from "./GroupSection.vue";

/**
 * 侧边栏：系统筛选入口、分组列表、可见笔记、创建入口与本地存储提示。
 * 组件只发出用户意图，不直接写数据库。
 * 笔记菜单使用 fixed 锚定，避免列表 overflow 裁切。
 */
const props = defineProps<{
  groups: Group[];
  visibleNotes: Note[];
  activeFilter: NoteFilter;
  selectedNoteId: string | null;
  expandedGroupIds: ReadonlySet<string>;
  collapsed: boolean;
  mobileOpen: boolean;
  renamingGroupId: string | null;
  totalNoteCount: number;
  noteCountByGroup: Record<string, number>;
}>();

const emit = defineEmits<{
  "select-filter": [filter: NoteFilter];
  "select-note": [noteId: string];
  "create-note": [groupId?: string];
  "create-group": [];
  "rename-group": [groupId: string, name: string];
  "delete-group": [groupId: string];
  "toggle-group": [groupId: string];
  "move-note": [noteId: string, groupId: string];
  "delete-note": [noteId: string];
  "toggle-sidebar": [];
  "close-mobile": [];
  "show-data-risk": [];
  "cancel-rename-group": [];
  "start-rename-group": [groupId: string];
}>();

const openNoteMenuId = ref<string | null>(null);
const noteMenuStyle = ref<Record<string, string>>({});
const groupSectionRefs = ref<Record<string, InstanceType<typeof GroupSection> | null>>({});

const menuDismiss = useSharedMenuDismiss(() => {
  openNoteMenuId.value = null;
});

const isAllActive = computed(() => props.activeFilter === "all");

function isGroupActive(groupId: string): boolean {
  return typeof props.activeFilter === "object" && props.activeFilter.groupId === groupId;
}

function noteTitle(note: Note): string {
  const title = note.title.trim();
  return title || "无标题笔记";
}

function setGroupSectionRef(groupId: string, el: unknown): void {
  if (el) {
    groupSectionRefs.value[groupId] = el as InstanceType<typeof GroupSection>;
  } else {
    delete groupSectionRefs.value[groupId];
  }
}

/** 供父组件在重命名失败时写入错误文案 */
function setGroupRenameError(groupId: string, message: string): void {
  groupSectionRefs.value[groupId]?.setRenameError(message);
}

/** 切换笔记菜单并锚定到触发按钮 */
async function toggleNoteMenu(noteId: string, event: MouseEvent): Promise<void> {
  event.stopPropagation();
  if (openNoteMenuId.value === noteId) {
    openNoteMenuId.value = null;
    menuDismiss.unbind();
    return;
  }
  const trigger = event.currentTarget;
  if (!(trigger instanceof HTMLElement)) {
    return;
  }
  openNoteMenuId.value = noteId;
  noteMenuStyle.value = placeAnchoredMenu(trigger, {
    panelWidth: 172,
    estimatedHeight: 260,
  });
  await nextTick();
  menuDismiss.bind();
}

function closeNoteMenu(): void {
  openNoteMenuId.value = null;
  menuDismiss.unbind();
}

defineExpose({ setGroupRenameError });
</script>

<template>
  <div
    class="sidebar-shell"
    :class="{
      'is-collapsed': collapsed,
      'is-mobile-open': mobileOpen,
    }"
  >
    <div class="sidebar-backdrop" aria-hidden="true" @click="emit('close-mobile')" />

    <aside class="sidebar" aria-label="笔记导航">
      <header class="sidebar__header">
        <div class="sidebar__brand">
          <span class="sidebar__logo" aria-hidden="true">
            <AppIcon name="notebook-pen" :size="16" />
          </span>
          <h1 class="sidebar__title">Local Note</h1>
        </div>
        <div class="sidebar__header-actions">
          <button
            type="button"
            class="icon-btn"
            aria-label="新建笔记"
            title="新建笔记"
            @click="emit('create-note')"
          >
            <AppIcon name="plus" />
          </button>
          <button
            type="button"
            class="icon-btn sidebar__desktop-collapse"
            aria-label="收起侧边栏"
            @click="emit('toggle-sidebar')"
          >
            <AppIcon name="panel-left-close" />
          </button>
        </div>
      </header>

      <nav class="sidebar__nav" aria-label="筛选与分组">
        <!-- 系统入口与新建入口固定，不参与分组列表滚动 -->
        <div class="sidebar__nav-static">
          <button
            type="button"
            class="nav-item"
            :class="{ 'is-active': isAllActive }"
            @click="emit('select-filter', 'all')"
          >
            <AppIcon name="files" :size="16" />
            <span>全部笔记</span>
            <span class="nav-item__count">{{ totalNoteCount }}</span>
          </button>

          <div class="sidebar__section-label">分组</div>

          <button
            type="button"
            class="btn btn--ghost sidebar__new-group"
            @click="emit('create-group')"
          >
            <AppIcon name="folder-plus" :size="16" />
            新建分组
          </button>
        </div>

        <!-- 仅分组列表可滚动 -->
        <div class="sidebar__groups-scroll">
          <div v-for="group in groups" :key="group.id" class="sidebar__group-block">
            <GroupSection
              :ref="(el) => setGroupSectionRef(group.id, el)"
              :group="group"
              :expanded="expandedGroupIds.has(group.id)"
              :active="isGroupActive(group.id)"
              :noteCount="noteCountByGroup[group.id] ?? 0"
              :renaming="renamingGroupId === group.id"
              :deletable="!isDefaultGroup(group.id)"
              @select="emit('select-filter', { groupId: group.id })"
              @toggle="emit('toggle-group', group.id)"
              @create-note="emit('create-note', group.id)"
              @rename="
                (name) => {
                  if (renamingGroupId === group.id) {
                    emit('rename-group', group.id, name);
                  } else {
                    emit('start-rename-group', group.id);
                  }
                }
              "
              @delete="emit('delete-group', group.id)"
              @cancel-rename="emit('cancel-rename-group')"
            />
          </div>
        </div>
      </nav>

      <section class="sidebar__notes" aria-label="笔记列表">
        <div class="sidebar__section-label">笔记</div>
        <div v-if="visibleNotes.length === 0" class="sidebar__empty-hint">当前没有笔记</div>
        <ul v-else class="note-list">
          <li v-for="note in visibleNotes" :key="note.id" class="note-list__item">
            <!-- 使用 div 避免原生按钮的文字基线影响垂直居中，同时保留键盘操作语义。 -->
            <div
              class="note-list__button"
              :class="{ 'is-active': note.id === selectedNoteId }"
              role="button"
              tabindex="0"
              @click="emit('select-note', note.id)"
              @keydown.enter.prevent="emit('select-note', note.id)"
              @keydown.space.prevent="emit('select-note', note.id)"
            >
              {{ noteTitle(note) }}
            </div>
            <div class="menu note-list__menu">
              <button
                type="button"
                class="icon-btn"
                data-anchored-menu-trigger
                aria-label="笔记更多操作"
                :aria-expanded="openNoteMenuId === note.id"
                @click="toggleNoteMenu(note.id, $event)"
              >
                <AppIcon name="ellipsis" />
              </button>
              <Teleport to="body">
                <div
                  v-if="openNoteMenuId === note.id"
                  class="menu__panel menu__panel--wide menu__panel--anchored"
                  role="menu"
                  data-anchored-menu-panel
                  :style="noteMenuStyle"
                >
                  <div class="menu__label">移动到</div>
                  <button
                    v-for="group in groups"
                    :key="group.id"
                    type="button"
                    role="menuitem"
                    class="menu__item"
                    @click="
                      closeNoteMenu();
                      emit('move-note', note.id, group.id);
                    "
                  >
                    {{ group.name }}
                  </button>
                  <div class="menu__divider" />
                  <button
                    type="button"
                    role="menuitem"
                    class="menu__item menu__item--danger"
                    @click="
                      closeNoteMenu();
                      emit('delete-note', note.id);
                    "
                  >
                    删除笔记
                  </button>
                </div>
              </Teleport>
            </div>
          </li>
        </ul>
      </section>

      <footer class="sidebar__footer">
        <button type="button" class="sidebar__data-link" @click="emit('show-data-risk')">
          <AppIcon name="info" :size="14" />
          数据保存在此浏览器
        </button>
        <!-- 效率用户可发现快捷键；文案保持克制 -->
        <p class="sidebar__shortcut-hint">Ctrl/⌘ N 新建 · B 侧栏</p>
      </footer>
    </aside>
  </div>
</template>
