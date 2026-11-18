# 导航精修：活动项徽标跟随 + 模式入口收敛 + 浮导航点击显示 —— Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans to implement task-by-task (Native/inline recommended; small scope).

**Goal:** 大纲活动项徽标红色焦点随 active；去掉「代码模式」入口（默认代码模式=edit）；去掉导航独立「阅读」「样式」按钮；排版模式浮导航默认隐藏、点内容区显示。

**Architecture:** 纯视觉/入口收敛，不触联动逻辑。点 2（排版大纲点击切换）已在本轮早期修复部署，不在本计划。

**Spec:** `docs/superpowers/specs/2026-11-17-nav-refine-design.md`

## Global Constraints

- 活动项徽标 = 强调色（红底白字，任意层级）；非活动项徽标 = 统一中性灰（H1 不再恒红）。
- 模式菜单（MODE_ITEMS）留 预览/排版/阅读，删「代码模式」；默认 appMode='edit'（=代码编辑器）不变。
- 导航（Toolbar + LeftNav）删独立「样式」「阅读」按钮；保留「历史」+「模式」菜单。
- 浮导航默认隐藏，点内容区显示，删 `.nav-hidden:hover`。
- 全量 `npm run test` + `typecheck` 通过。

---

### Task 1: 活动项徽标随 active（layout.css + outline-boundary.test.mjs）

**Files:** `src/styles/layout.css`、`tests/outline-boundary.test.mjs`

- [ ] **Step 1 RED**: `outline-boundary.test.mjs` 把 `:94` 的 `doesNotMatch(.current .outline-badge)` 改 `assert.match(outlineCss, /outline-jump-btn\\.current \\.outline-badge/, '活动项徽标强调色，随 active')`；`:87` 改 `assert.match(outlineCss, /outline-badge\\.l1[^}]*background/, '徽标类存在')`（保持 l1 类）。
- [ ] **Step 2**: 运行 `node --import tsx --test tests/outline-boundary.test.mjs`，确认 FAIL（无 `.current .outline-badge`）。
- [ ] **Step 3 GREEN**: `layout.css`：`.outline-badge.l1/.l2/.l3` 统一中性灰（`background:#55524C; color:var(--color-on-primary)`）；新增 `.sidebar-outline .outline-jump-btn.current .outline-badge { background: var(--accent-primary); color: var(--color-on-primary); }`。
- [ ] **Step 4**: 运行，确认 PASS + `npm run typecheck`。
- [ ] **Step 5**: 提交 `git add src/styles/layout.css tests/outline-boundary.test.mjs && git commit -m "style(outline): 活动项徽标强调色随 active，非活动项徽标统一中性灰"`。

---

### Task 2: 去「代码模式」入口（editorActions.tsx + mode-boundary.test.mjs）

**Files:** `src/components/layout/editorActions.tsx`、`tests/mode-boundary.test.mjs`

- [ ] **Step 1 RED**: `mode-boundary.test.mjs:12` 改 `assert.doesNotMatch(actions, /label: '代码模式', action: 'code'/, '代码模式入口已去掉（默认代码模式）')`。
- [ ] **Step 2**: 运行 `node --import tsx --test tests/mode-boundary.test.mjs`，确认 FAIL。
- [ ] **Step 3 GREEN**: `editorActions.tsx MODE_ITEMS` 删 `{ icon: 'ri-code-s-line', label: '代码模式', action: 'code' }`。
- [ ] **Step 4**: 运行，确认 PASS + typecheck。
- [ ] **Step 5**: 提交。

---

### Task 3: 去导航独立「阅读」「样式」按钮（Toolbar.tsx + LeftNav.tsx）

**Files:** `src/components/layout/Toolbar.tsx`、`src/components/layout/LeftNav.tsx`

- [ ] **Step 1**: 删 `Toolbar.tsx` 的独立「样式」「阅读」按钮（`:185-194`）；删 `LeftNav.tsx` 的「样式」「阅读」按钮（`:135-136`）。
- [ ] **Step 2**: 全量 `npm run test` + typecheck（确认无未用变量/无测试锚点）。
- [ ] **Step 3**: 提交。

---

### Task 4: 浮导航默认隐藏、点内容区显示（StyleMainPanel.tsx + read-mode.css）

**Files:** `src/components/panels/StyleMainPanel.tsx`、`src/styles/read-mode.css`、`tests/style-panel-outline.test.mjs`（可选锚点）

- [ ] **Step 1 RED**: 新增断言（或复用 style-panel-outline）：`assert.match(panel, /navVisible/)` 且 `assert.match(panel, /onClick=\{\(\) => setNavVisible\(true\)\}/)`（内容区点击显示）；`assert.doesNotMatch(readModeCss, /nav-hidden:hover/, '不靠 hover 显示')`。
- [ ] **Step 2**: 运行，确认 FAIL。
- [ ] **Step 3 GREEN**: `StyleMainPanel.tsx`：新增 `const [navVisible, setNavVisible] = useState(false)`；`<div className={main-nav-float${navVisible ? '' : ' nav-hidden'}}>`；内容区 `.style-read-scroll` 加 `onClick={() => setNavVisible(true)}`。`read-mode.css` 删 `.main-nav-float.nav-hidden:hover {...}`。
- [ ] **Step 4**: 运行，确认 PASS + 全量 + typecheck。
- [ ] **Step 5**: 提交。

---

## 执行备注

- 四任务顺序执行，各自绿。Task 1 只改徽标色；Task 2 只删菜单项；Task 3 只删按钮；Task 4 只改浮导航显隐。
- 实现后截图验证：活动项徽标红底随 active、非活动项灰、模式菜单无代码模式、导航无独立阅读/样式按钮、排版模式浮导航默认隐藏点内容区显示。
- **用户 WIP 可能并发**：只 `git add` 本任务文件，勿 `git add .`。
