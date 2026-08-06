# Local Note

本地优先的极简在线笔记。打开即可书写，数据保存在当前浏览器的 IndexedDB，无需账号与后端。

## 功能概览

- 创建 / 编辑 / 删除笔记，停止输入约 500ms 后自动保存
- 一级分组整理；系统提供**默认分组**（不可删除）
- 侧栏筛选「全部笔记」与各分组；笔记按最近更新排序
- 桌面双栏 / 移动抽屉布局
- 快捷键：`Ctrl/⌘ + N` 新建笔记，`Ctrl/⌘ + Shift + N` 新建分组，`Ctrl/⌘ + B` 切换侧栏

**不在范围内**：云同步、账号、Markdown、搜索、回收站、协作。

## 技术栈

| 项     | 说明                                         |
| ------ | -------------------------------------------- |
| 框架   | Vue 3.5 + TypeScript                         |
| 工具链 | [Vite+](https://viteplus.dev/guide/)（`vp`） |
| 状态   | 单一 composable，无 Pinia / Router           |
| 存储   | 浏览器原生 IndexedDB                         |
| 部署   | Cloudflare Pages（Git 集成）                 |

## 快速开始

```bash
# 安装依赖（推荐使用 vp）
vp install

# 开发
vp dev

# 类型检查 + 构建
vp run build

# 预览生产构建
vp preview
```

### 常用命令

| 命令           | 说明                               |
| -------------- | ---------------------------------- |
| `vp install`   | 安装依赖                           |
| `vp dev`       | 开发服务器                         |
| `vp check`     | 格式化检查 + Lint + 类型检查       |
| `vp test`      | 运行单元测试（`src/**/*.test.ts`） |
| `vp run build` | `vue-tsc -b` + 生产构建            |

### Cloudflare Pages 部署

在 Cloudflare Pages 网页连接 GitHub 或 GitLab 仓库，然后配置：

| 项                     | 值               |
| ---------------------- | ---------------- |
| Production branch      | 仓库的生产分支   |
| Build command          | `pnpm run build` |
| Build output directory | `dist`           |

说明：

- Cloudflare 会根据 `pnpm-lock.yaml` 安装依赖，Build command 不需要再次执行 `pnpm install`。
- Git 集成会在构建成功后自动发布 `dist`，项目不需要额外的部署步骤。
- 后续推送到生产分支时，Cloudflare Pages 会自动重新构建并发布。

## 目录结构

```text
src/
├─ App.vue                 # 页面组合
├─ main.ts
├─ style.css               # 全局样式与设计 token
├─ components/             # 侧栏、编辑器、对话框等
├─ composables/            # useLocalNote / useAutosave / 菜单锚定
├─ data/database.ts        # IndexedDB 封装
├─ domain/                 # 模型、纯规则与测试
└─ assets/icons/           # 本地 Lucide SVG 图标
docs/                      # 产品与实现文档
PRODUCT.md                 # 产品与品牌简报
DESIGN.md                  # 设计系统
```

## 数据说明

- 数据库名：`local-note-db`（版本 1）
- 对象仓库：`groups`、`notes`、`settings`
- 默认分组 ID：`__default__`；未选择分组时新建笔记进入该分组
- 数据仅存于本机浏览器；清除站点数据、隐私模式或存储回收可能导致丢失

## 文档

见 [docs/README.md](./docs/README.md)。

## 开发约定

- 使用 `vp` 内置命令，不要直接调用 Vite / Vitest CLI
- 不新增 UI 库、Pinia、Router、idb/Dexie 等依赖（除非另行约定）
- Agent 协作说明见 `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`
