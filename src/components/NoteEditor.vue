<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { TITLE_MAX_LENGTH, type Note, type SaveStatus } from "../domain/models";
import { isTitleAtLimit } from "../domain/rules";

/**
 * 笔记编辑区：标题、更新时间、正文与保存状态。
 * 使用原生 input/textarea，不引入富文本。
 */
const props = defineProps<{
  note: Note;
  saveStatus: SaveStatus;
}>();

const emit = defineEmits<{
  "update-title": [value: string];
  "update-content": [value: string];
  "retry-save": [];
}>();

const titleInputRef = ref<HTMLInputElement | null>(null);
const showTitleLimitHint = ref(false);
/** 记录上次聚焦过的笔记，避免重复抢焦点 */
const lastFocusedNoteId = ref<string | null>(null);

watch(
  () => props.note.id,
  async (noteId) => {
    showTitleLimitHint.value = false;
    if (lastFocusedNoteId.value === noteId) {
      return;
    }
    lastFocusedNoteId.value = noteId;
    await nextTick();
    // 切换到（含新建）笔记后聚焦标题，便于立即输入
    titleInputRef.value?.focus();
    titleInputRef.value?.select();
  },
  { immediate: true },
);

function onTitleInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  let value = target.value;
  if (value.length > TITLE_MAX_LENGTH) {
    value = value.slice(0, TITLE_MAX_LENGTH);
    target.value = value;
    showTitleLimitHint.value = true;
  } else {
    showTitleLimitHint.value = isTitleAtLimit(value);
  }
  emit("update-title", value);
}

function onContentInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  emit("update-content", target.value);
}

function formatUpdatedAt(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function statusText(status: SaveStatus): string {
  switch (status) {
    case "saving":
      return "保存中…";
    case "saved":
      return "已保存";
    case "error":
      return "保存失败";
    default:
      return "";
  }
}
</script>

<template>
  <section class="note-editor" aria-label="笔记编辑区">
    <header class="note-editor__header">
      <input
        ref="titleInputRef"
        class="note-editor__title"
        type="text"
        :value="note.title"
        :maxlength="TITLE_MAX_LENGTH"
        placeholder="无标题笔记"
        aria-label="笔记标题"
        @input="onTitleInput"
      />
      <div class="note-editor__meta">
        <time class="note-editor__time" :datetime="new Date(note.updatedAt).toISOString()">
          更新于 {{ formatUpdatedAt(note.updatedAt) }}
        </time>
        <div
          class="note-editor__status"
          :class="{
            'note-editor__status--error': saveStatus === 'error',
            'note-editor__status--muted': saveStatus === 'saved' || saveStatus === 'saving',
            'note-editor__status--idle': saveStatus === 'idle' || !saveStatus,
          }"
          aria-live="polite"
        >
          <span v-if="statusText(saveStatus)">{{ statusText(saveStatus) }}</span>
          <button
            v-if="saveStatus === 'error'"
            type="button"
            class="btn btn--ghost btn--small"
            @click="emit('retry-save')"
          >
            重试
          </button>
        </div>
      </div>
      <p v-if="showTitleLimitHint" class="note-editor__hint">
        标题最长 {{ TITLE_MAX_LENGTH }} 个字符
      </p>
    </header>

    <textarea
      class="note-editor__content"
      :value="note.content"
      placeholder="开始记录…"
      aria-label="笔记正文"
      @input="onContentInput"
    />
  </section>
</template>
