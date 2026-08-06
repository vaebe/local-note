declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, unknown>;
  export default component;
}

/** Vite 以原始字符串导入本地 SVG，供内联图标使用 */
declare module "*.svg?raw" {
  const content: string;
  export default content;
}
