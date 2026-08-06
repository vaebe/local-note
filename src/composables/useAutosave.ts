import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import { AUTOSAVE_DELAY_MS, type Note, type SaveStatus } from "../domain/models";

export interface AutosaveOptions {
  /** 真正执行写入；返回保存成功后的笔记记录 */
  save: (note: Note) => Promise<Note>;
  /** 保存状态对外同步 */
  saveStatus: Ref<SaveStatus>;
}

/**
 * 管理当前笔记的 500ms 防抖保存。
 * 同一时间只保留一个计时器；用递增序号避免旧请求覆盖新状态。
 */
export function useAutosave(options: AutosaveOptions) {
  const pendingNote = ref<Note | null>(null);
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let requestSeq = 0;
  let inFlight = false;

  function clearTimer(): void {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  /** 取消待执行计时器并丢弃草稿（切换前应先 flush） */
  function cancelPending(): void {
    clearTimer();
    pendingNote.value = null;
  }

  /** 用户输入后调用：重置 500ms 计时器 */
  function scheduleSave(note: Note): void {
    pendingNote.value = { ...note };
    options.saveStatus.value = "idle";
    clearTimer();
    timerId = setTimeout(() => {
      timerId = null;
      void flushPendingSave();
    }, AUTOSAVE_DELAY_MS);
  }

  /**
   * 立即尝试保存最新草稿。
   * 页面隐藏、切换笔记、卸载时调用；关闭页面时仅尽力提交。
   */
  async function flushPendingSave(): Promise<void> {
    clearTimer();
    const snapshot = pendingNote.value;
    if (!snapshot || inFlight) {
      return;
    }

    inFlight = true;
    const seq = ++requestSeq;
    options.saveStatus.value = "saving";

    try {
      const saved = await options.save(snapshot);
      // 仅当仍是最新一次请求时才更新成功状态
      if (seq === requestSeq) {
        // 若 flush 期间又有更新，保留更新后的草稿
        if (
          pendingNote.value &&
          pendingNote.value.id === saved.id &&
          (pendingNote.value.title !== snapshot.title ||
            pendingNote.value.content !== snapshot.content ||
            pendingNote.value.groupId !== snapshot.groupId)
        ) {
          options.saveStatus.value = "idle";
        } else if (pendingNote.value?.id === saved.id) {
          pendingNote.value = null;
          options.saveStatus.value = "saved";
        } else {
          options.saveStatus.value = "saved";
        }
      }
    } catch (error) {
      console.error("自动保存失败", error);
      if (seq === requestSeq) {
        // 失败时保留最后一次待保存快照，供重试使用
        pendingNote.value = snapshot;
        options.saveStatus.value = "error";
      }
    } finally {
      inFlight = false;
      // 保存过程中又有新输入时，继续调度
      if (pendingNote.value && options.saveStatus.value !== "error" && timerId === null) {
        const latest = pendingNote.value;
        if (
          latest.title !== snapshot.title ||
          latest.content !== snapshot.content ||
          latest.groupId !== snapshot.groupId
        ) {
          scheduleSave(latest);
        }
      }
    }
  }

  /** 保存失败后的手动重试 */
  async function retrySave(): Promise<void> {
    if (!pendingNote.value) {
      return;
    }
    await flushPendingSave();
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === "hidden") {
      void flushPendingSave();
    }
  }

  function handlePageHide(): void {
    void flushPendingSave();
  }

  onMounted(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", handlePageHide);
    void flushPendingSave();
  });

  return {
    scheduleSave,
    flushPendingSave,
    retrySave,
    cancelPending,
    pendingNote,
  };
}
