# Textus 只读预览 —— 设计文档（Approach A）

日期：2026-11-13 · 分支：dev · 状态：待批准

## 1. 意图与为什么

用户要把 lzeditor 的 WYSIWYG（当前是 A2 复用的**可编辑** Milkdown 编辑器）改成
**只读预览**：像 Textus 分屏预览那样，渲染 markdown、语法全绘，但不可编辑；
**编辑只在代码模式（CM6）做**。理由：可编辑 WYSIWYG 的显示/主题/IME 等问题多、
难维护，与其继续打补丁，不如把"预览"完全交给 Textus 的现成只读组件，省心且忠实。

用户原话（要点）：
- 去掉我们现在实现的（可编辑 WYSIWYG），直接复用 Textus。
- 预览 = 像 Textus 分屏预览那种只读渲染（编辑只在代码模式，预览只看效果）。
- 代码模式可以继承（允许复用 Textus，但本次不必换，保留现有 CM6）。
- 样式预览可用；阅读模式用户后续自己实现（本次不动）。

## 2. 目标 / 非目标 / 反目标

**目标**
1. WYSIWYG 侧改为**只读预览**：复用 Textus `SplitPreview`（`preview: true` +
   `setReadOnly(true)`），由应用文档状态 `editorMd` 驱动，`md` 变化只重绘改动块。
2. 编辑只在代码模式：`App.tsx` 中 `wysiwyg=true` → `<SplitPreview markdown={editorMd}/>`，
   `wysiwyg=false` → 现有 `<CodeEditor>`（CM6，可编辑）。
3. 删除现在不可再用的可编辑 WYSIWYG 实现（`MilkdownEditor.tsx` 及其专属胶水）。
4. 预览沿用内容主题：外壳 `.textus-editor-shell[data-content-theme=…]` 的 `--doc-*`
   token（slate 默认），样式面板预览不受影响。
5. 阅读模式（`ReadMode`）**不改**。

**非目标**
- 不把代码模式换成 Textus 源码编辑器（可作后续，需单独评估耦合）。
- 不实现完整的主题选择器（纸/板岩/森林切换）——预览沿用当前 `data-content-theme`
  机制即可；选择器接线是后续项。
- 不保留可编辑 WYSIWYG 的任何 UI 入口。

**反目标（失败即返工）**
- 门禁不许破：`typecheck` 0、`test` 279/279、`node scripts/check-textus-vendor.mjs` 0/0、
  `npm run build` 成功。
- 不碰用户并行提交的 `feat(history)` 工作（`f8a6093`…`4988042`）。
- 不引入对 Textus 运行时/网络的新依赖（仍走 vendored `textus/` 闭包）。

## 3. 约束

- vendor 门禁按 **import 闭包**校验（`check-textus-vendor.mjs`）：`textus/` 下所有
  `.ts/.tsx` 的相对 import 必须解析到 `textus/` 或 `textus/shim/` 内的真实文件；
  裸 import 必须是 `package.json` deps/devDeps 的键或允许子路径。**不要求逐字节
  匹配 Textus 源码**（vendored CSS 已被改过作用域），故可调整被 vendor 文件的 import。
- `SplitPreview` 的 `useSettings().t` 读的是**对象属性**（`t.splitPreview`、`t.hoverCard`、
  `t.missingImageRemote.replace(...)` 等），而当前 shim `settings-context.ts` 把 `t`
  返回成**函数**——需让 `t` 成为英文翻译对象，否则这些读取为 `undefined`。
- 预览仍需 `.textus-editor-shell` 外壳（scoped CSS 的作用域）：`SplitPreview` 自身
  只渲染 `<Milkdown/>`，需在外层包 `.textus-editor-shell[data-content-theme]`。

## 4. 方案（用户已选 A）

### 方案 A —— 直接复用 Textus `SplitPreview`（**选定**）
- vendor `editor/modes/SplitPreview.tsx`、`editor/useEditorRunner.ts`；
  按需 vendor `utils/hooks/useLatest.ts`，或把 `SplitPreview` 里对应 import 改指
  `textus/shim/`/既有文件（门禁只查闭包，允许）。
- 预览外壳：`<div class="textus-editor-shell" data-content-theme="slate"><SplitPreview
  markdown={editorMd}/></div>`；沿用现有 `milkdown.css` 的布局（外壳/滚动/居中列）。
- 优点：最忠实 Textus，预览行为与分屏预览完全一致，自研代码近零。
- 代价：多 vendor 1–3 个文件；shim `t` 需改对象。

### 方案 B —— 复用 A2 链路加只读（未选）
- 用 `withEditorCore(..., { preview: true })` + 挂载 `setReadOnly(true)`，自写 ~30 行
  diff 同步。优点：不新增 vendor 文件。代价：仍是自研薄包装，非 Textus 原件。
- 未选原因：用户要"直接复用 Textus"，A 更贴；B 的边界行为需自验。

## 5. 已定实现要点（含 builder-check 后的裁决）

1. **Vendor**（放 `src/additional/milkdown/textus/`，与 Textus 源同路径）：
   - `editor/modes/SplitPreview.tsx`（只读预览，`markdown` 驱动，diff 重绘）。
   - `editor/useEditorRunner.ts`（`useInstance` 封装，供 `SplitPreview`）。
   - `SplitPreview` 的 `useSettings` import（`../../prefs/SettingsContext`）与
     `useLatest` import（`../../utils/hooks/useLatest`）在 V 内**不存在**——重定向到
     `textus/shim/settings-context.ts` 与既有/新增的 `useLatest`（`utils/hooks/`
     目录也不存在，需新建或就地内联）。门禁只查闭包，允许。
2. **Shim**：`shim/settings-context.ts` 的 `useSettings()`：
   - `t` 改为**英文翻译对象**（含 `splitPreview` 及 vendored 已读的 `hoverCard/…`、
     `missingImage*` 键）。`en` locale 已含这些键，typecheck 无碍。
   - `settings` 返回与已删编辑器一致的 `editorSettings`（`language:"en"`、
     `enableMath:true`、`enableMermaid:true`、`colorSwatches:"off"`、
     `codeLineNumbers:false`、`autoCloseBrackets:false`、`autoCloseMarks:false`）
     而非 `{}`——否则 mermaid/math 预览与色板在预览里会关掉，违背"语法全绘"。
3. **noDiskImages 分支（裁决：改，不复刻磁盘分支）**：`SplitPreview` 原样走
   `withEditorCore` 的**磁盘**分支（`onImagePasteError`/`requestImageName`），会装
   `createImagePlugin/createUndoFilePlugin/createLinkClickPlugin/createLinkHoverPlugin`，
   而 lzeditor 无磁盘（`docPath.current=null` 恒空），link hover/click 是否空安全未验证。
   lzeditor 一贯用 `noDiskImages`（A2 的 B5）。**将 vendored `SplitPreview` 的
   `withEditorCore` 调用改为 `noDiskImages` 分支**（传 no-op 插件），避免空路径
   hover/click 崩溃。这是相对 Textus 原件的**有意的、记录在案的偏离**（lzeditor 无磁盘）。
4. **预览外壳组件 `TextusPreview.tsx`**（新建，承载原 `MilkdownEditor.tsx` 的 CSS
   import 职责）：
   - 8 个 CSS import（`milkdown.css`、prosemirror.css、content-base/`content-themes`、
     `milkdown-theme`、`completion-panel`、`diagram-zoom`、`hover-card`）移入此组件；
   - 渲染 `<div class="textus-editor-shell" data-content-theme="slate"><SplitPreview
     markdown={editorMd} filePath={null}/></div>`；
   - **镜像 `<html data-theme>` 到外壳 `data-theme`**（MutationObserver，同被删编辑器）
     ——否则 `:not([data-theme="light"])` 在应用亮色下也命中暗色 token，亮/暗错乱。
   - 保留 `milkdown.css`（外壳布局/滚动/居中列/占位/选区）。
5. **接线**（`App.tsx`）：`wysiwyg ? <TextusPreview markdown={editorMd}/> : <CodeEditor .../>`。
   删除 `import { MilkdownEditor }`；删除 `MilkdownEditor.tsx` 与 `editor-factory.ts`
   （`buildEditor`/`recomputeSource`）；保留 `withEditorCore`/`configureEditorRoot`。
6. **数据流**：`editorMd` + `handleEditorChange` 仍是文档真相。CM6 编辑 → `editorMd`；
   预览是 `editorMd` 的只读函数。切换 `wysiwyg` 即 预览⇄代码，无往返状态问题。
7. **样式预览**：预览外壳沿用 `data-content-theme`（slate），内容主题生效；样式面板
   预览不受影响。主题选择器接线为后续项。

## 6. 测试与删除（builder-check 确认，必须做）

- `tests/cm6-core-boundary.test.mjs`（:84–97）与 `tests/additional-dead-cluster.test.mjs`
  （:31）**硬断言旧设计**（App 含 `MilkdownEditor`、`MilkdownEditor.tsx`/`editor-factory.ts`
  必须保留、`.updated(`/`withEditorCore(`/无 `.use(`）。删除这两文件会直接破 279 门禁。
  **须改写这两处断言**为新接线：App 渲染 `TextusPreview`/`SplitPreview`、
  `MilkdownEditor.tsx`/`editor-factory.ts` 已删、`withEditorCore(` 仍在（SplitPreview 用）。
- 其余测试（`wysiwyg-toolbar-disable` 等）不受影响：`wysiwyg` 仍是真实模式。
- 手测：`wysiwyg` 开 → 只读预览（语法全绘、居中 690px 列、可滚动、不可编辑、亮/暗随
  应用主题）；CM6 编辑 → 预览随 `editorMd` 更新且只重绘改动块；代码模式仍可编辑；
  样式面板可用；阅读模式未动。

## 7. 验证

- 门禁：`npm run typecheck`、`npm test`、`node scripts/check-textus-vendor.mjs`、
  `npm run build`。
- 手测：`wysiwyg` 开 → 只读预览（语法全绘、居中 690px 列、可滚动、不可编辑）；
  CM6 编辑 → 预览随 `editorMd` 更新且只重绘改动块；代码模式仍可编辑；样式面板可用；
  阅读模式未动。
