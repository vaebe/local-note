---
name: Local Note
description: 本地优先的极简笔记工具，明亮日光书桌气质。
colors:
  primary: "oklch(0.78 0.13 78)"
  primary-hover: "oklch(0.72 0.14 78)"
  primary-soft: "oklch(0.96 0.03 78)"
  primary-ink: "oklch(0.4 0.08 78)"
  on-accent: "oklch(0.28 0.04 70)"
  neutral-bg: "oklch(0.985 0.006 78)"
  neutral-elevated: "oklch(0.995 0.003 78)"
  neutral-sidebar: "oklch(0.975 0.01 78)"
  neutral-text: "oklch(0.38 0.02 70)"
  neutral-strong: "oklch(0.26 0.02 70)"
  neutral-muted: "oklch(0.5 0.018 70)"
  placeholder: "oklch(0.56 0.016 70)"
  neutral-border: "oklch(0.91 0.012 78)"
  neutral-border-strong: "oklch(0.84 0.02 78)"
  danger: "oklch(0.54 0.18 25)"
  success: "oklch(0.52 0.09 150)"
  status-lamp: "oklch(0.76 0.12 78)"
typography:
  display:
    fontFamily: "Source Serif 4, Noto Serif SC, Songti SC, Georgia, serif"
    fontSize: "clamp(1.75rem, 2.8vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Source Serif 4, Noto Serif SC, Songti SC, Georgia, serif"
    fontSize: "1.55rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Source Sans 3, Noto Sans SC, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  prose:
    fontFamily: "Source Sans 3, Noto Sans SC, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: "0.01em"
  label:
    fontFamily: "Source Sans 3, Noto Sans SC, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "0.12em"
rounded:
  xs: "7px"
  sm: "10px"
  md: "14px"
  lg: "18px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "36px"
  sidebar: "292px"
  content-max: "1280px"
  tap: "40px"
  tap-mobile: "44px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-strong}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.sm}"
    padding: "8px 11px"
    height: "40px"
  nav-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.sm}"
    padding: "8px 11px"
    height: "40px"
  input-inline:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-strong}"
    rounded: "{rounded.sm}"
    padding: "4px 0"
  dialog:
    backgroundColor: "{colors.neutral-elevated}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.lg}"
    padding: "22px"
---

# Design System: Local Note

## 1. Overview

**Creative North Star: "The Daylight Desk"**

Local Note 的视觉系统服务于一件事：让人打开页面就能安静、快速地写。它像窗边一张被日光铺亮的书桌，干净明亮，工具就位，不阴郁也不吵。气质对齐 PRODUCT.md 的三词：`克制 · 迅捷 · 安静`，同时保证界面有阳光感。

密度偏低到中等。侧栏承载导航与结构，主区只承载标题与正文。颜色预算留给主操作与状态，不把整页染成手帐墙。

本系统明确拒绝：Notion/飞书式重后台密度；AI 紫粉渐变营销页；赤陶手帐厚涂；暗黑赛博/霓虹终端；青绿/天蓝强调；以及整页阴沉炭灰。

**Key Characteristics:**

- 高亮近白底 + 日光金强调（Restrained，≤10% 着色；明亮不阴郁）
- 衬线仅用于标题与品牌字，UI 标签与按钮一律无衬线
- 状态清晰：hover / active / focus / saved / error 可辨
- 桌面双栏，移动端抽屉；断点驱动结构变化，不做花哨流体排版
- 动效 150–250ms 级，只表达状态，不做编排式进场表演

## 2. Colors

Restrained 策略：高亮近白中性面 + 日光金强调。阳光感来自明亮表面与金色点缀，而不是把整页刷成厚米色。

### Primary

- **Sun Gold** (`oklch(0.78 0.13 78)`): 主按钮、焦点、caret、logo；按钮字用深色。
- **Sun Gold Hover** (`oklch(0.72 0.14 78)`): 主按钮 hover。
- **Sun Mist** (`oklch(0.96 0.03 78)`): 空状态图标底。
- **Sun Ink** (`oklch(0.4 0.08 78)`): 选中态文字。
- **On Accent** (`oklch(0.28 0.04 70)`): 亮金按钮上的字色。
- **Sun Lamp** (`oklch(0.76 0.12 78)`): 保存状态点。

### Neutral

- **Daylight BG** (`oklch(0.985 0.006 78)`): 应用底，高亮。
- **Elevated** (`oklch(0.995 0.003 78)`): 主编辑面、菜单、对话框，接近纯白。
- **Sidebar Light** (`oklch(0.975 0.01 78)`): 浅侧栏，不比主区更暗沉。
- **Body Ink** (`oklch(0.38 0.02 70)`): 常规文字。
- **Strong Ink** (`oklch(0.26 0.02 70)`): 标题。
- **Muted Ink** (`oklch(0.5 0.018 70)`): 次要说明。
- **Placeholder** (`oklch(0.56 0.016 70)`): 占位符，禁止再叠 opacity。
- **Border Quiet / Strong**: 分割与 ghost 描边。

### Semantic

- **Danger** (`oklch(0.54 0.18 25)`): 删除与错误。
- **Success** (`oklch(0.52 0.09 150)`): 仅语义预留，不进品牌面。

### Named Rules

**The One Accent Rule.** 日光金只用于主操作、选中与状态，≤10%。

**The Daylight Rule.** 主表面必须保持高亮（近白）。禁止整页深灰/炭灰营造「高级暗调」。

**The No-Cyan Rule.** 禁止青、天蓝、湖蓝、青绿。

**The No-Green Rule.** 禁止绿系品牌色。

**The No-Hand-Journal Rule.** 禁止赤陶厚涂与整页厚米色手帐墙；允许极低彩的日光暖底。

**The No-Side-Stripe Rule.** 选中态用洗底 + 全周 1px hairline。

## 3. Typography

**Display Font:** Source Serif 4 + Noto Serif SC（fallback: Songti SC, Georgia, serif）  
**Body Font:** Source Sans 3 + Noto Sans SC（fallback: system-ui, PingFang SC, Microsoft YaHei）  
**Mono Font:** ui-monospace / Cascadia Code / Consolas（仅代码或技术只读场景）

**Character:** 衬线给出安静的书写感，无衬线保证工具效率。两者对比明确：标题可有文学呼吸，控件必须干脆。

### Hierarchy

- **Display / Note Title** (600, `clamp(1.75rem, 2.8vw, 2.25rem)`, lh 1.25, tracking -0.02em): 笔记标题。产品主区的唯一大字。
- **Title** (600, ~1.55rem, lh 1.3): 空状态标题、致命错误标题、对话框标题。
- **Brand Title** (600, 1.12rem): 侧栏产品名。
- **Body** (400, 16px, lh 1.55): UI 默认文字。
- **Prose** (400, 1.05rem, lh 1.8): 笔记正文；主区最大宽度 1280px（产品确认的宽书写面）。
- **Label** (650, 11px, tracking 0.12em, uppercase): 侧栏分区标签、菜单小标题。短词 only。
- **Meta** (400, 13px): 更新时间、保存状态。

### Named Rules

**The Display-Is-Not-UI Rule.** 禁止在按钮、nav 项、菜单项、计数上使用 display 衬线字体。

**The Scale Restraint Rule.** 产品 UI 不用夸张流体大标题。笔记标题 clamp 上限约 2.25rem，禁止 hero 级 4rem+。

## 4. Elevation

以色阶分层为主，阴影为辅。默认面是平的；阴影只出现在浮层（菜单、对话框、移动端抽屉、收起侧栏唤起按钮）。

### Shadow Vocabulary

- **sm** (`0 1px 2px rgba(18, 23, 31, 0.05)`): 轻微分界。
- **soft** (`0 8px 24px rgba(18, 23, 31, 0.07)`): 侧栏唤起按钮等小浮层。
- **modal** (`0 14px 40px rgba(18, 23, 31, 0.1), 0 2px 8px rgba(18, 23, 31, 0.04)`): 对话框、菜单、移动端抽屉。

深度也来自：

- 侧栏 `neutral-sidebar` vs 主区 `neutral-elevated`
- 1px `neutral-border` 分割
- 选中态浅墨蓝底 + 左侧 3px 强调条（导航反馈，不是卡片装饰条滥用）

### Named Rules

**The Flat-By-Default Rule.** 静态内容面不加宽阴影。阴影只响应浮起状态。

**The No-Ghost-Card Rule.** 禁止在同一元素上同时使用「1px border + ≥16px blur 宽阴影」作为装饰。

## 5. Components

整体气质：**refined and restrained**。控件清晰，但不与正文抢戏。

### Buttons

- **Shape:** 轻柔圆角 (`10px`)
- **Primary:** Harbor Ink Blue 底 + 近白字；padding `0 16px`；高度 40px（移动端 44px）
- **Hover:** 更深墨蓝；轻微下压 active `translateY(1px)`
- **Ghost:** 透明底 + 强边框；hover 中性 hover 底
- **Danger:** Danger Rose 实底
- **Icon button:** 40×40 点击区，默认 muted，hover 变 strong

### Navigation / List items

- **Shape:** `10px` 圆角行
- **Default:** 透明，正文色
- **Hover:** 中性 hover 底
- **Active:** 浅金洗底 + 深金棕字 + 全周 1px hairline；字重 600
- **Count:** 右对齐 tabular nums；active 时用 primary

### Inputs / Editor fields

- **Title / content:** 无边框透明底；caret 用 primary
- **Title focus:** 底部 2px primary 内阴影线
- **Group rename:** 1.5px primary 边框 + 浅 primary 外环
- **Placeholder:** muted，不降低到不可读

### Menus

- Elevated 面 + 1px border + modal 阴影
- 项高 ≥36px；危险项用 danger 字色与 danger-bg hover
- 可有轻微 blur，但仅用于浮层可读，不作为全局玻璃拟态

### Dialog

- 原生 `<dialog>`；圆角 `18px`；elevated 面
- 标题用 display 衬线；说明用 muted 正文
- 操作右对齐：ghost 取消 + primary/danger 确认

### Empty state

- 居中；可选 72px 图标容器（冷蓝灰渐变，非插画堆砌）
- 标题 + 一句说明 + 单一 primary CTA

### Icons

- 本地 Lucide 路径 SVG，`currentColor`，默认 18px
- 不引入图标运行时依赖

### App shell

- Desktop ≥1024px: 292px 侧栏 + 主区
- <1024px: 主区全宽；侧栏固定抽屉 + backdrop
- 触控目标：桌面 40px，移动 44px

## 6. Do's and Don'ts

### Do:

- **Do** 把颜色预算花在当前任务上：选中笔记、主按钮、保存/错误状态。
- **Do** 保持侧栏服务导航、主区服务书写；主区最大内容宽 1280px。
- **Do** 用 200ms 级 ease-out 做状态过渡；并尊重 `prefers-reduced-motion`。
- **Do** 保证正文与关键控件对比度可读；placeholder 不要飘成浅灰装饰。
- **Do** 文案用动词 + 对象（「新建笔记」「删除分组」），短句直接。
- **Do** 打开即写：首次空状态提供明确 CTA，不自动塞模板内容。

### Don't:

- **Don't** 使用绿色/青绿/薄荷绿作为品牌强调色（No-Green Rule）。
- **Don't** 使用青、天蓝、湖蓝作为品牌或状态色（No-Cyan Rule）。
- **Don't** 把界面做成阴沉炭灰/深灰洞；主表面必须明亮（Daylight Rule）。
- **Don't** 做成 Notion/飞书式重后台：复杂侧栏、卡片墙、企业 SaaS 密度。
- **Don't** 使用 AI 紫粉渐变落地页语言：营销感、装饰堆叠、不务实。
- **Don't** 使用暖米色手帐风：纸感底、赤陶强调、过度文艺。
- **Don't** 使用暗黑赛博/霓虹终端：炫技高对比、开发者玩具感。
- **Don't** 用 display 衬线字体做按钮或 nav 标签。
- **Don't** 用 `border-left`/`box-shadow` 侧条装饰选中态；用洗底 + 全周 hairline。
- **Don't** 给 placeholder 再叠一层 opacity 导致对比失败。
- **Don't** 加纸张噪点、装饰双光晕或玻璃拟态作为默认氛围。
- **Don't** 编排整页入场动画；产品应直接进入任务。
- **Don't** 同时堆叠宽阴影 + 描边制造 ghost-card。
- **Don't** 把圆角推到 24px+ 的「气球卡片」；组件圆角顶在 14–18px。
