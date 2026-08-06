# Local Note MVP 执行计划

> **状态：历史归档（已实施）**  
> 本文档记录 MVP 落地时的分阶段计划与验收清单，**不再作为待办**。  
> 现行说明请看 [README.md](../README.md)、[PRODUCT.md](../PRODUCT.md)、[product-requirements.md](./product-requirements.md)。  
> 实施后产品有调整：无「未分组」入口、默认分组不可删除、内容区最大宽度 1280px。

## 1. 计划信息

- 执行项目：`D:\codetest\local-note`
- 产品依据：`docs/product-requirements.md`
- 目标版本：MVP
- 建议执行者：Grok 4.5
- 最终验收者：Codex
- 技术栈：Vue 3.5、TypeScript、Vite+

本计划的目标是实现一个自用、极简、打开快、输入顺畅的本地优先在线笔记。执行时优先保证核心流程舒适可靠，不扩大到账号、同步、Markdown、搜索、回收站或复杂设置。

## 2. 完成标准

只有同时满足以下条件，才可认为 MVP 实施完成：

1. 用户可以创建、编辑、移动和删除笔记。
2. 用户可以创建、重命名、展开、收起和删除一级分组。
3. 标题和正文停止输入 500ms 后自动保存，刷新页面后内容完整恢复。
4. “全部笔记”“未分组”和各分组可以正确筛选笔记，笔记按 `updatedAt` 倒序显示。
5. 桌面端和移动端均可完成核心操作，移动端侧边栏使用抽屉布局。
6. IndexedDB 初始化或写入失败时，界面有明确反馈，当前输入不会被主动清空。
7. 核心控件可使用键盘访问，焦点状态可见。
8. `vp check`、`vp test` 和 `vp run build` 实际执行成功。
9. 浏览器人工验收清单全部完成，控制台没有未处理异常。

## 3. 已确定的实现约束

### 3.1 范围约束

本次只实现 `docs/product-requirements.md` 中的 MVP。以下能力不实现：

- 登录、云同步、分享和协作。
- Markdown、富文本、图片和附件。
- 搜索、标签、回收站和版本历史。
- 导入导出、拖拽排序和深色模式。
- PWA、离线资源缓存和后端服务。
- 多标签页冲突合并；MVP 保持最后写入覆盖。

### 3.2 依赖约束

- 使用项目已有的 Vue、TypeScript 和 Vite+。
- 直接使用浏览器原生 IndexedDB，不添加 `idb`、Dexie 等数据层依赖。
- 不添加 Pinia；应用状态由一个顶层 composable 管理。
- 不添加 Vue Router；应用只有一个页面。
- 不添加 UI 组件库、图标库、日期库或 CSS 框架。
- 测试使用 Vite+ 内置 Vitest，测试 API 从 `vite-plus/test` 导入。
- 如果执行过程中认为必须增加依赖，暂停实施并先说明原因、体积影响和替代方案，获得用户确认后再添加。

### 3.3 产品行为约束

- “全部笔记”是扁平筛选视图，显示所有笔记。
- “未分组”只显示 `groupId === null` 的笔记。
- 点击某个分组后只显示该分组笔记。
- 在“全部笔记”或未明确选择分组时新建笔记，笔记进入“未分组”。
- 在“未分组”中创建笔记，笔记进入“未分组”。
- 在具体分组中创建笔记，笔记直接进入该分组。
- 首次进入不自动生成笔记，显示“新建第一篇笔记”按钮。
- 新建笔记标题为“无标题笔记”，正文为空，并聚焦标题输入框。
- 删除分组时不删除笔记，分组内笔记在同一事务中移动到“未分组”。
- 分组名称去除首尾空格后进行非空、最长 40 字符和完全重复校验。
- 标题最长 120 字符；正文不设置产品级硬限制。
- 快捷键仅在浏览器把键盘事件交给页面时处理，不以破坏浏览器保留行为为代价。

### 3.4 代码约束

- 所有 Vue 组件使用 Composition API 和 `<script setup lang="ts">`。
- `App.vue` 只负责页面组合，不承载完整的数据访问实现。
- 状态保持单一来源；筛选、排序和当前笔记等派生值使用 `computed`。
- IndexedDB 写入、事件监听和自动保存等副作用放在 composable 或数据模块中。
- 组件通过类型明确的 props 和 emits 通信，不直接修改 props。
- 新增函数、类型、关键分支和魔法值添加简洁中文注释，重点解释用途和原因。
- 不保留模板示例代码、模板图片或未使用的 import。
- 不顺手重构 Vite+ 配置或修改与本产品无关的项目规则。

## 4. 目标目录结构

最终目录以够用为准，不为未来功能预建空目录：

```text
src/
├─ App.vue
├─ main.ts
├─ style.css
├─ components/
│  ├─ AppSidebar.vue
│  ├─ GroupSection.vue
│  ├─ NoteEditor.vue
│  ├─ EmptyState.vue
│  └─ ActionDialog.vue
├─ composables/
│  ├─ useLocalNote.ts
│  └─ useAutosave.ts
├─ data/
│  └─ database.ts
└─ domain/
   ├─ models.ts
   ├─ rules.ts
   └─ rules.test.ts
```

如果实现后某个文件只有极少且仅被单处使用的代码，可以合并回直接使用它的模块；不得为了匹配目录图而保留无意义抽象。

## 5. 组件与模块职责

### 5.1 `App.vue`

职责：初始化应用状态，组合侧边栏、编辑器、空状态和对话框，决定桌面或移动侧边栏是否显示。

主要数据来源：`useLocalNote()`。

允许承担：

- 页面级布局。
- 组件事件与应用 actions 的连接。
- 当前确认对话框的展示。

禁止承担：

- 直接操作 IndexedDB。
- 实现 500ms 防抖计时器。
- 在模板中执行复杂筛选或排序。

### 5.2 `AppSidebar.vue`

职责：显示应用名称、系统筛选入口、分组列表、可见笔记列表、创建入口和本地存储提示。

建议 props：

- `groups: Group[]`
- `visibleNotes: Note[]`
- `activeFilter: NoteFilter`
- `selectedNoteId: string | null`
- `expandedGroupIds: ReadonlySet<string>`
- `collapsed: boolean`
- `mobileOpen: boolean`

建议 emits：

- `select-filter`
- `select-note`
- `create-note`
- `create-group`
- `rename-group`
- `delete-group`
- `toggle-group`
- `move-note`
- `delete-note`
- `toggle-sidebar`
- `close-mobile`

要求：组件只发出用户意图，不直接写数据库。

### 5.3 `GroupSection.vue`

职责：渲染一个一级分组及其展开状态、名称编辑和分组操作。

建议 props：

- `group: Group`
- `expanded: boolean`
- `active: boolean`
- `noteCount: number`

建议 emits：

- `select`
- `toggle`
- `create-note`
- `rename`
- `delete`

要求：不提供创建子分组入口；空分组仍可选中并创建笔记。

### 5.4 `NoteEditor.vue`

职责：显示和编辑当前笔记标题、更新时间、正文与保存状态。

建议 props：

- `note: Note`
- `saveStatus: SaveStatus`

建议 emits：

- `update-title`
- `update-content`
- `retry-save`

要求：

- 使用真实的 `<input>` 和 `<textarea>`，不引入富文本编辑器。
- 切换到新建笔记后聚焦标题。
- 保存失败时保留组件当前显示内容。
- 只在失败时突出显示状态，正常“已保存”反馈保持克制。

### 5.5 `EmptyState.vue`

职责：显示首次进入、当前筛选无笔记或未选中笔记时的简短引导。

建议 props：

- `title: string`
- `description?: string`
- `actionLabel?: string`

建议 emits：

- `action`

### 5.6 `ActionDialog.vue`

职责：承载删除笔记、删除分组和数据风险说明等简单对话框。

建议 props：

- `open: boolean`
- `title: string`
- `description: string`
- `confirmLabel?: string`
- `destructive?: boolean`
- `cancelable?: boolean`

建议 emits：

- `confirm`
- `cancel`

要求：优先使用原生 `<dialog>`，关闭后焦点返回触发按钮，Escape 可以取消可取消的操作。

### 5.7 `useLocalNote.ts`

职责：作为应用唯一业务状态源，协调数据库、筛选、选择、分组、笔记和设置。

应暴露只读状态：

- `ready`
- `fatalError`
- `groups`
- `notes`
- `activeFilter`
- `visibleNotes`
- `selectedNote`
- `expandedGroupIds`
- `sidebarCollapsed`
- `mobileSidebarOpen`
- `saveStatus`

应暴露 actions：

- `initialize()`
- `retryInitialize()`
- `selectFilter()`
- `selectNote()`
- `createNote()`
- `updateNoteDraft()`
- `moveNote()`
- `deleteNote()`
- `createGroup()`
- `renameGroup()`
- `deleteGroup()`
- `toggleGroup()`
- `toggleSidebar()`
- `openMobileSidebar()` / `closeMobileSidebar()`
- `retrySave()`
- `flushPendingSave()`

### 5.8 `useAutosave.ts`

职责：管理单篇当前笔记的 500ms 防抖保存和保存状态。

约束：

- 同一时间只保留一个待执行计时器。
- 新输入到来时取消旧计时器并重新计时。
- 切换笔记前先尝试保存旧笔记。
- `visibilitychange` 进入 hidden、`pagehide` 和组件卸载时调用刷新方法。
- 关闭页面时仅尽力提交，不声称异步 IndexedDB 一定完成。
- 保存失败后保留最后一次待保存快照，并允许重试。
- 较早的异步保存完成时不得覆盖较新的状态，可使用递增请求序号判断结果是否仍是最新请求。

### 5.9 `database.ts`

职责：封装原生 IndexedDB 的打开、升级、事务和 CRUD 操作，不包含 Vue 响应式状态。

建议公开函数：

- `openLocalNoteDatabase()`
- `loadInitialData()`
- `createNoteRecord()`
- `updateNoteRecord()`
- `deleteNoteRecord()`
- `createGroupRecord()`
- `updateGroupRecord()`
- `deleteGroupAndUnfileNotes()`
- `getSetting()` / `setSetting()`

应在模块内部提供 IndexedDB request 和 transaction 的 Promise 包装函数，避免在业务层重复事件回调代码。

## 6. 数据模型与状态流

### 6.1 TypeScript 类型

在 `domain/models.ts` 定义并注释：

```ts
interface Group {
  id: string;
  name: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

interface Note {
  id: string;
  groupId: string | null;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

type NoteFilter = "all" | "ungrouped" | { groupId: string };
type SaveStatus = "idle" | "saving" | "saved" | "error";
```

可以根据 TypeScript 判别联合类型的实际使用方式调整 `NoteFilter` 表达，但不得把系统入口伪造成真实分组记录。

### 6.2 IndexedDB v1

数据库：`local-note-db`，版本：`1`。

对象仓库：

- `groups`：主键 `id`，索引 `order`。
- `notes`：主键 `id`，索引 `groupId`、`updatedAt`、复合索引 `[groupId+updatedAt]`。
- `settings`：主键 `key`。

设置键建议固定为：

- `activeFilter`
- `selectedNoteId`
- `expandedGroupIds`
- `sidebarCollapsed`

设置值在读取时进行最小运行时校验；无效或引用已删除记录时回退到安全默认值。

### 6.3 初始化数据流

```text
App 挂载
  -> 检查 window.indexedDB
  -> 打开 local-note-db
  -> onupgradeneeded 创建仓库与索引
  -> 并行读取 groups、notes 和 settings
  -> 过滤无效设置引用
  -> 孤立 groupId 的笔记在内存中视为未分组
  -> 恢复筛选与最后笔记
  -> ready = true
```

初始化失败时显示阻断式错误界面和“重试”按钮，不渲染可编辑但无法保存的空白编辑器。

### 6.4 编辑保存流

```text
用户输入
  -> 更新内存中的当前 Note 草稿
  -> saveStatus = idle
  -> 重置 500ms 计时器
  -> 到期后 saveStatus = saving
  -> IndexedDB 更新同一条 Note 和 updatedAt
  -> 成功：替换内存记录，saveStatus = saved
  -> 失败：保留草稿，saveStatus = error，显示重试
```

更新时间以成功发起本次内容保存时生成的时间戳为准。笔记排序在保存成功后按新的 `updatedAt` 重新派生。

### 6.5 删除分组事务

删除分组必须使用一个 `readwrite` 事务同时覆盖 `groups` 和 `notes`：

1. 通过 `groupId` 索引取得该分组笔记。
2. 将每篇笔记的 `groupId` 改为 `null` 并更新 `updatedAt`。
3. 删除分组记录。
4. 等待整个事务完成后再更新界面状态。
5. 任一步失败则事务回滚，界面保持原状态并显示错误。

## 7. 分阶段实施步骤

每个阶段必须完成对应验证后再进入下一阶段。发现失败时先修复，不得把失败留到最终统一处理。

### 阶段 0：确认基线

任务：

1. 阅读 `AGENTS.md`、产品需求、`package.json` 和 `vite.config.ts`。
2. 运行 `vp install`。
3. 记录 `git status --short`，确认哪些文件是用户现有内容。
4. 检查仓库是否出现 `.codegraph/`；当前没有。如果执行时已经存在，先按 `AGENTS.md` 使用 CodeGraph。
5. 不修改 `docs/product-requirements.md`。

验证：

- `vp install` 成功。
- 已确认项目使用 `vp` 内置命令，而不是直接调用 Vite、pnpm 或 Vitest。

### 阶段 1：清理模板并建立领域模型

任务：

1. 删除不再使用的 `HelloWorld.vue`、模板图片和模板 SVG。
2. 将 `App.vue` 改为薄应用壳，暂时只展示加载状态和基本双栏容器。
3. 重写 `style.css`，只保留全局 reset、颜色、字体、间距和布局 token。
4. 创建 `domain/models.ts` 和 `domain/rules.ts`。
5. 在 `rules.ts` 实现纯函数：
   - 分组名称标准化和校验。
   - 标题长度处理。
   - 笔记按更新时间倒序排序。
   - 根据当前筛选过滤笔记。
   - 删除当前笔记后的下一篇选择规则。

验证：

- 页面不再出现 Vite/Vue 模板内容。
- `App.vue` 不包含业务数据库逻辑。
- 领域函数不依赖 Vue 或 DOM。
- 对本阶段修改文件执行定向检查；若 Vite+ 不支持文件级 `check`，记录后在最终阶段运行统一检查。

### 阶段 2：实现 IndexedDB 数据层

任务：

1. 创建 `data/database.ts`。
2. 实现数据库打开和 v1 升级逻辑。
3. 创建 `groups`、`notes` 和 `settings` 仓库及 PRD 指定索引。
4. 实现 request、transaction 转 Promise 的内部工具。
5. 实现初始数据加载和各项 CRUD。
6. 实现删除分组并迁移笔记的原子事务。
7. 对错误保留原始 `Error` 信息，业务层统一决定展示文案。

验证：

- 浏览器 DevTools 中可以看到 `local-note-db` v1 和三个对象仓库。
- 创建一条分组和笔记记录后刷新，记录仍然存在。
- 删除非空分组后，分组消失且笔记 `groupId` 变为 `null`。
- 人为制造失败时，不应先更新成成功界面状态。

### 阶段 3：实现应用状态与初始化

任务：

1. 创建 `useLocalNote.ts`。
2. 使用 `shallowRef`、`ref` 或 `reactive` 保存最少源状态；不要保存可以通过 `computed` 得到的重复状态。
3. 实现 `visibleNotes`、`selectedNote`、当前分组等派生值。
4. 实现数据库初始化、设置恢复和无效引用回退。
5. 实现筛选选择、笔记选择和设置持久化。
6. IndexedDB 不可用或初始化失败时，暴露阻断式错误状态和重试 action。

验证：

- 空数据库进入首次使用状态。
- 设置中的最后笔记存在时正确恢复。
- 最后笔记不存在时回退到筛选中的最近笔记或空状态。
- 孤立 `groupId` 笔记出现在“未分组”中。

### 阶段 4：完成侧边栏与筛选流程

任务：

1. 实现 `AppSidebar.vue` 和 `GroupSection.vue`。
2. 显示“全部笔记”“未分组”和所有一级分组。
3. 当前筛选和当前笔记使用克制但清晰的选中态。
4. 实现分组独立展开/收起并持久化展开 ID。
5. 实现桌面端侧边栏整体收起和唤起按钮。
6. 可见笔记按 `updatedAt` 倒序显示。
7. “全部笔记”显示所有笔记的扁平列表；其他入口只显示对应笔记。
8. 点击移动端笔记后关闭抽屉。

验证：

- 三种筛选入口显示正确结果。
- 展开状态和整体收起状态刷新后恢复。
- 空分组仍然显示。
- 同一笔记不会在当前可见列表中重复出现。

### 阶段 5：完成笔记编辑与自动保存

任务：

1. 实现 `NoteEditor.vue` 和 `useAutosave.ts`。
2. 实现新建笔记、标题编辑和正文编辑。
3. 新建后聚焦标题，标题达到 120 字符后停止增加并给出轻提示。
4. 实现 500ms 防抖保存、保存状态和失败重试。
5. 切换笔记、页面隐藏和页面离开前调用 `flushPendingSave()`。
6. 保存成功后更新 `updatedAt` 和列表排序。
7. 未选择笔记时显示 `EmptyState.vue`。

验证：

- 连续快速输入只更新同一条记录。
- 停止输入不足 500ms 时不提前执行多次写入。
- 500ms 后出现保存过程并最终显示“已保存”。
- 输入后刷新，已完成保存的内容完整恢复。
- 模拟写入失败时正文仍保留，点击重试后可以继续保存。

### 阶段 6：完成分组和笔记管理

任务：

1. 创建分组时使用“新建分组”并立即进入重命名状态。
2. 实现分组名称校验和错误提示。
3. 实现空分组和非空分组删除确认。
4. 实现笔记移动到任意分组或“未分组”。
5. 实现删除笔记确认。
6. 删除当前笔记后，按 PRD 规则选择同筛选中的下一篇笔记；没有则显示空状态。
7. 只有操作成功后更新成功状态；数据库失败时保留原界面数据并提示。

验证：

- 空名称、纯空格、重复名称和超过 40 字符名称不能提交。
- 删除非空分组后笔记安全出现在“未分组”。
- 移动笔记后各筛选数量和当前列表立即正确更新。
- 删除当前笔记后选择结果稳定，没有指向已删除 ID。

### 阶段 7：补齐对话框、风险提示和异常状态

任务：

1. 实现 `ActionDialog.vue`，统一处理确认操作。
2. 在侧边栏底部提供可发现但不抢眼的“数据保存在此浏览器”入口。
3. 风险说明包含清除站点数据、隐私模式和浏览器回收空间可能导致数据丢失。
4. 实现 IndexedDB 初始化失败、写入失败和存储空间不足的用户提示。
5. 错误信息使用用户可理解的中文；详细错误只记录到控制台，避免展示内部对象。

验证：

- 删除操作必须经过确认。
- Escape、取消按钮和确认按钮行为正确。
- 关闭对话框后焦点回到原触发元素。
- 用户可以在两次点击以内找到本地数据风险说明。

### 阶段 8：响应式、键盘和视觉收尾

任务：

1. `>= 1024px` 使用固定双栏；`< 1024px` 使用覆盖式侧边栏；`< 768px` 优化为单栏编辑体验。
2. 移动抽屉使用全高布局，支持安全区域和 `100dvh`。
3. 正文编辑区域使用弹性高度，软键盘出现时仍可滚动到光标区域。
4. 交互不依赖 hover；菜单按钮在触摸设备始终可访问。
5. 图标按钮提供 `aria-label`，展开按钮提供 `aria-expanded`。
6. 点击区域桌面端不小于 40px，移动端不小于 44px。
7. 实现 PRD 快捷键；仅在事件可处理且不会影响输入框关键编辑行为时调用 `preventDefault()`。
8. 动效保持 150–220ms，并支持 `prefers-reduced-motion`。
9. 使用系统字体和 CSS/内联 SVG，不加载网络字体和整套图标资源。

验证：

- 在 1440×900、1024×768、768×1024 和 390×844 视口检查布局。
- 页面没有横向滚动条。
- 移动端打开侧边栏、选中笔记、返回编辑器流程顺畅。
- 仅使用键盘可以访问系统入口、分组、笔记、菜单、对话框和编辑器。
- 焦点环清晰，正文与背景对比度满足 WCAG AA。

### 阶段 9：添加最小自动化测试

任务：

1. 在 `vite.config.ts` 的 `test` 配置中限定 `src/**/*.test.ts`，不要创建单独的 Vitest 配置文件。
2. 测试 API 从 `vite-plus/test` 导入。
3. 为 `domain/rules.ts` 添加行为测试，至少覆盖：
   - 分组名称 trim、空值、重复和长度校验。
   - 标题 120 字符边界。
   - 全部、未分组和具体分组筛选。
   - `updatedAt` 倒序排序。
   - 删除当前笔记后的下一篇选择。
4. 防抖逻辑若能在不暴露组件内部状态的前提下作为纯逻辑测试，则使用 fake timers 测试；否则保留浏览器验收，不为测试强行重构。
5. 不添加只验证 DOM 结构的快照测试。

验证：

- `vp test` 成功。
- 测试断言面向可观察业务结果，不访问组件私有状态。
- 不为了提高覆盖率添加无业务价值测试。

### 阶段 10：最终检查与交付

任务：

1. 删除本次替换模板后产生的无用文件、import、样式和资源。
2. 检查所有新增函数、类型和复杂逻辑是否有必要且准确的注释。
3. 检查 `App.vue` 是否保持为组合层，数据库逻辑是否仍在数据模块。
4. 运行完整项目验证命令。
5. 启动生产预览并执行浏览器验收。
6. 输出实际修改文件、命令结果、人工验收结果和已知限制。

必须执行：

```powershell
vp check
vp test
vp run build
vp preview
```

说明：

- 使用 `vp run build`，因为项目的 `build` 脚本包含 `vue-tsc -b && vp build`。
- `vp preview` 用于人工验收生产构建；验收结束后正常停止服务。
- 如果环境或包管理行为异常，运行 `vp env doctor` 并在交付报告中包含输出。
- 不得把未执行的检查写成“通过”。

## 8. 浏览器人工验收清单

Grok 完成后必须逐项执行并记录结果，Codex 后续会复验同一清单。

### 8.1 首次使用

- [ ] 清空 `local-note-db` 后打开应用，显示首次使用空状态。
- [ ] 点击“新建第一篇笔记”后创建“无标题笔记”并聚焦标题。
- [ ] 页面可以立即输入，没有明显卡顿。

### 8.2 自动保存

- [ ] 输入标题和正文后，500ms 左右开始保存。
- [ ] 保存成功后显示“已保存”。
- [ ] 刷新页面后标题和正文完整恢复。
- [ ] 快速连续输入不会产生重复笔记。
- [ ] 保存失败时当前输入保留，并出现“重试”。

### 8.3 分组

- [ ] 创建分组后立即进入重命名。
- [ ] 空名称、重复名称和超长名称无法提交。
- [ ] 分组可以独立展开和收起，刷新后状态恢复。
- [ ] 空分组仍然显示并可在其中新建笔记。
- [ ] 删除非空分组后，其笔记进入“未分组”。

### 8.4 笔记管理

- [ ] 可以在当前具体分组中新建笔记。
- [ ] 可以把笔记移动到其他分组和“未分组”。
- [ ] 删除笔记前出现确认。
- [ ] 删除当前笔记后正确选择下一篇或显示空状态。
- [ ] 各筛选中的笔记按更新时间倒序排列。

### 8.5 筛选与恢复

- [ ] “全部笔记”显示全部笔记的扁平列表。
- [ ] “未分组”只显示未分组笔记。
- [ ] 具体分组只显示该分组笔记。
- [ ] 刷新后恢复上次筛选和最后打开笔记。
- [ ] 最后打开笔记已删除时不会出现空白错误页。

### 8.6 桌面与移动体验

- [ ] 桌面侧边栏可以整体收起并重新打开。
- [ ] 移动端侧边栏以抽屉打开，选择笔记后关闭。
- [ ] 390px 宽度下没有横向溢出。
- [ ] 移动端软键盘不会永久遮挡当前编辑位置。
- [ ] 触摸操作不依赖 hover。

### 8.7 可访问性与异常

- [ ] 所有图标按钮具有可读名称。
- [ ] Tab 顺序合理，焦点清晰可见。
- [ ] 对话框可使用 Escape 取消并恢复焦点。
- [ ] IndexedDB 不可用时不能进入无法保存的编辑器。
- [ ] 本地数据丢失风险说明可以被找到。
- [ ] 浏览器控制台没有未处理 Promise rejection 或 Vue warning。

## 9. Grok 执行纪律

1. 按阶段顺序实施；完成阶段验证后再进入下一阶段。
2. 只修改完成本计划所需文件，不顺手调整项目其他配置。
3. 不修改产品需求文档，不新增产品范围。
4. 不新增依赖；确有必要时先向用户请求确认。
5. 不使用 Options API、Pinia、Router 或 UI 框架替代本计划结构。
6. 不执行 Git 提交、推送、发布或部署，除非用户另行授权。
7. 发现用户已有修改与计划冲突时停止并说明，不得覆盖。
8. 命令失败时保留真实错误并修复；无法修复时明确报告阻塞。
9. 所有完成声明必须附带实际验证结果。

## 10. Grok 最终交付格式

执行完成后，按以下结构回复用户，便于 Codex 接手验收：

```text
实施结果：完成 / 部分完成 / 阻塞

一、实现内容
- 按阶段列出实际完成的功能。

二、文件变更
- 新增文件：...
- 修改文件：...
- 删除文件：...

三、自动验证
- vp check：成功/失败，关键输出
- vp test：成功/失败，测试数量
- vp run build：成功/失败，关键输出

四、浏览器验收
- 桌面视口：通过项、失败项
- 移动视口：通过项、失败项
- IndexedDB 刷新恢复：结果
- 控制台：是否存在错误或警告

五、未完成或已知限制
- 逐项列出；没有则写“无”。

六、需要 Codex 重点复验的区域
- 列出风险最高或实现中做过取舍的部分。
```

不得只回复“已完成”。最终报告必须让验收者能够复现所有关键结果。
