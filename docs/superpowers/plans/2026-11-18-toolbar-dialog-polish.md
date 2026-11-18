# 工具栏精简 + 弹框固定高度 + 导出预览优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 工具栏改恒纯图标 + hover 显标题；常用格式按钮开关收敛工具栏；文档库/插入/图片/链接弹框固定高度；导出预览固定高度 + 弹框更紧凑。

**Architecture:** 纯展示/布局调整，不触编辑器/导出核心逻辑。工具栏恒挂 `.toolbar-icon-only`（隐藏 label），`showToolbarLabels` 开时加 `.toolbar-hover-labels` 让 hover 显示标题；侧边栏隐藏 `.rail-label`（既有 UiTip right 提供 hover 文字）；`quickFormatButtons` 关闭时条件渲染 查找/AI/粗体/斜体/删除线；弹框加 `height` prop；`.ud-preview-body` 固定高 + 滚动。

**Tech Stack:** React + TS + Vite + CodeMirror 6（markdown 源码）；CSS 变量设计系统；boundary tests（node --import tsx --test tests/*.test.mjs）。

**Spec:** `docs/superpowers/specs/2026-11-18-toolbar-dialog-polish-design.md`

## Global Constraints

- 恒纯图标：顶栏/侧边栏 label 默认隐藏；`showToolbarLabels` 开启（默认 true）→ hover 显标题（顶栏下方 / 侧边栏右侧）。
- `quickFormatButtons` 关闭 → 顶栏仅 12 核心（文档库/新建/大纲/格式/图片/链接/表格/插入/模式/历史/导出/设置），隐藏 查找/AI/粗体/斜体/删除线。
- 弹框固定高度：文档库默认「URL 在线导入」+ `height={600}`；图片/链接等插入弹框 `height={520}`。
- 导出预览 `.ud-preview-body` 固定高 + `overflow-y:auto`；导出弹框收窄。
- 全量 `npm run test`（当前 295/295）+ `npm run typecheck` 通过。
- **用户 WIP 可能并发**：只 `git add` 本任务文件，勿 `git add .`。

## Review Focus

- 顶栏 hover 显 label 不得挤压布局（label 绝对定位，勿改按钮尺寸/工具栏高度）。
- `quickFormatButtons` 关闭时 查找/AI 确实隐藏（不只粗体/斜体/删除线）。
- 弹框固定高度后内容可滚动不溢出（overflow 正确）。
- 导出预览固定高度后滚动条出现、卡片不撑破弹框。
- 侧边栏 icon-only 后 UiTip right 仍显示文字（hover 可达）。

---

### Task 1: 工具栏恒纯图标 + hover 显标题（顶栏 + 侧边栏）

**Files:**
- Modify: `src/components/layout/Toolbar.tsx`（顶栏 class 恒 icon-only）
- Modify: `src/styles/layout.css`（label 隐藏 + hover 显示）
- Modify: `src/styles/globals.css` 或 `src/styles/layout.css`（侧边栏 `.rail-label` 隐藏）
- Modify: `src/components/layout/LeftNav.tsx`（UiTip 随 showToolbarLabels）
- Test: `tests/toolbar-hover-labels.test.mjs`

- [ ] **Step 1: 写失败测试**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const toolbar = read('src/components/layout/Toolbar.tsx')
const leftNav = read('src/components/layout/LeftNav.tsx')
const layoutCss = read('src/styles/layout.css')

// 顶栏恒 icon-only + showToolbarLabels 时挂 hover-labels
assert.match(toolbar, /navtop toolbar toolbar-icon-only\$\{showToolbarLabels \? ' toolbar-hover-labels' : ''\}/, '顶栏恒 icon-only，showToolbarLabels 开时加 hover-labels')
// hover 显 label：绝对定位下置，不挤压布局
assert.match(layoutCss, /\.toolbar-icon-only\.toolbar-hover-labels \.toolbar-btn:hover \.toolbar-label[^}]*position:\s*absolute/, '顶栏 hover 显示 label（绝对定位）')
// 侧边栏 rail-label 隐藏（icon-only）
assert.match(layoutCss, /\.rail-btn \.rail-label[^}]*display:\s*none/, '侧边栏 rail-label 隐藏（icon-only）')
console.log('toolbar hover labels ok')
```

- [ ] **Step 2: 运行确认 FAIL**

Run: `node --import tsx --test tests/toolbar-hover-labels.test.mjs`
Expected: FAIL（顶栏 class / hover CSS / rail-label 均未实现）

- [ ] **Step 3: 实现顶栏恒 icon-only + hover 显 label**

`Toolbar.tsx`：`<div className={`navtop toolbar toolbar-icon-only${showToolbarLabels ? ' toolbar-hover-labels' : ''}`}>`（替换现有 `navtop toolbar${!showToolbarLabels ? ' toolbar-icon-only' : ''}`）。
`layout.css`：`.toolbar-icon-only .toolbar-btn .toolbar-label { display:none }`（已有）；新增 `.toolbar-icon-only.toolbar-hover-labels .toolbar-btn:hover .toolbar-label { position:absolute; top:calc(100% + 4px); left:50%; transform:translateX(-50%); display:block; white-space:nowrap; background:var(--color-bg-card); border:0.7px solid var(--color-border); border-radius:6px; padding:2px 8px; font-size:11px; color:var(--color-text-body); box-shadow:var(--color-popover-shadow); z-index:200; pointer-events:none; }`。

- [ ] **Step 4: 实现侧边栏 icon-only**

`layout.css`：新增 `.rail-btn .rail-label { display:none }`（`LeftNav.tsx` 的 rail-label 隐藏，UiTip right 承担 hover 文字）。
`LeftNav.tsx`：`const showToolbarLabels = useSettingsStore(s => s.showToolbarLabels)`；`menu()`/`btn()` 里 `{showToolbarLabels && <UiTip text={label} placement="right">...</UiTip>}`（无 tip 时直接渲染按钮）。

- [ ] **Step 5: 运行确认 PASS**

Run: `node --import tsx --test tests/toolbar-hover-labels.test.mjs && npm run typecheck`
Expected: PASS + typecheck 通过

- [ ] **Step 6: 提交**

```bash
git add src/components/layout/Toolbar.tsx src/styles/layout.css src/components/layout/LeftNav.tsx tests/toolbar-hover-labels.test.mjs
git commit -m "feat(toolbar): 恒纯图标 + hover 显标题（顶栏下方/侧边栏右侧）"
```

---

### Task 2: 常用格式按钮开关收敛工具栏 + 文案

**Files:**
- Modify: `src/components/layout/Toolbar.tsx`（查找/AI 随 quickFormatButtons）
- Modify: `src/components/panels/settings/EditorSettingsTab.tsx`（desc 文案）
- Test: `tests/quick-format-toolbar.test.mjs`

- [ ] **Step 1: 写失败测试**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const toolbar = read('src/components/layout/Toolbar.tsx')
const settings = read('src/components/panels/settings/EditorSettingsTab.tsx')

// 查找 + AI 随 quickFormatButtons 显隐
const findBlock = toolbar.match(/查找[\s\S]{0,120}/)?.[0] || ''
const aiBlock = toolbar.match(/AI[\s\S]{0,120}/)?.[0] || ''
assert.match(findBlock, /quickFormatButtons/, '查找按钮随 quickFormatButtons 显隐')
assert.match(aiBlock, /quickFormatButtons/, 'AI 按钮随 quickFormatButtons 显隐')
// desc 文案更新
assert.match(settings, /在工具栏上显示常用的样式菜单，开启后全部显示/, 'desc 文案已更新')
assert.doesNotMatch(settings, /粗体、斜体、下划线、删除线、高亮五个按钮/, '旧「五个按钮」文案已移除')
console.log('quick format toolbar ok')
```

- [ ] **Step 2: 运行确认 FAIL**

Run: `node --import tsx --test tests/quick-format-toolbar.test.mjs`
Expected: FAIL（查找/AI 未随 quickFormatButtons；desc 未更新）

- [ ] **Step 3: 实现**

`Toolbar.tsx`：把「查找」按钮包进 `{quickFormatButtons && <>...</>}`（与粗体/斜体/删除线同组）；把「AI」按钮也包进 `quickFormatButtons &&`。
`EditorSettingsTab.tsx`：desc 改为「在工具栏上显示常用的样式菜单，开启后全部显示」。

- [ ] **Step 4: 运行确认 PASS**

Run: `node --import tsx --test tests/quick-format-toolbar.test.mjs && npm run typecheck`
Expected: PASS + typecheck 通过

- [ ] **Step 5: 提交**

```bash
git add src/components/layout/Toolbar.tsx src/components/panels/settings/EditorSettingsTab.tsx tests/quick-format-toolbar.test.mjs
git commit -m "feat(toolbar): 常用格式开关关闭时收敛为 12 核心按钮 + 更新文案"
```

---

### Task 3: 弹框固定高度（文档库默认 URL 标签 + 插入/图片/链接）

**Files:**
- Modify: `src/components/panels/LibraryPanel.tsx`
- Modify: `src/components/panels/ImageDialog.tsx`、`src/components/panels/LinkDialog.tsx`（及 Code/Formula/TableDropdown/Emoji/Chart 若为插入弹框）
- Test: `tests/dialog-fixed-height.test.mjs`

- [ ] **Step 1: 写失败测试**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const lib = read('src/components/panels/LibraryPanel.tsx')
const img = read('src/components/panels/ImageDialog.tsx')
const link = read('src/components/panels/LinkDialog.tsx')

assert.match(lib, /useState\('url'\)/, '文档库默认 URL 在线导入标签')
assert.match(lib, /height=\{600\}/, '文档库弹框固定高度 600')
assert.match(img, /height=\{520\}/, '图片弹框固定高度 520')
assert.match(link, /height=\{520\}/, '链接弹框固定高度 520')
console.log('dialog fixed height ok')
```

- [ ] **Step 2: 运行确认 FAIL**

Run: `node --import tsx --test tests/dialog-fixed-height.test.mjs`
Expected: FAIL（默认 url / height 未设）

- [ ] **Step 3: 实现**

`LibraryPanel.tsx`：`useState('url')`（原 'docs'）；`<UiModal ... height={600}>`。
`ImageDialog.tsx`/`LinkDialog.tsx`：`<UiModal ... height={520}>`（原 width 720 保留）。

- [ ] **Step 4: 运行确认 PASS**

Run: `node --import tsx --test tests/dialog-fixed-height.test.mjs && npm run typecheck`
Expected: PASS + typecheck 通过

- [ ] **Step 5: 提交**

```bash
git add src/components/panels/LibraryPanel.tsx src/components/panels/ImageDialog.tsx src/components/panels/LinkDialog.tsx tests/dialog-fixed-height.test.mjs
git commit -m "feat(dialog): 弹框固定高度（文档库默认 URL 导入 + 图片/链接）"
```

---

### Task 4: 导出预览固定高度 + 弹框更紧凑

**Files:**
- Modify: `src/styles/settings-dialog.css`（`.ud-preview-body` 固定高 + 滚动）
- Modify: `src/components/panels/ExportDialog.tsx`（width 收窄）
- Test: `tests/export-preview-height.test.mjs`

- [ ] **Step 1: 写失败测试**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const css = read('src/styles/settings-dialog.css')
const exportDialog = read('src/components/panels/ExportDialog.tsx')

const body = css.match(/\.ud-preview-body\s*\{[^}]*\}/)?.[0] || ''
assert.match(body, /height:\s*380px/, '导出预览固定高度 380px')
assert.match(body, /overflow-y:\s*auto/, '导出预览可滚动')
assert.match(exportDialog, /width=\{780\}/, '导出弹框收窄至 780')
console.log('export preview height ok')
```

- [ ] **Step 2: 运行确认 FAIL**

Run: `node --import tsx --test tests/export-preview-height.test.mjs`
Expected: FAIL（未固定高 / 未收窄）

- [ ] **Step 3: 实现**

`settings-dialog.css` `.ud-preview-body`：`min-height:120px` → `height:380px; overflow-y:auto`（保留 `overflow:auto` 改 `overflow-y:auto`）。
`ExportDialog.tsx`：`width={900}` → `width={780}`。

- [ ] **Step 4: 运行确认 PASS**

Run: `node --import tsx --test tests/export-preview-height.test.mjs && npm run typecheck && npm run test`
Expected: PASS + typecheck + 全量通过

- [ ] **Step 5: 提交**

```bash
git add src/styles/settings-dialog.css src/components/panels/ExportDialog.tsx tests/export-preview-height.test.mjs
git commit -m "feat(export): 导出预览固定高度 + 滚动条，弹框更紧凑"
```

---

## 执行备注

- 四任务顺序执行，各自绿。Task 1 只改工具栏显隐/hover；Task 2 只改按钮收敛 + 文案；Task 3 只改弹框高度；Task 4 只改导出预览。
- 实现后截图验证：顶栏 icon-only + hover 下置文字、侧边栏 icon-only + hover 右侧文字、quickFormat 关闭后 12 核心、文档库默认 URL 标签 + 固定高、导出预览固定高滚动条。
- **用户 WIP 可能并发**：只 `git add` 本任务文件，勿 `git add .`。
