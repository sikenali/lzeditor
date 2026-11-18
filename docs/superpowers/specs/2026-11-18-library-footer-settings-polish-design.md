# 界面持续优化（文档库重命名 / 预览标题 / 页脚 / 设置窗口）设计

## 意图与为什么

用户继续打磨界面，提出 5 项具体优化：把文档库重命名入口从顶部文件夹列表挪到树里（并同步路径）、去掉冗余的顶部文件夹列表、去掉预览模式侧栏的「预览」标题、把页脚右侧信息挪到左侧下方并缩小文字、让设置窗口更紧凑且固定尺寸（不随内容高度变化）。

## 目标

1. 树里的文件夹（`.library-tree-item`，展开态）上出现编辑/重命名图标，点击可重命名该文档库，并同步该库下所有文档的 `path`，让树文件夹名跟随变化。
2. 去掉 LibraryPanel 侧栏模式顶部的 `.library-folder-list`（冗余，树里已有文件夹）。
3. 去掉 `SidebarPreview` 的「预览」标题（`sidebar-header-title`）；样式模式（`StyleMainPanel`）不受影响。
4. `app-footer-right` 挪到 `app-footer-left` 下方显示，文字缩小，布局更协调。
5. 设置中心窗口更紧凑（比 92vw/92vh/1280 小），且固定尺寸，不随标签页内容高度变化。

## 非目标 / 反目标

- 不改树/库的数据模型；`activeLibraryId` 内部语义不变（新文档/导入仍按其定位）。
- 不动 `SidebarOutline`（「目录」标题保留）、不动 `StyleMainPanel`。
- 不改变文档重命名（仅文档库/文件夹重命名，路径同步）。
- 其他弹窗尺寸不在本次收紧范围内（除非用户明确要求）。

## 决策（用户确认）

### 1 & 2. 文档库重命名入口挪到树 + 去顶部文件夹列表

- **根因**：`renameLibrary` 只改 `docLibraries` 的名字，不改 `docs[].path`；树文件夹名来自 `doc.path` 首段，所以库重命名后树不变。
- **做法**：扩展 `renameLibrary(id, name)`：先取旧名 `oldName`，把该库（`libraryId === id`）下所有文档的 `path` 从 `oldName` 前缀改写为 `name` 前缀（`path === oldName` → `name`；`path.startsWith(oldName+'/')` → `name + path.slice(oldName.length)`）。树文件夹名随之更新。
- **UI**：`LibraryTree` 文件夹节点（`isFolder` 分支）加一个 `.tree-rename-btn`（`ri-edit-line`），hover 显示，点击调用 `onRenameFolder(node)`；父级 `LibraryPanel` 把 `node.title` 匹配到 `docLibraries`（按 `lib.name === node.title`），命中则 `renameLibrary(lib.id, newName)`（新名经一个内联输入框让用户输入）。
- **去除**：`LibraryPanel` 侧栏模式 `library-folder-list`（含 `library-folder-rename-btn`/`library-folder-rename-input`）整块删除。
- **保留**：树里系统文档的「还原为出厂内容」按钮（`.tree-reset-btn`）不动。
- **已知小影响**：重命名后文件夹 id（`folder-<path>`）变化，该文件夹可能收起（expanded 状态按 id 记忆）。可接受；如需保留展开态可在实现时按 title 迁移。

### 3. 去预览标题

- `SidebarPreview.tsx` 删掉 `<span className="sidebar-header-title">预览</span>`。
- `sidebar-header-title` 的 CSS 仍被 `SidebarOutline`（目录）使用，保留。

### 4. 页脚右侧挪到左侧下方

- `Footer.tsx` 保持三个子节点 DOM（left / center / right），用 CSS 重排：`.app-footer` 改 grid（两列：左侧堆叠 + 右侧按钮），`left` 在左上、`right` 在左下（`font-size` 缩小到 ~11px、muted）、`center` 按钮组在右侧垂直居中。
- `app-footer-right` 文字缩小（当前 `--text-md`，改 ~11-12px），间距/对齐协调。

### 5. 设置中心窗口更紧凑 + 固定尺寸

- `SettingsDialog`：`width: 'min(960px, 92vw)'`、`height: 'min(680px, 86vh)'`、`maxWidth: 960`（原 92vw/92vh/1280）。
- 确保 UiModal 把 `height` 当**固定高度**用（非 max-height），切换标签不改变窗口尺寸（若当前是 max-height 则改固定 height）。
- 其他弹窗（文档库/导出/图片等）尺寸不动。

## 留给实现者

- 实现 `renameLibrary` 路径同步 + 相应 conformance 测试（改 `editorStore` 需确认有既有测试覆盖）。
- 树文件夹重命名交互：内联输入框（复用 `library-folder-rename-input` 样式或新建 `.tree-rename-input`），Enter/blur 提交。
- 确认 UiModal 的 `height`/`maxHeight` 语义，确保设置窗口固定尺寸。
- 跑全量 `npm test` + `npx tsc --noEmit`。
