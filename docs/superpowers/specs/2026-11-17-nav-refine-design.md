# 导航精修：大纲活动项徽标跟随 + 模式入口收敛 + 浮导航点击显示 —— 设计文档（短版）

> 日期：2026-11-17
> 目标：把大纲活动项的红色焦点跟随 active；去掉「代码模式」入口（默认代码模式）；去掉导航独立「阅读」「样式」按钮；排版模式浮导航默认隐藏、点内容区显示。
> 用户选定：**活动项徽标随 active 强调色** + **模式菜单留预览/排版/阅读** + **浮导航默认隐藏、点内容区显示**。

## 意图

用户报告 5 点。其中点 2（排版模式大纲点击不切换）已在本轮早期修复并部署（已验证：点击大纲 → 内容滚动 0→394→4465→5551→6926 + active 跟随），无需改动。其余 4 点为本轮范围。

## 当前事实（已探明）

- **点 1 徽标**：`.outline-badge.l1` 恒红、`.l2/.l3` 恒灰（反色实底）；活动项 `.outline-jump-btn.current` 只有红字/红边框/浅红底，徽标仍是灰 → 红色焦点看起来「卡在 H1」。
- **点 3 代码模式入口**：`editorActions.tsx MODE_ITEMS` 含 `{label:'代码模式', action:'code'}`；`appMode` 默认 `'edit'`，且 `'edit'`/`'code'` 都渲染 `<CodeEditor/>`（WYSIWYG 已移除），故 `'edit'` 即代码模式。
- **点 4 独立按钮**：`Toolbar.tsx:185-194` 有独立「样式」「阅读」按钮；`LeftNav.tsx:135-136` 也有「样式」「阅读」。两者都另有「模式」菜单（MODE_ITEMS：预览/排版/阅读）。
- **点 5 浮导航**：`StyleMainPanel.tsx:179` `<div className={main-nav-float${previewVisible?'':' nav-hidden'}}>`；`previewVisible` 默认 `true` → 浮导航默认显示；`read-mode.css .main-nav-float.nav-hidden:hover {opacity:1}` 让 hover 也能显示。
- 测试锚点：`mode-boundary.test.mjs:12`（代码模式必须存在）、`outline-boundary.test.mjs:94`（当前项徽标无 override）、`outline-boundary.test.mjs:87`（.l1 分级）。

## 目标

- 点 1：活动项徽标 = 强调色（红底白字，任意层级）；非活动项徽标 = 中性灰（统一，H1 不再恒红）。红色焦点随 active。
- 点 3：`MODE_ITEMS` 去掉「代码模式」；默认 `appMode='edit'`（= 代码模式）不变。
- 点 4：`Toolbar.tsx`、`LeftNav.tsx` 去掉独立「样式」「阅读」按钮；保留「历史」「模式」菜单（预览/排版/阅读）。
- 点 5：`StyleMainPanel` 浮导航默认隐藏；点击内容区显示；去掉 `.nav-hidden:hover` hover 显示。

## 非目标

- 不改大纲非活动项文字颜色/边框（只改徽标配色）。
- 不改阅读/排版内容渲染、不改分页引擎、不改 `activeTocId` 联动逻辑（点 2 已完成）。
- 不删「历史」按钮；不删「模式」菜单本身。

## 具体改动

| 位置 | 现在 | 改为 |
|------|------|------|
| `layout.css` `.outline-badge.l1/.l2/.l3` | H1 红、H2·H3 灰 | 统一中性灰（如 #55524C，白字） |
| `layout.css` 新增 `.outline-jump-btn.current .outline-badge` | 无 | `background: var(--accent-primary); color: var(--color-on-primary)`（红底白字随 active） |
| `editorActions.tsx MODE_ITEMS` | 含代码模式 | 去掉代码模式项 |
| `Toolbar.tsx` | 独立样式/阅读按钮 | 删这两个按钮 |
| `LeftNav.tsx` | 独立样式/阅读按钮 | 删这两个按钮 |
| `StyleMainPanel.tsx` | 浮导航绑 previewVisible（默认显示） | 新增 `navVisible` state（默认 false）；点击内容区显示；浮导航随 navVisible |
| `read-mode.css` | `.nav-hidden:hover{opacity:1}` | 删除（不要 hover 显示） |

## 交给实现者

- 点 1：`.l1/.l2/.l3` 三色改统一中性灰（保留类名结构，测试 `.outline-badge.l1` 仍 match）；`.current .outline-badge` 覆盖为强调色。更新 `outline-boundary.test.mjs:94` 由 doesNotMatch 改 match。
- 点 3：只删 MODE_ITEMS 的代码模式项；`modeAction` 的 `'code'` 分支保留（无害死路径，避免破坏切换模式模式与快捷键）；更新 `mode-boundary.test.mjs:12`。
- 点 4：删 Toolbar + LeftNav 的「样式」「阅读」按钮；保留「模式」菜单与「历史」。若删后出现未用 `toggleMode` 等，一并清理。
- 点 5：`navVisible` state 默认 false；`main-nav-float` 用 `navVisible`（不再用 `previewVisible`）；点击 `.style-read-scroll`（内容区）`setNavVisible(true)`；删 `.nav-hidden:hover`。保留「显示/隐藏预览」按钮控制样式卡片（不再联动浮导航）。
- 全量 `npm run test` + `typecheck` 通过；截图验证：活动项徽标红底随 active、非活动项灰、模式菜单无代码模式、导航无独立阅读/样式按钮、排版模式浮导航默认隐藏点内容区显示。
