<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { GROUP_NAME_MAX_LENGTH, type Group } from "../domain/models";
import { useAnchoredMenu } from "../composables/useAnchoredMenu";
import AppIcon from "./AppIcon.vue";

/**
 * 一级分组行：展开状态、名称编辑与分组操作。
 * 不提供创建子分组入口；空分组仍可选中并创建笔记。
 */
const props = withDefaults(
  defineProps<{
    group: Group;
    expanded: boolean;
    active: boolean;
    noteCount: number;
    renaming: boolean;
    /** 默认分组不可删除 */
    deletable?: boolean;
  }>(),
  {
    deletable: true,
  },
);

const emit = defineEmits<{
  select: [];
  toggle: [];
  "create-note": [];
  rename: [name: string];
  delete: [];
  "cancel-rename": [];
}>();

const nameInputRef = ref<HTMLInputElement | null>(null);
const draftName = ref(props.group.name);
const localError = ref("");
const {
  open: menuOpen,
  panelStyle: menuPanelStyle,
  toggle: toggleMenu,
  close: closeMenu,
} = useAnchoredMenu({ panelWidth: 148, estimatedHeight: 120 });

watch(
  () => props.group.name,
  (name) => {
    if (!props.renaming) {
      draftName.value = name;
    }
  },
);

watch(
  () => props.renaming,
  async (isRenaming) => {
    if (isRenaming) {
      draftName.value = props.group.name;
      localError.value = "";
      await nextTick();
      nameInputRef.value?.focus();
      nameInputRef.value?.select();
    }
  },
  { immediate: true },
);

/** 防止 Enter 触发 submit 后 blur 再次提交，导致同名校验误报 */
let renameSubmitting = false;

function submitRename(): void {
  if (renameSubmitting || !props.renaming) {
    return;
  }
  renameSubmitting = true;
  localError.value = "";
  emit("rename", draftName.value);
  // 下一轮事件循环再允许提交，覆盖 Enter+blur 的连续触发
  window.setTimeout(() => {
    renameSubmitting = false;
  }, 0);
}

function cancelRename(): void {
  draftName.value = props.group.name;
  localError.value = "";
  emit("cancel-rename");
}

function onRenameKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter") {
    event.preventDefault();
    // 统一走 blur 提交路径，避免 Enter 与 blur 各提交一次
    nameInputRef.value?.blur();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancelRename();
  }
}

function setRenameError(message: string): void {
  localError.value = message;
}

defineExpose({ setRenameError });
</script>

<template>
  <div class="group-section" :class="{ 'is-active': active }">
    <div class="group-section__row">
      <button
        type="button"
        class="icon-btn group-section__toggle"
        :aria-expanded="expanded"
        :aria-label="expanded ? `收起分组 ${group.name}` : `展开分组 ${group.name}`"
        @click.stop="emit('toggle')"
      >
        <AppIcon name="chevron-right" class="chevron" :class="{ 'is-open': expanded }" />
      </button>

      <template v-if="renaming">
        <input
          ref="nameInputRef"
          v-model="draftName"
          class="group-section__name-input"
          type="text"
          :maxlength="GROUP_NAME_MAX_LENGTH"
          aria-label="分组名称"
          @keydown="onRenameKeydown"
          @blur="submitRename"
        />
      </template>
      <button v-else type="button" class="group-section__name" @click="emit('select')">
        <span class="group-section__label">{{ group.name }}</span>
        <span class="group-section__count">{{ noteCount }}</span>
      </button>

      <div class="group-section__actions">
        <button
          type="button"
          class="icon-btn"
          aria-label="在此分组新建笔记"
          @click.stop="emit('create-note')"
        >
          <AppIcon name="plus" />
        </button>
        <div class="menu">
          <button
            type="button"
            class="icon-btn"
            data-anchored-menu-trigger
            aria-label="分组更多操作"
            :aria-expanded="menuOpen"
            @click.stop="toggleMenu($event.currentTarget)"
          >
            <AppIcon name="ellipsis" />
          </button>
          <Teleport to="body">
            <div
              v-if="menuOpen"
              class="menu__panel menu__panel--anchored"
              role="menu"
              data-anchored-menu-panel
              :style="menuPanelStyle"
            >
              <button
                type="button"
                role="menuitem"
                class="menu__item"
                @click="
                  closeMenu();
                  emit('select');
                  emit('rename', group.name);
                "
              >
                重命名
              </button>
              <button
                v-if="deletable"
                type="button"
                role="menuitem"
                class="menu__item menu__item--danger"
                @click="
                  closeMenu();
                  emit('delete');
                "
              >
                删除分组
              </button>
            </div>
          </Teleport>
        </div>
      </div>
    </div>
    <p v-if="localError" class="group-section__error">{{ localError }}</p>
  </div>
</template>
