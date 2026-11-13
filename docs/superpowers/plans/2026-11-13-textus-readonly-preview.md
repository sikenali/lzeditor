# Textus 只读预览 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Textus 的只读 `SplitPreview` 替换可编辑 WYSIWYG：预览只读、`editorMd` 驱动、只重绘改动块；编辑只在代码模式（CM6 不动）。

**Architecture:** vendor `SplitPreview.tsx` + `useEditorRunner.ts` + `useLatest.ts`；建 `TextusPreview.tsx` 承载 8 个 CSS import + `.textus-editor-shell[data-content-theme=slate]` 外壳 + `<html data-theme>` 镜像；`App.tsx` 的 `wysiwyg` 分支改渲染 `TextusPreview`；删 `MilkdownEditor.tsx`/`editor-factory.ts`；shim `useSettings()` 返回英文翻译对象 + 编辑器默认 settings；改 2 个测试到新接线。

**Tech Stack:** React + Vite + TS；Milkdown 7（`@milkdown/react`、`@milkdown/kit`）；Node 内置 test runner（`node --import tsx --test`）。

**Spec:** `docs/superpowers/specs/2026-11-13-textus-readonly-preview-design.md`

## Global Constraints

- 门禁不许破（逐任务验证）：`npm run typecheck` 0、`npm test` 279/279、`node scripts/check-textus-vendor.mjs` 0 硬失败/0 警告、`npm run build` 成功。
- vendor 门禁按 **import 闭包**：`src/additional/milkdown/textus/` 下所有 `.ts/.tsx` 的相对 import 必须解析到该目录或 `shim/` 内真实文件；裸 import 必须是 `package.json` deps/devDeps 键或允许子路径（如 `@milkdown/kit/core`）。不要求逐字节匹配 Textus 源。
- 不碰 `feat(history)` 工作（`f8a6093`…`4988042`）；`ReadMode` 不改。
- 预览沿用内容主题：外壳 `data-content-theme="slate"`；亮/暗由 `<html data-theme>` 镜像到外壳 `data-theme`。
- lzeditor 无磁盘：vendored `SplitPreview` 走 `withEditorCore` 的 **`noDiskImages`** 分支（no-op 插件），不装 image/undo/link-click/link-hover（`docPath` 恒 null）。

## Review Focus

- 预览只读：点/选内容不改 `editorMd`（SplitPreview 自身 `setReadOnly(true)`，`cm6-core-boundary` 断 `preview: true` + `withEditorCore(`）。
- 预览随 CM6 编辑更新且只重绘改动块：`SplitPreview` 的 `markdown` diff-replace 逻辑由 `editorMd` 驱动（断 `TextusPreview` 传 `markdown={editorMd}`）。
- 亮/暗主题：外壳 `data-theme` 跟随 `<html data-theme>`，亮色下不命中暗色 token（`TextusPreview` 的 MutationObserver）。
- 删除后无死引用：`MilkdownEditor.tsx`/`editor-factory.ts` 已删，`additional-dead-cluster` 断其不存在；`milkdown.css` 保留（由 `TextusPreview` import）。
- mermaid/math 在预览绘制：shim `settings.enableMath/enableMermaid` 为 true（`textus-shim.test.mjs`）。

---

### Task 1: Shim 返回翻译对象 + 编辑器默认 settings

**Files:**
- Modify: `src/additional/milkdown/textus/shim/settings-context.ts`
- Test: `tests/textus-shim.test.mjs`（新建）

**Interfaces:**
- Produces: `useSettings(): { t: { splitPreview: string; hoverCard: string; hoverPin: string; hoverOpen: string; hoverClose: string; missingImageNotFound: string; missingImageUnsupported: string; missingImageRemote: string; missingImageUnsaved: string }; settings: Settings }` —— `settings` 含 `language:"en"`, `enableMath:true`, `enableMermaid:true`, `colorSwatches:"off"`, `codeLineNumbers:false`, `autoCloseBrackets:false`, `autoCloseMarks:false`（与已删可编辑编辑器一致，保证预览"语法全绘"）。`t` 是**对象**（非函数），因 vendored 代码读 `t.hoverCard`、`t.missingImageRemote.replace(...)`、`SplitPreview` 读 `t.splitPreview`。

- [ ] **Step 1: 写失败测试 `tests/textus-shim.test.mjs`**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { useSettings } from '../src/additional/milkdown/textus/shim/settings-context.ts'

test('useSettings 提供英文翻译对象与编辑器默认 settings', () => {
  const { t, settings } = useSettings()
  assert.equal(typeof t.splitPreview, 'string')
  assert.ok(t.splitPreview.length > 0, 't.splitPreview 应为非空字符串（SplitPreview aria-label）')
  assert.equal(typeof t.hoverCard, 'string')
  assert.equal(typeof t.missingImageRemote, 'string')
  assert.equal(settings.enableMath, true, '预览须绘制 math')
  assert.equal(settings.enableMermaid, true, '预览须绘制 mermaid')
  assert.equal(settings.language, 'en')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --import tsx --test tests/textus-shim.test.mjs`
Expected: FAIL —— 当前 `t` 是函数，`t.splitPreview` 为 `undefined`（非字符串）。

- [ ] **Step 3: 改 `shim/settings-context.ts`：`useSettings()` 返回 `{ t, settings }`**

```ts
const editorSettings = {
  language: "en",
  autoCloseBrackets: false,
  autoCloseMarks: false,
  codeLineNumbers: false,
  colorSwatches: "off",
  diagramEngine: "mermaid",
  enableMath: true,
  enableMermaid: true,
} as Settings;

const t = {
  splitPreview: "Preview",
  hoverCard: "Hover",
  hoverPin: "Pin",
  hoverOpen: "Open",
  hoverClose: "Close",
  missingImageNotFound: "Image not found",
  missingImageUnsupported: "Unsupported image",
  missingImageRemote: "Remote image",
  missingImageUnsaved: "Unsaved image",
};

export function useSettings() {
  return { t, settings: editorSettings };
}
```
（删除原 `t: (key) => key` 函数；`settings: {} as Settings` 改为 `editorSettings`。若 typecheck 发现 vendored 代码还读其它 `t.*` 键，按报错补齐到 `t`。）

- [ ] **Step 4: 跑测试 + typecheck 确认通过**

Run: `node --import tsx --test tests/textus-shim.test.mjs && npm run typecheck`
Expected: PASS（测试通过，typecheck 0）。

- [ ] **Step 5: 提交**

```bash
git add tests/textus-shim.test.mjs src/additional/milkdown/textus/shim/settings-context.ts
git commit -m "feat(textus): preview shim returns translation object + editor settings"
```

---

### Task 2: Vendor 预览组件（SplitPreview + useEditorRunner + useLatest）

**Files:**
- Create: `src/additional/milkdown/textus/editor/useEditorRunner.ts`（照抄 Textus `src/editor/useEditorRunner.ts`）
- Create: `src/additional/milkdown/textus/utils/hooks/useLatest.ts`（照抄 Textus `src/utils/hooks/useLatest.ts`）
- Create: `src/additional/milkdown/textus/editor/modes/SplitPreview.tsx`（自 Textus `src/editor/modes/SplitPreview.tsx`，两处改动：`useSettings` import 改指 `../../shim/settings-context`；`withEditorCore` 改走 `noDiskImages` 分支）

**Interfaces:**
- Consumes: `useSettings()`（Task 1，提供 `t.splitPreview` 与 `settings` 默认值）；`withEditorCore`/`configureEditorRoot`（已 vendored，`preview?: boolean`、`noDiskImages?: MilkdownPlugin` 均在）；`parseMarkdownSource`、`setReadOnly`/`pastReadOnly`（已 vendored）。
- Produces: `SplitPreview(props: { markdown: string; filePath: string | null; extras?: (editor, docPath) => Editor })` —— 只读预览，`markdown` 变化时 diff 重绘；`useEditorRunner()`、`useLatest<T>(value)` 供内部与后续用。

- [ ] **Step 1: 建 `useEditorRunner.ts`（照抄）**

```ts
import { useCallback } from "react";
import { useInstance } from "@milkdown/react";
import type { Ctx } from "@milkdown/kit/ctx";

export type EditorRunner = <T>(fn: (ctx: Ctx) => T) => T | undefined;

export function useEditorRunner(): EditorRunner {
  const [loading, getEditor] = useInstance();
  return useCallback(
    <T>(fn: (ctx: Ctx) => T): T | undefined =>
      loading ? undefined : getEditor().action(fn),
    [loading, getEditor],
  );
}
```

- [ ] **Step 2: 建 `utils/hooks/useLatest.ts`（照抄）**

```ts
import { useEffect, useRef } from "react";

export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}
```

- [ ] **Step 3: 建 `editor/modes/SplitPreview.tsx`，含两处改动**

自 Textus `src/editor/modes/SplitPreview.tsx` 复制，改：
1. `import { useSettings } from "../../prefs/SettingsContext"` → `import { useSettings } from "../../shim/settings-context"`（`prefs/SettingsContext` 不在 V 内）。
2. `withEditorCore(Editor.make()... , { settings: settingsRef, docPath: docPathRef, onImagePasteError: () => "", requestImageName: async () => null, preview: true })` → 改为 `{ settings: settingsRef, docPath: docPathRef, preview: true, noDiskImages: () => () => {} }`（lzeditor 无磁盘，走 noDiskImages 分支；no-op 插件 `() => () => {}` 与 `editor-factory.ts` 同形）。
其余（`configureEditorRoot`、`listenerCtx.mounted(setReadOnly(true))`、`useEffect` diff-replace、`return <Milkdown/>`、`SplitPreview`/`PreviewEditor` 导出）照抄。

- [ ] **Step 4: 跑 vendor 门禁 + typecheck**

Run: `node scripts/check-textus-vendor.mjs && npm run typecheck`
Expected: vendor 门禁 0 硬失败/0 警告（`utils/hooks/` 新目录被闭包遍历，`useLatest`/`useEditorRunner`/`SplitPreview` 的相对 import 均落 V 内或 shim；裸 import 均允许）。typecheck 0（`t.splitPreview` 现为字符串，`withEditorCore` 接受 `noDiskImages`）。

- [ ] **Step 5: 提交**

```bash
git add src/additional/milkdown/textus/editor/useEditorRunner.ts src/additional/milkdown/textus/utils/hooks/useLatest.ts src/additional/milkdown/textus/editor/modes/SplitPreview.tsx
git commit -m "feat(textus): vendor read-only SplitPreview preview component"
```

---

### Task 3: TextusPreview 外壳组件

**Files:**
- Create: `src/additional/milkdown/TextusPreview.tsx`

**Interfaces:**
- Consumes: `SplitPreview`（Task 2）；`milkdown.css` + 7 个 vendored CSS；`useSettings`（Task 1）。
- Produces: `TextusPreview(props: { markdown: string })` —— 渲染 `.textus-editor-shell[data-content-theme="slate"]`，内含 `<SplitPreview markdown={markdown} filePath={null}/>`，并把 `<html data-theme>` 镜像到外壳 `data-theme`（MutationObserver）。

- [ ] **Step 1: 写 `TextusPreview.tsx`**

```tsx
import { useEffect, useRef } from "react";
import { SplitPreview } from "./textus/editor/modes/SplitPreview";
import "./milkdown.css";
import "@milkdown/kit/prose/view/style/prosemirror.css";
import "./textus/theme/content-base.css";
import "./textus/theme/content-themes.css";
import "./textus/editor/milkdown-theme.css";
import "./textus/editor/completion/completion-panel.css";
import "./textus/editor/diagram-zoom.css";
import "./textus/editor/hover/hover-card.css";

/** 只读预览外壳：`.textus-editor-shell` 是 vendored Textus CSS 的作用域，
 *  `data-content-theme` 激活 `--doc-*` token，`data-theme` 镜像应用亮/暗。 */
export function TextusPreview({ markdown }: { markdown: string }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const root = document.documentElement;
    const apply = () => {
      const theme = root.getAttribute("data-theme");
      if (theme === "dark" || theme === "light") shell.setAttribute("data-theme", theme);
      else shell.removeAttribute("data-theme");
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={shellRef} className="textus-editor-shell" data-content-theme="slate">
      <SplitPreview markdown={markdown} filePath={null} />
    </div>
  );
}
```

- [ ] **Step 2: typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: typecheck 0；build 成功（8 个 CSS import 解析）。

- [ ] **Step 3: 提交**

```bash
git add src/additional/milkdown/TextusPreview.tsx
git commit -m "feat(textus): add read-only preview shell (TextusPreview)"
```

---

### Task 4: 接线 App、删旧实现、改 2 个测试

**Files:**
- Modify: `src/App.tsx:16`（删 `import { MilkdownEditor }`）、`src/App.tsx:461`（`<MilkdownEditor md={editorMd} onChange={handleEditorChange}/>` → `<TextusPreview markdown={editorMd}/>`，并 import `TextusPreview`）
- Delete: `src/additional/milkdown/MilkdownEditor.tsx`、`src/additional/milkdown/textus/editor/editor-factory.ts`
- Test: `tests/cm6-core-boundary.test.mjs:84-97`、`tests/additional-dead-cluster.test.mjs:31`（改写）

**Interfaces:**
- Consumes: `TextusPreview`（Task 3）；`editorMd`/`handleEditorChange`（App 现有，文档真相）。
- Produces: `wysiwyg` 开 → 只读预览；关 → `CodeEditor`（CM6，可编辑）。`editor-factory.ts` 不再存在。

- [ ] **Step 1: 改写两个测试到新接线（先失败）**

`tests/cm6-core-boundary.test.mjs` 的并存模式块改为：
```js
assert.match(app, /TextusPreview|SplitPreview/, 'App 必须挂载只读预览（并存模式）')
assert.match(app, /wysiwyg\s*\?/, 'App 必须按 wysiwyg 切换编辑器')
const previewShell = read('src/additional/milkdown/TextusPreview.tsx')
assert.match(previewShell, /SplitPreview/, 'TextusPreview 必须渲染 SplitPreview')
assert.match(previewShell, /filePath=\{null\}/, '预览无磁盘（filePath=null）')
assert.match(previewShell, /data-theme/, '外壳必须镜像 data-theme（亮/暗随应用主题）')
const vendoredPreview = read('src/additional/milkdown/textus/editor/modes/SplitPreview.tsx')
assert.match(vendoredPreview, /withEditorCore\(/, 'SplitPreview 必须委托 withEditorCore 安装插件链')
assert.match(vendoredPreview, /preview:\s*true/, 'SplitPreview 必须为 preview:true（只读、语法全绘）')
assert.equal(existsSync('src/additional/milkdown/MilkdownEditor.tsx'), false, 'MilkdownEditor.tsx 必须删除（已改只读预览）')
assert.equal(existsSync('src/additional/milkdown/textus/editor/editor-factory.ts'), false, 'editor-factory.ts 必须删除')
const reducedPresets = read('src/additional/milkdown/textus/editor/markdown/reduced-presets.ts')
assert.match(reducedPresets, /@milkdown\/kit\/preset\/commonmark/, 'Milkdown 必须用 CommonMark 预设')
assert.match(reducedPresets, /@milkdown\/kit\/preset\/gfm/, 'Milkdown 必须用 GFM 预设')
const editorChain = read('src/additional/milkdown/textus/editor/editor-extensions.ts')
assert.match(editorChain, /\.use\(listener\)/, 'Milkdown 必须监听 markdown 变更（listener 装在链上）')
const editorStore = read('src/store/editorStore.ts')
assert.match(editorStore, /wysiwyg/, 'editorStore 必须保存 wysiwyg 开关')
```
（在文件顶部确认 `existsSync` 已导入；未导入则加 `import { existsSync } from 'node:fs'`。）

`tests/additional-dead-cluster.test.mjs:31` 改为：
```js
assert.equal(existsSync(f('milkdown/MilkdownEditor.tsx')), false, 'MilkdownEditor.tsx 必须删除（已改只读预览）')
assert.ok(existsSync(f('milkdown/TextusPreview.tsx')), 'TextusPreview.tsx 必须保留（只读预览外壳）')
assert.ok(existsSync(f('milkdown/milkdown.css')), 'milkdown.css 必须保留')
```

- [ ] **Step 2: 跑两测试确认失败**

Run: `node --import tsx --test tests/cm6-core-boundary.test.mjs tests/additional-dead-cluster.test.mjs`
Expected: FAIL —— 当前 App 仍含 `MilkdownEditor`、两文件仍在（`existsSync` true）、App 无 `TextusPreview`。

- [ ] **Step 3: 接线 App + 删 `MilkdownEditor.tsx` 与 `editor-factory.ts`**

`App.tsx`：删 `import { MilkdownEditor } from './additional/milkdown/MilkdownEditor'`；加 `import { TextusPreview } from './additional/milkdown/TextusPreview'`；`wysiwyg ? <TextusPreview markdown={editorMd}/> : <CodeEditor md={editorMd} onChange={handleEditorChange}/>`。
`rm src/additional/milkdown/MilkdownEditor.tsx src/additional/milkdown/textus/editor/editor-factory.ts`（`grep` 已确认除本测试外无其它引用；`source-control.ts` 仅注释提及）。

- [ ] **Step 4: 跑全部门禁**

Run: `npm run typecheck && npm test && node scripts/check-textus-vendor.mjs && npm run build`
Expected: typecheck 0；test 279/279；vendor 门禁 0 硬失败/0 警告；build 成功。

- [ ] **Step 5: 提交**

```bash
git add src/App.tsx tests/cm6-core-boundary.test.mjs tests/additional-dead-cluster.test.mjs
git rm src/additional/milkdown/MilkdownEditor.tsx src/additional/milkdown/textus/editor/editor-factory.ts
git commit -m "feat(textus): use read-only preview in wysiwyg mode, drop editable WYSIWYG"
```

---

## 执行顺序说明

Task 1（shim）→ Task 2（vendor）→ Task 3（外壳）→ Task 4（接线+删除+测试）。每任务结束各自门禁绿并提交，互不阻塞后续；Task 4 依赖 Task 3 的 `TextusPreview` 与 Task 2 的 `SplitPreview`。手测（人工）：`wysiwyg` 开 → 只读预览（居中 690px 列、可滚动、语法全绘、不可编辑、亮/暗随应用主题）；CM6 编辑 → 预览只重绘改动块；样式面板可用；阅读模式未动。
