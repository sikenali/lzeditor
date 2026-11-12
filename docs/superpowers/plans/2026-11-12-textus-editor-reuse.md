# Textus 编辑器复用（A2 精简核心）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Textus 的写作画布核心源码 vendor 进 `src/additional/milkdown/textus/`，替换现有 94 行 Milkdown 薄封装，保持 `md`/`onChange`/`readonly` 接口与 `wysiwyg` 并存，写作体验对齐 Textus、markdown 往返不失真。

**Architecture:** 从 `github.com/CatVinci-Studio/Textus`（shallow clone 在 `/tmp/opencode/textus`，只读参照）拷贝 `src/editor/**` + 纯逻辑 `utils/lazy/clipboard/i18n/prefs` 到 `src/additional/milkdown/textus/`，按固定规则改写相对 import：目标落在 vendor 根内→保留；落在被排除的 `platform/ui/storage/ai/plugins`（除 slash-commands）/`theme`→改指向 lzeditor 侧 `shim/`。`withEditorCore` 装配按 B6 裁剪；新 `MilkdownEditor` 采用 `readSourceBlocks`/`writePreservingSource` 受控流（B3）。CSS vendor 并作用域化（B1）。

**Tech Stack:** React 19 + Vite 5 + TypeScript 5.5 + `@milkdown/kit`/`@milkdown/react` ^7.23.0（与 Textus 同版本）+ ProseMirror + remark/micromark。

**Spec:** `docs/superpowers/specs/2026-11-12-textus-editor-reuse-design.md`

## Global Constraints

- **vendor 根**：`src/additional/milkdown/textus/`（下称 `V`）。Milkdown/ProseMirror 只许 `src/additional`（`tests/cm6-core-boundary.test.mjs`），本计划全部落在 `V`，不碰主 `src`。
- **参照源**：`/tmp/opencode/textus`（只读）。KEEP 闭包 = 146 个 `src/editor/**` + 33 个纯逻辑外部文件（见 Spec §Builder check B4 与探索报告）。**不 vendor**：`src/ai/**`、`src/plugins/**`（除 `contributions/slash-commands.ts`）、`src/export/**`、`src/platform/**`、`src/ui/**`、`src/storage/**`、`src/theme/**`（TS）、`src/document-view/**` 帧外件、`src/settings|app|document/**`。
- **import 改写规则（对所有 vendor 文件）**：
  1. 相对 import 解析到 `V` 内 → 原样保留（重定位到对应 `V` 子路径）。
  2. 相对 import 解析到被排除模块（platform/ui/storage/ai/plugins(除 slash-commands)/theme/editor 内被剔文件）→ 改写为指向 `V/shim/<模块>.ts` 的对应具名导出（shim 提供该符号的最小实现或 no-op）。
  3. 裸 import 是 npm 包 → 保留；是 Textus 内部别名/路径别名（如有）→ 改写为 `V` 内路径。
- **被剔除的编辑器特性**（其 import 一律指向 shim no-op）：typewriter、zen、note-embed、obsidian-embed-preview、lazy-blocks（`lazyBlocksPlugin`/`withLazyBlockViews`/`drawAround`/`drawAllBlocks`）、diagram-engine 的 chart/pele 部分、`render-html.ts` 的 `marked` 用法。
- **`noDiskImages` 模式**：`withEditorCore` 走 `"noDiskImages" in options` 分支 → `createUndoFilePlugin`/`createImagePlugin`/`createLinkClickPlugin`/`createLinkHoverPlugin` **不安装**（运行时惰性）；其文件仍在闭包内但 import 必须解析（经 shim）。
- **npm 新增依赖**（精确版本取 Textus `package.json`，见 Spec §决定5/B7）：`remark-cjk-friendly`、`remark-cjk-friendly-gfm-strikethrough`、`remark-frontmatter`、`remark-math`、`prosemirror-highlight`、`tiny-pinyin`、`micromark-util-chunked`、`micromark-util-classify-character`、`micromark-util-resolve-all`、`micromark-util-types`、`mdast-util-from-markdown`、`mdast-util-to-markdown`、`decode-named-character-reference`、`@codemirror/lang-html`、`@codemirror/language-data`、`refractor`。**不加** `marked`、`@tauri-apps/*`、`pele`。
- **完成判据**：`npm run typecheck`、`npm test`（含 cm6-core-boundary）、`npx vite build` 全过；手测清单（Review Focus）满足。
- 每个 vendor 任务结束运行 `node scripts/check-textus-vendor.mjs`（Task 1 建），须 PASS。

## Review Focus

- **中文/IME 输入**：composition-prune-guard、linux-ime-enter、cjk-friendly 必须生效；手测中文输入不吞字/不重复。
- **markdown 往返保真**：外部 `md` 写入（切文档/导入/程序写）后序列化不退化——由 Task 6 的往返测试钉住（source 重派生）。
- **WYSIWYG 与 CM6 并存**：`wysiwyg` 开关切换不破坏 CodeMirror；两模式共享同一 `md`。
- **粘贴保真**：纯文本/HTML 粘贴进 WYSIWYG 结果与 Textus 一致（paste-markdown/paste-html）。
- **cm6-core-boundary**：新增文件全在 `src/additional`，测试仍过。

---

### Task 1: 新增 npm 依赖 + vendor import 检查脚本

**Files:**
- Modify: `package.json`（dependencies）
- Create: `scripts/check-textus-vendor.mjs`
- Test: `tests/textus-vendor-closure.test.mjs`

**Interfaces:**
- Produces: `node scripts/check-textus-vendor.mjs` —— 遍历 `src/additional/milkdown/textus/**/*.{ts,tsx}`，收集所有相对 import 与裸 import；对每条相对 import 解析，断言其落在 `V` 内**或**命中 `V/shim/**`（不存在时警告不失败，Task 3 起改为硬失败）；对裸 import 断言在「npm 允许表」（package.json dependencies + devDependencies 的键）内。退出码 0/非 0。供后续任务做每任务门禁。

- [x] **Step 1: 写失败测试**

```js
// tests/textus-vendor-closure.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
test('vendor 闭包 import 全部可解析（npm 依赖已在 package.json）', () => {
  assert.doesNotThrow(() => execFileSync('node', ['scripts/check-textus-vendor.mjs'], { stdio: 'pipe' }))
})
```

- [x] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/textus-vendor-closure.test.mjs`
Expected: FAIL（脚本不存在 → ENOENT）

- [x] **Step 3: 在 `package.json` dependencies 追加 Task 1 依赖清单**

在 `dependencies` 追加：`remark-cjk-friendly@^2.3.2`、`remark-cjk-friendly-gfm-strikethrough@^2.3.1`、`remark-frontmatter@^5.0.0`、`remark-math@^6.0.0`、`prosemirror-highlight@^0.16.0`、`tiny-pinyin@1.3.2`、`micromark-util-chunked@^2.0.1`、`micromark-util-classify-character@^2.0.1`、`micromark-util-resolve-all@^2.0.1`、`micromark-util-types@^2.0.0`、`mdast-util-from-markdown@^2.1.0`、`mdast-util-to-markdown@^2.2.1`、`decode-named-character-reference@^1.3.0`、`@codemirror/lang-html@^6.4.12`、`@codemirror/language-data@^6.5.2`、`refractor@^5.0.0`。运行 `npm install`。

- [x] **Step 4: 实现 `scripts/check-textus-vendor.mjs`**

逻辑见 Interfaces.Produces。npm 允许表 = `Object.keys(require('./package.json').dependencies)` ∪ devDependencies。相对 import 目标解析用 `path.resolve`；`V` 内相对 import 未解析到存在文件 → FAIL；裸 import 不在允许表 → FAIL；指向 `V/shim/**` 的 import 在 Task 3 前为 WARN（文件可能尚未建），Task 3 起由脚本常量 `STRICT_SHIMS=true` 硬失败（实施者改该常量）。

- [x] **Step 5: 运行确认通过**

Run: `node --import tsx --test tests/textus-vendor-closure.test.mjs`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/check-textus-vendor.mjs tests/textus-vendor-closure.test.mjs
git commit -m "chore(textus): add editor-core deps + vendor import gate"
```

---

### Task 2: vendor 纯逻辑支撑模块 + shim 基础

**Files:**
- Create: `V/`（目录树）下，来自 `/tmp/opencode/textus`：
  - `V/utils/*`：`error-explain.ts`、`error-text.ts`、`events.ts`、`hash.ts`、`html.ts`、`ime.ts`、`list-filter.ts`、`markdown-math.ts`、`memory-idle.ts`、`nav-history.ts`、`note-link.ts`、`path.ts`、`pinyin.ts`、`regexp.ts`、`search-fold.ts`
  - `V/lazy/lazy-module.ts`；`V/clipboard/copied.ts`、`V/clipboard/copied-plugin.ts`
  - `V/i18n/`：`current.ts`、`langs.ts`、`locales/en.ts`、`names.ts`、`plural.ts`、`strings.ts`
  - `V/prefs/`：`settings-types.ts`、`settings-values.ts`、`shortcut-defaults.ts`
  - `V/shim/`：`platform-ipc.ts`、`platform-os.ts`、`platform-capabilities.ts`、`platform-file-src.ts`、`platform-ios-files.ts`、`platform-ipc-files.ts`、`platform-window-folder.ts`、`platform-update-channel.ts`、`platform-ai-gate.ts`、`platform-events.ts`、`settings-context.ts`、`settings-store.ts`、`storage.ts`、`ui-select.ts`、`ui-floating-list.ts`、`ui-presence.ts`、`ui-app-dialog.ts`、`ui-chrome-scale.ts`、`ui-icons.tsx`、`ui-motion.ts`、`ui-placement.ts`、`ui-zoomed-rects.ts`、`plugin-records.ts`、`ai-gate.ts`

**Interfaces:**
- Consumes: Task 1（check 脚本、npm 允许表）
- Produces: `V/shim/*` 的具名导出（no-op/最小实现），供 Task 3–5 改写 import 指向。

- [x] **Step 1: 拷贝并改写 import（按 Global Constraints 规则 1–3）**

把上列文件从 `/tmp/opencode/textus` 拷到 `V` 对应路径；`V/utils/*` 内互相引用改相对路径；`V/i18n/langs.ts` 的 locale 引用保持。`V/prefs/settings-types.ts` 仅保留 `type Settings`、`type DiagramEngine`、`type ImageNamingMode`、`type UpdateChannel` 等类型形状（值/defaults 用 `settings-values.ts` 最小集），**不**引 storage/platform。

- [x] **Step 2: 实现 `V/shim/*`**

按探索报告 §5 的符号需求，为每个 shim 导出最小实现或 no-op（例：`platform-os.ts` → `export const modIsMeta=()=>false`、`export const isLinuxPlatform=false`、`isMacPlatform=false`；`ui-motion.ts` → `motionAllowed=true`、`duration=200`、`animate=()=>{}`、`glideScroll=()=>{}`；`plugin-records.ts` → `export function windowInfo(){return {strings:()=>({completionCommands:""})}}`；`settings-context.ts` → `export type Settings=…` + `export const useSettings=()=>({t:(k)=>k,settings:{}}) `）。签名以探索报告为准。

- [x] **Step 3: 运行 import 门禁**

Run: `node scripts/check-textus-vendor.mjs`
Expected: PASS（此任务不含 `V/editor/**`，脚本仅校验已存在文件）

- [x] **Step 4: Commit**

```bash
git add src/additional/milkdown/textus scripts/check-textus-vendor.mjs
git commit -m "feat(textus): vendor utils/lazy/clipboard/i18n/prefs + shims"
```

---

### Task 3: vendor `src/editor` 基础（markdown/html/序列化）

**Files:**
- Create（来自 `/tmp/opencode/textus`）：`V/editor/markdown/**`（39 文件，见探索报告 §1）、`V/editor/html/**`（8 文件）、`V/editor/change-source.ts`、`V/editor/changed-ranges.ts`、`V/editor/extension-points.ts`、`V/editor/large-doc.ts`、`V/editor/live-selection.ts`、`V/editor/prosemirror-speedups.ts`、`V/editor/read-only-plugin.ts`、`V/editor/reveal-position.ts`、`V/editor/reveal-state.ts`、`V/editor/draw-when-visible.ts`、`V/editor/pointer-hold.ts`、`V/editor/placeholder-plugin.ts`
- Modify: `V/shim/*`（补齐本轮触及的符号）

**Interfaces:**
- Produces: `V/editor/markdown/source-preserving.ts` 的 `readSourceBlocks`/`writePreservingSource`/`openedParseRecorder`；`V/editor/markdown/reduced-presets.ts` 的 `commonmarkWithoutMarks`/`gfmWithoutStrikethrough`；`V/editor/extension-points.ts` 的 `addCompletionSource` 等。供 Task 6 wrapper 用。

- [x] **Step 1: 拷贝 markdown/ + html/ 并改写 import**

按规则 1–3。`V/editor/markdown/render-html.ts` **裁剪 `marked` 用法**（B7：只留非 marked 的 HTML 工具，或降级为 `(html)=>html` 的极简实现；如裁剪后无人引用再整体剔除并同步 `V/shim`）。`V/editor/markdown/reduced-presets.ts` 的 `isLinuxPlatform` 指向 `V/shim/platform-os`。

- [x] **Step 2: 拷贝顶层序列化/基础文件并改写 import**

`change-source.ts`、`changed-ranges.ts`、`extension-points.ts`、`large-doc.ts`、`live-selection.ts`、`prosemirror-speedups.ts`、`read-only-plugin.ts`、`reveal-position.ts`（其 `drawAround` 指向 shim）、`reveal-state.ts`、`draw-when-visible.ts`（`drawAllBlocks` 指向 shim）、`pointer-hold.ts`、`placeholder-plugin.ts`。

- [x] **Step 3: 运行 import 门禁（STRICT_SHIMS=true）**

Run: `node scripts/check-textus-vendor.mjs`
Expected: PASS（shim 符号需覆盖本轮；缺失报 FAIL 则补齐 shim）

- [x] **Step 4: Commit**

```bash
git add src/additional/milkdown/textus/editor scripts/check-textus-vendor.mjs
git commit -m "feat(textus): vendor markdown/html/serialization core"
```

---

### Task 4: vendor 输入/标记/数学/emoji

**Files:**
- Create（来自 `/tmp/opencode/textus`）：`V/editor/keys/**`（15 文件）、`V/editor/marks/**`（15 文件）、`V/editor/math/**`（7 文件）、`V/editor/emoji/**`（4 文件 + `shortcodes.json`）
- Modify: `V/shim/*`（补齐符号，如 `ui-motion`、`ui-placement`、`platform-os`）

**Interfaces:**
- Produces: `V/editor/math/math-schema.ts` 的 `mathInlineSchema`/`mathBlockSchema`；`V/editor/marks/md-span-schema.ts`；`V/editor/emoji/emoji-completion.ts` 的 `addEmojiCompletion`。

- [x] **Step 1: 拷贝 keys/ 并改写 import**

`block-keys-plugin.ts`、`block-join-plugin.ts`、`bracket-autopair-plugin.ts`、`composition-prune-guard-plugin.ts`、`drag-autoscroll-plugin.ts`、`format-shortcut-plugin.ts`、`ime.ts`、`inline-source-plugin.ts`、`keyboard-reveal-plugin.ts`、`linux-ime-enter-plugin.ts`（`isLinuxPlatform`→shim）、`mac-navigation-plugin.ts`（`isMacPlatform`→shim）、`margin-click-plugin.ts`、`move-block-plugin.ts`、`select-all.ts`、`tab-extend-plugin.ts`。

- [x] **Step 2: 拷贝 marks/ + math/ + emoji/ 并改写 import**

`marks/*`（含 `highlight-syntax.ts` 的 micromark 依赖）、`math/*`（`katex-bundle.ts`/`katex-loader.ts`）、`emoji/*`（含 `shortcodes.json` 拷贝）。`math/math-preview-plugin.ts` 的 `ui-motion`/`ui-placement` 指向 shim。

- [x] **Step 3: 运行 import 门禁**

Run: `node scripts/check-textus-vendor.mjs`
Expected: PASS

- [x] **Step 4: Commit**

```bash
git add src/additional/milkdown/textus/editor/keys src/additional/milkdown/textus/editor/marks src/additional/milkdown/textus/editor/math src/additional/milkdown/textus/editor/emoji
git commit -m "feat(textus): vendor keys/marks/math/emoji"
```

---

### Task 5: vendor 剪贴板/图片/代码/表格/补全/悬停/查找/其余编辑器文件

**Files:**
- Create（来自 `/tmp/opencode/textus`）：`V/editor/clipboard/**`（9）、`V/editor/images/**`（9）、`V/editor/code/**`（7）、`V/editor/tables/**`（4）、`V/editor/completion/**`（5）、`V/editor/hover/**`（4）、`V/editor/embeds/embed-sources.ts`、`V/editor/find/find-replace-plugin.ts`、`V/editor/mermaid-plugin.ts`、`V/editor/diagram-zoom.ts`、`V/editor/diagram-zoom.css`、`V/editor/pending-diagram.ts`、`V/editor/undo-file.ts`、`V/editor/editor-extensions.ts`（本轮仅拷贝，Task 6 裁剪）、`V/editor/code/code-language-picker.tsx`
- Create: `V/plugins/contributions/slash-commands.ts`（来自 `/tmp/opencode/textus/src/plugins/contributions/slash-commands.ts`）
- Modify: `V/shim/*`

**Interfaces:**
- Produces: `V/editor/completion/completion-plugin.ts` 的 `createCompletionPlugin`；`V/editor/code/syntax-highlight-plugin.ts`；`V/editor/tables/table-hover-view.ts`。

- [ ] **Step 1: 拷贝 clipboard/ + images/ 并改写 import**

`clipboard/*`（`paste-plain.ts` 的 `clipboardIpc`/`modIsMeta`→shim）、`images/*`（`image-store.ts`/`missing-image.ts`/`picture-clipboard.ts`/`rooted-image.ts`/`image-plugin.ts` 的 `fs`/`webAssets`/`exportDoc`/`canPickImageFile`/`fileSrc`/`isScopedUrl`→shim）。

- [ ] **Step 2: 拷贝 code/ + tables/ + completion/ + hover/ + 其余并改写 import**

`code/code-language-picker.tsx`（`Select`/`SelectMenu`/`useFloatingList`/`useMergedRef`/`usePresence`/`isIOSApp`→shim）、`completion/*`（`ui-placement`/`clampLeft`/`opensBelow`→shim）、`hover/*`（`ui-chrome-scale`/`ui-zoomed-rects`/`ui-motion`/`windowFolder`/`fs`/`scaledPx`/`zoomedRectScale`→shim）、`tables/*`（`ui-icons`→shim）、`mermaid-plugin.ts`（`DIAGRAM_LANGUAGES`/`appearanceIsDark`/`diagramRenderer`/`mermaidTheme` 经 `V/shim/diagram-engine`）、`pending-diagram.ts`/`diagram-zoom.ts`（`ui-motion`→shim）、`undo-file.ts`（`undoFiles`→shim）、`embeds/embed-sources.ts`。

- [ ] **Step 3: 拷贝 slash-commands 并改写 import**

`V/plugins/contributions/slash-commands.ts`：`windowInfo()`→`V/shim/plugin-records`；其余相对 import 指向 `V/editor/extension-points`。

- [ ] **Step 4: 运行 import 门禁**

Run: `node scripts/check-textus-vendor.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/additional/milkdown/textus/editor src/additional/milkdown/textus/plugins
git commit -m "feat(textus): vendor clipboard/images/code/tables/completion/hover/find/mermaid"
```

---

### Task 6: 裁剪 `editor-extensions.ts` 装配 + mermaid-only diagram-engine

**Files:**
- Modify: `V/editor/editor-extensions.ts`（来自 Task 5 拷贝）
- Create: `V/shim/diagram-engine.ts`
- Test: `tests/textus-editor-extensions-trim.test.mjs`

**Interfaces:**
- Consumes: Task 3–5 全部 `V/editor/*` 与 `V/shim/*`。
- Produces: `withEditorCore(editor, options): Editor`，签名与 Textus 一致（`Editor` 为 `@milkdown/kit/core`），options 含 `{ settings, docPath, onImagePasteError, requestImageName } | { noDiskImages }`。

- [ ] **Step 1: 写失败测试**

```js
// tests/textus-editor-extensions-trim.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
test('装配不含被剔特性且走 noDiskImages', () => {
  const src = readFileSync('src/additional/milkdown/textus/editor/editor-extensions.ts', 'utf8')
  for (const sym of ['createTypewriterPlugin','zenFocusPlugin','createNoteEmbedPlugin','createObsidianEmbedPreviewPlugin','lazyBlocksPlugin','withLazyBlockViews']) {
    assert.equal(src.includes(sym), false, `装配不得再引用 ${sym}`)
  }
  assert.ok(src.includes('noDiskImages'))
})
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/textus-editor-extensions-trim.test.mjs`
Expected: FAIL（`editor-extensions.ts` 尚未裁剪，含 `createTypewriterPlugin`）

- [ ] **Step 3: 实现裁剪 + diagram-engine shim**

在 `V/editor/editor-extensions.ts`：剔除 `createTypewriterPlugin`/`zenFocusPlugin`/`createNoteEmbedPlugin`/`createObsidianEmbedPreviewPlugin`/`lazyBlocksPlugin`/`withLazyBlockViews` 的 import 与 `.use(...)`；`task-list-plugin.ts` 的 `TYPEWRITER_HOLD` 引用改 shim no-op。`createMermaidPreviewPlugin` 保留。`withEditorCore` 的 options 联合类型保留 `noDiskImages` 分支；`disk` 分支的四个插件（undo-file/image/link-click/link-hover）保留在代码但运行时走 `[]`。创建 `V/shim/diagram-engine.ts`：`export const DIAGRAM_LANGUAGES=['mermaid']`、`appearanceIsDark=()=>false`、`diagramRenderer`、`mermaidTheme`、`type DrawnDiagram`（最小）。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test tests/textus-editor-extensions-trim.test.mjs`
Expected: PASS

- [ ] **Step 5: 运行 import 门禁**

Run: `node scripts/check-textus-vendor.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/additional/milkdown/textus/editor/editor-extensions.ts src/additional/milkdown/textus/shim/diagram-engine.ts tests/textus-editor-extensions-trim.test.mjs
git commit -m "feat(textus): trim editor-extensions assembly to A2 core"
```

---

### Task 7: 新 MilkdownEditor wrapper（source-preserving 受控模型）

**Files:**
- Modify: `src/additional/milkdown/MilkdownEditor.tsx`（重写内部，保留对外 `{ md, onChange, readonly? }` 接口与 `MilkdownProvider`）
- Create: `V/editor/editor-factory.ts`（`buildEditor`：`Editor.make().config(configureEditorRoot).use(withEditorCore(...))`——按 B3 不用 `markdownUpdated`，改用 source 保真上报）
- Create: `V/editor/source-control.ts`（纯函数：`resolveExternalWrite(current: string, incoming: string): { replace: boolean }` 与 `recomputeSource(ctx, md, doc)`——可脱离 React 单测）
- Test: `tests/textus-source-control.test.mjs`

**Interfaces:**
- Consumes: `withEditorCore`（Task 6）、`readSourceBlocks`/`writePreservingSource`（Task 3）、`@milkdown/react` `useEditor`。
- Produces: `MilkdownEditor`（`{ md: string; onChange: (md: string)=>void; readonly?: boolean }`）。外部 `md` 变化：仅当 `writePreservingSource` 输出 ≠ `md` 时 `replaceAll(md)`，随后**重新** `readSourceBlocks` 派生 source。

- [ ] **Step 1: 写失败测试（外部写后须重派生 source 以保真）**

```js
// tests/textus-source-control.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveExternalWrite } from '../src/additional/milkdown/textus/editor/source-control'
test('外部 md 与当前保真输出不同才 replace，相同则 no-op', () => {
  assert.equal(resolveExternalWrite('# 同文', '# 同文').replace, false)   // 已流出，不重置光标
  assert.equal(resolveExternalWrite('# 旧文', '# 新文').replace, true)    // 外部真写入才替换
})
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/textus-source-control.test.mjs`
Expected: FAIL（`source-control.ts` 未建 → 模块找不到）

- [ ] **Step 3: 实现 `V/editor/source-control.ts` + `V/editor/editor-factory.ts` + 重写 wrapper**

`resolveExternalWrite(current, incoming)` 返回 `{ replace: current !== incoming }`（沿用现有"仅当不同才 replaceAll"语义）。`buildEditor(root, initialMd, opts)`：`Editor.make().config(ctx=>{ctx.set(rootCtx,root);ctx.set(defaultValueCtx,initialMd)}).use(withEditorCore(editor, { noDiskImages }))`，并挂 listener 仅用于 mounted（readonly 重设），**不用** markdownUpdated。wrapper 内：mount 时 `sourceRef = readSourceBlocks(ctx, initialMd, doc)`；`onChange` 经 `writePreservingSource(ctx, sourceRef.current, doc)` 上报；外部 `md` 变化时若 `resolveExternalWrite(...).replace` 为 true 则 `replaceAll(md)` 后 `sourceRef.current = readSourceBlocks(ctx, md, newDoc)`。`readonly` 经 `editable` 控制（沿用现有 `setProps`）。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test tests/textus-source-control.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/additional/milkdown/MilkdownEditor.tsx src/additional/milkdown/textus/editor/editor-factory.ts src/additional/milkdown/textus/editor/source-control.ts tests/textus-source-control.test.mjs
git commit -m "feat(textus): source-preserving controlled MilkdownEditor"
```

---

### Task 8: vendor/作用域化编辑器 CSS

**Files:**
- Modify: `src/additional/milkdown/milkdown.css`
- Create: `src/additional/milkdown/textus/theme/content-base.css`、`.../editor/milkdown-theme.css`、`.../theme/content-themes.css`、`.../editor/completion/completion-panel.css`、`.../editor/diagram-zoom.css`、`.../editor/hover/hover-card.css`
- Test: `tests/textus-css-scoped.test.mjs`

**Interfaces:**
- Produces: `src/additional/milkdown/textus/theme/*.css`，import 进 `MilkdownEditor.tsx`（含 `@milkdown/kit/prose/view/style/prosemirror.css`）。

- [ ] **Step 1: 写失败测试**

```js
// tests/textus-css-scoped.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
test('编辑器 CSS 全部作用域在 .textus-editor-shell 下', () => {
  const files = ['textus/theme/content-base.css','textus/editor/milkdown-theme.css','textus/theme/content-themes.css','textus/editor/completion/completion-panel.css']
  for (const f of files) {
    const css = readFileSync('src/additional/milkdown/' + f, 'utf8')
    assert.ok(!/^[^{]*\{[^}]*\}/m.test(css.replace(/\.[\w-]*textus-editor-shell[^{]*\{[\s\S]*?\}/g, '')), `${f} 有未作用域选择器`)
  }
})
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/textus-css-scoped.test.mjs`
Expected: FAIL（文件未建）

- [ ] **Step 3: 拷贝 CSS + 作用域化**

从 `/tmp/opencode/textus` 拷 `theme/content-base.css`、`editor/milkdown-theme.css`、`theme/content-themes.css`、`editor/completion/completion-panel.css`、`editor/diagram-zoom.css`、`editor/hover/hover-card.css` 到 `V` 对应路径；每个文件顶层选择器加 `.textus-editor-shell ` 前缀（排除 `@media`/`@keyframes`/`@font-face` 内部），把颜色/尺寸改用 `var(--t-*)` 兜底。`MilkdownEditor.tsx` import 这些 CSS + `@milkdown/kit/prose/view/style/prosemirror.css`；根 div 加 `.textus-editor-shell`。保留现有 `milkdown.css` 作壳级样式。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test tests/textus-css-scoped.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/additional/milkdown tests/textus-css-scoped.test.mjs
git commit -m "feat(textus): vendor & scope editor CSS"
```

---

### Task 9: 集成接线与最终门禁

**Files:**
- Verify: `src/App.tsx`（不改逻辑；确认 `wysiwyg ? <MilkdownEditor> : <CodeEditor>` 已就位）、`src/store/editorStore.ts`（`wysiwyg` 开关）、`src/components/layout/editorActions.tsx`（「WYSIWYG 模式」切换）、`tests/cm6-core-boundary.test.mjs`
- Modify: `src/additional/index.ts`（如导出名有变）

**Interfaces:**
- Consumes: Task 7 `MilkdownEditor`、Task 8 CSS。

- [ ] **Step 1: 运行 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: 运行全量测试（含 cm6-core-boundary、vendor 门禁、roundtrip）**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: 生产构建**

Run: `npx vite build`
Expected: 成功（`dist/index.html` 生成）

- [ ] **Step 4: 手测清单（Review Focus）**

WYSIWYG 开关切换不破坏 CM6；中文/IME 输入不吞字；标题/列表/表格/代码块/math/emoji/引用/链接编辑与序列化保真；纯文本+HTML 粘贴；只读态；外部 `md` 写入（切文档/导入）后往返不失真。

- [ ] **Step 5: Commit**

```bash
git add src/additional tests package.json package-lock.json scripts
git commit -m "feat(textus): integrate A2 editor core as WYSIWYG mode"
```

---

## Self-Review 备注

- **Spec 覆盖**：目标/非目标/反目标逐条映射到 Task 1–9（反目标"cm6-boundary"由 Global Constraints + Task 9 Step 2 钉住；"往返不失真"由 Task 7 钉住；"不破坏 CM6"由 Task 9 Step 4）。
- **B1–B7 裁定**全部落地：B1→Task 8；B2→Task 5 Step 3（slash-commands）；B3→Task 7；B4→Task 2/3–5 + Global 规则；B5→Task 6（noDiskImages）；B6→Task 6；B7→Task 1。
- **比例**：计划以"拷贝+改写规则+门禁"为主，未转写产品代码。
