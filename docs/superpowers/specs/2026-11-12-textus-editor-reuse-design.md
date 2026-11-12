# Textus 编辑器区域复用设计 — LZEditor

- 日期：2026-11-12
- 状态：待评审（brainstorming 已完成，做法已定 A2）
- 参考源：`github.com/CatVinci-Studio/Textus`（shallow clone 至 `/tmp/opencode/textus`，非本仓库）

## 意图（为什么做）

lzeditor 的 WYSIWYG 编辑器现在只是自己手写的 **94 行 Milkdown 薄封装**
（`src/additional/milkdown/MilkdownEditor.tsx`，仅 commonmark+gfm+listener）。
用户希望**编辑器区域**（写作画布）直接复用/继承 **Textus 项目**的编辑器实现，
让写作体验与 Textus 一致——这是继已移植的 Textus 插件系统
（`src/additional/plugins/`）之后的第二步。

## 目标

- 把 Textus 的 **写作画布核心**（编辑/输入/剪贴板/序列化/排版主体 + 补全 +
  代码块基础高亮/行号）源码 vendor 进 lzeditor `src/additional/milkdown/`，
  **直接复用** Textus 源码（拷贝真实文件、改 import、剥 AI 依赖），而非重写。
- 新编辑器替换现有薄封装，**保持同一对外接口** `md` / `onChange` / `readonly`，
  仍由 `wysiwyg` 开关控制，与 CodeMirror 源码编辑器**并存**（不破坏 CM6）。
- 复用 Textus 的 markdown 往返管线（reduced-presets + source-preserving），
  让 WYSIWYG 下输入→markdown 的保真度与 Textus 一致。

## 非目标（明确不做）

- **不带** Textus 的 AI 对话 / quick-ask / 审阅(review) / 语法检查(grammar) /
  AI 补全来源（`src/ai/*`、`withAiPlugins`、`useEditorChat/Review/Popups/Carets`）。
- **不带** 插件宿主驱动的视图：`plugin-code-blocks` 的插件化 code-block 视图、
  `plugin-decorations`、`EditorMarginLayer`、`EditorOverlays`、`EditorChatPortals`。
- **不做** typewriter/zen 模式、diagram-engine/chart 节点、obsidian/note embed、
  导出联动（`export/drawn-blocks`）。
- **不改变** CodeMirror 编辑器、mdToHtml 渲染管线、文档存储结构、Electron 层。
- **不**把 Textus 抽成 npm 包（做法 B 已否决）。

## 反目标（即使成功也是失败）

- 破坏了 `tests/cm6-core-boundary.test.mjs`（Milkdown/ProseMirror 仅限
  `src/additional`，主 `src` 禁）。
- 新编辑器把 `md` 回写得比现在更失真（round-trip 退化）。
- 让 `npm run typecheck` / `npm test` 失败。
- 在 CM6 模式下引入了任何运行时回归。

## 现状（基线）

- 编辑器区域：`App.tsx` `centerContent` = `wysiwyg ? <MilkdownEditor> : <CodeEditor>`。
- 薄封装 `MilkdownEditor.tsx`：`Editor.make().use(commonmark).use(gfm).use(listener)`，
  受控 `md` + `onChange`；外部 `md` 变化仅当编辑器自身 markdown 不同才 `replaceAll`。
- `editorStore` 已有 `wysiwyg` 开关；`editorActions` 有「WYSIWYG 模式」切换。
- 只有 CodeMirror 注册了 `EditorFacade`（`src/components/editor/facade/`）；
  WYSIWYG 模式 `getEditorFacade()` 为 null，插入操作回退到光标位（现状，不在本次修）。

## Textus 侧事实（决定 A2 边界）

`src/document-view/editor-extensions.ts` 的 `withEditorExtensions` =
`withAiPlugins( withEditorCore(...) )` + `pluginCodeBlocks` + `pluginDecorations`。
其中 **`withEditorCore`**（`src/editor/editor-extensions.ts`，453 行装配）是纯写作核心，
拉起的子模块（`src/editor/` 下）：markdown/（reduced-presets、source-preserving、
markdown-output、frontmatter、github-alert、inline-syntax、heading-id、toc、
reference-links、wikilink、br-hardbreak、link-*、missing-links）、html/（raw-html、
raw-html-preview、html-align）、marks/（md-span、autopair、color-swatch、enclosure、
heading-marker）、math/（katex）、emoji/、keys/（IME、block-keys/join、inline-source、
tab-extend、move-block、bracket-autopair、format-shortcut、select-all、mac-navigation、
drag-autoscroll、margin-click、keyboard-reveal、composition-prune、linux-ime-enter）、
clipboard/（paste-markdown、paste-html、paste-url、own-undo-step、copy-text、paste-plain、
plain-text、word-lists、paste-slice）、images/（image-html、image-plugin、
picture-clipboard、image-name-request）、code/（syntax-highlight、code-line-numbers）、
tables/（table-hover-view）、completion/（completion-plugin、sources、panel、
emoji-completion）、mermaid-plugin、prosemirror-speedups、pointer-hold、change-source、
placeholder-plugin、read-only-plugin、undo-file、find/find-replace-plugin、
extension-points。

`pluginCodeBlocks`/`pluginDecorations` 依赖 `plugins/manager`、`export/drawn-blocks`、
`ai/doc-markdown` —— 这是"精简核心"明确**排除**的插件宿主/导出/AI 基础设施。

## 做法（Approaches）

- **A1 忠实全量**：连同 code-block views、decorations 的插件宿主/导出/doc-markdown
  一起 vendor。体验最接近 Textus，但搬入基础设施更多。
- **A2 精简核心（已选）**：只搬 `withEditorCore` 的编辑/输入/剪贴板/序列化/排版主体
  + completion + code-block 基础高亮/行号；**暂缓**插件宿主驱动的
  `plugin-code-blocks` 视图、`plugin-decorations`、margin/overlays/chat portals、
  typewriter/zen、chart/diagram、embeds、导出联动。
- **B 共享 npm 包**：需重构 Textus 仓库（Tauri 单体）为库 + 绑定发布，太重，否决。
- **C 重写**：非"直接复用"，与诉求相悖，否决。

### A2 取舍

- **得**：范围可控、更快见效、不引入插件宿主/导出/AI 的耦合；写作体验（输入、
  序列化、markdown 保真、代码块高亮、补全、math、emoji、表格、剪贴板）对齐 Textus。
- **失**：插件化 code-block 视图、decorations 装饰、margin/审阅等高级交互暂缺；
  后续需按需补齐（记入 "后续"）。
- **边界**：代码块基础高亮/行号走 `code/syntax-highlight-plugin` +
  `code/code-line-numbers-plugin`（不依赖插件宿主）；`code-block-language-view` 若引
  插件宿主则暂缓、仅保留静态 lang 标注。

## 决定（已定）

1. **vendor 位置**：Textus 写作核心源码拷入 `src/additional/milkdown/textus/`
   （保留 `src/additional/milkdown/MilkdownEditor.tsx` 作为对外壳组件，
   `index.ts` 导出不变）。`src/additional` 边界满足 cm6-core-boundary 测试。
2. **对外接口不变**：新 `MilkdownEditor` 仍 `{ md, onChange, readonly? }`，
   受控逻辑沿用现有"仅当自身 markdown 不同才 replaceAll"。
3. **剥离策略**：把 `withEditorCore` 里的 AI 无关部分原样搬；`withAiPlugins`、
   `useEditor*`（chat/review/popups/carets）、`useEditorSetup`、`Editor*Layer/Overlays/
   ChatPortals` **不搬**。编辑器装配直接调 `withEditorCore(...)`（去掉 AI 包裹层）。
4. **Textus 依赖 shim**：`Settings` 用 lzeditor 侧最小对象（如 `{ typewriterMode:false,
   ... }`）；`i18n` strings 用空/占位实现；插件宿主、`docPath`、`requestImageName` 以
   lzeditor 适配器或 no-op 提供。
5. **依赖新增**（lzeditor `package.json`，仅核心所需，含 B7 修正）：
   `remark-cjk-friendly`、`remark-cjk-friendly-gfm-strikethrough`、`remark-frontmatter`、
   `remark-math`、`prosemirror-highlight`、`tiny-pinyin`、`micromark-util-classify-character`、
   `micromark-util-chunked`、`micromark-util-resolve-all`、`micromark-util-types`、
   `decode-named-character-reference`、`@codemirror/lang-html`、`@codemirror/language-data`、
   `refractor`。**不需要** `marked`。已具备：`@milkdown/kit`、`@milkdown/react`
   （^7.23.0 与 Textus 一致）、`katex`、`mermaid`、`highlight.js`、`@codemirror/*`、
   `@lezer/*`。
6. **katex 版本**：lzeditor 0.18.7 vs Textus 0.19.0 —— 先保持 0.18.7，若 math 渲染
   异常再升（记入"风险"）。

## 风险

- **round-trip 保真**：source-preserving 依赖 `change-source`/`openedParseRecorder`
  的块级标记；若剥得不完整，序列化可能退化。验证：`save-roundtrip` 类语料
  （Textus `src/document-view/save-roundtrip*.ts` 有现成用例可参照）。
- **IME/中文输入**：`keys/` 的 composition-prune-guard、linux-ime-enter、
  cjk-friendly 是关键；务必保留并手测中文输入。
- **katex 版本差异**、`prosemirror-highlight`+`refractor` 与 lzeditor 的
  highlight.js 双栈并存（体积 +2 小包，可接受）。
- **Milkdown 7 与 React 19**：lzeditor 已用 React 19 + Milkdown 7，Textus 同版本，
  兼容。
- **边界测试**：vendor 必须全部落在 `src/additional/`，否则
  `tests/cm6-core-boundary.test.mjs` 失败。

## 验证

- `npm run typecheck` 通过。
- `npm test` 通过（含 cm6-core-boundary）。
- `npx vite build` 成功。
- 手测：WYSIWYG 开关切换、中文/IME 输入、markdown 往返保真（标题/列表/表格/代码块/
  math/emoji/引用/链接）、剪贴板粘贴（纯文本 + HTML）、只读态、外部 `md` 写入。

## 后续（非本次）

- plugin-code-blocks 插件化视图、plugin-decorations、margin/审阅、quick-ask/AI、
  typewriter/zen、chart/diagram 节点、obsidian/note embed、导出联动。

## Builder check 发现与裁定（2026-11-12）

一位 fresh builder 对照 `/tmp/opencode/textus` 复核后提出 6 项缺口。裁定如下：

### B1. CSS/主题接线（原文档漏）— 裁定：vendor Textus 样式，作用域化
Textus 编辑器无样式不可用：入口引 `@milkdown/kit/prose/view/style/prosemirror.css`、
`theme/content-base.css`、`editor/milkdown-theme.css`（1774 行）、
`theme/content-themes.css`、`completion/completion-panel.css`。lzeditor 现有
`milkdown.css`（115 行）只服务薄封装。
**做法**：把这些 CSS vendor 进 `src/additional/milkdown/textus/`，包在专用容器类
（如 `.textus-editor-shell`）下作用域，lzeditor 的 `--t-*` token 变量经 CSS 变量
覆盖；保留现有 `milkdown.css` 作为壳级样式。冲突用容器类+更具体选择器解决。

### B2. 补全 `/` 菜单在排除的插件层 — 裁定：连带 slash-commands
Textus 的 `/` 来源由 `src/plugins/contributions/slash-commands.ts` 经
`setPluginCompletionSources` 注册（唯一 `addCompletionSource` 在 emoji）。
**做法**：为兑现"补全"，把 `slash-commands`（自包含，仅需 `windowInfo().strings()`
shim）一并 vendor 进 completion；否则补全面板只剩 emoji。已在决定中注明，
如你认为超范围可砍掉（降级为 emoji-only）。

### B3. 受控 `md`/`onChange` 会破坏 source-preserving 往返 — 裁定：改用
`readSourceBlocks`/`writePreservingSource`，且每次外部写后重派生 `source`
Textus 绑定"一个编辑器=一个已开文档"，`useDocumentReporting` 在 mount 时
`readSourceBlocks` 一次，经 `writePreservingSource` 上报；**不用** `markdownUpdated`
（"会把整篇序列化"）。lzeditor 现用 `markdownUpdated` + 外部 `replaceAll`；
`replaceAll` 后已记录的 `openedParseCtx` 与文档失配，`writePreservingSource`
块数校验失败、静默回退普通序列化——往返保真丢失（正是反目标）。
**做法**：新编辑器采用 `readSourceBlocks`/`writePreservingSource` 流；`onChange`
由 source 保真上报；每次外部 `md` 写入（文档切换/导入/程序写）在 `replaceAll`
后**重新** `readSourceBlocks` 派生 source。此即目标"复用往返管线"的必然要求。

### B4. vendor 闭包超出 `src/editor/`（utils/lazy/clipboard/i18n/prefs/platform）—
裁定：纯逻辑 vendor，platform/* 不 vendor
completion 引 `utils/ime`、`utils/pinyin`、`utils/list-filter`；pinyin 引
`lazy/lazy-module`；`copied-plugin` 引 `clipboard/copied`；core 引 `i18n/strings`、
`prefs/SettingsContext`；图片/undo-file 引 `platform/fs|ipc|ipc-files|...`（Tauri）。
**规则**：`src/utils/*`、`src/lazy/*`、`src/clipboard/*`、`src/i18n/*`、
`src/prefs/*` 属纯逻辑 → vendor 或 lzeditor shim；`src/platform/*`（fs/ipc/tauri）
**一律不 vendor**，用 lzeditor 侧等价物或 no-op。边界（cm6-core-boundary 只许
`src/additional`）由此自然满足。

### B5. disk vs noDiskImages — 裁定：走 `noDiskImages`
lzeditor 无"粘贴图片落盘"管线（图片走对话框/dataURL），故取 `withEditorCore`
的 `noDiskImages` 分支，避免拖入 `platform/ipc-files`/`fs` 与 `requestImageName`
磁盘适配。disk-only 插件（createImagePlugin、createUndoFilePlugin）随 noDisk 分支
不激活；link-click/hover 在 `docPath=null` 下应优雅降级（仅导航，不落盘）。

### B6. "withEditorCore 原样搬"与非目标冲突（其内部含 typewriter/zen/embeds/mermaid/lazyBlocks）— 裁定：裁剪装配，保留 configureEditorRoot
`withEditorCore`（453 行）内建 `createTypewriterPlugin`、`zenFocusPlugin`、
`createNoteEmbedPlugin`、`createObsidianEmbedPreviewPlugin`、
`createMermaidPreviewPlugin`、`lazyBlocksPlugin`。前五者中 typewriter/zen/note-embed/
obsidian-embed 属非目标 → 从装配中**剔除**；**mermaid 预览保留**（mermaid 已是
lzeditor 依赖，属写作特性）；`lazyBlocksPlugin`/`withLazyBlockViews` 剔除并提供空
实现。装配改动须保 load order；mount 仍走 `configureEditorRoot`
（设 `rootCtx`/`defaultValueCtx`/`orderedListAttr`）。

### B7. 依赖清单修正（minor）
补：`decode-named-character-reference`、`micromark-util-chunked`、
`micromark-util-resolve-all`、`micromark-util-types`（闭包实需）。`marked` **不需要**
（render-html 仅被排除的 embeds/hover/diagram 用）。这些会在 typecheck 时机械暴露。

## 交给实施者的开放项

- 具体 vendor 文件清单（`withEditorCore` 依赖闭包，按 B4 规则裁剪）在计划阶段确定；
  以"typecheck 通过 + 手测保真"为完成判据，允许裁剪个别边缘模块
  （如 margin-click、keyboard-reveal）以降低接入成本。
- 上述 B1–B7 为本设计裁定；实施者不得擅自改变（改变需回到本设计评审）。
