# 界面持续优化（库重命名 / 预览标题 / 页脚 / 设置窗口）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把文档库重命名入口从顶部文件夹列表挪到树里（并同步文档路径）、去掉冗余的顶部文件夹列表、去掉预览侧栏「预览」标题、把页脚右侧信息挪到左侧下方并缩小文字、让设置中心窗口更紧凑且固定尺寸。

**Architecture:** 纯前端 UI 优化。`renameLibrary` 扩展为同时改写该库下文档的 `path`（树文件夹名来自 path 首段）；树文件夹节点加重命名按钮（镜像现有「还原出厂内容」按钮样式）；`SidebarPreview` 删「预览」标题；`.app-footer` 改 grid 把右侧信息排到左侧下方；`SettingsDialog` 尺寸常量改紧凑固定值。

**Tech Stack:** React + Zustand + CSS（source-assertion conformance 测试）。

**Spec:** `docs/superpowers/specs/2026-11-18-library-footer-settings-polish-design.md`

## Global Constraints

- `renameLibrary(id, name)` 必须同时：改 `docLibraries[].name`，并改写该库（`libraryId === id`）下所有文档的 `path`（`path === oldName` → `name`；`path.startsWith(oldName+'/')` → `name + path.slice(oldName.length)`），使树文件夹名跟随。
- 树文件夹的重命名按钮在 hover 时出现（镜像 `.tree-reset-btn` 行为），点击不触发展开/收起。
- 移除顶部 `.library-folder-list` 后，`activeLibraryId` 内部语义不变（新文档/导入仍按其定位）。
- `.app-footer-right` 必须排在 `.app-footer-left` **下方**，文字缩小（`font-size` ~11px）。
- `SettingsDialog`：`maxWidth` 1280→960、`height` '92vh'→'min(680px, 86vh)'（固定尺寸，不随内容变化）。
- 不改 `SidebarOutline`（「目录」标题保留）、不改 `StyleMainPanel`、不改文档重命名。

## Review Focus

1. **库重命名后树文件夹名即时更新**（路径同步）：`renameLibrary` 改写 path → `buildTree` 首段变新名。任务 1 测试断言 path 改写逻辑存在。
2. **重命名入口可发现且不误触展开**：hover 才显示编辑图标，点击 `stopPropagation` 不触发 toggle。任务 1 断言 `tree-rename-btn` + `onRenameFolder`。
3. **预览标题只在预览侧栏去掉**：`SidebarPreview` 无「预览」标题，`SidebarOutline`「目录」保留。任务 2 断言。
4. **页脚右侧在左侧下方且文字小**：`.app-footer` grid 两行，`.app-footer-right` font-size ~11px。任务 3 断言。
5. **设置窗口固定且更紧凑**：`maxWidth:960`、`height:min(680px,86vh)`。任务 4 断言。

---

### Task 1: 文档库重命名入口挪到树 + 去顶部文件夹列表

**Files:**
- Modify: `src/store/editorStore.ts:208-213`（`renameLibrary` 同步 path）
- Modify: `src/components/panels/LibraryTree.tsx`（文件夹分支加重命名按钮/内联输入）
- Modify: `src/components/panels/LibraryPanel.tsx`（删 `library-folder-list`，接 `onRenameFolder`/`onRenameCommit`）
- Modify: `src/styles/layout.css`（加 `.tree-rename-btn`/`.tree-rename-input`；删死 `.library-folder-*` 样式）
- Test: `tests/library-rename.test.mjs`（新建）

**Interfaces:**
- Consumes: 无。
- Produces: `LibraryTree` 新增 props `renameTargetKey?: string | null`、`onRenameFolder?: (node) => void`、`onRenameCommit?: (key, newName) => void`；`renameLibrary` 签名不变（id, name）。

- [ ] **Step 1: 写失败测试 `tests/library-rename.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const store = read('src/store/editorStore.ts')
const tree = read('src/components/panels/LibraryTree.tsx')
const panel = read('src/components/panels/LibraryPanel.tsx')
const layout = read('src/styles/layout.css')

// renameLibrary 必须同步文档 path（库重命名后树文件夹名跟随）
assert.match(store, /renameLibrary:[\s\S]*?docs:[\s\S]*?path/, 'renameLibrary 必须改写 docs path')
assert.match(store, /renameLibrary:[\s\S]*?startsWith\(\s*oldName/, 'renameLibrary 必须按旧名前缀改写 path')

// 树文件夹必须有重命名按钮 + 接收 onRenameFolder
assert.match(tree, /tree-rename-btn/, '树文件夹必须有重命名按钮')
assert.match(tree, /onRenameFolder/, 'LibraryTree 必须接收 onRenameFolder')

// 顶部文件夹列表已去除
assert.doesNotMatch(panel, /library-folder-list/, 'LibraryPanel 不得再有 library-folder-list')
assert.doesNotMatch(panel, /library-folder-rename-btn/, 'LibraryPanel 不得再有 library-folder-rename-btn')

// 树重命名输入必须复用 .library-folder-rename-input（input-css-boundary 测试钉死它）
assert.match(tree, /library-folder-rename-input/, '树重命名输入必须复用 library-folder-rename-input')
assert.match(layout, /\.library-folder-rename-input/, '.library-folder-rename-input 样式必须保留（树内重命名复用）')

// 样式
assert.match(layout, /\.tree-rename-btn/, '必须有 .tree-rename-btn 样式')

console.log('library rename checks passed')
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test tests/library-rename.test.mjs`
Expected: FAIL（store 无 path 改写、树无重命名按钮、panel 仍有 folder-list 等）

- [ ] **Step 3: 实现**

1. `editorStore.ts` `renameLibrary`：
   ```ts
   renameLibrary: (id: string, name: string) => {
     const oldName = get().docLibraries.find((lib: any) => lib.id === id)?.name
     set((s: any) => ({
       docLibraries: s.docLibraries.map((lib: any) => lib.id === id ? { ...lib, name } : lib),
       docs: s.docs.map((d: any) => {
         if (d.libraryId !== id || !oldName) return d
         const p = d.path || ''
         if (p === oldName) return { ...d, path: name }
         if (p.startsWith(oldName + '/')) return { ...d, path: name + p.slice(oldName.length) }
         return d
       }),
     }))
     saveCatalog()
   },
   ```
2. `LibraryTree.tsx`：
   - Props 加 `renameTargetKey`, `onRenameFolder`, `onRenameCommit`。
   - 文件夹分支把外层 `<button class="library-tree-item">` 改成 `<div class="library-tree-item" onClick={() => onToggleFolder(node.id)}>`（镜像文档条目 div 结构）。
   - 内部：`isRenaming = renameTargetKey === node.id`；`isRenaming` 时渲染 `<input className="library-folder-rename-input" defaultValue={node.title} autoFocus onClick={e=>e.stopPropagation()} onBlur={...onRenameCommit(node.id, value)...} onKeyDown={Enter→blur}/>`（**复用** `.library-folder-rename-input`，input-css-boundary 钉死它，勿删）；否则渲染 `<span class="tree-label">{node.title}</span>` + （`onRenameFolder` 时）`<button type="button" class="tree-rename-btn" title="重命名" onClick={e=>{e.stopPropagation(); onRenameFolder(node)}}><span class="remix ri-edit-line"/></button>`。
3. `LibraryPanel.tsx`：
   - 删 `library-folder-list` 整块（含 `library-folder-rename-btn`/`library-folder-rename-input`/`renameTargetId` 相关）。
   - 加 `const [renameTarget, setRenameTarget] = useState<{ key: string; title: string } | null>(null)`。
   - 给 `<LibraryTree>` 传 `renameTargetKey={renameTarget?.key ?? null}`、`onRenameFolder={(node) => setRenameTarget({ key: node.id, title: node.title })}`、`onRenameCommit={(key, newName) => { const lib = docLibraries.find((l:any) => l.name === renameTarget?.title); if (lib) renameLibrary(lib.id, newName); setRenameTarget(null) }}`。
4. `layout.css`：
   - 加 `.tree-rename-btn`（镜像 `.tree-reset-btn`：`margin-left:auto`、20×20、`opacity:0`，`.library-tree-item:hover .tree-rename-btn { opacity:1 }`、hover 变 accent）。
   - **保留** `.library-folder-rename-input`（树重命名输入复用；`input-css-boundary` 测试钉死它）。
   - 删死样式 `.library-folder-list/.library-folder-row/.library-folder-item/.library-folder-rename-btn`（已无引用；`.library-folder-rename-input` 除外）。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test tests/library-rename.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/store/editorStore.ts src/components/panels/LibraryTree.tsx src/components/panels/LibraryPanel.tsx src/styles/layout.css tests/library-rename.test.mjs
git commit -m "feat(library): 文档库重命名入口挪到树 + 同步路径 + 去顶部文件夹列表

- renameLibrary 同步该库下所有文档 path（树文件夹名跟随）
- 树文件夹加重命名按钮（hover 出现，内联输入提交）
- 移除冗余顶部 library-folder-list，清理其死样式"
```

---

### Task 2: 去掉预览侧栏「预览」标题

**Files:**
- Modify: `src/components/sidebar/SidebarPreview.tsx:148`
- Test: `tests/ui-polish-round3.test.mjs`（新建，本任务写入「预览标题」段）

**Interfaces:**
- Consumes: 无。Produces: 无（样式模式 `StyleMainPanel` 不受影响）。

- [ ] **Step 1: 写失败测试**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const preview = read('src/components/sidebar/SidebarPreview.tsx')
const outline = read('src/components/sidebar/SidebarOutline.tsx')

// 预览侧栏不得再有「预览」标题
assert.doesNotMatch(preview, /sidebar-header-title">预览/, 'SidebarPreview 不得再有「预览」标题')
// 目录侧栏「目录」标题保留（样式/大纲不受影响）
assert.match(outline, /sidebar-header-title">目录/, 'SidebarOutline「目录」标题必须保留')
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/ui-polish-round3.test.mjs`
Expected: FAIL（SidebarPreview 仍有「预览」）

- [ ] **Step 3: 实现**

`SidebarPreview.tsx` 删除 `<span className="sidebar-header-title">预览</span>`（line 148）。`sidebar-header-title` CSS 保留（`SidebarOutline` 仍用）。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/ui-polish-round3.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/sidebar/SidebarPreview.tsx tests/ui-polish-round3.test.mjs
git commit -m "style(sidebar): 预览侧栏去掉「预览」标题（样式/大纲标题不变）"
```

---

### Task 3: 页脚右侧信息挪到左侧下方

**Files:**
- Modify: `src/styles/layout.css`（`.app-footer` grid + `.app-footer-right` 缩小）
- Test: `tests/ui-polish-round3.test.mjs`（追加「页脚」段）
- （`Footer.tsx` DOM 结构不变，仅 CSS 重排。）

**Interfaces:**
- Consumes: 无。Produces: 无。

- [ ] **Step 1: 追加失败断言**

```js
const layout = read('src/styles/layout.css')
// 页脚右侧信息必须排在左侧下方（grid 两行），文字缩小
assert.match(layout, /\.app-footer\s*\{[^}]*display:\s*grid/, '.app-footer 必须改 grid 布局')
assert.match(layout, /\.app-footer-right\s*\{[^}]*font-size:\s*1[01]px/, '.app-footer-right 文字必须缩小到 ~11px')
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/ui-polish-round3.test.mjs`
Expected: FAIL（`.app-footer` 仍是 flex，right 文字未缩小）

- [ ] **Step 3: 实现**

`layout.css`：
```css
.app-footer  {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  align-items: center;
  align-content: center;
  column-gap: 24px;
  /* 保留 height:58px、padding、bg、position、::before 分割线 */
}
.app-footer-left  { grid-column: 1; grid-row: 1; }
.app-footer-right  { grid-column: 1; grid-row: 2; font-size: 11px; color: var(--color-text-muted); }
.app-footer-center  { grid-column: 2; grid-row: 1 / span 2; }
```
（`Footer.tsx` 三个子节点 DOM 不变；`app-footer-left` 保留 logo+名称、`app-footer-center` 按钮组、`app-footer-right` ©/LightOS。）

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/ui-polish-round3.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/styles/layout.css tests/ui-polish-round3.test.mjs
git commit -m "style(footer): 页脚右侧信息挪到左侧下方，文字缩小更协调"
```

---

### Task 4: 设置中心窗口更紧凑 + 固定尺寸

**Files:**
- Modify: `src/components/panels/SettingsDialog.tsx:34-37`（`PANEL_MAX_WIDTH`/`PANEL_HEIGHT`）
- Test: `tests/ui-polish-round3.test.mjs`（追加「设置窗口」段）

**Interfaces:**
- Consumes: 无。Produces: 无。

- [ ] **Step 1: 追加失败断言**

```js
const settings = read('src/components/panels/SettingsDialog.tsx')
assert.match(settings, /PANEL_MAX_WIDTH\s*=\s*960/, '设置窗口 maxWidth 必须 960')
assert.match(settings, /PANEL_HEIGHT\s*=\s*'min\(680px,\s*86vh\)'/, '设置窗口 height 必须 min(680px,86vh) 固定紧凑')
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/ui-polish-round3.test.mjs`
Expected: FAIL（仍 1280 / '92vh'）

- [ ] **Step 3: 实现**

`SettingsDialog.tsx`：
```ts
const PANEL_WIDTH = '92vw'                  // 不变（UiModal 用 min(width, maxWidth)）
const PANEL_HEIGHT = 'min(680px, 86vh)'     // 原 '92vh'，固定紧凑
const PANEL_MAX_WIDTH = 960                 // 原 1280
```

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/ui-polish-round3.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/panels/SettingsDialog.tsx tests/ui-polish-round3.test.mjs
git commit -m "style(settings): 设置中心窗口更紧凑且固定尺寸（960px / min(680px,86vh)）"
```

---

## 备注

- `ui-polish-round3.test.mjs` 由 Task 2 创建，Task 3、Task 4 追加断言；各任务跑该文件验证。
- `--accent-hover` 等 token 不动；`SidebarOutline`/`StyleMainPanel`/文档重命名不动。
- 改 `editorStore` 后确认既有 `doc-persistence`/`doc-catalog` 测试仍过（它们 source-assert editorStore）。
- 全量 `npm test` + `npx tsc --noEmit` 每任务末跑一次。
