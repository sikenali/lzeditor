# 实施计划：文档库精简 + 去掉「打开文件/模板」子菜单

日期：2026-11-16
规格：`docs/superpowers/specs/2026-11-16-library-simplify-design.md`（已批准）

## Context（为什么）

用户希望产品更简洁：

1. **文档库只留 README.md**——删掉内置使用手册的 20 篇文档（a01–a10、b01–b10）及其「使用手册·基础篇/高级篇」目录结构，`Default` 库默认只显示 `README.md`。
2. **去掉「新建」菜单下的「打开文件 / 模板…」子菜单**——连同其背后的 `FilePanel`（模板面板）一起移除。

用户已确认范围：**彻底删除**（删内容文件、welcome 链接、About「文档」按钮、FilePanel 及入口）。

## 非目标（不动）

- 欢迎页「打开文件… / 打开文件夹…」按钮（直接走 `pickFile`，不依赖 FilePanel）
- 「打开文件夹…」菜单项（`NEW_ITEMS` 第 3 项，`Ctrl+Shift+O`）
- README.md 正文、URL 在线导入、本地批量导入
- `docCatalog.ts` 的 `persistCatalog`/`restoreSession`/`mergeDocs` 逻辑（不改，只改数据）
- `doc-persistence.test.mjs`（`saveCatalog` 调用数不变）、`doc-catalog.test.mjs`（用自建 mock，不读 DEFAULT_DOCS）

## 关键决策（执行者照做，不要自由发挥）

1. **Ctrl+O 与 Electron 菜单「打开」**：由 `setOpenPanel('file')` 改为 `pickFile()` 直接弹系统文件选择器，保留标准「打开文件」快捷键语义。成功后 `importSingleFile(file)` 导入。与 `WelcomeScreen.handleOpenFile` 一致。
2. **About「文档」按钮**：`MANUAL_DOC_ID` 由 `'a01-特色功能'` 改为 `'readme'`（打开 README.md，避免死链接）。按钮保留。
3. **`BUILTIN_DOCS`**：清空为 `{}`（`getDocMd` 仍引用它，保留 export）。
4. **ShortcutSettingsTab「打开文档」行**：label 由「打开文档」改为「打开文件」（Ctrl+O 现在直接开文件）。快捷键不变。

---

## Task 1 — 文档库只留 README.md（Part A）

**提交信息**：`refactor(library): 文档库只留 README.md，移除 20 篇内置手册`

改完 Task 1 后 `npm test` 应保持全绿（无测试读 DEFAULT_DOCS 或内容文件）。

### Step 1.1 — `src/store/editorStore.ts`：DEFAULT_DOCS 只留 readme

把 `DEFAULT_DOCS`（当前第 71–93 行）从 21 篇缩到 1 篇：

```ts
const DEFAULT_DOCS: Array<CatalogEntry> = ([
  { id: 'readme',                   title: 'README.md',            path: 'Default',         libraryId: 'default' },
] as Array<CatalogEntry>).map(d => ({ ...d, builtin: true }))
```

删除全部 20 篇 `a01`–`a10`、`b01`–`b10` 条目（`libraryId: 'manual', system: true`）。

### Step 1.2 — `src/utils/docSource.ts`：清掉 20 篇手册 import 与 BUILTIN_DOCS

- 删除第 4–23 行的 `import a01 … import b10`（20 条 `import x from '../content/….md?raw'`）。
- `BUILTIN_DOCS`（第 25–46 行）清空为：

```ts
export const BUILTIN_DOCS: Record<string, string> = {}
```

`getDocMd`/`getDocHtml` 其余逻辑不动。

### Step 1.3 — 删除 20 个手册内容文件

```bash
git rm src/content/a01-特色功能.md src/content/a02-文档库和文档.md src/content/a03-基本格式.md \
  src/content/a04-自动完成.md src/content/a05-快捷键.md src/content/a06-大纲视图.md \
  src/content/a07-即时预览和阅读模式.md src/content/a08-预览视图.md src/content/a09-历史记录.md \
  src/content/a10-拼写检查.md src/content/b01-链接.md src/content/b02-图像.md src/content/b03-脚注.md \
  src/content/b04-任务列表.md src/content/b05-表格.md src/content/b06-图表.md src/content/b07-代码块.md \
  src/content/b08-html代码.md src/content/b09-LaTeX数学公式.md src/content/b10-高级格式.md
```

（用 `git rm` 而非文件系统删除，保持 git 跟踪干净。）

### Step 1.4 — `src/content/welcome.md`：移除手册链接区

删除从「`本手册分为基础篇和高级篇两部分…`」起，到「`* [B10 高级格式](b10-高级格式)`」结束的整段（含「第一部分：基础篇」「第二部分：高级篇」两个 `##` 标题及其中间的 `---` 分隔线）。保留第 1–7 行（标题/引言/欢迎语）与第 45 行起的 `---`、`## 快速开始` 及其后正文。

删除后 welcome.md 结构为：`# LZEditor 使用手册` → 引言 → `---` → 欢迎语 → `---` → `## 快速开始` → …（与改前「快速开始」及之后完全一致）。

### Step 1.5 — `src/components/panels/settings/AboutSettingsTab.tsx`：「文档」按钮改开 README

- 第 4 行：`const MANUAL_DOC_ID = 'a01-特色功能'` → `const MANUAL_DOC_ID = 'readme'`
- 第 12 行注释：`// 「文档」在编辑器内打开内置使用手册的第一篇` → `// 「文档」在编辑器内打开 README.md`

`handleOpenManual` 的 `if (s.docs.some(d => d.id === MANUAL_DOC_ID)) s.switchDoc(MANUAL_DOC_ID)` 逻辑不动（readme 恒在 docs 里）。

### Step 1.6 — 验证

```bash
npm test
npm run typecheck
```

两个都应通过。

---

## Task 2 — 去掉「打开文件/模板」子菜单与 FilePanel（Part B）+ 测试同步

**提交信息**：`refactor(menu): 去掉「打开文件/模板」子菜单与 FilePanel，Ctrl+O 直接开文件`

Part B 的源码改动会让 4 个测试失败/抛错，因此**本任务的源码与测试同步改，同一提交**。

### Step 2.1 — `src/components/layout/editorActions.tsx`

- `NEW_ITEMS`（第 18–22 行）删除中间项 `{ icon: 'ri-folder-open-line', label: '打开文件 / 模板…', action: 'open' },`，只剩：

```ts
export const NEW_ITEMS: MenuItem[] = [
  { icon: 'ri-file-add-line', label: '新建文档', action: 'new' },
  { icon: 'ri-folder-line', label: '打开文件夹…', action: 'openFolder' },
]
```

- 删除 `openFileDialog` 回调（第 306 行）：`const openFileDialog = useCallback(() => useEditorStore.getState().setOpenPanel('file'), [])`
- `useEditorActions` 的 return（第 317 行）去掉 `openFileDialog`：`return { applyCmd, formatAction, insertAction, tableAction, modeAction, newDocument, openFolderDialog, wysiwyg }`

### Step 2.2 — `src/components/layout/Toolbar.tsx`

- 第 62 行解构去掉 `openFileDialog`：`const { applyCmd, formatAction, insertAction, tableAction, modeAction, newDocument, openFolderDialog, wysiwyg } = useEditorActions()`
- `onMenuAction` 的 `key === 'new'` 分支（第 87–91 行）去掉 `else openFileDialog()`：

```js
if (key === 'new') {
  if (action === 'new') newDocument()
  else if (action === 'openFolder') void openFolderDialog()
}
```

### Step 2.3 — `src/components/layout/LeftNav.tsx`

- 第 26 行解构去掉 `openFileDialog`：`const { formatAction, insertAction, tableAction, modeAction, newDocument, openFolderDialog, wysiwyg } = useEditorActions()`
- `onMenuAction` 的 `key === 'new'` 分支（第 69–73 行）同样去掉 `else openFileDialog()`：

```js
if (key === 'new') {
  if (action === 'new') newDocument()
  else if (action === 'openFolder') void openFolderDialog()
}
```

### Step 2.4 — 删除 FilePanel.tsx

```bash
git rm src/components/panels/FilePanel.tsx
```

### Step 2.5 — `src/App.tsx`

- 第 22 行：删除 `import { FilePanel } from './components/panels/FilePanel'`
- 第 42 行：`import { pickFolderFiles, importFolderFiles } from './utils/docImport'` → `import { pickFolderFiles, importFolderFiles, pickFile, importSingleFile } from './utils/docImport'`
- 第 194 行（Ctrl+O）：

```js
} else if (key === 'o') {
  e.preventDefault(); dismissWelcome(); void pickFile().then(file => { if (file) importSingleFile(file) })
}
```

- 第 233 行（Electron onMenuOpen）：

```js
const onOpen = () => { dismissWelcome(); void pickFile().then(file => { if (file) importSingleFile(file) }) }
```

- 第 545 行：删除 `{openPanel === 'file' && <FilePanel onClose={closePanel} />}`

### Step 2.6 — `src/shared/types.ts`

- 第 54 行：`openPanel: 'none' | 'library' | 'history' | 'settings' | 'export'`（去掉 `'file'`）
- 第 86 行：`setOpenPanel: (panel: 'none' | 'library' | 'history' | 'settings' | 'export') => void`（去掉 `'file'`）

### Step 2.7 — `src/components/panels/settings/ShortcutSettingsTab.tsx`

- 第 21 行：`{row('打开文档', `${mod}+O`)}` → `{row('打开文件', `${mod}+O`)}`

### Step 2.8 — `tests/new-menu-label.test.mjs`

当前第 12–13 行断言 `NEW_ITEMS` 第 2 项是「打开文件/模板」，删除该项后改为断言：

```js
// ── NEW_ITEMS 不再有「打开文件 / 模板…」，只剩 新建文档 / 打开文件夹 ──
assert.ok(!actions.includes('打开文件 / 模板…'), '不得再有「打开文件 / 模板…」菜单项')
assert.ok(!actions.includes("action: 'open'"), 'NEW_ITEMS 不得再有 open 动作（FilePanel 已删）')
assert.match(actions, /label: '新建文档'/, 'NEW_ITEMS 仍保留「新建文档」')
assert.match(actions, /label: '打开文件夹…'/, 'NEW_ITEMS 仍保留「打开文件夹…」')
```

第 10 行 `assert.ok(!actions.includes('新建文件-模板'))` 保留不动。

### Step 2.9 — `tests/controls-boundary.test.mjs`

第 158 行断言改为（去掉 `'file'`）：

```js
assert.match(types, /openPanel: 'none' \| 'library' \| 'history' \| 'settings' \| 'export'/, 'openPanel 类型必须收窄到真实可达的值')
```

### Step 2.10 — `tests/ui-atoms.test.mjs`

- 第 22 行：`const panelDialogs = ['ExportDialog','HistoryPanel','LibraryPanel','SearchPanel']`（去掉 `'FilePanel'`）
- 第 34 行：`const MODALS = ['SettingsDialog','ExportDialog','ImageDialog','LinkDialog','CodeDialog','FormulaDialog','ChartDialog','EmojiDialog','LibraryPanel','TableDropdown']`（去掉 `'FilePanel'`）

### Step 2.11 — `tests/filepath-wiring.test.mjs`

- 第 7 行：删除 `const fpFile = read('src/components/panels/FilePanel.tsx')`
- 第 18 行：删除 `assert.match(fpFile, /getDiskPath\(/)`

第 4–6、9–17 行（fp/di/panel 断言）保留不动。

### Step 2.12 — 验证

```bash
npm test
npm run typecheck
```

两个都应通过。

---

## Task 3 — 完整验证

**提交信息**：无（若 Task 1/2 各自绿则本任务只是复检）

```bash
npm run check
```

`npm run check` = `npm run typecheck && npm run test`，应全绿。

手动抽查（浏览器 `npm run dev`）：
1. 文档库 `Default` 库只显示 README.md，无「使用手册」目录。
2. 「新建」菜单只剩「新建文档 / 打开文件夹…」两项，无「打开文件 / 模板…」。
3. Ctrl+O 直接弹系统文件选择器（不再开模板面板）。
4. About 页「文档」按钮打开 README.md。
5. `git status` 无残留未跟踪的已删文件、无对 `a0*/b0*` 的引用。

---

## Review Focus（执行完请重点看）

- **Part A**：确认没有任何代码/测试仍引用 `a01-…`/`b10-…`/`'使用手册'`/`libraryId: 'manual'`（`grep -rn "a01\|b10\|使用手册\|manual" src tests` 应只剩 docCatalog 注释与 LibraryPanel/LibraryTree 里的「system」语义注释）。
- **Part B**：确认 `openPanel` 类型与 `setOpenPanel` 签名一致去掉 `'file'`；确认 `FilePanel` 无残留引用（`grep -rn "FilePanel" src tests` 应为空）；确认 Ctrl+O 与 onMenuOpen 都走 `pickFile`。
- **测试**：确认 `doc-catalog`/`doc-persistence` 未改动仍绿（它们不读 DEFAULT_DOCS/内容文件）。

## 比例（按改动行数估）

| 区域 | 占比 |
|------|------|
| Part A 数据/内容（editorStore、docSource、20 文件、welcome、About） | ~55% |
| Part B 菜单/面板（editorActions、Toolbar、LeftNav、App、types、Shortcut、FilePanel） | ~30% |
| 测试同步（4 个测试） | ~15% |
