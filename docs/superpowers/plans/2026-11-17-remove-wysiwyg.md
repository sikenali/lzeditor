# 移除 WYSIWYG 模式入口 + 清理死代码 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 去掉 WYSIWYG 模式入口（模式菜单项）并清理全部 WYSIWYG 接线死代码，使 WYSIWYG 从产品不可进入。

**Architecture:** WYSIWYG 唯一入口是 `MODE_ITEMS` 的模式菜单项（`action:'wysiwyg'`），不持久化（`wysiwyg:false` 默认）。去掉入口后 `wysiwyg` 永不可达，删掉 store 字段/类型/App 分支/modeLayout 参数/applyWysiwygItems/disabled 状态。Textus/Milkdown 子系统（`src/additional/milkdown/`，220 文件）保留不删（改后不再被 import，Vite 不打包）。

**Tech Stack:** React + Vite + zustand；node:test 纯函数/静态单测。

**Spec:** `docs/superpowers/specs/2026-11-17-remove-wysiwyg-design.md`

## Global Constraints

- `wysiwyg` 恒 false 后，`shouldShowRightPreview` 去掉 `wysiwyg` 参数，非 WYSIWYG 路径行为不变（`&& !wysiwyg` 恒 true）。
- 不改其余模式（预览/代码/排版/阅读）行为；不改 TextusPreview/CodeEditor 组件本身。
- **不删** `src/additional/milkdown/` 子系统（220 文件 / 27.8k LOC）—— 本任务只删接线，子系统保留（后续单独评估）。
- 全量 `npm run test` 必须全绿；`npm run typecheck` 通过。

## Review Focus

- **删除不残留**：`wysiwyg`/`setWysiwyg`/`applyWysiwygItems`/`TextusPreview`（在 App 内）在 src 内无残留引用（grep 为空）。测试：Task 3 的 grep 断言。
- **其余模式不受影响**：预览/代码/排版/阅读经 `shouldShowRightPreview` 行为不变。测试：Task 1 mode-layout.test.mjs。
- **App 恒挂源码编辑器**：不再按 wysiwyg 切换 TextusPreview。测试：Task 3 cm6-core-boundary.test.mjs 更新断言。

---

### Task 1: `shouldShowRightPreview` 去掉 `wysiwyg` 参数（modeLayout 签名）

**Files:**
- Modify: `src/utils/modeLayout.ts`（`shouldShowRightPreview`）
- Modify: `src/App.tsx`（第 466 行调用点去掉 `wysiwyg` 传参）
- Test: `tests/mode-layout.test.mjs`

**Interfaces:**
- Produces: `shouldShowRightPreview({ showPreview, appMode })` —— 不再接受 `wysiwyg`。
- Consumes: 现有 `showPreview`/`appMode`。

- [ ] **Step 1: 写失败测试（mode-layout.test.mjs）** —— 所有 `shouldShowRightPreview` 调用去掉 `wysiwyg` 参数；断言行为不变（edit+preview 显示；style/code/history/read 隐藏；preview 关时隐藏）。

```js
// 改：把每处 shouldShowRightPreview({ showPreview, appMode, wysiwyg }) 改成 ({ showPreview, appMode })
// 删除「WYSIWYG 开启时必须隐藏右侧预览」测试（wysiwyg 参数已移除，该行为随模式一并删除）
// 保留并断言：edit+preview→true；style/code/history/read→false；preview 关→false
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --import tsx --test tests/mode-layout.test.mjs`
Expected: FAIL（调用带多余 `wysiwyg`，或类型/断言不符）

- [ ] **Step 3: 实现** —— `modeLayout.ts`：`shouldShowRightPreview(opts: { showPreview; appMode })` 删 `wysiwyg` 字段与 `&& !wysiwyg`；`App.tsx:466` 调用去掉 `wysiwyg` 传参。

- [ ] **Step 4: 运行，确认通过** + typecheck

Run: `node --import tsx --test tests/mode-layout.test.mjs && npm run typecheck`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/modeLayout.ts src/App.tsx tests/mode-layout.test.mjs
git commit -m "refactor(modes): shouldShowRightPreview 去掉 wysiwyg 参数（WYSIWYG 移除前置）"
```

---

### Task 2: 移除 WYSIWYG 入口 + applyWysiwygItems + disabled 状态（editorActions/Toolbar/LeftNav）

**Files:**
- Modify: `src/components/layout/editorActions.tsx`（MODE_ITEMS 项、applyWysiwygItems、runMapped 守卫、modeAction 分支、useEditorActions 返回）
- Modify: `src/components/layout/Toolbar.tsx`（import/解构/disabled/applyWysiwygItems）
- Modify: `src/components/layout/LeftNav.tsx`（同上）
- Delete: `tests/wysiwyg-toolbar-disable.test.mjs`

**Interfaces:**
- Consumes: 无（纯删除）。
- Produces: `MODE_ITEMS` 无 `action:'wysiwyg'` 项；`useEditorActions()` 返回无 `wysiwyg`。

- [ ] **Step 1: 写失败测试** —— 删 `tests/wysiwyg-toolbar-disable.test.mjs`（测的是被删的 applyWysiwygItems，整体失效）。

- [ ] **Step 2: 运行，确认旧断言消失** —— 该测试文件已删，`npm run test` 少 1 个测试文件。

- [ ] **Step 3: 实现** —— `editorActions.tsx`：
  - `MODE_ITEMS` 删 `{ icon:'ri-article-line', label:'WYSIWYG 模式', action:'wysiwyg' }`。
  - 删 `applyWysiwygItems` 函数（含其 JSDoc）。
  - `runMapped` 的 `if (useEditorStore.getState().wysiwyg) { toast(...) }` 守卫删掉，恢复 `if (!facade) return false`。
  - `modeAction` 删 `if (action === 'wysiwyg') { st.setWysiwyg(!st.wysiwyg) }`。
  - `useEditorActions` 删 `const wysiwyg = ...` 与返回值里的 `wysiwyg`。
  - `Toolbar.tsx`/`LeftNav.tsx`：删 `applyWysiwygItems` import、`wysiwyg` 解构、`disabled={wysiwyg}`（大纲/查找/粗体/斜体/删除线）、`applyWysiwygItems(FORMAT_ITEMS|INSERT_ITEMS, wysiwyg)` 调用（回退为直接用 `FORMAT_ITEMS`/`INSERT_ITEMS`）。

- [ ] **Step 4: 运行，确认通过** + typecheck

Run: `npm run typecheck && npm run test`
Expected: PASS（测试文件数 -1）

- [ ] **Step 5: 提交**

```bash
git add src/components/layout/editorActions.tsx src/components/layout/Toolbar.tsx src/components/layout/LeftNav.tsx tests/wysiwyg-toolbar-disable.test.mjs
git commit -m "feat(modes): 移除 WYSIWYG 模式入口与 applyWysiwygItems/disabled 死代码"
```

---

### Task 3: 移除 WYSIWYG 状态 + App 恒挂 CodeEditor（store/types/App）

**Files:**
- Modify: `src/store/editorStore.ts`（`wysiwyg` 字段 + `setWysiwyg`）
- Modify: `src/shared/types.ts`（`wysiwyg` + `setWysiwyg` 类型）
- Modify: `src/App.tsx`（`wysiwyg` selector、`TextusPreview` import、三态分支 → 恒 `<CodeEditor/>`）
- Test: `tests/cm6-core-boundary.test.mjs`（更新 App 断言）

**Interfaces:**
- Consumes: 无。
- Produces: 无 `wysiwyg` 状态。

- [ ] **Step 1: 写失败测试** —— `tests/cm6-core-boundary.test.mjs`：删/改「App 必须挂 TextusPreview / 按 wysiwyg 切换编辑器」断言（`:84-85`），改为断言 App 恒挂 `CodeEditor`、不含 `wysiwyg`/`TextusPreview`。并 grep 断言 `src/` 无 `wysiwyg`/`setWysiwyg`/`applyWysiwygItems` 残留。

```js
assert.match(app, /<CodeEditor\s/, 'App 必须恒挂源码编辑器（不再按 wysiwyg 切换）')
assert.doesNotMatch(app, /TextusPreview/, 'App 不再挂 TextusPreview')
assert.doesNotMatch(app, /wysiwyg/, 'App 无 wysiwyg 引用')
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --import tsx --test tests/cm6-core-boundary.test.mjs`
Expected: FAIL（App 仍含 wysiwyg/TextusPreview）

- [ ] **Step 3: 实现** —— `editorStore.ts` 删 `wysiwyg: false`（`:129`）与 `setWysiwyg`（`:199`）；`shared/types.ts` 删 `wysiwyg: boolean`（`:66-67`）与 `setWysiwyg`（`:96`）；`App.tsx` 删 `wysiwyg` selector（`:83`）、`TextusPreview` import（`:17`），`:459-461` 三态改恒 `return <CodeEditor md={editorMd} onChange={handleEditorChange} />`。

- [ ] **Step 4: 运行，确认通过** + typecheck + grep 残留

Run: `npm run typecheck && npm run test`
Expected: PASS；`grep -rnE "wysiwyg|setWysiwyg|applyWysiwygItems" src/ --include=*.ts --include=*.tsx` 无匹配（除 `src/additional/milkdown/` 子系统内与注释外）。

- [ ] **Step 5: 提交**

```bash
git add src/store/editorStore.ts src/shared/types.ts src/App.tsx tests/cm6-core-boundary.test.mjs
git commit -m "feat(modes): 移除 WYSIWYG 状态与 App 分支，恒挂源码编辑器"
```

---

## 执行备注

- 三任务顺序执行，各自端到端绿（Task 1 先改 modeLayout 签名 + App 调用点；Task 2 删入口/applyWysiwygItems/disabled；Task 3 删状态 + App 分支）。
- `src/additional/milkdown/` 子系统保留不删；改后 `TextusPreview` 不再被 import，`additional-dead-cluster.test.mjs`（只断言文件存在/删除）仍通过。
- 静态验证：全量 `npm run test` + `npm run typecheck`；grep 无 `wysiwyg`/`applyWysiwygItems` 残留（子系统内除外）。
