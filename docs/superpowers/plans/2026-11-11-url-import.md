# 文档库导入 2 标签（URL 在线导入 + 本地导入）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把文档库弹窗的 Git仓库/博客/GitBook 三个来源页面优化为「URL 在线导入」+「本地导入」两个标签。

**Architecture:** 纯工具函数（URL 校验/标题派生/HTML 检测/fetch）放 `src/utils/importUrl.ts`，可 node 单测；`ImportButtons.tsx` 改造成 2 标签的 presentational 组件（URL 输入 + 本地导入按钮）；`LibraryPanel.tsx` 负责接线（本地文件选择器保留，URL 导入调 fetch + `openMarkdownDoc`）。按用户决策「仅 .md 直链」：不提取 HTML、不新增后端/代理。

**Tech Stack:** React + zustand + 现有 `openMarkdownDoc`（`src/utils/docImport.ts`）+ 现有 toast（`src/utils/toast.ts`）。测试：node:test（结构性源码断言 + 纯函数单测，与项目现有 `tests/*.mjs` 一致）。

**Spec:** `docs/superpowers/specs/2026-11-11-url-import-design.md`

## Global Constraints

- 只支持**纯 .md 直链**；返回 HTML 时 toast 提示「请提供 .md 直链」，不自动转 markdown。
- 不做 Git 仓库文件列表、不新增后端/代理/IPC（raw/gist 带 CORS 头，渲染进程 fetch 可行）。
- 删除 3 份重复 empty-state；本地导入行为与现状一致（`.md/.markdown/.txt` 多选 → `openMarkdownDoc`）。
- 左侧分类固定为：文档库 / URL 在线导入 / 本地导入；Git仓库/博客/GitBook 不再出现。

## Review Focus

1. 粘贴非 http(s) 或空 URL → 按钮禁用或 toast 提示，不发起 fetch。
2. 贴 HTML 页面 URL → toast「请提供 .md 直链」，不新建文档。
3. 网络/CORS 失败 → toast 错误（区分网络错误与 HTTP 非 2xx），不静默。
4. 标题从 URL 末段文件名派生（去扩展名），README.md → README。
5. 文档库弹窗左侧分类与右键内容随 category 正确切换，文档库分类行为不变。

---

### Task 1: URL 导入工具函数

**Files:**
- Create: `src/utils/importUrl.ts`
- Test: `tests/import-url.test.mjs`

**Interfaces:**
- Produces:
  - `validateImportUrl(url: string): string | null` — 合法返回 null，否则返回错误文案（不含 http(s) 协议 / 空）。
  - `looksLikeHtml(text: string): boolean` — 粗略判断是否为 HTML（含 `<html`/`<!doctype`/`<body`/`<div` 等标签）。
  - `deriveTitleFromUrl(url: string): string` — 取 URL 末段文件名去扩展名（`.../README.md` → `README`；无路径段 → hostname）。
  - `fetchMarkdownFromUrl(url: string): Promise<{ title: string; md: string }>` — `fetch(url)` → `response.ok` 检查 → `text()` → `looksLikeHtml` 则 throw 带「请提供 .md 直链」文案 → 返回 `{ title: deriveTitleFromUrl(url), md }`。

- [ ] **Step 1: 写失败测试** `tests/import-url.test.mjs`

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateImportUrl, looksLikeHtml, deriveTitleFromUrl } from '../src/utils/importUrl.ts'

test('validateImportUrl：拒绝空/非 http(s)', () => {
  assert.ok(validateImportUrl(''))
  assert.ok(validateImportUrl('ftp://x/y.md'))
  assert.ok(validateImportUrl('not-a-url'))
  assert.equal(validateImportUrl('https://a/b.md'), null)
  assert.equal(validateImportUrl('http://a/b.md'), null)
})

test('looksLikeHtml：HTML 判定', () => {
  assert.ok(looksLikeHtml('<!doctype html><html><body>x</body></html>'))
  assert.ok(looksLikeHtml('<div class="post">hi</div>'))
  assert.equal(looksLikeHtml('# 标题\n\n正文 **加粗**'), false)
})

test('deriveTitleFromUrl：末段文件名去扩展名', () => {
  assert.equal(deriveTitleFromUrl('https://raw.githubusercontent.com/a/b/main/README.md'), 'README')
  assert.equal(deriveTitleFromUrl('https://gist.github.com/u/abc/raw/file.md'), 'file')
  assert.equal(deriveTitleFromUrl('https://example.com/a/b/c'), 'c')
})
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/import-url.test.mjs`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现** `src/utils/importUrl.ts`

三个纯函数 + `fetchMarkdownFromUrl`（`fetch` 全局，node 20 可用）。`fetchMarkdownFromUrl` 先 `validateImportUrl`，`response.ok` 不满足 throw `new Error('请求失败 (HTTP ${status})')`，`looksLikeHtml` 则 throw `new Error('请提供 .md 直链（raw.githubusercontent.com / gist 等）')`，否则 `openMarkdownDoc` 由调用方做（本模块只返回 `{title, md}`）。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/import-url.test.mjs`
Expected: PASS（3 个 test 全绿）

- [ ] **Step 5: 提交**

```bash
git add src/utils/importUrl.ts tests/import-url.test.mjs
git commit -m "feat(import): URL 导入工具——校验/标题派生/HTML 检测/fetch"
```

---

### Task 2: ImportButtons 改造成 2 标签

**Files:**
- Modify: `src/components/panels/ImportButtons.tsx`
- Test: `tests/import-buttons-2tabs.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `validateImportUrl`。
- Produces:
  - `CATEGORIES`：`[{id:'docs',label:'文档库',icon:'ri-folder-fill'},{id:'url',label:'URL 在线导入',icon:'ri-link'},{id:'local',label:'本地导入',icon:'ri-upload-2-line'}]`
  - `ImportButtons` props：`{ category: string; onImportUrl: (url: string) => Promise<void>; onImportLocal: () => void }`（删除 onImportGit/Blog/Gitbook）。

- [ ] **Step 1: 写失败测试** `tests/import-buttons-2tabs.test.mjs`（结构性源码断言）

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const buttons = read('src/components/panels/ImportButtons.tsx')

// CATEGORIES 只剩 docs/url/local；Git仓库/博客/GitBook 消失
assert.ok(!buttons.includes("label: 'Git 仓库'"))
assert.ok(!buttons.includes("label: '博客'"))
assert.ok(!buttons.includes("label: 'GitBook'"))
assert.match(buttons, /label: 'URL 在线导入'/)
assert.match(buttons, /label: '本地导入'/)

// props 改为 onImportUrl/onImportLocal
assert.match(buttons, /onImportUrl: \(url: string\) => Promise<void>/)
assert.match(buttons, /onImportLocal: \(\) => void/)
assert.ok(!buttons.includes('onImportGit'))

// url 分支渲染输入框 + 导入按钮
assert.match(buttons, /category === 'url'/)
assert.match(buttons, /placeholder=[^>]*\.md|粘贴.*\.md|直链/)
assert.ok(buttons.includes('onImportUrl('))

// local 分支渲染本地导入按钮
assert.match(buttons, /category === 'local'/)
assert.match(buttons, /从本地导入 Markdown/)
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/import-buttons-2tabs.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现** `ImportButtons.tsx`

重写：`CATEGORIES` 3 项；`ImportButtons` 用本地 `useState` 管理 URL 输入 + `loading`；`category==='url'` 渲染说明文案 + `<input>` + 「导入」按钮（`disabled={!url || loading}`，点击 `await onImportUrl(url)`，`catch` 里 toast 错误，finally 清 loading）；`category==='local'` 渲染「从本地导入 Markdown」按钮（`onClick={onImportLocal}`）；`category==='docs'` 返回 null（文档库列表由 LibraryPanel 渲染）。`leftNav` 导出保留（映射新 CATEGORIES）。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/import-buttons-2tabs.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/panels/ImportButtons.tsx tests/import-buttons-2tabs.test.mjs
git commit -m "feat(import): 文档库导入改 2 标签——URL 在线导入 + 本地导入 UI"
```

---

### Task 3: LibraryPanel 接线

**Files:**
- Modify: `src/components/panels/LibraryPanel.tsx`
- Test: `tests/import-buttons-2tabs.test.mjs`（补充断言）或 `tests/library-import-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 1 `fetchMarkdownFromUrl`、Task 2 `ImportButtons` 新 props、现有 `openMarkdownDoc`。
- Produces: 无（终态）。

- [ ] **Step 1: 写失败测试** `tests/library-import-wiring.test.mjs`（结构性源码断言）

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const panel = read('src/components/panels/LibraryPanel.tsx')

// handleImportUrl：调 fetchMarkdownFromUrl + openMarkdownDoc
assert.match(panel, /handleImportUrl/)
assert.match(panel, /fetchMarkdownFromUrl\(/)
assert.match(panel, /openMarkdownDoc\(/)

// 传给 ImportButtons 的是 onImportUrl / onImportLocal（不再传 onImportGit 等）
assert.match(panel, /onImportUrl=\{handleImportUrl\}/)
assert.match(panel, /onImportLocal=\{handleImportLocal\}/)
assert.ok(!panel.includes('onImportGit'))
assert.ok(!panel.includes('onImportBlog'))
assert.ok(!panel.includes('onImportGitbook'))

// 本地选择器仍保留（.md 多选）
assert.match(panel, /type = 'file'/)
assert.match(panel, /accept = '\\.md,\\.markdown,\\.txt'/)
```

- [ ] **Step 2: 运行确认失败**

Run: `node --import tsx --test tests/library-import-wiring.test.mjs`
Expected: FAIL

- [ ] **Step 3: 实现** `LibraryPanel.tsx`

`handleImportLocal` 保留；新增 `handleImportUrl = async (url) => { const { title, md } = await fetchMarkdownFromUrl(url); openMarkdownDoc(title, md) }`（错误由 ImportButtons 的 catch 提示）；`<ImportButtons category={category} onImportUrl={handleImportUrl} onImportLocal={handleImportLocal} />`；删除 3 个 `handleImportGit/Blog/Gitbook` 别名。import 顶部加 `import { fetchMarkdownFromUrl } from '../../utils/importUrl'`。

- [ ] **Step 4: 运行确认通过**

Run: `node --import tsx --test tests/library-import-wiring.test.mjs`
Expected: PASS

- [ ] **Step 5: 全量验证**

Run: `npm test` 与 `npx tsc --noEmit`
Expected: 全部通过（新增测试绿 + 既有 238 项不回归 + typecheck 0 错）

- [ ] **Step 6: 提交**

```bash
git add src/components/panels/LibraryPanel.tsx tests/library-import-wiring.test.mjs
git commit -m "feat(import): LibraryPanel 接线 URL 在线导入 + 本地导入"
```

---

## 自审记录

- **Spec 覆盖**：设计文档全部范围（2 标签 UI、仅 .md 直链、HTML 报错、本地导入保留、删 3 份重复）映射到 Task 1-3。✅
- **类型一致**：`fetchMarkdownFromUrl → {title, md}`、`ImportButtons` props `onImportUrl(url):Promise<void>` 在 Task 2/3 一致。✅
- **Review Focus**：5 条（空/非 http URL、HTML 直链、网络错误、标题派生、分类切换）各由 Task 1（validate/looksLikeHtml/deriveTitle）与 Task 2/3（UI + toast）测试覆盖。✅
- **比例**：计划长度与设计文档相当，无转录实现。✅
