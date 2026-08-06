<script setup lang="ts">
/**
 * 本地静态图标：来自 Iconify Lucide 集，以 SVG raw 内联渲染，支持 currentColor。
 * 不引入图标运行时依赖，体积可控。
 */
import chevronRight from "../assets/icons/chevron-right.svg?raw";
import ellipsis from "../assets/icons/ellipsis.svg?raw";
import files from "../assets/icons/files.svg?raw";
import folder from "../assets/icons/folder.svg?raw";
import folderPlus from "../assets/icons/folder-plus.svg?raw";
import inbox from "../assets/icons/inbox.svg?raw";
import info from "../assets/icons/info.svg?raw";
import menu from "../assets/icons/menu.svg?raw";
import notebookPen from "../assets/icons/notebook-pen.svg?raw";
import panelLeftClose from "../assets/icons/panel-left-close.svg?raw";
import panelLeftOpen from "../assets/icons/panel-left-open.svg?raw";
import plus from "../assets/icons/plus.svg?raw";
import stickyNote from "../assets/icons/sticky-note.svg?raw";
import x from "../assets/icons/x.svg?raw";

const ICONS = {
  "chevron-right": chevronRight,
  ellipsis,
  files,
  folder,
  "folder-plus": folderPlus,
  inbox,
  info,
  menu,
  "notebook-pen": notebookPen,
  "panel-left-close": panelLeftClose,
  "panel-left-open": panelLeftOpen,
  plus,
  "sticky-note": stickyNote,
  x,
} as const;

export type IconName = keyof typeof ICONS;

const props = withDefaults(
  defineProps<{
    name: IconName;
    /** 图标边长，默认 18 */
    size?: number | string;
  }>(),
  {
    size: 18,
  },
);
</script>

<template>
  <span
    class="app-icon"
    :style="{ width: `${size}px`, height: `${size}px` }"
    v-html="ICONS[props.name]"
    aria-hidden="true"
  />
</template>
