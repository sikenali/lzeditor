# 全量缺陷修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复审计中确认的 14 个高优先级缺陷与全部中等问题，且不破坏已实现功能。

**Architecture:** 按子系统分批修改：AI/模型设置、Electron/IPC、编辑器命令、导出、阅读分页、文档库、弹窗校验、设置消费。每批完成后跑 typecheck + 相关测试；全部完成后跑 build + 全量测试。

**Tech Stack:** React + Zustand + CodeMirror 6 + Milkdown + Electron + node:http。

**Spec:** 本文件即修复清单（来源：本次审计报告）。

## Global Constraints

- 不改动已有通过的功能语义；所有改动必须保持 typecheck、build、现有测试全绿。
- 前端优先复用既有纯函数/工具（`docImport`、`mdOutline`、`mdToHtml`、`exportService`）。
- Electron 改动必须同时兼容浏览器 dev（无 `electronAPI`）。
- 新增/修改的行为要有测试或可复现的验证命令。

## Review Focus

- AI 端点拼接：不能把已有版本段（`/v2`、`/v4`、`/v1beta/openai`）再拼成 `.../v1/...`。
- Electron 打包态：`file://` 下不能依赖 `/api` 代理。
- 导出：目录锚点必须与正文标题 id 一致；页码/纸张要在 PDF/HTML/DOCX 真正生效。
- 编辑器：代码模式插入块命令不能把 `# `/`- ` 插到行中。
- 设置：开关必须真的改变对应模式的可见行为，不能只写 store。

---

### Task 1: AI 端点、模型测试与 Key 开关

**Files:** `src/hooks/useAI.ts`、`src/components/panels/settings/ModelSettingsTab.tsx`、`src/store/settingsStore.ts`、`tests/ai-endpoint.test.mjs`

- [ ] 新增纯函数 `resolveApiUrl(endpoint, path)`：去掉末尾 `/`；若已以目标 path 结尾则原样；否则拼接 `/<path>`。用于 chat/completions、models、messages。
- [ ] `useAI.ts` 的 OpenAI/Anthropic 分支改用该函数；Anthropic 也支持流式或保持现状但 URL 正确。
- [ ] 测试连接按钮改用同一函数；`testingKey` 非空时禁用所有测试按钮。
- [ ] `startEdit` 清除该 key 的 testSuccess/testFailed/testError。
- [ ] `toggleApiKey` 关闭当前选中 key 时，自动改选下一个 enabled 且 key 非空的条目；`useAI` 的 `activeKey` 只取 enabled 且 key 非空的条目。
- [ ] 测试：`resolveApiUrl('https://qianfan.baidubce.com/v2','chat/completions')` → `.../v2/chat/completions`；Google、OpenAI、DeepSeek 各一例。

### Task 2: Electron 文件关联与版本历史

**Files:** `electron/main.ts`、`electron/preload.ts`、`electron/api.ts`、`src/services/versionApi.ts`、`package.json`

- [ ] `second-instance`：先校验扩展名，再 `allowedPaths.add(resolve(file))`，再发事件；同时处理首启 `process.argv` 与 macOS `open-file`。
- [ ] `ALLOWED_FILE_EXT` 增加 `.mdown`、`.mkd`，与 `docImport` 对齐。
- [ ] 新增 IPC `versions:save` / `versions:list`，主进程用 `app.getPath('userData')/versions.json` 存最近 10 条，逻辑与 server 一致（去重、cap 10）。
- [ ] `versionApi`：有 `electronAPI.versionsSave/versionsList` 时走 IPC，否则走 `/api/versions`。
- [ ] `electron:dev` 同时启动 `dev:server`（浏览器 dev 的 `/api` 代理可用）。
- [ ] 测试：纯函数版本的版本存储逻辑（可在 server 侧已有；至少保证 typecheck 与手动 IPC 契约一致）。

### Task 3: 编辑器命令一致性

**Files:** `src/components/layout/Toolbar.tsx`、`src/components/sidebar/LeftNav.tsx`、`src/components/layout/editorActions.tsx`、`src/components/editor/facade/cm6/cm6-commands.ts`、`src/components/editor/facade/cm6/cm6-extensions.ts`、`src/components/editor/facade/milkdown/MilkdownEditorFacade.ts`、`src/components/panels/SearchPanel.tsx`、`src/additional/milkdown/textus/editor/keys/format-shortcut-plugin.ts`

- [ ] 图片/链接按钮统一走 `formatAction('image'|'link')`（会切回编辑模式）。
- [ ] `runMapped` 在无 facade 且非 edit/code 时切回编辑并轮询等待 facade（上限 ~2s），再执行命令。
- [ ] CM6 `insert.heading*`/`insert.section`/`insert.quote`/`insert.bullet-list`/`insert.numbered-list`/`insert.task`：空选区且当前行有内容时改写当前行前缀（与 Milkdown 一致）；空行则插入前缀。分割线/代码块/表格仍按块插入并保证行首。
- [ ] CM6 增加 Mod-B/Mod-I 快捷键（复用 `wrapSelection`），空选区插入标记并把光标放中间。
- [ ] Milkdown `block.convert.heading` 改为 level 2（与 CM6 `## ` 一致）；补 `block.duplicate`、`block.insert-below`。
- [ ] Milkdown 增加 Ctrl/⌘+Alt+1..6 标题快捷键。
- [ ] `SearchPanel` 允许空替换词：去掉 `!replaceTerm` 早退与按钮禁用里的该项。
- [ ] 更新 `tests/cm6-commands.test.mjs` 与新增快捷键/插入测试。

### Task 4: 导出正确性

**Files:** `src/services/exportService.ts`、`src/services/docxGenerator.ts`、`src/services/epubGenerator.ts`、`src/components/panels/ExportDialog.tsx`、`src/components/panels/StyleMainPanel.tsx`

- [ ] `buildTOC` 读取标题现有 `id`，没有则注入并生成；`href` 用该 id，保证可跳转。
- [ ] `addPageNumbers` 改为真正的分页页码：PDF 用 jsPDF 每页写页码；HTML 用 `@page` + `counter(page)`（不可用时保留页脚说明）。同时注入 `@page { size: <paper> <orientation> }`。
- [ ] DOCX `sectPr` 按 paperSize/orientation 计算 `w:pgSz`。
- [ ] DOCX/EPUB 接收并应用 typography 选项（字体、字号、行高、缩进、对齐、代码主题尽量）。
- [ ] EPUB 仅在 `includeTOC` 时生成 nav.xhtml 并写入 manifest/spine。
- [ ] MD 导出：源已有 H1 时不再前置 `# title`。
- [ ] 导出前把 Mermaid/ECharts 渲染成静态 SVG/图片再序列化（用 `renderMermaidBlocks`/`renderEchartsBlocks` 后取 `innerHTML`；canvas 转 img）。
- [ ] 导出使用与预览一致的 `styleId → typographyTheme` 映射。
- [ ] HTML/EPUB 补 `.ln/.lc` 行号样式；DOCX 代码块跳过 `.ln` 文本。
- [ ] 测试：TOC 锚点、MD H1、EPUB nav 条件、DOCX pgSz 的纯函数/字符串断言。

### Task 5: 阅读模式分页

**Files:** `src/components/editor/ReadMode.tsx`

- [ ] `measure` 依赖加入 `readFontSize`（以及行高若影响）；字号变化触发重新分页。
- [ ] 验证：改字号后 `pages` 重算（纯逻辑测试或断言依赖数组包含 readFontSize）。

### Task 6: 文档库 / 导入 / 历史

**Files:** `src/components/panels/LibraryPanel.tsx`、`src/utils/docImport.ts`、`src/store/editorStore.ts`、`src/components/panels/HistoryPanel.tsx`

- [ ] 弹窗 `LibraryTree` 传入重命名三件套。
- [ ] 本地导入改用 `importSingleFile`/`importFolderFiles` 的校验与错误处理；path 用 `webkitRelativePath` 的目录（无则空串），不再把文件名当目录。
- [ ] 导入后把新文件夹加入 `expandedFolders`（默认展开）。
- [ ] `switchDoc` 重置 `mdContent`/`docHTML` 到目标文档（或空），避免旧内容残留。
- [ ] `closeDoc` 删除 `lzeditor-doc-{id}`。
- [ ] 历史 hydration 改为本地+服务器合并（按 id 去重，保留本地）。
- [ ] 测试：store 行为（switchDoc/closeDoc/版本合并）。

### Task 7: 弹窗校验与取消语义

**Files:** `src/components/panels/LinkDialog.tsx`、`src/components/panels/ImageDialog.tsx`、`src/components/panels/ChartDialog.tsx`、`src/components/panels/CodeDialog.tsx`、`src/components/panels/TableDropdown.tsx`、`src/App.tsx`

- [ ] 链接/图片 URL 校验（允许 http(s)/相对路径/data 图片），非法时禁用确认并提示。
- [ ] App 新标签插入的 label 做 HTML 转义。
- [ ] 图表数据/标签解析校验，非法值禁用插入并提示。
- [ ] CodeDialog 取消时恢复打开前的 codeTheme/macCodeBlock。
- [ ] 切换表格类型保留现有单元格文本。
- [ ] 测试：校验纯函数/字符串断言。

### Task 8: 设置消费与恢复默认

**Files:** `src/components/editor/MilkdownEditor.tsx`、`src/additional/milkdown/textus/**` CSS、`src/styles/read-mode.css`、`src/components/panels/SettingsDialog.tsx`、`src/store/settingsStore.ts`、`src/components/sidebar/LeftNav.tsx`、`src/components/panels/settings/LayoutSettingsTab.tsx`

- [ ] Milkdown：应用 spellcheck/lang、tab-size、首行缩进、两端对齐；行高变量在阅读/预览生效。
- [ ] 左侧导航模式下「显示常用格式按钮」要么在 LeftNav 生效，要么在设置里隐藏该项。
- [ ] 「恢复默认」重置除 API Key 外的全部设置（含字体/字号/行高/宽度/段落/开关）。
- [ ] 测试：reset 后关键字段等于 DEFAULT_SETTINGS；Milkdown 设置消费的源码断言。

### Task 9: 全量验证

- [ ] `npm run typecheck` exit 0
- [ ] `npm test` 0 fail
- [ ] `npm run build` exit 0
- [ ] 提交（仅本会话改动文件）
