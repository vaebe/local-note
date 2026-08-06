import { nextTick, onUnmounted, ref } from "vue";

export type AnchoredMenuPlaceOptions = {
  /** 预估面板高度，用于靠近视口底部时向上展开 */
  estimatedHeight?: number;
  /** 面板宽度，用于右对齐与左右边界夹紧 */
  panelWidth?: number;
};

/**
 * 根据触发按钮计算 fixed 菜单坐标，避免 overflow 容器裁切。
 */
export function placeAnchoredMenu(
  trigger: HTMLElement,
  options?: AnchoredMenuPlaceOptions,
): Record<string, string> {
  const estimatedHeight = options?.estimatedHeight ?? 220;
  const panelWidth = options?.panelWidth ?? 172;
  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  let top = rect.bottom + 4;
  let left = rect.right - panelWidth;

  if (top + estimatedHeight > window.innerHeight - margin) {
    top = Math.max(margin, rect.top - estimatedHeight - 4);
  }
  if (left < margin) {
    left = margin;
  }
  if (left + panelWidth > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - panelWidth - margin);
  }

  return {
    position: "fixed",
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    right: "auto",
    zIndex: "60",
    width: `${panelWidth}px`,
  };
}

/**
 * 单个触发器的锚定菜单状态（分组行等）。
 */
export function useAnchoredMenu(options?: AnchoredMenuPlaceOptions) {
  const open = ref(false);
  const panelStyle = ref<Record<string, string>>({});
  const triggerEl = ref<HTMLElement | null>(null);

  function onDocumentPointerDown(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (triggerEl.value?.contains(target)) {
      return;
    }
    const panels = document.querySelectorAll("[data-anchored-menu-panel]");
    for (const panel of panels) {
      if (panel.contains(target)) {
        return;
      }
    }
    close();
  }

  function bindDismissListeners(): void {
    // 捕获阶段监听滚动，侧栏内部滚动也会关闭，避免菜单悬空
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
  }

  function unbindDismissListeners(): void {
    window.removeEventListener("scroll", close, true);
    window.removeEventListener("resize", close);
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  }

  function close(): void {
    if (!open.value) {
      return;
    }
    open.value = false;
    unbindDismissListeners();
  }

  /** 切换菜单；传入触发按钮（通常为 event.currentTarget） */
  async function toggle(fromEl: EventTarget | null): Promise<void> {
    if (open.value) {
      close();
      return;
    }
    if (!(fromEl instanceof HTMLElement)) {
      return;
    }
    triggerEl.value = fromEl;
    open.value = true;
    panelStyle.value = placeAnchoredMenu(fromEl, options);
    await nextTick();
    bindDismissListeners();
  }

  onUnmounted(() => {
    close();
  });

  return {
    open,
    panelStyle,
    toggle,
    close,
  };
}

/**
 * 多触发器共用一套关闭监听（笔记列表多项菜单）。
 */
export function useSharedMenuDismiss(onClose: () => void): {
  bind: () => void;
  unbind: () => void;
} {
  function onDocumentPointerDown(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (target instanceof Element && target.closest("[data-anchored-menu-trigger]")) {
      return;
    }
    const panels = document.querySelectorAll("[data-anchored-menu-panel]");
    for (const panel of panels) {
      if (panel.contains(target)) {
        return;
      }
    }
    onClose();
    unbind();
  }

  function onViewportChange(): void {
    onClose();
    unbind();
  }

  function bind(): void {
    unbind();
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
  }

  function unbind(): void {
    window.removeEventListener("scroll", onViewportChange, true);
    window.removeEventListener("resize", onViewportChange);
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  }

  onUnmounted(() => {
    unbind();
  });

  return { bind, unbind };
}
