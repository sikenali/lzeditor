# 设计：文档库精简 + 去掉「打开文件/模板」子菜单

日期：2026-11-16

## Intent（意图与为什么）

用户希望产品更简洁：

1. **文档库只留 README.md**——删掉内置使用手册的 20 篇文档及其目录结构（使用手册·基础篇/高级篇），`Default` 库默认只显示 `README.md`。
2. **去掉「新建」菜单下的「打开文件 / 模板…」子菜单**——连同其背后的 `FilePanel`（模板面板）一起移除。

## Goals / Non-goals

- **Goals**：文档库默认只有 README.md；新建菜单不再出现「打开文件 / 模板…」；模板面板（FilePanel）整体移除；相关引用、内容文件、测试同步清理。
- **Non-goals**：不动「打开文件夹…」菜单项；不动欢迎页的「打开文件… / 打开文件夹…」按钮（它们直接走文件选择器，不依赖 FilePanel）；不动 README.md 正文；不动导入 URL / 本地批量导入等既有功能。

## 方案（用户已选：彻底删除）

### Part A — 文档库只留 README.md

| 文件 | 改动 |
|------|------|
| `src/store/editorStore.ts` | `DEFAULT_DOCS` 只保留 `readme`（README.md，`libraryId: 'default'`），删除 `a01–a10`、`b01–b10` 共 20 篇 |
| `src/utils/docSource.ts` | 删除 20 篇手册文档的 `import` 与 `BUILTIN_DOCS` 条目；保留 `readme`/`welcome` 特殊分支 |
| `src/content/a01-*.md` … `b10-*.md` | **删除**这 20 个内容文件 |
| `src/content/welcome.md` | 移除「第一部分/第二部分」的手册文档链接（A01–A10、B01–B10），保留快速开始/常见问题/关于等正文 |
| `src/components/panels/settings/AboutSettingsTab.tsx` | `MANUAL_DOC_ID` 由 `'a01-特色功能'` 改为 `'readme'`（「文档」按钮改为打开 README.md） |

### Part B — 去掉「打开文件 / 模板…」子菜单与 FilePanel

| 文件 | 改动 |
|------|------|
| `src/components/layout/editorActions.tsx` | `NEW_ITEMS` 删除 `{ label: '打开文件 / 模板…', action: 'open' }`；`useEditorActions` 移除 `openFileDialog` 及其返回值 |
| `src/components/panels/FilePanel.tsx` | **删除**整个文件 |
| `src/App.tsx` | 移除 `FilePanel` import 与 `{openPanel === 'file' && <FilePanel/>}`；`Ctrl+O` 与 Electron `onMenuOpen` 由 `setOpenPanel('file')` 改为 `pickFile()`（直接打开本地文件） |
| `src/components/layout/Toolbar.tsx` | 移除 `openFileDialog` 的使用（`'open'` 动作分支） |
| `src/components/layout/LeftNav.tsx` | 移除 `openFileDialog` 的使用 |
| `src/shared/types.ts` | `openPanel` 联合类型移除 `'file'` |
| `src/components/panels/settings/ShortcutSettingsTab.tsx` | 更新/删除「打开文件」快捷键行（Ctrl+O 现指向打开本地文件） |

### 测试同步

- `tests/new-menu-label.test.mjs`：NEW_ITEMS 第 2 项不再是「打开文件/模板」，断言更新为只剩「新建文档 / 打开文件夹…」
- `tests/controls-boundary.test.mjs`：`openPanel` 类型断言去掉 `'file'`
- `tests/ui-atoms.test.mjs`：`MODALS`/`panelDialogs` 列表去掉 `FilePanel`
- `tests/doc-catalog.test.mjs`、`tests/doc-persistence.test.mjs`：若引用手册文档/默认目录，按「只剩 readme」更新

## 权衡 / 取舍

- **Ctrl+O 与 Electron 菜单「打开」**：FilePanel 移除后，这两处不再打开模板面板，改为直接弹系统文件选择器（`pickFile`），保留标准「打开文件」快捷键语义。欢迎页「打开文件…」已走同一 `pickFile`，行为一致。
- **「文档」按钮**：About 页的「文档」按钮原本打开手册第一篇，手册删除后改为打开 README.md，避免出现死链接。
- **欢迎内容**：`welcome.md` 仍是新建文档的默认内容，只移除失效的手册链接，保留引导/FAQ 正文。

## 遗留给执行者

- 执行前先跑 `npm test` 确认基线；改动后补跑 `npm test` 与 `npm run typecheck`。
- `docSource.ts` 的 `getDocMd('readme')`/`getDocHtml` 分支保留不动。
- 若有测试仍引用已删文档 id（如 `a01-特色功能`），同步改为仅断言 `readme`。
