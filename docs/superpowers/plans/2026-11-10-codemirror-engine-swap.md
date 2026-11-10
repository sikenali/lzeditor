# CodeMirror 6 Engine Swap (Delete yeli) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the self-developed `yeli` source-mapped WYSIWYG block editor (deleting `src/vendor/yeli/`) with a CodeMirror 6 source editor (left-write / right-read, as in Backtickle), while keeping every existing feature working through a stable facade interface.

**Architecture:** The yeli engine is used only on the "write" side (the editor canvas). The "read"/preview side (`src/utils/markdown/` — markdown-it + KaTeX + mermaid + highlight.js) is already independent of yeli and is untouched. We introduce a new `CodeEditor` component backed by CodeMirror 6 that exposes the *same* typed facade surface the app already consumes (`EditorFacade`), so `App`, `useAI`, `editorActions`, `Toolbar`, `SearchPanel`, `SidebarOutline`, `SidebarPreview`, `HistoryPanel`, `docImport` keep working with only an import-name rename. The yeli-specific live block rendering (`render-ext/` mermaid/echarts/katex, registered into yeli's renderer) is re-wired into the preview's `createMarkdownIt` so those diagrams still render — now in the preview instead of the editor canvas.

**Tech Stack:** CodeMirror 6 (`@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/lang-markdown`, `@codemirror/search`, `@codemirror/autocomplete`, `@lezer/markdown`, `@lezer/highlight`), React 19, Vite, existing markdown-it preview stack, `node --test` static-boundary tests.

**Spec:** `docs/superpowers/specs/` — this plan is Phase 1 of the Backtickle-alignment effort (see the conversation record). Phase 2+ covers the remaining missing Backtickle features (Graphviz, Quick Open / command palette, HTML→MD smart paste, accessibility, filesystem layer, update check).

## Global Constraints

- The app must keep compiling under `npm run typecheck` (tsc --noEmit) with **zero** errors.
- `npm run check` (`typecheck` + `node --test tests/*.test.mjs tests/vendor/*.test.mjs`) must pass.
- `src/` must contain **no** references to `@tiptap`, `@memfoldai`, `@milkdown`, `prosemirror` (already true; must stay true).
- `src/` must contain **no** references to `src/vendor/yeli` after this plan (the engine is deleted).
- The preview/export renderer (`src/utils/markdown/`) must be **unchanged** except where `render-ext` is explicitly re-wired into `createMarkdownIt`.
- All existing features that the app exposes today must remain reachable: AI streaming, search/replace, outline jump, scroll sync, history rollback, document import, insertion dialogs (code/table/formula/image/link), export.

## Review Focus

The spec implies input classes no single task's tests exercise; each gets pinned to its owning task:

1. **Editing an existing document must preserve bytes.** The facade `setText(md)` on an already-loaded document must not reset the caret unless `md` actually differs (`CodeEditor` effect already guards `facade.getText() !== md`). Pinned in Task 7.
2. **Search must handle regex, case, whole-word, zero-length matches.** Invalid regex throws `RangeError`; zero-length matches don't infinite-loop. Pinned in Task 4.
3. **A document with no trailing newline + `insertBlock`/`insertText` at end must not corrupt.** Separator logic (`\n` if needed) preserved. Pinned in Task 5.
4. **`table.*` commands must not silently fail in source mode.** Since CM6 has no block/activeCell context, `getTableContext()` returns `null` and `execCommand('table.*')` falls back to inserting an empty markdown table at the cursor (via `insert.text.table`-style insert), never throwing. Pinned in Task 5.
5. **`selection.*` commands need a real selection.** In source mode the DOM selection is always available; wrap must no-op on a collapsed selection rather than corrupt. Pinned in Task 3.

---

### Task 1: Add CodeMirror 6 dependencies

**Files:**
- Modify: `package.json` (dependencies)

**Interfaces:**
- Consumes: nothing
- Produces: the CM6 package set installed so later tasks can import them.

- [ ] **Step 1: Add the CM6 packages to `dependencies`**

Add these exact versions (mirroring Backtickle's pinning style; versions are Backtickle's, adjusted to Node/TS in this repo — use `npm install` to resolve):

```
@codemirror/state@6.7.6
@codemirror/view@6.43.13
@codemirror/commands@6.11.1
@codemirror/language@6.12.4
@codemirror/lang-markdown@6.5.2
@codemirror/search@6.7.2
@codemirror/autocomplete@6.20.3
@lezer/common@1.5.3
@lezer/highlight@1.2.5
@lezer/markdown@1.7.2
```

- [ ] **Step 2: Install and verify the lockfile**

Run: `npm install`
Expected: resolves without peer conflicts; `package-lock.json` updated.

- [ ] **Step 3: Verify imports resolve**

Run: `node -e "require('@codemirror/view'); require('@codemirror/state'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add CodeMirror 6 dependencies"
```

---

### Task 2: Define the neutral `EditorFacade` interface

**Files:**
- Create: `src/components/editor/facade/EditorFacade.ts` (from current `YeliEditorFacade.ts`)
- Delete: `src/components/editor/facade/YeliEditorFacade.ts`
- Test: `tests/cm6-core-boundary.test.mjs` (updated in Task 10; interface assertions here are provisional and must be added/kept there)

**Interfaces:**
- Consumes: `SourceBlock`, `TableDimensions`, `TableCellPosition`, `DocumentTransactionResult` types currently imported from yeli — these must be dropped or re-declared locally (yeli is deleted). `table-commands` types are no longer available, so `getTableContext()` returns `null` and `execCommand('table.*')` takes no block context.
- Produces: `EditorFacade` interface + `createEditorFacade(options)` + `SearchQueryOptions`. This is the single contract every consumer and the CM6 implementation use. **Signature is byte-identical to today's `YeliEditorFacade` except `getDocumentStore()` is removed** (it only served `EditCanvas`, which is deleted with yeli).

- [ ] **Step 1: Create `EditorFacade.ts` with the trimmed interface**

The interface keeps these exact members (copy signatures verbatim from today's `YeliEditorFacade.ts`, but drop `getDocumentStore(): DocumentStore` and drop the yeli type imports — replace `TableCellPosition`/`TableDimensions` with locally-declared plain types, and change `getTableContext()` to return `null` unconditionally):

```ts
export interface FacadeSelection { from: number; to: number; }
export interface SearchQueryOptions { term: string; regex: boolean; caseSensitive: boolean; wholeWord: boolean; }
export interface EditorFacade {
  setText(markdown: string): void;
  getText(): string;
  getRevision(): number;
  replaceRange(from: number, to: number, text: string): void;
  insertText(text: string, anchor?: FacadeSelection, expectedRevision?: number): void;
  insertBlock(text: string): void;
  insertCodeBlock(language: string, code: string): void;
  insertFormula(text: string): void;
  onChange(listener: (markdown: string) => void): () => void;
  getSelection(): FacadeSelection | null;
  setSelection(from: number, to: number): void;
  onSelectionChange(listener: (selection: FacadeSelection | null) => void): () => void;
  getTableContext(): null;
  setViewRoot(root: HTMLElement | null): void;
  focus(): void;
  scrollToBlock(blockId: string): void;
  undo(): boolean;
  redo(): boolean;
  execCommand(name: string, args?: Record<string, unknown>): unknown;
  searchMatches(options: SearchQueryOptions): number;
  findNext(): boolean;
  findPrev(): boolean;
  replaceCurrent(text: string): number;
  replaceAll(text: string): number;
}
export interface EditorFacadeOptions { labels?: Record<string,string>; locale?: "en" | "zh-CN"; }
export function createEditorFacade(options?: EditorFacadeOptions): EditorFacade;
```

Note: `getTableContext(): null` is the source-mode reality — the toolbar's table structure buttons then disable (they already disable when `getTableContext()` returns null), and `insert.table` still works.

- [ ] **Step 2: Update the facade registry to the neutral names**

Modify `src/components/editor/facade/registry.ts`: rename `registerYeliFacade`→`registerEditorFacade`, `getYeliFacade`→`getEditorFacade`, and the stored type `YeliEditorFacade`→`EditorFacade`. Same module-level singleton semantics.

- [ ] **Step 3: Delete the old `YeliEditorFacade.ts`**

- [ ] **Step 4: Run typecheck to see the expected breakage list**

Run: `npm run typecheck`
Expected: FAIL — errors are exactly the consumer imports of `YeliEditorFacade`/`getYeliFacade`/`registerYeliFacade` (Task 8 fixes them) and nothing else. Do **not** proceed to fix them here; record the file list in Task 8.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/facade/EditorFacade.ts src/components/editor/facade/registry.ts
git rm src/components/editor/facade/YeliEditorFacade.ts
git commit -m "refactor: introduce neutral EditorFacade interface, drop yeli-only getDocumentStore"
```

---

### Task 3: CM6 command mapping (`selection.*`, `insert.*`, `block.*`, `view.*`)

**Files:**
- Create: `src/components/editor/facade/cm6/cm6-commands.ts`
- Test: `tests/cm6-commands.test.mjs`

**Interfaces:**
- Consumes: the command ids from today's yeli `command-registry` catalog (the same string ids the app already calls: `selection.bold`, `selection.italic`, `selection.strike`, `selection.code`, `selection.link`, `selection.clear`, `insert.paragraph`, `insert.task`, `insert.bullet-list`, `insert.numbered-list`, `insert.quote`, `insert.code-block`, `insert.table`, `insert.divider`, `template.meeting-notes`, `block.convert.heading`, `block.convert.task`, `block.convert.quote`, `block.convert.bullet-list`, `block.convert.numbered-list`, `block.convert.code`, `block.duplicate`, `block.delete`, `view.search`, `view.outline`, `view.font-size`, `view.page-width`, `view.presentation`, `view.command-guide`, `document.save`).
- Produces: `applyEditorCommand(facade: EditorFacade, name: string, args?: Record<string, unknown>): unknown` — a pure-ish helper that translates a command id into a CM6 transaction against the facade's doc. Used by Task 5's `execCommand`.

- [ ] **Step 1: Write the failing test**

`tests/cm6-commands.test.mjs` (static text assertions + a pure mapping check runnable in node):

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const cmds = read('src/components/editor/facade/cm6/cm6-commands.ts')
// selection.* wrap markdown (same delimiters as yeli)
assert.match(cmds, /selection\.bold/, 'must map selection.bold')
assert.match(cmds, /selection\.italic/, 'must map selection.italic')
assert.match(cmds, /selection\.strike/, 'must map selection.strike')
assert.match(cmds, /selection\.code/, 'must map selection.code')
// block.* and insert.* ids must be recognized, never silently dropped
assert.match(cmds, /insert\.table/, 'must map insert.table')
assert.match(cmds, /block\.convert\.heading/, 'must map block.convert.heading')
assert.match(cmds, /template\.meeting-notes/, 'must map meeting-notes template')
console.log('cm6 commands ok')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cm6-commands.test.mjs`
Expected: FAIL — file does not exist yet.

- [ ] **Step 3: Implement `applyEditorCommand`**

One plain approach: a `SELECTION_WRAP` table (bold `**x**`, italic `*x*`, strike `~~x~~`, code `` `x` ``, link `[x](url)`, clear strips delimiters) applied to the current selection via `facade.replaceRange(from, to, wrapped)`; `insert.*`/`template.meeting-notes` build markdown and `facade.insertText(md, facade.getSelection() ?? undefined)`; `block.convert.*` and `block.*` rewrite the line prefix of the current line(s); `view.*`/`document.save` return `null` (the app handles these via UI, not the editor); `table.insert-row/column`* fall back to `insert.table` (Task 5's Review Focus #4). Undo/redo are not routed here (handled directly).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/cm6-commands.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/facade/cm6/cm6-commands.ts tests/cm6-commands.test.mjs
git commit -m "feat: map yeli command ids to CodeMirror transactions"
```

---

### Task 4: CM6 search (find/replace on the doc)

**Files:**
- Create: `src/components/editor/facade/cm6/cm6-search.ts`
- Test: `tests/cm6-search.test.mjs`

**Interfaces:**
- Consumes: `EditorFacade` (`getText`, `replaceRange`, `setSelection`), `SearchQueryOptions`.
- Produces: `createSearchSession(facade: EditorFacade)` returning `{ searchMatches, findNext, findPrev, replaceCurrent, replaceAll }` with the exact semantics today's facade exposes (see `YeliEditorFacade.ts`): regex/case/whole-word, `(?<!\S)…(?!\S)` whole-word, zero-length skip, invalid regex throws `RangeError`, replace-current advances highlight after replacement, replace-all goes back-to-front.

- [ ] **Step 1: Write the failing test**

`tests/cm6-search.test.mjs` (pure, node-runnable — the session is constructed over a mock facade with an in-memory string):

```js
import assert from 'node:assert/strict'
// The session takes a minimal {getText, replaceRange, setSelection} facade.
import { createSearchSession } from '../src/components/editor/facade/cm6/cm6-search.ts'
function mockFacade(text) {
  let source = text
  return {
    getText: () => source,
    replaceRange: (from, to, t) => { source = source.slice(0, from) + t + source.slice(to) },
    setSelection: () => {},
  }
}
const f = mockFacade('foo bar foo')
const s = createSearchSession(f)
assert.equal(s.searchMatches({ term: 'foo', regex: false, caseSensitive: true, wholeWord: false }), 2)
assert.equal(s.findNext(), true)
assert.equal(s.replaceAll('baz'), 2)
assert.equal(f.getText(), 'baz bar baz')
assert.throws(() => s.searchMatches({ term: '(', regex: true, caseSensitive: true, wholeWord: false }), RangeError)
console.log('cm6 search ok')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cm6-search.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `createSearchSession`**

The algorithm is identical to today's `YeliEditorFacadeImpl` `#computeMatches`/`#findNext`/`#findPrev`/`#replaceCurrent`/`#replaceAll` (copy the bodies; they are pure string logic). `searchMatches` keeps the current highlight index when options are unchanged, resets to first otherwise.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/cm6-search.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/facade/cm6/cm6-search.ts tests/cm6-search.test.mjs
git commit -m "feat: facade search/replace over CodeMirror doc"
```

---

### Task 5: Implement the CM6-backed `EditorFacade`

**Files:**
- Create: `src/components/editor/facade/cm6/CM6EditorFacade.ts`
- Test: `tests/cm6-facade.test.mjs`

**Interfaces:**
- Consumes: `EditorFacade` + `createEditorFacade` (Task 2), `applyEditorCommand` (Task 3), `createSearchSession` (Task 4).
- Produces: `createCM6EditorFacade(view: EditorView, options?): EditorFacade` — the live facade bound to a CodeMirror `EditorView`. Task 6's component owns the `EditorView` and passes it in.

- [ ] **Step 1: Write the failing test**

`tests/cm6-facade.test.mjs` — static assertions that the facade is CM6-backed and preserves contract:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const f = read('src/components/editor/facade/cm6/CM6EditorFacade.ts')
assert.match(f, /import \{[^}]*EditorView[^}]*\} from ['"]@codemirror\/view/, 'must bind a CM6 EditorView')
assert.match(f, /getText\(\)/, 'must expose getText')
assert.match(f, /replaceRange\(/, 'must expose replaceRange')
assert.match(f, /getTableContext\(\)/, 'must expose getTableContext returning null')
assert.match(f, /getRevision/, 'must expose getRevision')
assert.match(f, /createCM6EditorFacade/, 'must export the factory')
console.log('cm6 facade ok')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cm6-facade.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `createCM6EditorFacade`**

Wrap an `EditorView` with the `EditorFacade` contract:
- `setText(md)` → dispatch a full-doc replace via `view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: md } })`.
- `getText()` → `view.state.doc.toString()`.
- `getRevision()` → an internal counter incremented on every committed transaction (or `view.state` doc identity via a `version` extension).
- `replaceRange(from,to,text)` / `insertText(text, anchor, expectedRevision)` → `view.dispatch` with a single `changes`; `insertText` throws `RangeError` on stale `expectedRevision`.
- `insertBlock`/`insertCodeBlock`/`insertFormula` → append at end with the same `\n` separator rule as today.
- `onChange`/`onSelectionChange` → subscribe to `view.updateListener` (filter `docChanged` / `selectionSet`).
- `getSelection`/`setSelection` → read/write `view.state.selection.main` mapped to source offsets.
- `searchMatches`/`findNext`/`findPrev`/`replaceCurrent`/`replaceAll` → delegate to `createSearchSession` (Task 4).
- `getTableContext()` → `null` (Review Focus #4).
- `scrollToBlock(blockId)` → find the line whose text matches the block's heading/id and `view.dispatch` a `scrollIntoView` effect (best-effort; no-op when not found).
- `undo`/`redo` → `undo(view)` / `redo(view)` from `@codemirror/commands`.
- `execCommand(name, args)` → `applyEditorCommand(this, name, args)` (Task 3).
- `focus()`/`setViewRoot()` → `view.focus()` / store the root element.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/cm6-facade.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/facade/cm6/CM6EditorFacade.ts tests/cm6-facade.test.mjs
git commit -m "feat: CodeMirror-backed EditorFacade implementation"
```

---

### Task 6: Create the `CodeEditor` React component

**Files:**
- Create: `src/components/editor/CodeEditor.tsx`
- Delete: `src/components/editor/YeliEditor.tsx`, `src/components/editor/yeli-labels.ts`
- Test: `tests/code-editor-boundary.test.mjs`

**Interfaces:**
- Consumes: `createCM6EditorFacade` (Task 5), `registerEditorFacade`/`getEditorFacade` (Task 2).
- Produces: `CodeEditor` — a `forwardRef` component with the same props (`{ md: string; onChange: (markdown: string) => void }`) and same ref handle shape as today's `YeliEditorHandle` (`focus`, `insertText`, `replaceRange`, `execCommand`, `getText`, `setText`). This is the mount point `App.tsx` renders.

- [ ] **Step 1: Write the failing test**

`tests/code-editor-boundary.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const code = read('src/components/editor/CodeEditor.tsx')
const app = read('src/App.tsx')
assert.match(code, /@codemirror\/view/, 'CodeEditor must build a CM6 EditorView')
assert.match(code, /registerEditorFacade\(facade\)/, 'must register the facade on mount')
assert.match(code, /facade\.getText\(\) !== md/, 'external md must not reset caret when equal')
assert.match(app, /<CodeEditor md=\{editorMd\}/, 'App must mount CodeEditor')
assert.doesNotMatch(app, /<YeliEditor|<CM6Editor/, 'App no longer mounts the old editors')
console.log('code editor ok')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/code-editor-boundary.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement `CodeEditor`**

`useEffect`-created `EditorView` over a `contenteditable=false` div, extensions built by `cm6-extensions` (Task 7), wired: `md` → `facade.setText` only when different; `view.updateListener` doc changes → `onChange(facade.getText())`; register facade on mount / unregister on unmount; set the editor scroll container into `useEditorStore.getState().setEditorContentRef(...)` for scroll sync; install assist (Task 9). The ref handle forwards to the facade.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/code-editor-boundary.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/CodeEditor.tsx tests/code-editor-boundary.test.mjs
git rm src/components/editor/YeliEditor.tsx src/components/editor/yeli-labels.ts
git commit -m "feat: CodeMirror 6 CodeEditor component replacing YeliEditor"
```

---

### Task 7: Build CM6 extensions and re-wire `render-ext` into the preview

**Files:**
- Create: `src/components/editor/facade/cm6/cm6-extensions.ts`
- Modify: `src/utils/markdown/render.ts` (fence rule + export), `src/components/editor/render-ext/index.ts`
- Test: `tests/cm6-extensions-boundary.test.mjs`

**Interfaces:**
- Consumes: `installRenderExt` (`render-ext/index.ts`), `renderersFor`/`observeLazyRenderers` (for preview hydration), `createMarkdownIt`.
- Produces: `buildCM6Extensions(options)` returning a `Extension[]` (history, `markdown({ base: markdownLanguage })`, `closeBrackets`, `keymap` with `defaultKeymap`, `historyKeymap`, `searchKeymap`, `autocompletion`, a theme), and an exported `installPreviewRenderExt(md)` that applies `installRenderExt` to a `createMarkdownIt` instance so mermaid/echarts/KaTeX lazy containers render in the preview.

- [ ] **Step 1: Write the failing test**

`tests/cm6-extensions-boundary.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const ext = read('src/components/editor/facade/cm6/cm6-extensions.ts')
const render = read('src/utils/markdown/render.ts')
assert.match(ext, /buildCM6Extensions/, 'must export buildCM6Extensions')
assert.match(ext, /@codemirror\/lang-markdown/, 'must use the markdown language')
assert.match(ext, /closeBrackets/, 'must include auto-pairing')
assert.match(ext, /installPreviewRenderExt/, 'must re-wire render-ext into the preview renderer')
assert.match(render, /installPreviewRenderExt/, 'createMarkdownIt must apply preview render-ext')
console.log('cm6 extensions ok')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cm6-extensions-boundary.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement `cm6-extensions.ts` and wire into `render.ts`**

`buildCM6Extensions` returns: `history()`, `markdown({ base: markdownLanguage })` from `@codemirror/lang-markdown`, `closeBrackets()`, `autocompletion()`, `keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap])`, `EditorView.lineWrapping`, `syntaxHighlighting(defaultHighlightStyle)`. `installPreviewRenderExt(md)` calls `installRenderExt(md)`; in `createMarkdownIt`, after the rules are set, call `installPreviewRenderExt(md)` so the fence rule handles `mermaid`/`echarts` and KaTeX rules apply — this replaces the yeli registration that `YeliEditor.tsx` used to do. Export it from `render.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/cm6-extensions-boundary.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the full render/preview tests to confirm no regression**

Run: `node --test tests/render-boundary.test.mjs tests/mermaid.test.mjs tests/split.test.mjs`
Expected: PASS (preview behavior unchanged; echarts/mermaid now also reachable in preview).

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/facade/cm6/cm6-extensions.ts src/utils/markdown/render.ts src/components/editor/render-ext/index.ts tests/cm6-extensions-boundary.test.mjs
git commit -m "feat: CM6 extensions; re-wire render-ext into preview renderer"
```

---

### Task 8: Rename facade consumers to the neutral names

**Files:**
- Modify: `src/App.tsx`, `src/hooks/useAI.ts`, `src/hooks/aiApply.ts`, `src/components/layout/editorActions.tsx`, `src/components/layout/Toolbar.tsx`, `src/components/panels/SearchPanel.tsx`, `src/components/panels/HistoryPanel.tsx`, `src/components/sidebar/SidebarPreview.tsx`, `src/components/sidebar/SidebarOutline.tsx`, `src/utils/docImport.ts`

**Interfaces:**
- Consumes: `getEditorFacade`/`registerEditorFacade`/`EditorFacade` (Task 2), `CodeEditor` (Task 6).
- Produces: a codebase that references only the neutral names.

- [ ] **Step 1: Mechanical rename across consumers**

Replace, in the listed files only:
- `YeliEditorFacade` → `EditorFacade`
- `getYeliFacade` → `getEditorFacade`
- `registerYeliFacade` → `registerEditorFacade`
- `import { YeliEditor }` → `import { CodeEditor }` and `<YeliEditor .../>` → `<CodeEditor .../>` in `App.tsx`

Do **not** rename in `src/vendor/` (deleted) or in any file outside this list.

- [ ] **Step 2: Typecheck to confirm the rename is complete**

Run: `npm run typecheck`
Expected: PASS with zero errors. Any remaining `Yeli` reference is a missed consumer — fix it.

- [ ] **Step 3: Commit**

```bash
git add -A src/
git commit -m "refactor: rename yeli facade references to editor-neutral names"
```

---

### Task 9: CM6 editor assist (typewriter, smart-paste, autopair) and styling

**Files:**
- Create: `src/components/editor/facade/cm6/cm6-assist.ts`, `src/styles/code-editor.css`
- Delete: `src/components/editor/assist/` (all seven files), `src/styles/yeli-canvas.css`
- Modify: `src/components/editor/CodeEditor.tsx` (import assist + CSS), `src/main.tsx` or an existing CSS entry that imported `yeli-canvas.css`
- Test: `tests/cm6-assist-boundary.test.mjs`

**Interfaces:**
- Consumes: `EditorFacade`, `useSettingsStore` flags (`typewriterMode`, `focusMode`, `autoPair`).
- Produces: `installAssist(view: EditorView, facade: EditorFacade, settings): () => void` — typewriter (scroll caret into vertical center on `selectionSet`), focus-mode (blur non-focused lines), autopair (CM6 `closeBrackets` already handles it; only needed if `autoPair` is on), smart-paste (URL→link, TSV→table via a CM6 `domEventHandlers` paste handler reusing `smart-paste` logic now relocated to `cm6-assist.ts`).

- [ ] **Step 1: Write the failing test**

`tests/cm6-assist-boundary.test.mjs`:

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const assist = read('src/components/editor/facade/cm6/cm6-assist.ts')
assert.match(assist, /installAssist/, 'must export installAssist')
assert.match(assist, /typewriter/, 'must implement typewriter follow')
assert.match(assist, /smart.?paste|tsvRows|linkMarkdown/, 'must carry smart-paste URL/table logic')
assert.doesNotMatch(assist, /installSmartPaste/, 'no yeli assist re-export')
console.log('cm6 assist ok')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cm6-assist-boundary.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement `cm6-assist.ts` and `code-editor.css`**

Reuse the existing `smart-paste.ts`/`typewriter.ts`/`autopair.ts` logic (copy the pure helpers — `singleUrl`, `tsvRows`, `tableFromRows`, `linkMarkdown`, `imageMarkdown` — into `cm6-assist.ts`; the DOM glue becomes a CM6 paste handler). `code-editor.css` adapts `yeli-canvas.css` token variables (`--ink: var(--color-text-primary)`, `--focus: var(--color-primary)`) to a CM6 `.cm-editor` theme so the editor still follows the app's theme tokens. Wire `installAssist` into `CodeEditor`'s mount effect and import `code-editor.css` there.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/cm6-assist-boundary.test.mjs`
Expected: PASS.

- [ ] **Step 5: Delete the yeli assist and CSS**

`git rm -r src/components/editor/assist src/styles/yeli-canvas.css`

- [ ] **Step 6: Typecheck + existing test sweep**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/editor/facade/cm6/cm6-assist.ts src/styles/code-editor.css src/components/editor/CodeEditor.tsx tests/cm6-assist-boundary.test.mjs
git rm -r src/components/editor/assist src/styles/yeli-canvas.css
git commit -m "feat: CM6 editor assist and theme styling; remove yeli assist"
```

---

### Task 10: Delete the yeli vendor and update the boundary tests

**Files:**
- Delete: `src/vendor/yeli/` (entire tree)
- Modify: `tests/cm6-core-boundary.test.mjs`, `tests/code-mode-boundary.test.mjs`
- Modify: `package.json` (remove `@heroicons/react`, `yaml`; remove `yeli-canvas.css` import refs)
- Modify: `docs/third-party-notices-yeli.md` → mark as removed (or delete and note in `THIRD_PARTY_NOTICES.md`)

**Interfaces:**
- Consumes: everything from Tasks 1–9.
- Produces: a `src/` with no yeli dependency and boundary tests that assert the CM6 reality.

- [ ] **Step 1: Delete the vendor tree**

```bash
git rm -r src/vendor/yeli
```

- [ ] **Step 2: Rewrite `tests/cm6-core-boundary.test.mjs`**

Replace the whole file. Assert: CM6 is present in `src` (`@codemirror/*`, `@lezer/*`); `src/vendor/yeli` is gone (walk `src` and assert no `vendor/yeli` import); `EditorFacade` interface members are present (`setText`/`getText`/`replaceRange`/`insertText`/`searchMatches`/`findNext`/`replaceAll`); `getEditorFacade`/`registerEditorFacade` exist; `App.tsx` mounts `<CodeEditor>`; no TipTap/ProseMirror references remain.

- [ ] **Step 3: Rewrite `tests/code-mode-boundary.test.mjs`**

Replace the whole file. Assert: `App.tsx` mounts `<CodeEditor md={editorMd}`; `showRightPreview` still excludes `code`/`history`/`style`/`read`; preview-pane styles unchanged; `code-editor.css` is imported; `read-mode` container styles still present.

- [ ] **Step 4: Remove now-unused dependencies**

In `package.json`, remove `@heroicons/react` and `yaml` (only `src/vendor/yeli` used them; verified no other import in `src/`). Run `npm install` to prune the lockfile.

- [ ] **Step 5: Remove `docs/third-party-notices-yeli.md` reference**

Update `THIRD_PARTY_NOTICES.md` / delete `docs/third-party-notices-yeli.md`.

- [ ] **Step 6: Full verification**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove yeli vendor and update boundary tests for CodeMirror"
```

---

### Task 11: Full-project regression and e2e review

**Files:**
- Modify: `tests/e2e/editor-interactions.spec.ts` (and any e2e that asserts yeli DOM)
- Verify: `npm run build`, `npm run typecheck`, `npm run test`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a shippable, yeli-free editor.

- [ ] **Step 1: Update e2e tests that reference yeli DOM**

The yeli canvas exposed `[data-source-block-id]` / `.block-content-editable` selectors; CM6 exposes `.cm-editor` / `.cm-content`. Update the e2e spec's selectors and interaction assertions to CM6 (`typing in .cm-content`, heading shortcut via `keymap`, etc.). Run: `npm run test:e2e` (needs build; the harness may not run Playwright WebKit here — mark this as "verify locally" and keep the static suite green).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: Vite build succeeds; `dist/` produced.

- [ ] **Step 3: Final check**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: update e2e selectors for CodeMirror editor"
```

---

## Post-Plan Notes

- **Phase 2+ (separate plans):** Graphviz diagrams, Quick Open + command palette, HTML→MD smart paste, accessibility (dyslexia fonts, reading ruler, reduce motion, editable shortcuts, WCAG audit), real filesystem layer (folder sidebar, rename/move/Trash, external-change detection, crash recovery), daily update check.
- **`appMode` (`edit`/`code`/`style`)** now all render the same CM6 source editor; the WYSIWYG-vs-source distinction is intentionally gone (source mode everywhere), matching Backtickle's left-write/right-read model. The "code mode" right-panel exclusion still applies.
