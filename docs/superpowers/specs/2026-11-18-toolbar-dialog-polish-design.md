# 工具栏精简 + 弹框固定高度 + 导出预览优化 —— 设计文档（短版）

> 日期：2026-11-18
> 目标：工具栏改纯图标 + hover 显标题；常用格式按钮开关收敛工具栏；文档库/插入/图片/链接弹框固定高度；导出预览固定高度 + 紧凑弹框。
> 用户已逐点确认（消息直答）。

## 意图

用户报告 6 点 UI 优化。全部为展示/布局调整，不触编辑器/导出核心逻辑。

## 当前事实（已探明）

- **工具栏**（`Toolbar.tsx`）：`.toolbar-btn` 为 `flex-column`（图标 + 下方 label），`showToolbarLabels=false` 时挂 `.toolbar-icon-only` 隐藏 label。按钮：文档库/新建/大纲/查找/[粗体/斜体/删除线]/格式/图片/链接/表格/插入/AI/模式/历史/导出/设置。**注意**：下划线/高亮无 markdown 语法，按钮早已移除（代码注释注明），现只有粗体/斜体/删除线。
- **侧边栏**（`LeftNav.tsx`，`navMode='left'`）：`rail-btn` 已包 `UiTip placement="right"`（hover 右侧 tooltip），但 `rail-label` 也内联常显。
- **设置**：`quickFormatButtons`（默认 true）、`showToolbarLabels`（默认 true）在 `EditorSettingsTab.tsx:104-110`；desc 现为「在工具栏直接显示粗体、斜体、下划线、删除线、高亮五个按钮，关闭后仅保留格式菜单」。
- **弹框**：`UiModal` 支持 `height` prop（`heightCss` → `min(height, 100vh-40)`）。`LibraryPanel`（width 900，默认 category='docs'）、`ImageDialog`/`LinkDialog`（width 720）均无固定高度。`CATEGORIES`：docs/url/local（url = URL 在线导入）。
- **导出预览**：`ExportDialog` width 900；`.ud-preview-body { min-height:120px; overflow:auto }`，`.ud-preview-card` 包 `export-preview-body`。

## 目标

1. **工具栏标题**：工具栏恒纯图标；`showToolbarLabels` 开启（默认）→ hover 显示标题——顶栏在图标**下方**（tooltip 式），侧边栏在图标**右侧**（已有 UiTip right）。关闭 → 纯图标无标题。
2. **常用格式按钮**：`quickFormatButtons` 关闭 → 顶栏只显示 文档库/新建/大纲/格式/图片/链接/表格/插入/模式/历史/导出/设置（12 个核心），隐藏 查找/AI/粗体/斜体/删除线。开启 → 全部显示。文案改为「在工具栏上显示常用的样式菜单，开启后全部显示」。
3. **弹框固定高度**：文档库弹框默认「URL 在线导入」标签；文档库/插入/图片/链接等弹框统一固定高度。
4. **导出预览**：`.ud-preview-body` 固定高度 + `overflow-y:auto`（滚动条）；导出弹框更紧凑（收窄宽度）。

## 非目标

- 不重新加入 下划线/高亮 按钮（markdown 源码无法表达，无法生效）。
- 不改 粗体/斜体/删除线 的实际 markdown 行为；不改导出逻辑/分页。
- 不重命名「设置」为「配置」（用户口中的「配置」即设置按钮）。

## 具体改动

| 位置 | 现在 | 改为 |
|------|------|------|
| `layout.css` `.toolbar-btn` / `.toolbar-icon-only` | icon-only 仅隐藏 label | 恒 icon-only；label 默认隐藏；`showToolbarLabels` 开时 `.toolbar-btn:hover .toolbar-label` 绝对定位显示在图标下方 |
| `Toolbar.tsx` | label 常显（开） | label 恒不内联；hover 由 CSS 显示 |
| `LeftNav.tsx` `.rail-label` | 内联常显 | 恒隐藏（icon-only）；靠既有 UiTip right hover 显文字 |
| `EditorSettingsTab.tsx` desc | 「…五个按钮…」 | 「在工具栏上显示常用的样式菜单，开启后全部显示」 |
| `Toolbar.tsx` `quickFormatButtons` | 只控制粗体/斜体/删除线 | 关闭时额外隐藏 查找 + AI（12 核心）；开启全显 |
| `LibraryPanel.tsx` | 默认 category='docs'；无高度 | 默认 category='url'；`height={600}` |
| `ImageDialog`/`LinkDialog` 等 | 无高度 | `height={520}` |
| `settings-dialog.css` `.ud-preview-body` | `min-height:120px; overflow:auto` | 固定 `height:380px` + `overflow-y:auto`（导出预览） |
| `ExportDialog.tsx` | width 900 | 收窄（如 780），更紧凑 |

## 交给实现者

- 点 1：顶栏 label 用 `position:absolute`（tooltip 下置）避免 hover 挤压布局；侧边栏只隐藏 `.rail-label`（UiTip 已在）。`showToolbarLabels` 开时开 hover 显，关时全隐藏。
- 点 2：`quickFormatButtons` 关闭时条件渲染 `查找`/`AI`/`粗体`/`斜体`/`删除线`；保留 12 核心 + 格式/插入/表格等菜单。更新 desc 文案。
- 点 3：LibraryPanel 默认 url + `height`；Image/Link/Code/Formula/TableDropdown/Emoji/Chart 弹框统一固定高度。
- 点 4：`.ud-preview-body` 固定高 + 滚动；ExportDialog 收窄。
- 全量 `npm run test` + `typecheck` 通过；截图验证：顶栏 icon-only + hover 下置文字、侧边栏 icon-only + hover 右侧文字、quickFormat 关闭后 12 核心、文档库默认 URL 标签 + 固定高、导出预览固定高滚动条。
