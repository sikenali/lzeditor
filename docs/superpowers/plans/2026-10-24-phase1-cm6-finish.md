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

- [x] `onChange` 内：`setMdContent(text)` + `updateDoc({ md: text })` 改为
  `updateDoc({ md: text, html: mdToHtml(text), docsMd: { [docId]: text } })`（`docsMd` 用 spread 合并，不能整体替换对象）；去掉 `setMdContent` 直写（`updateDoc` 已写 mdContent，双写无意义）。
- [x] `onCounts: (_words, chars)` 改为 `({ words, chars }) => { setWordCount(words); setCharCount(chars) }`——当前 words 被丢弃，字数与阅读时长不刷新。
- [x] `onChange` 里补 `useEditorStore.getState().setLastEditTime(Date.now())`。
- [x] localStorage 持久化改 `{ md, html, savedAt }` 三字段，与 `utils/docSource.ts` 的读取结构对齐。
- [x] `useEffect([docId, initialContent])` 强制 `setText` 会在切 tab 时被 store 的旧 HTML 回灌：改为只在 `docId` 变化时 setText，`initialContent` 从依赖数组移除。
- 验证：`npm run typecheck`；手动核对侧栏预览/阅读模式/导出同步。

### 任务 S0-2：历史快照去重与切 tab 刷盘
**文件：** `src/store/editorStore.ts`

- [x] `addVersion`（:195-199）去重条件由 `versions[last].html === version.html` 改为比较 `md`（或 `desc`）——CM6 恒传 `html: ''`，此前所有后续快照都被丢弃。
- [x] `switchDoc`（:231-239）刷盘不再使用 `s.editor?.getHTML?.()`（TipTap 旧内容），改读 `s.docsMd?.[s.activeDocId] ?? s.mdContent`。
- [x] `resetDocContent`（:273-276）不再走 `editor.commands.setContent`，改为 store 更新 `docsMd/activeDoc` + 让 CM6 通过 `setText` 生效（见 S0-6 的统一写入出口）。
- 验证：切 tab 后回来内容不丢失；历史面板出现多条快照。

### 任务 S0-3：图片粘贴/拖拽真实 handler
**文件：** `src/components/editor/codemirror/editor.ts`、`image-input.ts`

- [x] `editor.ts:128` 的 `setImageHandler(view, null)` 换成真实回调：把 dataURL 组装为 `![{文件名}]({dataURL})` 插入光标处（走 `view.dispatch` replaceSelection）。
- [x] 检查 `image-input.ts` 的 `preventDefault` 之后必须真的插入内容，否则是「吞掉截图」。
- 验证：截图粘贴 / 拖拽图片文件 → CM6 中出现 markdown 图片，侧栏预览渲染出来。

### 任务 S0-4：命令名映射对齐 + 补齐缺口命令
**文件：** `src/components/layout/editorActions.tsx`、`src/components/editor/codemirror/commands.ts`

- [x] `applyCmd` 的 cmdMap 补齐：`strikeThrough → 'strikethrough'`、`underline → 'underline'`、`toggleHighlight → 'highlight'`。
- [x] `formatAction` 补齐：`clear`、`ol → numbered-list`、`ul → bullet-list`、`task → task-list`、`sup`、`sub`、`hr`（rule）。
- [x] `insertAction` 增加 CM6 分支：`toc`（生成目录）、`quote/blockquote`、`footnote`、`hr`、`code`（打开代码块面板不变）、`math`、`chart`、`emoji`。
- [x] `commands.ts` 新增 FormatCommand：`underline`(`<u></u>`)、`highlight`(`==`)、`sup`(`<sup>`)、`sub`(`<sub>`)、`clear`（剥离行内标记）、`math`(`$$`/`$`)、`footnote`、`toc`、`emoji`（纯文本插入）、`table` 支持行列参数。
- [x] 删掉「`if (cm6) { ...; return }`」静默吞动作的写法：未映射的动作必须有明确降级（打开对话框或灰显），不得静默失败。
- 验证：逐项点工具栏，CM6 下每项都有可见效果或明确提示。

### 任务 S0-5：查找替换真实现
**文件：** `src/components/editor/codemirror/editor.ts`、`src/components/panels/SearchPanel.tsx`

- [x] `openSearch`/`findNext`/`findPrevious` 改为 `@codemirror/search` 的 `setSearchQuery` + `setSearchSelection` + `selectNextSearchResult`/`selectPreviousSearchResult` + `replaceSelection`/`replaceAll` effects（真实传入搜索词与替换词）。
- [x] `SearchPanel` 的 `const cm6 = getCM6Editor()` 从 render 期移到每个 handler 内获取（避免 doc 切换后陈旧引用）。
- [x] `handleReplaceAll` 不再 `return`。
- 验证：查找→逐个替换→全部替换，命中高亮与计数正确。

### 任务 S0-6：统一写入出口 + 迁移剩余 TipTap 写入路径
**文件：** `src/components/editor/codemirror/registry.ts`、`src/App.tsx`、`src/hooks/useAI.ts`、`src/components/panels/HistoryPanel.tsx`

- [x] `registry.ts` 增加 `cm6Write()` 工具：返回 `{ setText, insertAtCursor, insertBlock, getSelection, replaceSelection }`，内部从 `getCM6Editor()` 取实例（实例为 null 时给统一降级行为，例如写入 store 待下次挂载后应用）。
- [x] `App.tsx:299/328/342-345/351/357/362/367` 七个插入回调（图片/代码/链接/公式/图表/表情/表格）CM6 分支接入。
- [x] `useAI.ts:169-209` 应用结果与回滚改为 CM6 的 replaceSelection（并记录原文用于 undo）。
- [x] `HistoryPanel.tsx:30-44` 回滚/重播改为 `cm6Write().setText(md)`。
- [x] `Toolbar.tsx:34-38` AI 面板取选区（两模式都坏，顺手修）。
- 验证：插入对话框、AI 润色、历史回滚在 CM6 下全部生效。

### 任务 S0-7：CM6 保活与状态栏恢复
**文件：** `src/components/editor/LZEditor.tsx`、`src/components/layout/StatusBar.tsx`

- [x] `LZEditor.tsx:927` 的 `useCM6 ? <CM6Editor/> : <EditorContent/>` 改为 CM6 始终挂载、用 `display` 切换可见（切到阅读/代码/历史模式时 `getCM6Editor()` 不能变 null）。
- [x] `StatusBar.tsx:121-130` 去掉 `!useCM6` 隐藏条件——光标行/列已正常上报。
- 验证：在阅读/代码模式下工具栏按钮仍生效；状态栏光标位置实时显示。
### 任务 S0-8：边界静态断言测试

- [x] 新增 `tests/cm6-core-boundary.test.mjs`，静态断言：CM6Editor 写 docsMd/md/html、updateDoc 合并 docsMd、addVersion 按 md 去重、store 无 TipTap HTML 往返、图片 handler 非 null、查找走 SearchQuery、FormatCommand 覆盖 underline/highlight/sup/sub/clear/math/footnote/toc/strikethrough、命令名映射无静默吞动作、AI/历史/插入对话框接入 CM6、LZEditor 用 display 保活。

**实现偏差记录（实际做法与计划不同之处）：**

- S0-4 的 `emoji` 未做成 FormatCommand：`EmojiDialog` 已给出最终文本，直接走 `cm.insertText(text)`，不进命令表。
- S0-6 未新增 `registry.ts` 的 `cm6Write()` 包装：`getCM6Editor()` 已是统一出口，各处直接调用；未接入的降级路径统一为「静默走 TipTap 分支」。
- S0-4 表格单元格级操作（增删行列/合并/拆列）在 CM6 模式下不支持：CM6 表格是 markdown 源文本，`tableAction` 只保留「插入表格」，单元格操作走原 TipTap 分支（CM6 模式无表格插件，按钮不可用）。
- S0-4 图片 `align` 参数在 CM6 模式下忽略（markdown 图片无对齐语义），待 S1 阶段补齐。
- S0-5 使用了 @codemirror/search v6.7.2 实际导出的 `findNext`/`findPrevious`/`replaceNext`/`replaceAll`（v6.7.2 无 `selectNextSearchResult`/`replaceSelection` 导出）；命中数用 `getSearchQuery` + 全文匹配计算。

## Stage 1 — 设置项真实生效（并行实现遗留的空壳 setter 补齐）

**前置：** 并行会话提交的 CM6 内核中，`CM6Editor.tsx` 已把 settings 全部接到 `editor.set*()`，但 `editor.ts` 里多数 setter 只改一个模块级 `current*` 变量、或只切 CSS class，实际不生效。本阶段把它们全部接到 CodeMirror 的 `Compartment` / facet。

### 任务 S1-1：Compartment 化六个可开关扩展
**文件：** `src/components/editor/codemirror/editor.ts`

- [x] 新增 7 个 `Compartment`：`lineNumbersC / tabSizeC / wrapC / typewriterC / currentLineC / livePreviewC / continuationC`。
- [x] `setLineNumbers`：`lineNumbersC.reconfigure(on ? lineNumbers() : [])`（原实现只记变量）。
- [x] `setSoftWrap`：`wrapC.reconfigure(on ? EditorView.lineWrapping : [])`，保留原 CSS class 切换作为兜底。
- [x] `setCurrentLine`：`currentLineC.reconfigure(on ? [highlightActiveLine(), highlightActiveLineGutter()] : [])`。
- [x] `setTypewriter`：`typewriterC.reconfigure(on ? typewriterExtension : [])` + 原 scroll listener 挂卸。
- [x] `setLivePreview`：`livePreviewC.reconfigure(on ? livePreviewExtension : [])`——此前实时预览扩展完全没被使用。
- [x] `setTabSize`：`tabSizeC.reconfigure(EditorState.tabSize.of(n))`，越界钳到 1–16，未变化时不 dispatch。
- [x] keymap 拆分：`undoKeymap`（Mod-z / Mod-Shift-z）常驻；`continuationKeymap`（Enter 续写有序/无序/任务列表）受开关控制。
- [x] 扩展数组初值对齐 settingsStore 默认值（行号关、软换行开、当前行高亮开、续写开、打字机关、实时预览关、缩进 2），并同步模块级 `current*` 初值，避免首次挂载空跑一次 dispatch。

### 任务 S1-2：snippets 补全链路接通
**文件：** `src/components/editor/codemirror/editor.ts`、`complete.ts`

- [x] 装入 `completionSetup([snippetSource])` + `snippetTabKeymap` + `snippetDataField`。
- [x] 创建编辑器时一次性 `setSnippetImpl(snippetCompletionSource())`：`snippetSource` 委派给模块级实现，不装配则补全永远返回 null。
- [x] `setSnippets(list)` 改为 `dispatch({ effects: setSnippetDataEffect({ snippets: list }) })`（原实现丢弃参数）。
- [x] `complete.ts` 中 snippet 的 `type: 'text'` → `'snippet'`：Tab keymap 判断 `selectedCompletion().type === 'snippet'`，原值导致 Tab 键永远无法接受补全。

### 任务 S1-3：实时预览样式接入设计 token
**文件：** `src/styles/app.css`

- [x] `.cm6-editor-container` 定义 `--lz-primary: var(--color-primary)`、`--lz-outline-variant: var(--color-border-soft)`、`--lz-inline-code-bg: var(--color-bg-secondary)`，live-preview 的 baseTheme 才能随明暗主题走。

### 任务 S1-4：设置面板新增「编辑器内核」区块
**文件：** `src/components/panels/settings/EditorSettingsTab.tsx`

- [x] 新增区块并置于首位：内核开关（`useCM6Editor`，关闭即回退 TipTap）、当前行高亮、自动换行、回车续写列表、括号自动配对、实时预览、缩进大小（2/4/8 segmented）。
- [x] 与旧区块去重：行号、拼写检查、打字机模式沿用既有行，不重复添加。

### 任务 S1-5：边界静态断言补齐
**文件：** `tests/cm6-core-boundary.test.mjs`

- [x] 追加断言：Compartment 必须存在；六个 setter 必须走 `reconfigure`；`setTabSize` 不能是空实现；`setSnippets` 不能丢参数；snippet `type` 必须为 `'snippet'`；设置面板必须暴露 7 个内核相关键。

**实现偏差记录（实际做法与计划不同之处）：**

- CM6 的 `Facet.of()` 返回 Extension 而不是 `StateEffect`，缩进大小无法用 `dispatch({ effects })` 改，只能走 Compartment reconfigure（与其余开关写法统一）。
- 实时预览的图片 resolver（`setLivePreviewImages`）未接：截图与本地图片在 `image-input.ts` 里已全部转成 `data:` URL，live-preview 原生支持 `data:image/`，相对路径图片在 CM6 下没有文件服务器可解析，暂不实现。
- `autoCompleteMarkdownPairs`（旧内核设置）与 `autoPair`（CM6）保持分离：新增的「输入括号时自动配对」只写 `autoPair`，未与旧设置合并，避免切换内核时互相覆盖。
- 缩进大小只作用于 Tab 键与空白宽度（`EditorState.tabSize` facet），未做额外智能缩进——markdown 不需要。
- CM6 下表格仍无单元格级操作（见 S0-4 偏差），本阶段未补。

## Stage 2 — 移除 TipTap（待用户验收 Stage 0/1 后再动）

- [ ] S2-1 删除 `LZEditor.tsx` 的 TipTap 实例、`EditorContent` / `BubbleMenu` 与 `useCM6` 渲染分支，编辑器容器只挂 `CM6Editor`。
- [ ] S2-2 删除 `src/components/editor/extensions/`（8 文件），`package.json` 移除 `@tiptap/*`（13 包）与 `@memfoldai/tiptap-search-and-replace`，重装依赖。
- [ ] S2-3 `editorStore` 去掉 TipTap `Editor` 类型依赖，类型改为 markdown 事实源；`SidebarOutline.tsx` 改从 `docsMd` 解析 heading。
- [ ] S2-4 `useAI.ts` 去掉 `@tiptap/ai-toolkit`，提示词与工具调用走纯文本接口。
- [ ] S2-5 删除 `editorActions.tsx` / `SearchPanel.tsx` 中的 CM6 分支判断与 TipTap 降级路径，统一 CM6。
- [ ] S2-6 清理重复定义：`codemirror/types.ts` 与 `codemirror/registry.ts` 内容重复，二选一。
- [ ] S2-7 `vite.config.ts` 的 `vendor-tiptap` manualChunks 改为 `vendor-codemirror`，验证主 chunk 体积下降。
