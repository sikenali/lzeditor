# 统一阅读/样式模式大纲 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 阅读/样式模式的目录统一用顶栏「大纲」组件 `SidebarOutline`，目录与内容同步（样式滚动同步、阅读按页同步），点击目录跳转到对应章节。

**Architecture:** `SidebarOutline` 读 `appMode` 感知模式——编辑模式沿用光标高亮 + 编辑器跳转；阅读/样式模式改用 store `activeTocId` 高亮 + 模块级「跳转注册表」`outlineJump.ts`（内容模式挂载时注册 `(id)=>void`，点击目录调用它）。阅读/样式模式去掉各自内嵌 `read-toc-sidebar`，「目录」按钮改造成切换 `showOutline`。

**Tech Stack:** React + TypeScript + zustand（editorStore）+ CodeMirror 6（编辑模式跳转）。

**Spec:** `docs/superpowers/specs/2026-11-17-outline-unify-design.md`

## Global Constraints

- `parseMdOutline` 的标题 id 与 `mdToHtml` 渲染的锚点 id 一致（均走 `headingId`/`makeHeadingIdGen`）；样式模式滚动同步必须用该 id，不再用 `style-h-${i}`。
- 阅读/样式模式没有源码编辑器：跳转不得依赖 `getEditorFacade()`。
- 编辑模式 `SidebarOutline` 行为不变（`cursorPosition` 高亮 + `getEditorFacade().setSelection/focus` 跳转），现有 `outline-boundary.test.mjs` 必须继续通过。
- 阅读模式保持翻页式（不改成滚动式）；「目录与内容同步」在阅读模式下=当前页所在章节高亮。
- `activeTocId` store 字段保留（App.tsx 内部锚点跳转仍用它）；`readTocOpen`/`tocItems` 移除。
- 保留 `read-toc-*` CSS（`code-mode-boundary.test.mjs` 断言 `.read-toc-sidebar` 必须存在；移除需同步改该测试，超出本次功能范围）。注：与设计文档「移除死样式」的差异——设计文档已将删除范围留给实现者。

## Review Focus

1. **阅读模式空页/末页边界**：当前页对为空或文末时，`activeTocId` 应回落为空串或最后一节，不抛错、不越界。
2. **样式模式滚动到文首/文末**：`useScrollSpy` 在滚动到顶部/底部时正确更新 `activeTocId`（首节/末节）。
3. **`activeTocId` 失配**：`SidebarOutline` 在 `activeTocId` 为空或与 `items` 不匹配时不高亮（`shownCurrent(entries,-1)`→`null`），不崩溃。
4. **跳转回调未注册时**：点击目录在内容模式（`getOutlineJumper()` 返回 null）应安全无操作，不抛错。
5. **`readTocOpen`/`tocItems` 移除后**：无组件/测试再引用它们，类型与 store 一致。

---

### Task 1: 大纲跳转注册表 `outlineJump.ts`

**Files:**
- Create: `src/utils/outlineJump.ts`
- Test: `tests/outline-jump.test.mjs`

**Interfaces:**
- Produces: `registerOutlineJumper(fn: (id: string) => void): void`、`getOutlineJumper(): ((id: string) => void) | null`、`clearOutlineJumper(): void`。后续任务依赖这三个导出。

- [ ] **Step 1: 写失败测试 `tests/outline-jump.test.mjs`**

```js
import assert from 'node:assert/strict'
import { registerOutlineJumper, getOutlineJumper, clearOutlineJumper } from '../src/utils/outlineJump.ts'

// 未注册时返回 null
assert.equal(getOutlineJumper(), null, '未注册时 getOutlineJumper 返回 null')

// 注册后返回该函数
const fn = (id) => { void id }
registerOutlineJumper(fn)
assert.equal(getOutlineJumper(), fn, '注册后 getOutlineJumper 返回该函数')

// 重复注册覆盖
const fn2 = (id) => { void id }
registerOutlineJumper(fn2)
assert.equal(getOutlineJumper(), fn2, '重复注册覆盖旧回调')

// 清空后返回 null
clearOutlineJumper()
assert.equal(getOutlineJumper(), null, 'clearOutlineJumper 后返回 null')

console.log('outline jump registry ok')
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test tests/outline-jump.test.mjs`
Expected: FAIL（模块不存在，import 报错）

- [ ] **Step 3: 实现 `src/utils/outlineJump.ts`**

```ts
/** 内容模式（阅读/样式）的目录跳转回调。模块级单例，仿照 components/editor/facade/registry.ts。 */
export type OutlineJumper = (id: string) => void
let current: OutlineJumper | null = null
export function registerOutlineJumper(fn: OutlineJumper): void { current = fn }
export function getOutlineJumper(): OutlineJumper | null { return current }
export function clearOutlineJumper(): void { current = null }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test tests/outline-jump.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/outlineJump.ts tests/outline-jump.test.mjs
git commit -m "feat(outline): 大纲跳转注册表 outlineJump 模块级单例"
```

---

### Task 2: `SidebarOutline` 感知模式（编辑不变，阅读/样式用 activeTocId + 跳转注册表）

**Files:**
- Modify: `src/components/sidebar/SidebarOutline.tsx`
- Test: `tests/outline-mode-aware.test.mjs`

**Interfaces:**
- Consumes: `getOutlineJumper()`（Task 1）。
- Produces: `SidebarOutline` 在 `appMode==='read'|'style'` 时用 store `activeTocId` 高亮、点击调 `getOutlineJumper()?.(item.id)`；编辑模式路径不变。

- [ ] **Step 1: 写失败测试 `tests/outline-mode-aware.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const sidebar = readFileSync(new URL('../src/components/sidebar/SidebarOutline.tsx', import.meta.url), 'utf8')

// 必须感知模式：读 appMode 并区分内容模式
assert.match(sidebar, /appMode/, 'SidebarOutline 必须订阅 editorStore.appMode')
assert.match(sidebar, /appMode === 'read' \|\| appMode === 'style'/, '内容模式 = 阅读/样式')

// 内容模式下高亮走 store activeTocId
assert.match(sidebar, /activeTocId/, '内容模式高亮必须订阅 store activeTocId')

// 跳转：内容模式走注册表，编辑模式走 facade（保留）
assert.match(sidebar, /getOutlineJumper\(\)/, '内容模式点击必须经 getOutlineJumper 跳转')
assert.match(sidebar, /getEditorFacade\(\)/, '编辑模式点击仍经 getEditorFacade（编辑路径不变）')
assert.match(sidebar, /setSelection\(item\.pos/, '编辑模式跳转仍选中标题源码区间')

console.log('outline mode-aware checks passed')
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test tests/outline-mode-aware.test.mjs`
Expected: FAIL（`getOutlineJumper` / `activeTocId` 未出现）

- [ ] **Step 3: 修改 `src/components/sidebar/SidebarOutline.tsx`**

在组件顶部订阅：
```ts
const appMode = useEditorStore((s: any) => s.appMode)
const activeTocId = useEditorStore((s: any) => s.activeTocId)
const isContentMode = appMode === 'read' || appMode === 'style'
```
改 `current` 计算（内容模式从 `activeTocId` 反查，编辑模式从光标行）：
```ts
const current = useMemo(() => {
  if (isContentMode) {
    if (!activeTocId) return -1
    return items.findIndex(i => i.id === activeTocId)
  }
  return currentSectionIndex(items, cursorPosition?.line ?? 1)
}, [isContentMode, activeTocId, items, cursorPosition])
```
改 `handleJump`（内容模式走注册表，编辑模式走 facade）：
```ts
const handleJump = useCallback((item: MdOutlineItem) => {
  if (isContentMode) { getOutlineJumper()?.(item.id); return }
  const facade = getEditorFacade()
  if (!facade) return
  facade.setSelection(item.pos, item.pos + item.text.length)
  facade.focus()
}, [isContentMode])
```
（`import { getOutlineJumper } from '../../utils/outlineJump'`。）

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test tests/outline-mode-aware.test.mjs tests/outline-boundary.test.mjs`
Expected: PASS（新模式感知 + 既有编辑路径断言都过）

- [ ] **Step 5: 提交**

```bash
git add src/components/sidebar/SidebarOutline.tsx tests/outline-mode-aware.test.mjs
git commit -m "feat(outline): SidebarOutline 感知模式，阅读/样式走 activeTocId+跳转注册表"
```

---

### Task 3: `ReadMode` 去掉内嵌目录，加翻页同步 + 跳转注册

**Files:**
- Modify: `src/components/editor/ReadMode.tsx`
- Test: `tests/read-mode-outline.test.mjs`

**Interfaces:**
- Consumes: `registerOutlineJumper`/`clearOutlineJumper`（Task 1）、store `setActiveTocId`、`setShowOutline`。
- Produces: 翻页时 `setActiveTocId(id)`（id 来自 `parseMdOutline(md)`）；挂载注册 `(id)=>跳转到章节所在页`。

- [ ] **Step 1: 写失败测试 `tests/read-mode-outline.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const mode = readFileSync(new URL('../src/components/editor/ReadMode.tsx', import.meta.url), 'utf8')

// 去掉内嵌目录：不再渲染 read-toc-sidebar，不再用 readTocOpen
assert.doesNotMatch(mode, /read-toc-sidebar/, 'ReadMode 不再内嵌目录侧栏')
assert.doesNotMatch(mode, /readTocOpen/, 'ReadMode 不再用 readTocOpen')

// 目录按钮改造成切换统一大纲面板（showOutline）
assert.match(mode, /setShowOutline\(!showOutline\)/, '目录按钮切换 showOutline')

// 翻页同步：订阅 spread/pages 变化时 setActiveTocId
assert.match(mode, /setActiveTocId/, '翻页时必须更新 store activeTocId')

// 跳转注册：挂载注册，卸载清理
assert.match(mode, /registerOutlineJumper\(/, '挂载时注册大纲跳转')
assert.match(mode, /clearOutlineJumper/, '卸载时清理大纲跳转')

// 跳转实现：用 pageOfLine 反查章节所在页，jumpTo 到对应页对
assert.match(mode, /pageOfLine\(/, '跳转必须经 pageOfLine 反查所在页')
assert.match(mode, /jumpTo\(/, '跳转必须经 jumpTo 到对应页')

console.log('read-mode outline checks passed')
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test tests/read-mode-outline.test.mjs`
Expected: FAIL

- [ ] **Step 3: 修改 `src/components/editor/ReadMode.tsx`**

1. 去掉 `readTocOpen`/`setReadTocOpen` 订阅与内嵌 `read-toc-sidebar` JSX；`read-mode-body` 不再按 `readTocOpen` 改 `flexDirection`（去掉 `style={{ flexDirection: readTocOpen ? 'row' : 'column' }}`，保留 `display:flex;flex:1;min-height:0`）。
2. 「目录」按钮 `onClick` 改 `setShowOutline(!showOutline)`（新增 `setShowOutline` 订阅）。
3. 新增翻页同步 effect：`spread`/`pages` 变化时，取当前页对首块源码行 `startLine = pages[spread*2]?.blocks[0]?.line ?? pages[spread*2+1]?.blocks[0]?.line`；若 `startLine === undefined` → `setActiveTocId('')`；否则 `const idx = currentSectionIndex(toc, startLine + 1); setActiveTocId(idx < 0 ? '' : toc[idx].id)`。（`currentSectionIndex` 从 `../../utils/outline` 导入；`toc` 已是 `parseMdOutline(md)`。）
4. 跳转注册（用 ref 持有最新 `toc`/`pages`/`jumpTo`，挂载注册一次、卸载 `clearOutlineJumper`）：
```ts
const jumperRef = useRef<(id: string) => void>(() => {})
jumperRef.current = (id) => {
  const it = toc.find(i => i.id === id)
  if (!it) return
  const p = pageOfLine(pages, it.line - 1)
  jumpTo(p === null ? 0 : Math.floor(p / 2))
}
useEffect(() => {
  registerOutlineJumper((id) => jumperRef.current(id))
  return () => clearOutlineJumper()
}, [])
```
（`registerOutlineJumper`/`clearOutlineJumper` 从 `../../utils/outlineJump` 导入；删除原 `onTocClick`/`activeTocId` 局部订阅，改用 store。）

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test tests/read-mode-outline.test.mjs tests/mode-boundary.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/editor/ReadMode.tsx tests/read-mode-outline.test.mjs
git commit -m "feat(read): 去掉内嵌目录，改顶栏大纲 + 翻页同步 + 跳转注册"
```

---

### Task 4: `StyleMainPanel` 去掉内嵌目录，滚动同步改用 parseMdOutline id + 跳转注册

**Files:**
- Modify: `src/components/panels/StyleMainPanel.tsx`
- Test: `tests/style-panel-outline.test.mjs`
- Remove: `tests/style-panel-toc-reopen.test.mjs`, `tests/style-panel-toc-wiring.test.mjs`

**Interfaces:**
- Consumes: `registerOutlineJumper`/`clearOutlineJumper`（Task 1）、`parseMdOutline`、store `setActiveTocId`/`setShowOutline`。
- Produces: 滚动同步更新 `activeTocId`（id 来自 `parseMdOutline`）；挂载注册 `(id)=>scrollIntoView`。

- [ ] **Step 1: 写失败测试 `tests/style-panel-outline.test.mjs`**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const panel = readFileSync(new URL('../src/components/panels/StyleMainPanel.tsx', import.meta.url), 'utf8')

// 去掉内嵌目录与旧 readTocOpen/tocItems 依赖
assert.doesNotMatch(panel, /read-toc-sidebar/, 'StyleMainPanel 不再内嵌目录侧栏')
assert.doesNotMatch(panel, /readTocOpen/, 'StyleMainPanel 不再用 readTocOpen')
assert.doesNotMatch(panel, /tocItems|setTocItems/, 'StyleMainPanel 不再用 store tocItems')

// 目录按钮改造成切换 showOutline
assert.match(panel, /setShowOutline\(!showOutline\)/, '目录按钮切换 showOutline')

// 滚动同步 id 来自 parseMdOutline（不再 style-h-${i}）
assert.match(panel, /parseMdOutline/, '滚动同步必须用 parseMdOutline 的 id')
assert.doesNotMatch(panel, /style-h-\$\{i\}/, '不再给标题造 style-h-N 假 id')

// 同步 store activeTocId + 跳转注册
assert.match(panel, /setActiveTocId/, '滚动同步必须更新 store activeTocId')
assert.match(panel, /registerOutlineJumper\(/, '挂载时注册大纲跳转')
assert.match(panel, /clearOutlineJumper/, '卸载时清理大纲跳转')
assert.match(panel, /scrollIntoView/, '跳转必须 scrollIntoView 到章节')

console.log('style-panel outline checks passed')
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test tests/style-panel-outline.test.mjs`
Expected: FAIL

- [ ] **Step 3: 修改 `src/components/panels/StyleMainPanel.tsx`**

1. 去掉 `readTocOpen`/`setReadTocOpen`/`storeTocItems`/`setTocItems` 订阅与内嵌 `read-toc-sidebar` JSX；`read-mode-body` 不再按 `readTocOpen` 改 `flexDirection`。
2. 「目录」按钮 `onClick` 改 `setShowOutline(!showOutline)`（新增订阅）。
3. 章节提取改用 `parseMdOutline`：
```ts
const outlineItems = useMemo(() => parseMdOutline(effectiveMd), [effectiveMd])
useEffect(() => {
  setChapters(outlineItems.map(item => ({ id: item.id, text: item.text, level: item.level })))
}, [outlineItems])
```
4. 滚动同步：`chapterItems` 仍 `document.getElementById(c.id)` 取 `el`；`useScrollSpy` 的 `activeId`/`setActiveId` 改用 store `activeTocId`/`setActiveTocId`（`Chapter` 接口的 `id` 即 `parseMdOutline` id，与渲染锚点一致）。
5. 跳转注册（挂载注册、卸载清理）：
```ts
const jumperRef = useRef<(id: string) => void>(() => {})
jumperRef.current = (id) => scrollToChapter(id)
useEffect(() => {
  registerOutlineJumper((id) => jumperRef.current(id))
  return () => clearOutlineJumper()
}, [])
```
6. `handlePrevChapter`/`handleNextChapter` 改用 `activeTocId`（store）代替局部 `activeChapterId`。

- [ ] **Step 4: 删除过时测试**

```bash
git rm tests/style-panel-toc-reopen.test.mjs tests/style-panel-toc-wiring.test.mjs
```
（这两个测试断言的是被移除的内嵌目录行为：`setReadTocOpen(!readTocOpen)`、`setTocItems(items)`，已无对应实现。）

- [ ] **Step 5: 运行测试确认通过**

Run: `node --import tsx --test tests/style-panel-outline.test.mjs`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/components/panels/StyleMainPanel.tsx tests/style-panel-outline.test.mjs
git rm tests/style-panel-toc-reopen.test.mjs tests/style-panel-toc-wiring.test.mjs
git commit -m "feat(style): 去掉内嵌目录，滚动同步用 parseMdOutline id + 跳转注册"
```

---

### Task 5: 清理 store/types 死状态（readTocOpen、tocItems），跑全量测试

**Files:**
- Modify: `src/store/editorStore.ts`, `src/shared/types.ts`
- Test: 全量 `npm test`

**Interfaces:**
- 移除 `readTocOpen`、`tocItems` 及 `setReadTocOpen`、`setTocItems`（无组件/测试再引用）；保留 `activeTocId`/`setActiveTocId`。

- [ ] **Step 1: 确认无残留引用**

Run: `grep -rn "readTocOpen\|tocItems\|setReadTocOpen\|setTocItems" src/ tests/`
Expected: 仅 `src/store/editorStore.ts` 与 `src/shared/types.ts` 命中（组件已在上游任务清理）

- [ ] **Step 2: 从 `src/shared/types.ts` 移除 `readTocOpen`、`tocItems` 字段与 `setReadTocOpen`、`setTocItems` 方法签名**

删除 `readTocOpen: boolean`、`tocItems: { id: string; text: string; level: number }[]`、`setReadTocOpen: (open: boolean) => void`、`setTocItems: (items: { id: string; text: string; level: number }[]) => void`。

- [ ] **Step 3: 从 `src/store/editorStore.ts` 移除对应初始值与 setter**

删除 `readTocOpen: true as const`、`tocItems: [] as ...`、`setReadTocOpen: ...`、`setTocItems: ...`。

- [ ] **Step 4: 运行全量测试 + 类型检查**

Run: `npm test && npx tsc --noEmit`
Expected: 全过（`read-toc-*` CSS 保留，`code-mode-boundary` 断言不受影响）

- [ ] **Step 5: 提交**

```bash
git add src/store/editorStore.ts src/shared/types.ts
git commit -m "refactor(store): 移除已无引用的 readTocOpen/tocItems 死状态"
```

---

## 备注

- `read-toc-*` CSS 保留不动（`code-mode-boundary.test.mjs` 断言 `.read-toc-sidebar` 必须存在；移除需同步改该测试，超出本次功能范围）。
- 编辑模式 `SidebarOutline` 行为与 `outline-boundary.test.mjs` 全量断言保持不变。
- 样式模式 `useScrollSpy` 的 `items[].el` 依赖渲染后 DOM 已就绪（现有 effect 时序已满足）。
