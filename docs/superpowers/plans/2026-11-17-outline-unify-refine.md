# 大纲活动项统一 read-toc 风格 + 清理死 CSS + 删「目录」按钮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把顶栏大纲（sidebar-outline）活动项背景统一成 read-toc-list 风格（accent-a5 浅底 + 强调色字 + 强调色左边框），删除已无引用的 read-toc-* 死 CSS，并移除样式面板冗余的「目录」按钮，使大纲成为唯一目录并与阅读/排版内容联动。

**Architecture:** read-toc 组件已从 JSX 移除（`a8f6bc8`），只剩死 CSS；大纲↔阅读/排版联动已接好（`a78b035`/`a8f6bc8` 的 activeTocId + 跳转注册表）。本次只改大纲活动项视觉 + 删死 CSS + 删一个按钮，不触内容渲染逻辑。

**Tech Stack:** React + Vite；node:test 静态断言（读源文件 + assert）。

**Spec:** `docs/superpowers/specs/2026-11-17-outline-unify-refine-design.md`

## Global Constraints

- 活动项徽标**保持反色实底**（H1 红底白字 / H2·H3 灰底白字），不改成白底强调字。
- 活动项背景 = `var(--accent-a5)` + `var(--accent-primary)` 文字 + 强调色左边框（同 `.read-toc-item.active`）。
- **read-toc-* 死 CSS 全部删除**（globals.css + read-mode.css）；`read-toc` 无任何 JSX 引用（已证 grep 0）。
- 只删 **StyleMainPanel** 的 `style-action-btn`「目录」按钮；**ReadMode 的 `read-tool-btn`「目录」按钮保留**（用户未指向它）。
- 大纲与阅读/排版联动（activeTocId 高亮 + `getOutlineJumper()` 跳转）确认可用，不改联动逻辑。
- 全量 `npm run test` 全绿；`npm run typecheck` 通过。

## Review Focus

- **活动项在亮/暗两套主题下都清晰**：accent-a5 浅底 + 强调色字在 parchment（红 #C0392B）与 dark（红 #E05050）都可见，徽标反色实底白字可读。Task 1 的静态断言只保证选择器，视觉在实现后截图验证。
- **删死 CSS 不误删共用样式**：read-toc-* 与 read-tag/read-mode-toolbar/read-article-body 等**仍被使用**的类名不同（`code-mode-boundary.test.mjs` 另断言 read-tag/read-mode-toolbar/read-article-body 必须还在，Task 2 不得删到它们）。
- **删「目录」按钮不破坏样式面板动作栏**：其余 `style-action-btn`（显示/导出/关闭）保留；`showOutline`/`setShowOutline` 变未用须一并删，否则 noUnusedLocals 报错。Task 3。
- **大纲在阅读/排版模式联动**：点大纲项经 `getOutlineJumper()` 跳转 + `activeTocId` 高亮，编辑模式仍走 `getEditorFacade`（`outline-mode-aware.test.mjs` 断言不变）。Task 1 不改 SidebarOutline.tsx。

---

### Task 1: 大纲活动项样式 → read-toc 风格（layout.css）

**Files:**
- Modify: `src/styles/layout.css`（`.outline-jump-btn.current`、`.current:hover`、删除 `.current .outline-badge`）
- Test: `tests/outline-boundary.test.mjs`（新增 `.current` 用 accent-a5 断言）

**Interfaces:**
- Consumes: 无。
- Produces: `.current` 视觉 = accent-a5 浅底 + 强调色字 + 强调色左边框；无 `.current .outline-badge` override。

- [ ] **Step 1: 写失败测试** —— `outline-boundary.test.mjs` 的「样式落在高亮」测试内加：
```js
assert.match(outlineCss, /outline-jump-btn\.current\s*\{[^}]*background:\s*var\(--accent-a5\)/, '当前项背景必须是 read-toc 的 accent-a5 浅底')
assert.match(outlineCss, /outline-jump-btn\.current\s*\{[^}]*color:\s*var\(--accent-primary\)/, '当前项文字必须是强调色')
assert.doesNotMatch(outlineCss, /outline-jump-btn\.current \.outline-badge/, '当前项徽标不再白底强调字 override，回反色实底')
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --import tsx --test tests/outline-boundary.test.mjs`
Expected: FAIL（`.current` 当前是实色 accent-primary 底 + 白字，且仍有 `.current .outline-badge`）

- [ ] **Step 3: 实现** —— `layout.css`：
  - `.outline-jump-btn.current { background: var(--accent-a5); border-color: transparent; border-left-color: var(--accent-primary); color: var(--accent-primary); font-weight: 600; }`
  - `.outline-jump-btn.current:hover { background: var(--accent-a10); border-color: transparent; border-left-color: var(--accent-primary); }`
  - 删除 `.sidebar-outline .outline-jump-btn.current .outline-badge { ... }`（活动项徽标回 `.l1/.l2/.l3` 反色实底）。

- [ ] **Step 4: 运行，确认通过** + typecheck

Run: `node --import tsx --test tests/outline-boundary.test.mjs && npm run typecheck`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/styles/layout.css tests/outline-boundary.test.mjs
git commit -m "style(outline): 大纲活动项背景统一 read-toc 风格（accent-a5 浅底+强调色字+左边框），活动项徽标回反色实底"
```

---

### Task 2: 删除 read-toc-* 死 CSS（globals.css + read-mode.css）

**Files:**
- Modify: `src/styles/globals.css`（`:3168-3208` read-toc-* 块）
- Modify: `src/styles/read-mode.css`（`:167-207` read-toc-* 块 + `:234` 媒体查询内 `.read-toc`）
- Test: `tests/code-mode-boundary.test.mjs`（`:40` 的 `.read-toc-sidebar` 断言由「必须还在」改「必须已删」）

**Interfaces:**
- Consumes: 无。
- Produces: `read-toc` 不再出现在任何 CSS。

- [ ] **Step 1: 写失败测试** —— `code-mode-boundary.test.mjs`：把 `assert.match(globalsCss, /\.read-toc-sidebar/, '目录侧栏样式必须还在')` 改为：
```js
assert.doesNotMatch(globalsCss, /read-toc/, 'read-toc 死 CSS 已清理（组件已移除）')
```
并新增：
```js
assert.doesNotMatch(readModeCss, /read-toc/, 'read-mode 的 read-toc 死 CSS 已清理')
```
同时确认保留断言不动：`read-tag` / `read-mode-toolbar` / `read-article-body` 仍必须 match。

- [ ] **Step 2: 运行，确认失败**

Run: `node --import tsx --test tests/code-mode-boundary.test.mjs`
Expected: FAIL（globals.css 仍含 read-toc）

- [ ] **Step 3: 实现** —— 删 `globals.css:3168-3208` 整块（`.read-toc-sidebar`…`.read-toc-text`）；删 `read-mode.css:167-207` 整块 + `:234` 媒体查询内的 `.read-toc`（若媒体查询因此变空，删空查询）。

- [ ] **Step 4: 运行，确认通过** + typecheck

Run: `node --import tsx --test tests/code-mode-boundary.test.mjs && npm run typecheck`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/styles/globals.css src/styles/read-mode.css tests/code-mode-boundary.test.mjs
git commit -m "chore(css): 清理已无引用的 read-toc 死 CSS（globals + read-mode）"
```

---

### Task 3: 删除 StyleMainPanel「目录」按钮 + 未用变量（style-panel-outline.test.mjs）

**Files:**
- Modify: `src/components/panels/StyleMainPanel.tsx`（`:228-232` 删按钮；`:24-25` 删 `showOutline`/`setShowOutline`）
- Test: `tests/style-panel-outline.test.mjs`（`:11` 的 `setShowOutline(!showOutline)` 断言删除/改）

**Interfaces:**
- Consumes: 无。
- Produces: StyleMainPanel 无 `style-action-btn`「目录」按钮；无 `showOutline`/`setShowOutline`。

- [ ] **Step 1: 写失败测试** —— `style-panel-outline.test.mjs`：把 `assert.match(panel, /setShowOutline\(!showOutline\)/, '目录按钮切换 showOutline')` 改为：
```js
assert.doesNotMatch(panel, /setShowOutline\(!showOutline\)/, '「目录」按钮已删除（大纲由顶栏工具栏统一开关）')
assert.doesNotMatch(panel, /showOutline/, 'StyleMainPanel 不再用 showOutline')
```
保留其余断言（activeTocId / registerOutlineJumper / parseMdOutline / scrollIntoView 不动）。

- [ ] **Step 2: 运行，确认失败**

Run: `node --import tsx --test tests/style-panel-outline.test.mjs`
Expected: FAIL（panel 仍含 setShowOutline）

- [ ] **Step 3: 实现** —— `StyleMainPanel.tsx`：删 `:228-232` 的 `style-action-btn`「目录」按钮；删 `:24-25` 的 `const showOutline = ...` 与 `const setShowOutline = ...`。

- [ ] **Step 4: 运行，确认通过** + typecheck + 全量

Run: `node --import tsx --test tests/style-panel-outline.test.mjs && npm run typecheck && npm run test`
Expected: PASS（全量全绿）

- [ ] **Step 5: 提交**

```bash
git add src/components/panels/StyleMainPanel.tsx tests/style-panel-outline.test.mjs
git commit -m "feat(style): 移除样式面板「目录」按钮（大纲由顶栏统一），清理未用 showOutline"
```

---

## 执行备注

- 三任务顺序执行，各自端到端绿。Task 1 只改 `.current` 视觉；Task 2 只删死 CSS；Task 3 只删按钮。
- **不动** `src/components/sidebar/SidebarOutline.tsx`（联动逻辑 `a78b035` 已接，`outline-mode-aware.test.mjs` 断言不变）。
- **保留** ReadMode 的 `read-tool-btn`「目录」按钮（用户只指向 StyleMainPanel 的 `style-action-btn`）。
- 实现后截图验证：亮/暗两主题大纲活动项 = accent-a5 浅底 + 强调色字 + 左边框、徽标反色实底；样式面板动作栏无「目录」按钮；大纲与排版/阅读内容联动（点大纲项高亮+跳转）。
