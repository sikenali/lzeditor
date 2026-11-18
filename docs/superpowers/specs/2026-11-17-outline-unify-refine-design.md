# 大纲活动项背景统一 read-toc 风格 + 清理 read-toc 死 CSS + 去掉「目录」按钮 —— 设计文档（短版）

> 日期：2026-11-17
> 目标：把顶栏大纲（sidebar-outline）作为唯一目录，活动项背景统一为 read-toc-list 风格；清理已无引用的 read-toc-* 死 CSS；去掉样式面板冗余的「目录」按钮；确保大纲与阅读/排版模式内容联动。
> 用户选定：**活动项徽标保持反色实底** + **read-toc 死 CSS 删干净**。

## 意图

此前 `a8f6bc8` 已把阅读模式的内嵌目录改为顶栏大纲（read-toc 组件已从 JSX 移除，只剩死 CSS），
`a78b035`/`a8f6bc8` 已接好大纲↔阅读/排版联动（activeTocId + 跳转注册表）。本次把大纲活动项
视觉统一成 read-toc-list 的活动项样式，并清理残留死 CSS 与样式面板冗余按钮。

## 当前事实（已探明）

- **read-toc 组件已无 JSX 引用**（grep 0 处）。残留死 CSS：
  - `globals.css:3168-3208`：`.read-toc-sidebar`/`.read-toc-header`/`.read-toc-close`/`.read-toc-list`/`.read-toc-item`/`.read-toc-item.active`/`.read-toc-dot`/`.read-toc-text`。
  - `read-mode.css:167-207`：`.read-toc`/`.read-toc-header`/`.read-toc-close`/`.read-toc-list`/`.read-toc-item`/`.read-toc-item.active`/`.read-toc-dot`/`.read-toc-text`；`read-mode.css:234` 媒体查询内 `.read-toc`。
- **活动项目标样式**（read-toc-item.active）：`background: var(--accent-a5); color: var(--accent-primary); border-left-color: var(--accent-primary)`。
- **大纲当前活动项**（layout.css `.outline-jump-btn.current`，`aed30b8`）：实色 `accent-primary` 底 + 白字 + `.current .outline-badge` 白底强调字 override。
- **样式面板「目录」按钮**：`StyleMainPanel.tsx:228-232`（`style-action-btn`，切换 `showOutline`）；`showOutline`/`setShowOutline` 仅在此使用（`:24-25`）。
- **联动已接**：ReadMode `:241,245` + StyleMainPanel `:62,126` 设 `activeTocId`/注册 jumper；SidebarOutline `:47-53,67` 读 `activeTocId` 定 `.current`、经 `getOutlineJumper()` 跳转。

## 目标

- 大纲活动项背景 = read-toc-item.active 风格（accent-a5 浅底 + 强调色文字 + 强调色左边框）。
- 活动项徽标保持反色实底（H1 红底白字 / H2·H3 灰底白字），与行分离、对比足够。
- read-toc-* 死 CSS 全部删除（globals.css + read-mode.css）。
- 样式面板「目录」按钮删除（大纲改由顶栏工具栏「大纲」按钮统一开关）。
- 大纲与阅读/排版模式内容联动（activeTocId 高亮 + 跳转注册表跳转）确认可用。

## 非目标

- 不改大纲非活动项样式（徽标反色实底、文本颜色不变）。
- 不改阅读/排版模式的内容渲染逻辑（ReadMode / StyleMainPanel 面板本身）。
- 不改工具栏「大纲」按钮行为（showOutline 仍由它切换）。

## 具体改动

| 位置 | 现在 | 改为 |
|------|------|------|
| `layout.css` `.outline-jump-btn.current` | 实色 accent-primary 底 + 白字 | `background: var(--accent-a5); color: var(--accent-primary); border-left-color: var(--accent-primary)` |
| `layout.css` `.outline-jump-btn.current:hover` | 加深红底 | 浅强调 tint（`accent-a10` 或 color-mix），不覆盖左border |
| `layout.css` `.current .outline-badge` | 白底 + 强调字 | 删除（徽标回到 `.l1/.l2/.l3` 反色实底） |
| `globals.css:3168-3208` | read-toc-* 死 CSS | 整块删除 |
| `read-mode.css:167-207` + `:234` | read-toc-* 死 CSS | 整块删除（含媒体查询内 `.read-toc`） |
| `StyleMainPanel.tsx:228-232` | 「目录」style-action-btn | 删除该按钮 |
| `StyleMainPanel.tsx:24-25` | `showOutline`/`setShowOutline` | 删除（无其他使用） |

## 交给实现者

- 删 `.current .outline-badge` 后，活动项徽标继承 `.outline-badge.l1/.l2/.l3`（反色实底），无需新增样式。
- 删 read-toc-* CSS 前先确认无 JSX 引用（grep 0 已证）；删后 `npm run build` 应无未使用引用报错（CSS 不参与 tsc）。
- `StyleMainPanel` 删「目录」按钮后 `showOutline`/`setShowOutline` 变未用，一并删（否则 noUnusedLocals 报错）。
- 全量 `npm run test` + `typecheck` 通过；截图验证：大纲活动项 = accent-a5 浅底 + 强调色字 + 左边框、徽标反色实底、无 read-toc-* 死 CSS、样式面板无「目录」按钮、大纲与排版/阅读内容联动。
