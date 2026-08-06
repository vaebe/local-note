<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

/**
 * 通用确认对话框：删除笔记/分组、数据风险说明等。
 * 使用原生 dialog，关闭后焦点返回触发按钮。
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    cancelable?: boolean;
    /** 仅信息展示时隐藏确认按钮 */
    infoOnly?: boolean;
  }>(),
  {
    confirmLabel: "确认",
    cancelLabel: "取消",
    destructive: false,
    cancelable: true,
    infoOnly: false,
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);
const previouslyFocused = ref<HTMLElement | null>(null);

watch(
  () => props.open,
  async (isOpen) => {
    const dialog = dialogRef.value;
    if (!dialog) {
      return;
    }

    if (isOpen) {
      previouslyFocused.value =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!dialog.open) {
        dialog.showModal();
      }
      await nextTick();
      const focusTarget = dialog.querySelector<HTMLElement>(
        props.infoOnly || !props.cancelable
          ? "[data-dialog-confirm], [data-dialog-cancel]"
          : "[data-dialog-cancel], [data-dialog-confirm]",
      );
      focusTarget?.focus();
    } else if (dialog.open) {
      dialog.close();
      restoreFocus();
    }
  },
);

function restoreFocus(): void {
  const target = previouslyFocused.value;
  previouslyFocused.value = null;
  // 下一帧恢复，避免 dialog 关闭动画抢焦点
  requestAnimationFrame(() => {
    target?.focus();
  });
}

function onCancel(event: Event): void {
  // 拦截原生 cancel，统一走 cancelable 逻辑
  event.preventDefault();
  if (props.cancelable || props.infoOnly) {
    emit("cancel");
  }
}

function onConfirm(): void {
  emit("confirm");
}

function onDismiss(): void {
  if (props.cancelable || props.infoOnly) {
    emit("cancel");
  }
}

onBeforeUnmount(() => {
  const dialog = dialogRef.value;
  if (dialog?.open) {
    dialog.close();
  }
});
</script>

<template>
  <dialog ref="dialogRef" class="action-dialog" @cancel="onCancel">
    <form method="dialog" class="action-dialog__panel" @submit.prevent>
      <h2 class="action-dialog__title">{{ title }}</h2>
      <p class="action-dialog__desc">{{ description }}</p>
      <div class="action-dialog__actions">
        <button
          v-if="cancelable || infoOnly"
          type="button"
          class="btn btn--ghost"
          data-dialog-cancel
          @click="onDismiss"
        >
          {{ infoOnly ? "知道了" : cancelLabel }}
        </button>
        <button
          v-if="!infoOnly"
          type="button"
          class="btn"
          :class="destructive ? 'btn--danger' : 'btn--primary'"
          data-dialog-confirm
          @click="onConfirm"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </form>
  </dialog>
</template>
