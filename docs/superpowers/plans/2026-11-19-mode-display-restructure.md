# 模式显示重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让编辑模式成为默认全区域所见即所得视图、代码/编辑用同一菜单项切换（文案翻转）、预览成为第一类分屏（左=编辑或代码，右=预览）、所有内容区统一 760px 宽 + 27.33px 行高。

**Architecture:** 保留 `appMode` + `showPreview` 两维状态，不新增模式枚举。布局由 `modeLayout.ts` 纯函数推导；菜单行为由 `editorActions.tsx` 的 `modeAction` 驱动；内容测度由 `--document-width`（760px）与 27.33px 行高统一。

**Tech Stack:** React 18 + Zustand（editorStore/settingsStore）+ Milkdown（WYSIWYG）+ CodeMirror 6（代码）+ PostCSS。测试用 node:test + tsx，纯函数直接 import、组件用静态源码断言。

**Spec:** `docs/superpowers/specs/2026-11-19-mode-display-restructure-design.md`

## Global Constraints

- 保留两维状态（`appMode` + `showPreview`），**不新增**模式枚举。
- 默认 `appMode` 改为 `'edit'`（WYSIWYG paper 主题）；`showPreview` 默认 `false`。
- 预览分屏左栏编辑器类型 = 当前 `appMode`（`'edit'`→WYSIWYG，`'code'`→CM6）；右栏恒为 `SidebarPreview`。
- 代码/编辑菜单项文案翻转：`appMode === 'code' ? '编辑模式' : '代码模式'`，点击 `setAppMode(appMode==='code'?'edit':'code')`，**不改** `showPreview`。
- 排版/阅读模式进入时 `setShowPreview(false)`（独占全区域）。
- 内容测度：内容列宽 `--document-width: 760px`；正文行高 `27.33px`。
- 并行会话（nebula-ui-redesign）未提交改动不得触碰；混合同文件时用 `git add -p` 只暂存自己的 hunk。
- 部署走 `lzc-cli lpk install`；沙箱不可达部署站，用本地 `vite preview` 验证。

## Review Focus

1. **预览分屏 + 代码左栏**：`showPreview=true, appMode='code'` 必须左 CM6 + 右 `SidebarPreview`，不得把右栏藏掉（Task 1 测试钉死 `shouldShowRightPreview({showPreview:true,appMode:'code'})===true`）。
2. **代码/编辑菜单项文案翻转**：`appMode==='code'` 时显示「编辑模式」，点击回编辑；`appMode!=='code'` 时显示「代码模式」（Task 3 `getModeItems` 测试）。
3. **预览开时左栏不锁编辑**：`appMode==='code'` 下点预览，左栏保持 CM6（不强制 `edit`）（Task 3 `modeAction('preview')` 测试）。
4. **内容测度**：WYSIWYG 与 CM6 内容列 760px、正文行高 27.33px（Task 4 CSS 断言）。
5. **阅读模式分页不回归**：只改行高（27.33px）不改变分页引擎；验证 `ReadMode` 仍 `paginate()`（Task 5 全量 + 浏览器）。

---

### Task 1: 预览分屏允许左栏为代码（shouldShowRightPreview）

**Files:**
- Modify: `src/utils/modeLayout.ts`（`shouldShowRightPreview`）
- Modify: `tests/mode-layout.test.mjs`（code 期望改为 true）
- Modify: `tests/mode-boundary.test.mjs`（移除 `appMode !== 'code'` 断言）

**Interfaces:**
- Produces: `shouldShowRightPreview({showPreview, appMode})` 现在对 `appMode==='code'` 且 `showPreview===true` 返回 `true`。

- [ ] **Step 1: 更新行为测试（code + 预览 → 显示预览）**

修改 `tests/mode-layout.test.mjs` 第 16–22 行：把 `'code'` 从「各 appMode 都不得显示预览」循环中移除，改为单独断言 `showPreview=true, appMode='code'` → `true`：

```js
// 预览分屏：左栏可为代码（CM6），右栏仍显示预览
assert.equal(
  shouldShowRightPreview({ showPreview: true, appMode: 'code' }),
  true,
  '代码模式 + 预览开启 → 显示预览（分屏左栏 CM6、右栏预览）'
)
for (const m of ['history', 'style', 'read']) {
  assert.equal(
    shouldShowRightPreview({ showPreview: true, appMode: m }),
    false,
    `appMode=${m} 不显示预览`
  )
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test tests/mode-layout.test.mjs`
Expected: FAIL（`appMode='code'` 当前返回 false，断言期望 true）

- [ ] **Step 3: 实现 `shouldShowRightPreview`**

`src/utils/modeLayout.ts`：把

```ts
return showPreview
    && appMode !== 'code'
    && appMode !== 'history'
    && appMode !== 'style'
    && appMode !== 'read'
```

改为

```ts
return showPreview && (appMode === 'edit' || appMode === 'code')
```

（预览分屏只在编辑/代码视图下开启；排版/阅读/历史独占全区域。）

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test tests/mode-layout.test.mjs`
Expected: PASS

- [ ] **Step 5: 更新 mode-boundary.test.mjs 的过时断言**

`tests/mode-boundary.test.mjs` 第 29 行 `assert.match(modeLayout, /appMode !== 'code'/, '代码模式必须不给右栏留位')` 已与新行为矛盾（预览分屏允许代码左栏）。删除该行，替换为断言新逻辑存在：

```js
assert.match(modeLayout, /appMode === 'edit' \|\| appMode === 'code'/, '预览分屏左栏可为编辑或代码')
```

Run: `node --import tsx --test tests/mode-boundary.test.mjs tests/mode-layout.test.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/modeLayout.ts tests/mode-layout.test.mjs tests/mode-boundary.test.mjs
git commit -m "feat(layout): 预览分屏允许左栏为代码（CM6）+ 右栏预览"
```

---

### Task 2: 默认进入编辑模式（appMode 'code' → 'edit'）

**Files:**
- Modify: `src/store/editorStore.ts:129`（默认 `appMode`）
- Test: `tests/mode-boundary.test.mjs`（新增默认断言）

**Interfaces:**
- Produces: 新建会话 `appMode === 'edit'`（WYSIWYG 全区域），`codeMode === false`。

- [ ] **Step 1: 写失败测试（默认 appMode = edit）**

在 `tests/mode-boundary.test.mjs` 末尾加：

```js
const store = read('src/store/editorStore.ts')
assert.match(store, /appMode: 'edit' as const/, '默认必须进入编辑模式（WYSIWYG）而非代码模式')
assert.doesNotMatch(store, /appMode: 'code' as const/, '默认不得再是代码模式')
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/mode-boundary.test.mjs`
Expected: FAIL（当前 `appMode: 'code' as const`）

- [ ] **Step 3: 实现默认 edit**

`src/store/editorStore.ts:129`：`appMode: 'code' as const` → `appMode: 'edit' as const`。

- [ ] **Step 4: 运行确认通过 + 全量模式测试**

Run: `node --import tsx --test tests/mode-boundary.test.mjs tests/mode-layout.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/editorStore.ts tests/mode-boundary.test.mjs
git commit -m "feat(editor): 默认进入编辑模式（所见即所得）而非代码模式"
```

---

### Task 3: 模式菜单行为（代码文案翻转 + 预览不锁 edit + 样式/阅读关预览）

**Files:**
- Modify: `src/components/layout/editorActions.tsx`（`MODE_ITEMS` → `getModeItems(appMode)`；`modeAction` 重写）
- Modify: `src/components/layout/Toolbar.tsx:211`、`src/components/layout/LeftNav.tsx:162`（改用 `getModeItems(appMode)`）
- Modify: `tests/mode-boundary.test.mjs`（更新模式菜单断言 + 新增行为断言）

**Interfaces:**
- Produces: `getModeItems(appMode: string): MenuItem[]`（4 项，code 项 label 依 appMode 翻转）；`modeAction(action)` 语义：
  - `'preview'`：`setShowPreview(!showPreview)`；开时若 `appMode` 不在 `'edit'|'code'` → `setAppMode('edit')`。
  - `'code'`：`setAppMode(appMode==='code'?'edit':'code')`，**不改** `showPreview`。
  - `'style'|'read'`：`setAppMode(appMode===action?'edit':action)` + `setShowPreview(false)`。
- Consumes: `useEditorStore` 的 `appMode`/`showPreview`/`setAppMode`/`setShowPreview`。

- [ ] **Step 1: 写失败测试（getModeItems 文案翻转 + modeAction 语义）**

`tests/mode-boundary.test.mjs` 替换原 `label: '代码模式', action: 'code'` 静态断言为对 `getModeItems` 的纯函数断言：

```js
import { getModeItems } from '../src/components/layout/editorActions.tsx'
// 需在文件顶部加 import；若 tsx 无法解析，退回静态源码断言（见 Step 3 备选）。
const codeItem = (items) => items.find(i => i.action === 'code')
assert.equal(codeItem(getModeItems('edit')).label, '代码模式', '编辑模式态 → 菜单项显示「代码模式」')
assert.equal(codeItem(getModeItems('code')).label, '编辑模式', '代码模式态 → 菜单项显示「编辑模式」')
```

以及 `modeAction` 源码语义断言（modeBlock 已提取）：

```js
assert.match(modeBlock, /st\.setShowPreview\(next\)/, '预览模式必须驱动右栏分屏预览')
assert.match(modeBlock, /st\.appMode !== 'edit' && st\.appMode !== 'code'/, '预览开时左栏不锁编辑：仅非编辑/代码视图归位到编辑')
assert.match(modeBlock, /action === 'code'/, '代码模式动作必须存在')
assert.match(modeBlock, /st\.setShowPreview\(false\)/, '样式/阅读模式必须关分屏预览（独占全区域）')
assert.match(modeBlock, /st\.appMode === action \? 'edit' : action/, '样式/阅读模式必须可切换回来')
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/mode-boundary.test.mjs`
Expected: FAIL（`getModeItems` 未定义；modeBlock 无 `st.appMode !== 'edit' && …` 与 `setShowPreview(false)`）

- [ ] **Step 3: 实现 `getModeItems` 与 `modeAction`**

`src/components/layout/editorActions.tsx`：

把 `MODE_ITEMS` 常量改为函数（保留 4 项，code 项 label 翻转）：

```ts
export function getModeItems(appMode: string): MenuItem[] {
  return [
    { icon: 'ri-eye-2-line', label: '预览模式', action: 'preview' },
    { icon: 'ri-code-s-line', label: appMode === 'code' ? '编辑模式' : '代码模式', action: 'code' },
    { icon: 'ri-palette-line', label: '排版模式', action: 'style' },
    { icon: 'ri-book-open-line', label: '阅读模式', action: 'read' },
  ]
}
```

重写 `modeAction`：

```ts
const modeAction = useCallback((action: string) => {
  const st = useEditorStore.getState()
  if (action === 'preview') {
    const next = !st.showPreview
    st.setShowPreview(next)
    // 左栏编辑器类型 = 当前 appMode；仅当处于非编辑/代码视图时归位到编辑。
    if (next && st.appMode !== 'edit' && st.appMode !== 'code') st.setAppMode('edit')
    return
  }
  if (action === 'code') {
    // 代码/编辑同一项：代码模式下切回编辑，否则进代码。保留 showPreview（预览分屏内切换左栏）。
    st.setAppMode(st.appMode === 'code' ? 'edit' : 'code')
    return
  }
  if (action === 'style' || action === 'read') {
    st.setAppMode(st.appMode === action ? 'edit' : action)
    st.setShowPreview(false)
  }
}, [])
```

`Toolbar.tsx:211` 与 `LeftNav.tsx:162`：`MODE_ITEMS` → `getModeItems(appMode)`（两处组件已持有 `appMode`）。导入相应更新。

> 备选（若 tsx 无法 import getModeItems）：保留静态源码断言 `assert.match(actions, /label: appMode === 'code' \? '编辑模式' : '代码模式'/)`，并断言 `getModeItems\(appMode\)` 被 Toolbar/LeftNav 使用。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/mode-boundary.test.mjs tests/mode-layout.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/editorActions.tsx src/components/layout/Toolbar.tsx src/components/layout/LeftNav.tsx tests/mode-boundary.test.mjs
git commit -m "feat(editor): 模式菜单代码/编辑文案翻转，预览分屏左栏可切编辑或代码"
```

---

### Task 4: 内容测度统一 760px 宽 + 27.33px 行高

**Files:**
- Modify: `src/store/settingsStore.ts`（`contentWidth` 默认 `'1280'→'760'` + 迁移 v3→v4 + `SETTINGS_VERSION=4`）
- Modify: `src/additional/milkdown/milkdown.css`（`--document-width: 690→760`）
- Modify: `src/styles/code-editor.css`（`--document-width: 690→760`）
- Modify: `src/additional/milkdown/textus/theme/content-themes.css`（paper 块 `--doc-line-height: 27.33px`）
- Modify: `src/styles/read-mode.css`（`.read-article-body, .preview-doc` 行高 `27.33px`）
- Modify: `src/styles/panels.css`（`.style-read-acks` 行高 `27.33px`）
- Test: `tests/design1-v2-conformance.test.mjs` 或新增 `tests/content-measure.test.mjs`

**Interfaces:**
- Produces: `SETTINGS_VERSION = 4`；`contentWidth` 默认 `'760'`；旧存档 `'1024'/'1280'` 迁移为 `'760'`；`--document-width: 760px`（WYSIWYG/CM6）；正文 `27.33px` 行高。

- [ ] **Step 1: 写失败测试（默认/迁移 + CSS 测度）**

新增 `tests/content-measure.test.mjs`：

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('settings 默认内容宽 760，旧存档迁移到 760', () => {
  const s = read('src/store/settingsStore.ts')
  assert.match(s, /contentWidth: '760'/, 'contentWidth 默认必须 760px（统一内容测度）')
  assert.match(s, /SETTINGS_VERSION = 4/, 'settings 版本升到 4（迁移触发）')
  assert.match(s, /raw\?\.contentWidth === '1280'[\s\S]{0,120}raw\.contentWidth = '760'/, '旧 1280 必须迁移到 760')
  assert.match(s, /raw\?\.contentWidth === '1024'[\s\S]{0,120}raw\.contentWidth = '760'/, '旧 1024 必须迁移到 760')
})

test('WYSIWYG/CM6 内容列 760px', () => {
  assert.match(read('src/additional/milkdown/milkdown.css'), /--document-width: 760px/, 'WYSIWYG 内容列 760px')
  assert.match(read('src/styles/code-editor.css'), /--document-width: 760px/, 'CM6 内容列 760px')
})

test('正文行高 27.33px（编辑/预览/读区/排版读区）', () => {
  assert.match(read('src/additional/milkdown/textus/theme/content-themes.css'), /data-content-theme="paper"[\s\S]{0,200}--doc-line-height: 27\.33px/, 'paper 正文行高 27.33px')
  assert.match(read('src/styles/read-mode.css'), /line-height: 27\.33px/, '预览/阅读正文行高 27.33px')
  assert.match(read('src/styles/panels.css'), /\.style-read-acks[\s\S]{0,80}line-height: 27\.33px/, '排版读区行高 27.33px')
})
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/content-measure.test.mjs`
Expected: FAIL（默认仍 1280、无迁移、行高未设）

- [ ] **Step 3: 实现测度**

1. `settingsStore.ts`：
   - `SETTINGS_VERSION = 3` → `4`；新增 `export const CONTENT_WIDTH_MEASURE_VERSION = 4`。
   - 默认 `contentWidth: '1280'` → `'760'`。
   - 迁移逻辑（紧跟现有 v2→v3 迁移后）：`if (version < CONTENT_WIDTH_MEASURE_VERSION && (raw?.contentWidth === '1280' || raw?.contentWidth === '1024')) raw.contentWidth = '760'`。
2. `milkdown.css`：`--document-width: 690px` → `760px`。
3. `code-editor.css`：`--document-width: 690px` → `760px`。
4. `content-themes.css` paper 块：加 `--doc-line-height: 27.33px;`（与已有衬线规则同块）。
5. `read-mode.css`：`.read-article-body, .preview-doc { … line-height: var(--read-line-height, 1.7); … }` → `line-height: 27.33px;`（固定 27.33px，符合统一测度）。
6. `panels.css`：`.style-read-acks { … }` 加 `line-height: 27.33px;`。

- [ ] **Step 4: 运行确认通过 + 相关测试不回归**

Run: `node --import tsx --test tests/content-measure.test.mjs tests/design1-v2-conformance.test.mjs tests/mode-layout.test.mjs`
Expected: PASS（design1-v2 的 1280 断言是 Electron 窗口/弹框，与 contentWidth 无关，应仍过）

- [ ] **Step 5: Commit**

```bash
git add src/store/settingsStore.ts src/additional/milkdown/milkdown.css src/styles/code-editor.css src/additional/milkdown/textus/theme/content-themes.css src/styles/read-mode.css src/styles/panels.css tests/content-measure.test.mjs
git commit -m "feat(editor): 内容测度统一 760px 宽 + 27.33px 行高"
```

---

### Task 5: 全量验证 + 浏览器验证 + 部署

**Files:**
- （无源码改动，纯验证）

- [ ] **Step 1: 全量测试 + typecheck + build**

Run:
```bash
npm test 2>&1 | grep -E '^# (tests|pass|fail)'
npx tsc --noEmit
npm run build
```
Expected: `# fail 0`；tsc exit 0；build 成功。

- [ ] **Step 2: 浏览器验证四种模式 + 测度**

用 `vite preview` + Playwright 探针，逐项断言：
- 默认进入 → WYSIWYG 全区域（`.textus-editor-shell[data-content-theme="paper"]`，无右栏）。
- 点「代码模式」→ CM6 全宽；菜单项文案变「编辑模式」；再点 → 回 WYSIWYG。
- 点「预览模式」→ 左编辑器 + 右 `.preview-doc`；在分屏内点「代码模式」→ 左 CM6、右预览仍在。
- 点「排版模式」→ 样式面板（`.style-read-acks` 760px）；点「阅读模式」→ `ReadMode`（仍 `paginate`）。
- 测度：WYSIWYG `.milkdown` 与 CM6 `.cm-content` 宽 760px；正文 `line-height: 27.33px`。

- [ ] **Step 3: 核对版本并打包部署**

Run:
```bash
grep '"version"' package.json   # 记下 LPK_VERSION
rm -rf lzc/_lpk_content lzc/_runtime_cache && rm -f lzc/*.lpk
LPK_VERSION=<version> bash lzc/package.sh
lzc-cli lpk lint lzc/cloud.lazycat.app.lzeditor-<version>.lpk
lzc-cli lpk install lzc/cloud.lazycat.app.lzeditor-<version>.lpk
```
Expected: lint 无警告、install 成功。

- [ ] **Step 4: 确认只提交自己的改动**

Run: `git status --short`
Expected: 未提交项仅为并行会话（nebula-ui-redesign）的改动，无本任务遗漏。

---

## 自审记录

- **Spec 覆盖**：4 点（默认 edit→T2；代码文案翻转→T3；预览左栏可切→T1+T3；760×27.33→T4）全覆盖。
- **类型一致**：`getModeItems(appMode)` 在 T3 定义并被 Toolbar/LeftNav 消费；`shouldShowRightPreview` 签名在 T1 改、调用处不变。
- **Review Focus**：5 项各挂对应任务测试（T1#1、T3#1、T3#1、T4#1、T5#2）。
- **比例**：计划长度与 spec 相当，未写冗余函数体。
