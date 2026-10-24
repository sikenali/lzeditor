# Phase 1（改写版）：收尾现有 CodeMirror 6 集成 实现计划

> 取代 `2026-10-24-phase1-codemirror-core.md`（该计划基于「从零删 TipTap + mdSyntax 纯函数」路线）。
> 现状基线：`31b7063 feat(editor): 集成 CodeMirror 6 编辑器，新增浮动状态栏` —— CM6 内核本体已存在（`src/components/editor/codemirror/` 11 文件 + `CM6Editor.tsx`），typecheck 0 error、npm test 8/8，但与 TipTap 共存且大面积接线断裂。本计划只做「止血 → 接线 → 设置项落地 → 最终移除 TipTap」，不重写内核。

**目标：** CM6 可用为唯一编辑路径——内容单一事实源、全部工具栏/搜索/历史/AI/插入对话框写入 CM6、设置项真实生效；最后移除 TipTap。

**规格来源：** `docs/superpowers/specs/2026-10-24-lzeditor-cm6-integration-design.md`（D1、D2、D6）

**验收门槛：** 每 Stage 结束 `npm test` + `npm run typecheck` 全绿；Stage 0 结束需用户手动验证「打字→侧栏预览/导出/阅读模式同步、切 tab 不丢内容、截图粘贴成图片、Ctrl+F 可查可替换」。

---

## Stage 0 — 止血（数据正确性，必须先做）

### 任务 S0-1：单一事实源 docsMd + 计数/时间上报
**文件：** `src/components/editor/CM6Editor.tsx`

- [ ] `onChange` 内：`setMdContent(text)` + `updateDoc({ md: text })` 改为
  `updateDoc({ md: text, html: mdToHtml(text), docsMd: { [docId]: text } })`（`docsMd` 用 spread 合并，不能整体替换对象）；去掉 `setMdContent` 直写（`updateDoc` 已写 mdContent，双写无意义）。
- [ ] `onCounts: (_words, chars)` 改为 `({ words, chars }) => { setWordCount(words); setCharCount(chars) }`——当前 words 被丢弃，字数与阅读时长不刷新。
- [ ] `onChange` 里补 `useEditorStore.getState().setLastEditTime(Date.now())`。
- [ ] localStorage 持久化改 `{ md, html, savedAt }` 三字段，与 `utils/docSource.ts` 的读取结构对齐。
- [ ] `useEffect([docId, initialContent])` 强制 `setText` 会在切 tab 时被 store 的旧 HTML 回灌：改为只在 `docId` 变化时 setText，`initialContent` 从依赖数组移除。
- 验证：`npm run typecheck`；手动核对侧栏预览/阅读模式/导出同步。

### 任务 S0-2：历史快照去重与切 tab 刷盘
**文件：** `src/store/editorStore.ts`

- [ ] `addVersion`（:195-199）去重条件由 `versions[last].html === version.html` 改为比较 `md`（或 `desc`）——CM6 恒传 `html: ''`，此前所有后续快照都被丢弃。
- [ ] `switchDoc`（:231-239）刷盘不再使用 `s.editor?.getHTML?.()`（TipTap 旧内容），改读 `s.docsMd?.[s.activeDocId] ?? s.mdContent`。
- [ ] `resetDocContent`（:273-276）不再走 `editor.commands.setContent`，改为 store 更新 `docsMd/activeDoc` + 让 CM6 通过 `setText` 生效（见 S0-6 的统一写入出口）。
- 验证：切 tab 后回来内容不丢失；历史面板出现多条快照。

### 任务 S0-3：图片粘贴/拖拽真实 handler
**文件：** `src/components/editor/codemirror/editor.ts`、`image-input.ts`

- [ ] `editor.ts:128` 的 `setImageHandler(view, null)` 换成真实回调：把 dataURL 组装为 `![{文件名}]({dataURL})` 插入光标处（走 `view.dispatch` replaceSelection）。
- [ ] 检查 `image-input.ts` 的 `preventDefault` 之后必须真的插入内容，否则是「吞掉截图」。
- 验证：截图粘贴 / 拖拽图片文件 → CM6 中出现 markdown 图片，侧栏预览渲染出来。

### 任务 S0-4：命令名映射对齐 + 补齐缺口命令
**文件：** `src/components/layout/editorActions.tsx`、`src/components/editor/codemirror/commands.ts`

- [ ] `applyCmd` 的 cmdMap 补齐：`strikeThrough → 'strikethrough'`、`underline → 'underline'`、`toggleHighlight → 'highlight'`。
- [ ] `formatAction` 补齐：`clear`、`ol → numbered-list`、`ul → bullet-list`、`task → task-list`、`sup`、`sub`、`hr`（rule）。
- [ ] `insertAction` 增加 CM6 分支：`toc`（生成目录）、`quote/blockquote`、`footnote`、`hr`、`code`（打开代码块面板不变）、`math`、`chart`、`emoji`。
- [ ] `commands.ts` 新增 FormatCommand：`underline`(`<u></u>`)、`highlight`(`==`)、`sup`(`<sup>`)、`sub`(`<sub>`)、`clear`（剥离行内标记）、`math`(`$$`/`$`)、`footnote`、`toc`、`emoji`（纯文本插入）、`table` 支持行列参数。
- [ ] 删掉「`if (cm6) { ...; return }`」静默吞动作的写法：未映射的动作必须有明确降级（打开对话框或灰显），不得静默失败。
- 验证：逐项点工具栏，CM6 下每项都有可见效果或明确提示。

### 任务 S0-5：查找替换真实现
**文件：** `src/components/editor/codemirror/editor.ts`、`src/components/panels/SearchPanel.tsx`

- [ ] `openSearch`/`findNext`/`findPrevious` 改为 `@codemirror/search` 的 `setSearchQuery` + `setSearchSelection` + `selectNextSearchResult`/`selectPreviousSearchResult` + `replaceSelection`/`replaceAll` effects（真实传入搜索词与替换词）。
- [ ] `SearchPanel` 的 `const cm6 = getCM6Editor()` 从 render 期移到每个 handler 内获取（避免 doc 切换后陈旧引用）。
- [ ] `handleReplaceAll` 不再 `return`。
- 验证：查找→逐个替换→全部替换，命中高亮与计数正确。

### 任务 S0-6：统一写入出口 + 迁移剩余 TipTap 写入路径
**文件：** `src/components/editor/codemirror/registry.ts`、`src/App.tsx`、`src/hooks/useAI.ts`、`src/components/panels/HistoryPanel.tsx`

- [ ] `registry.ts` 增加 `cm6Write()` 工具：返回 `{ setText, insertAtCursor, insertBlock, getSelection, replaceSelection }`，内部从 `getCM6Editor()` 取实例（实例为 null 时给统一降级行为，例如写入 store 待下次挂载后应用）。
- [ ] `App.tsx:299/328/342-345/351/357/362/367` 七个插入回调（图片/代码/链接/公式/图表/表情/表格）CM6 分支接入。
- [ ] `useAI.ts:169-209` 应用结果与回滚改为 CM6 的 replaceSelection（并记录原文用于 undo）。
- [ ] `HistoryPanel.tsx:30-44` 回滚/重播改为 `cm6Write().setText(md)`。
- [ ] `Toolbar.tsx:34-38` AI 面板取选区（两模式都坏，顺手修）。
- 验证：插入对话框、AI 润色、历史回滚在 CM6 下全部生效。

### 任务 S0-7：CM6 保活与状态栏恢复
**文件：** `src/components/editor/LZEditor.tsx`、`src/components/layout/StatusBar.tsx`

- [ ] `LZEditor.tsx:927` 的 `useCM6 ? <CM6Editor/> : <EditorContent/>` 改为 CM6 始终挂载、用 `display` 切换可见（切到阅读/代码/历史模式时 `getCM6Editor()` 不能变 null）。
- [ ] `StatusBar.tsx:121-130` 去掉 `!useCM6` 隐藏条件——光标行/列已正常上报。
- 验证：在阅读/代码模式下工具栏按钮仍生效；状态栏光标位置实时显示。

---

## Stage 1 — 设置项落地（把空壳函数做成真的）

**文件：** `src/components/editor/codemirror/editor.ts`、`complete.ts`、`live-preview.ts`、`src/components/panels/settings/`

- [ ] S1-1 `setLineNumbers`：Compartment 动态增删 `EditorView.lineNumbers()`。
- [ ] S1-2 `setTabSize`：`EditorView.tabSize.of` effect。
- [ ] S1-3 `setSoftWrap`：Compartment 动态增删 `EditorView.lineWrapping`（当前只切 class，换行关不掉）。
- [ ] S1-4 `setContinueLists`：把 `editor.ts:56-79` 的 Enter 处理改为受开关控制的 extension。
- [ ] S1-5 `setTypewriter`：从无条件 extensions 中移除，改由开关动态增删（当前打字机恒开）。
- [ ] S1-6 `setLivePreview`：装入 `livePreviewExtension` 并调用 `setLivePreviewImages`（`live-preview.ts` 356 行目前零引用）。
- [ ] S1-7 `setSnippets`：修参数丢弃 + dispatch `setSnippetDataEffect` + 装入 `completionSetup([snippetSource])` 与 `snippetTabKeymap`（否则 15 个 `/` 片段全死）。
- [ ] S1-8 Settings 面板新增「编辑器内核」开关（`useCM6Editor`），恢复逃生口；`autoPair/continueLists/currentLine/softWrap/tabSize/livePreview/typewriterMode` 对应设置项接线（当前 `src/components/panels/settings/` 对 cm6 零引用）。
- 验证：设置面板逐项开关，编辑器行为随开关变化。

---

## Stage 2 — 移除 TipTap（最终目标，需用户确认 Stage 0/1 验收后执行）

- [ ] S2-1 删除 `LZEditor.tsx` 的 `useEditor`/`EditorContent`/`BubbleMenu`/`SlashCommand` 与 20+ 个 TipTap 专属 effect；删 `src/components/editor/extensions/` 7 个文件。
- [ ] S2-2 `SidebarOutline.tsx` 改用 `docsMd` 正则解析标题 + CM6 `view.dispatch` 定位，去掉 `@tiptap/pm` 的 `TextSelection`。
- [ ] S2-3 `SidebarPreview`/`PreviewPanel`/`ExportDialog`/`StyleMainPanel` 保持读 `docsMd`（S0-1 后已正确）。
- [ ] S2-4 卸载 `@tiptap/*` 13 包 + `@memfoldai/tiptap-search-and-replace`；`utils/htmlToMd`、`cleanContent` 仅保留导出侧使用。
- [ ] S2-5 `vite.config.ts` 删除 `vendor-tiptap` chunk，新增 `vendor-codemirror`。
- [ ] S2-6 清理死文件：`codemirror/types.ts`（与 registry 重复）、`editor.ts` 的 `onScroll`/`onSelection`/重复 `toggleTask`。
- [ ] S2-7 补测试：`commands.ts` 的 FormatCommand 用纯 `EditorState` 单测（脱离 DOM）；新增边界测试断言全库无 `@tiptap` import（对齐 `theme-boundary.test.mjs` 静态断言风格）。
- 验证：`npm run build` 产物无 tiptap chunk；全功能回归。
