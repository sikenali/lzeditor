# 模式显示重构设计（Mode Display Restructure）

日期：2026-11-19
状态：待审批

## 意图与为什么

用户反馈模式显示需要梳理，提出 4 点：

1. **默认显示编辑模式，全区域显示** —— 打开即所见即所得（WYSIWYG），不再默认进代码/源码模式。
2. **点击代码模式 → 切换到代码模式；该菜单项文案变成「编辑模式」** —— 代码/编辑用一个菜单项双向切换。
3. **点击预览模式 → 左边显示编辑模式/代码模式，右侧显示预览区域** —— 预览成为独立的第一类分屏模式。
4. **排版模式不变，但所有内容区宽度统一为 `style-read-acks` 的 760px 宽 + 27.33px 行高**。

**现状**（`src/store/editorStore.ts`）：
- `appMode: 'edit' | 'code' | 'style' | 'read' | 'history'`，**默认 `'code'`**（CM6 全宽源码）。
- `showPreview: boolean`，默认 `false`。当前「预览模式」是叠在 edit 上的布尔：点它 → `showPreview=true` 且强制 `appMode='edit'`，左栏**锁定 WYSIWYG**。
- 菜单项（`editorActions.tsx` `MODE_ITEMS`）：`预览模式 / 代码模式 / 排版模式 / 阅读模式`，文案固定。

**测度现状**：
- WYSIWYG 内容列：`--document-width: 690px`（milkdown.css），16px/27.2px。
- CM6 内容列：`--document-width: 1280px`（settings `contentWidth` 默认 `'1280'`），14px/1.7。
- `style-read-acks`：`.style-read-article { max-width: 760px }`，当前 15px/22.5px。

## 目标

- 让「编辑模式」成为默认全区域视图（WYSIWYG，paper 主题）。
- 代码/编辑用同一菜单项切换，文案随状态翻转（代码模式 ↔ 编辑模式）。
- 预览成为第一类分屏模式：左 = 编辑 **或** 代码编辑器，右 = `SidebarPreview`；左栏切换经模式菜单（不改 showPreview）。
- 所有模式内容区统一 **760px 内容列 + 27.33px 行高**。

## 非目标 / 反目标

- **不改**阅读模式（双联页书本翻页）与排版模式的结构与功能。
- **不引入**新的模式状态轴（保持 `appMode` + `showPreview` 两维即可表达全部布局）。
- **不触碰**并行会话的 nebula-ui-redesign 未提交改动（`flavors.ts`/`render.ts`/`fonts.css`/`layer-order.css` 等）。
- **不**让代码编辑器内容列跟随内容宽度设置外的其它意外变化。

## 约束

- 并行 superpowers 会话在 `dev` 上同时工作，只提交自己的改动，用 `git add -p` 隔离混合同文件的 hunk。
- 部署走 `lzc-cli lpk install`；沙箱无法访问部署站（IPv6 ULA），只能本地 `vite preview` 验证。

## 方案（两维模型：appMode + showPreview）

保留 `appMode` 与 `showPreview` 两个状态维度，不新增模式枚举：

| 状态 | 布局 |
|------|------|
| `showPreview=false, appMode='edit'` | **编辑模式**：全区域 WYSIWYG（paper 主题） |
| `showPreview=false, appMode='code'` | **代码模式**：全区域 CM6 源码 |
| `showPreview=true, appMode='edit'` | **预览分屏**：左 = WYSIWYG，右 = `SidebarPreview` |
| `showPreview=true, appMode='code'` | **预览分屏**：左 = CM6，右 = `SidebarPreview` |
| `appMode='style'`（showPreview 清 false） | **排版模式**：样式面板（不变） |
| `appMode='read'`（showPreview 清 false） | **阅读模式**：双联页（不变） |
| `appMode='history'` | 历史面板（不变） |

### 菜单行为（`modeAction` 重写）

菜单保持 4 项：`预览模式 / 代码模式 / 排版模式 / 阅读模式`。

- **预览模式**：`setShowPreview(!showPreview)`；开时若 `appMode` 不在 `'edit'|'code'` → `setAppMode('edit')`。左栏编辑器类型 = 当前 `appMode`。
- **代码模式 / 编辑模式**（同项，文案翻转）：文案 = `appMode === 'code' ? '编辑模式' : '代码模式'`。点击 → `setAppMode(appMode === 'code' ? 'edit' : 'code')`，**不改 `showPreview`**（预览分屏内切换左栏；全区域时切全区域）。
- **排版模式**：`setAppMode('style')` + `setShowPreview(false)`。
- **阅读模式**：`setAppMode('read')` + `setShowPreview(false)`。

> 说明：编辑模式是默认态，菜单里没有独立「编辑模式」项——从代码模式点「编辑模式」即可回到编辑；从排版/阅读经「代码模式→编辑模式」或「预览模式」回。这与用户 4 点一致（只指定了代码模式的文案翻转）。

### 内容测度（所有内容区统一）

- **内容列宽 760px**：`--document-width: 760px`（`code-editor.css` / `milkdown.css` 默认值 + `settingsStore.contentWidth` 默认 `'1280' → '760'` + 迁移旧存档 `'1024'/'1280' → '760'`）。`SidebarPreview`/阅读/排版读区已 760px 或由其容器控制，核对即可。
- **行高 27.33px**：WYSIWYG `--doc-line-height: 27.33px`（字面量，精确命中规格）；`SidebarPreview`/阅读正文行高同步 27.33px。

### 布局逻辑改动（`modeLayout.ts`）

- `shouldShowRightPreview`：现为 `showPreview && appMode !== 'code' && …`。改为 `showPreview && (appMode === 'edit' || appMode === 'code')`，使预览分屏允许左栏为代码时仍显示右栏预览。
- `shouldShowCenterColumn` / `shouldShowRightPanel`：`appMode === 'style'` 时中心隐藏、右栏样式面板（不变）。`showRightPanel` 预览/文档库分支沿用。

## 改动文件

- `src/store/editorStore.ts`：默认 `appMode: 'code' → 'edit'`。
- `src/utils/modeLayout.ts`：`shouldShowRightPreview` 允许 `code`。
- `src/components/layout/editorActions.tsx`：`modeAction` 重写（预览不锁 edit；代码文案翻转；排版/阅读清 showPreview）；`MODE_ITEMS` 文案动态化（`code` 项 label 依 `appMode`）。
- `src/store/settingsStore.ts`：`contentWidth` 默认 `'1280' → '760'` + 迁移旧值。
- `src/components/editor/CodeEditor.tsx`：无（`--document-width` 已读 settings，随默认变 760）。
- `src/additional/milkdown/milkdown.css`：`--document-width: 690 → 760`；`--doc-line-height` 走字面量 27.33px。
- `src/styles/code-editor.css`：`--document-width: 690 → 760`。
- 测试：新增/更新模式行为测试（默认 edit、代码文案翻转、预览左栏可切代码、760/27.33 测度断言）。

## 设计决策（本次由我拍板，供审批时核对）

1. **`contentWidth` 设置默认改 760 并迁移旧存档**：产品主理要求「所有宽度统一 760」，改默认只影响新用户；旧用户存档 `'1280'/'1024'` 需迁移到 `'760'` 才能真正确保通用。迁移放 `settingsStore` 的存档迁移逻辑。
2. **行高用字面量 27.33px**：`--cm-line-height` 是比例（默认 1.7→27.2px），无法精确命中 27.33；用字面量 `27.33px` 覆盖，精确匹配规格。字号保持现状（16px）。
3. **阅读/排版读区本已 760px**：只需把其正文行高同步为 27.33px，宽度不动。

## 留给实现者的

- 预览分屏的拖拽 resizer 复用现有 `code-splitter` + `previewWidth`（200–800），不改。
- 27.33px 的落地位置：WYSIWYG、SidebarPreview、阅读正文、排版读区 4 处，用统一变量或 CSS 规则。
- 若并行会话的 nebula-ui-redesign 与 `milkdown.css`/`fonts.css` 冲突，用 `git add -p` 只暂存自己的 hunk。
