# 文档目录持久化 + 关闭前落盘 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 用户新建的文档在刷新/重开后仍在文档库里可见；关闭前最后那 800ms 的编辑不丢；本地存储写满时用户能收到提示而不是「内容莫名消失」。

**架构：** 新增 `src/utils/docCatalog.ts` 只负责目录（标题、路径、所属库）的存取，文档正文仍走现有的 `lzeditor-doc-{id}` 单键。内置文档列表从 store 的字面量提成 `DEFAULT_DOCS` 常量，恢复时和 localStorage 里的用户文档合并。把 CM6 防抖回调里的落盘逻辑抽成 `persistEdit()`，供防抖和 `pagehide` 兜底共用。

**技术栈：** TypeScript、Zustand、localStorage（沿用现状，不上 IndexedDB）、node:test + happy-dom

**已核对的现状（不要重复排查）：**
- `src/components/editor/CM6Editor.tsx:57-71` 已有 800ms 防抖落盘到 `lzeditor-doc-${docId}`，同时 `addVersion` + `setSyncStatus`
- `src/utils/docSource.ts:48-55` `readLocalDoc()` 启动时会读回正文，正文不丢
- `src/store/editorStore.ts:94-116` `docs` 是**硬编码的内置文档字面量**，`createDoc`（206-222 行）只 `set()` 进内存
- `docLibraries`（77 行）初始值 `[{ id: 'default', name: 'Default' }]`，从不持久化
- `versions`（89 行）纯内存，`slice(-MAX_VERSIONS)`，`MAX_VERSIONS = 10`
- 全仓库 **0 处** `beforeunload` / `pagehide` / `visibilitychange`
- `src/utils/silentError.ts` 是「真实故障」的统一出口；`src/utils/toast.ts:82` `toast(message, options)` 是用户可见提示

**协作约束：**
- 工作区可能有其他会话的未提交改动，**不要 `git add -A`**，按任务显式列路径。
- **特别注意**：`src/components/editor/CM6Editor.tsx` 经常被别的会话同时改（键盘快捷键、live-preview 都动它）。任务 3 只改防抖那一段（57-71 行），**动手前先 `git diff src/components/editor/CM6Editor.tsx`** 看别人改了什么，必要时用编辑工具精确替换而不是整段重写。
- `npx tsc --noEmit` 当前全绿，这是基准；如果别的会话把 typecheck 弄挂了，验收只看「本任务的四个文件不引入新错误」。
- 提交前用 `git status --porcelain` 确认只暂存了本任务的文件。

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/utils/docCatalog.ts` | 新建 | 目录的存取与合并。唯一负责 `lzeditor-catalog` 键的模块 |
| `tests/doc-catalog.test.mjs` | 新建 | 合并/回退/脏数据的纯函数测试 |
| `src/store/editorStore.ts` | 修改 | 内置文档提成 `DEFAULT_DOCS`；启动时 `restoreSession`；四处变更后持久化 |
| `src/utils/pendingSave.ts` | 新建 | `persistEdit` / `setPendingEdit` / `flushPendingEdit` |
| `src/components/editor/CM6Editor.tsx` | 修改 | 防抖回调改调 `persistEdit`；登记/注销 `pagehide` 兜底 |
| `tests/doc-persistence.test.mjs` | 新建 | 结构断言：兜底接线、静默 catch 被替换 |

---

### 任务 1：`docCatalog.ts` 的存取与合并

**文件：**
- 创建：`src/utils/docCatalog.ts`
- 创建：`tests/doc-catalog.test.mjs`

- [ ] **步骤 1：先建模块骨架，让测试能引用**

创建 `src/utils/docCatalog.ts`：

```ts
export interface CatalogEntry {
  id: string
  title: string
  path: string
  libraryId?: string
  system?: boolean
}

/** CatalogEntry.system 标内置文档。落盘前过滤掉，恢复时靠 BUILTIN_DOCS 重建。 */
export interface Catalog {
  docs: CatalogEntry[]
  docLibraries: Array<{ id: string; name: string }>
  nextUntitledIdx: number
  activeDocId: string
}

const CATALOG_KEY = 'lzeditor-catalog'

export const DEFAULT_LIBRARIES: Array<{ id: string; name: string }> = [
  { id: 'default', name: 'Default' },
]

/**
 * 存目录：内置文档带 system 标记，存盘时丢掉，恢复时靠 BUILTIN_DOCS 重建。
 * 内置文档从不落盘——它们的正文覆盖本来就在 lzeditor-doc-{id} 里。
 */
export function persistCatalog(catalog: Catalog): boolean {
  const toStore: Catalog = {
    ...catalog,
    docs: catalog.docs.filter(d => !d.system),
  }
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(toStore))
    return true
  } catch (e) {
    silentError('保存文档目录失败', e)
    return false
  }
}
```

在文件末尾（`persistCatalog` 之前）补上 import 和读取逻辑：

```ts
import { silentError } from './silentError'

function readCatalog(): Catalog | null {
  try {
    const raw = localStorage.getItem(CATALOG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Catalog>
    if (!parsed || !Array.isArray(parsed.docs)) return null
    return {
      docs: parsed.docs,
      docLibraries: Array.isArray(parsed.docLibraries) ? parsed.docLibraries : DEFAULT_LIBRARIES,
      nextUntitledIdx: typeof parsed.nextUntitledIdx === 'number' ? parsed.nextUntitledIdx : 1,
      activeDocId: typeof parsed.activeDocId === 'string' ? parsed.activeDocId : '',
    }
  } catch (e) {
    silentError('读取文档目录失败', e)
    return null
  }
}

/**
 * 合并：用户文档在前（保留创建顺序），内置文档在后。
 * 恢复出来的条目不带 system 标记——正文照样从 lzeditor-doc-{id} 覆盖读取。
 */
export function mergeDocs(
  storedUserDocs: CatalogEntry[],
  builtinDocs: CatalogEntry[],
): CatalogEntry[] {
  return [...storedUserDocs, ...builtinDocs.map(b => ({ ...b, system: true }))]
}

/**
 * 恢复整场会话。没有任何存档、或存档指向的文档已被删掉时，回落到内置列表。
 */
export function restoreSession(
  builtinDocs: CatalogEntry[],
  fallbackActiveId: string,
): Catalog {
  const stored = readCatalog()
  if (!stored) {
    return {
      docs: builtinDocs.map(b => ({ ...b, system: true })),
      docLibraries: DEFAULT_LIBRARIES,
      nextUntitledIdx: 1,
      activeDocId: fallbackActiveId,
    }
  }
  const exists = stored.docs.some(d => d.id === stored.activeDocId)
  return {
    docs: mergeDocs(stored.docs, builtinDocs),
    docLibraries: stored.docLibraries.length > 0 ? stored.docLibraries : DEFAULT_LIBRARIES,
    nextUntitledIdx: Math.max(1, stored.nextUntitledIdx),
    activeDocId: exists ? stored.activeDocId : fallbackActiveId,
  }
}
```

- [ ] **步骤 2：写失败测试**

创建 `tests/doc-catalog.test.mjs`：

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Window } from 'happy-dom'

// 只为了 localStorage；不用 Node 自带的全局，它在这个版本里没有 Storage。
const win = new Window()
globalThis.window = win.window
globalThis.localStorage = win.localStorage

const { persistCatalog, restoreSession, mergeDocs, DEFAULT_LIBRARIES } =
  await import('../src/utils/docCatalog.ts')

const builtin = [
  { id: 'readme', title: 'README.md', path: 'Default' },
  { id: 'a01-特色功能', title: 'A01', path: '使用手册', system: true },
]

test('persistCatalog 只存用户文档，内置文档靠 system 标记被过滤', () => {
  assert.equal(persistCatalog({
    docs: [...mergeDocs([{ id: 'u1', title: '我的文档' }, { id: 'readme', title: 'README.md', path: 'Default' }], builtin)],
    docLibraries: [{ id: 'default', name: 'Default' }],
    nextUntitledIdx: 1,
    activeDocId: 'u1',
  }), true)
  const raw = JSON.parse(localStorage.getItem('lzeditor-catalog'))
  assert.deepEqual(raw.docs.map(d => d.id), ['u1'], '内置文档不该落盘')
})

test('restoreSession 把用户文档放回库，内置文档标记为 system', () => {
  persistCatalog({
    docs: [{ id: 'u1', title: '我的文档', path: 'Default' }],
    docLibraries: [{ id: 'default', name: 'Default' }],
    nextUntitledIdx: 2,
    activeDocId: 'u1',
  })
  const s = restoreSession(builtin, 'readme')
  assert.deepEqual(s.docs.map(d => d.id), ['u1', 'readme', 'a01-特色功能'])
  assert.equal(s.docs[0].system, undefined, '用户文档不标 system')
  assert.equal(s.docs[1].system, true, '内置文档标 system')
  assert.equal(s.activeDocId, 'u1')
  assert.equal(s.nextUntitledIdx, 2)
})

test('存档指向已删除的文档时回落到默认活动文档', () => {
  persistCatalog({
    docs: [{ id: 'u1', title: 't' }],
    docLibraries: DEFAULT_LIBRARIES,
    nextUntitledIdx: 1,
    activeDocId: '已删除的 id',
  })
  assert.equal(restoreSession(builtin, 'readme').activeDocId, 'readme')
})

test('没有任何存档时回落到内置列表', () => {
  localStorage.clear()
  const s = restoreSession(builtin, 'readme')
  assert.equal(s.docs.length, 2)
  assert.equal(s.activeDocId, 'readme')
  assert.equal(s.nextUntitledIdx, 1)
})

test('localStorage 里是坏 JSON 时静默回落，不抛错', () => {
  localStorage.setItem('lzeditor-catalog', '{这不是 JSON')
  const s = restoreSession(builtin, 'readme')
  assert.equal(s.docs.length, 2)
})
```

- [ ] **步骤 3：跑测试确认失败**

运行：`node --import tsx --test tests/doc-catalog.test.mjs`
预期：FAIL（模块不存在或函数未定义）

- [ ] **步骤 4：跑测试确认通过**

运行：`node --import tsx --test tests/doc-catalog.test.mjs`
预期：PASS，5 个测试全绿

- [ ] **步骤 5：Commit**

```bash
git add src/utils/docCatalog.ts tests/doc-catalog.test.mjs
git commit -m "feat(persist): 文档目录存取与恢复，内置文档不落盘"
```

---

### 任务 2：store 接上目录持久化

**文件：**
- 修改：`src/store/editorStore.ts:94-118`（`docs` 字面量提成常量）
- 修改：`src/store/editorStore.ts` `createDoc`（约 205-222 行）、`closeDoc`（约 248-262 行）、`renameDoc`、`createLibrary`（约 165-180 行）

- [ ] **步骤 1：把内置文档字面量提成模块级常量**

在 `src/store/editorStore.ts` 的 import 区加：

```ts
import { persistCatalog, restoreSession, type CatalogEntry } from '../utils/docCatalog'
```

把 `docs: [ ... ]` 那段字面量（94-118 行）原样搬到 store 创建**之前**的模块作用域：

```ts
const DEFAULT_DOCS: Array<CatalogEntry> = [
  { id: 'readme',                   title: 'README.md',        path: 'Default',        libraryId: 'default' },
  { id: 'a01-特色功能',           title: 'A01 特色功能',   path: '使用手册·基础篇', libraryId: 'manual', system: true },
  // ...其余逐行照抄原字面量，不要改 id/title/path
]

const restored = restoreSession(DEFAULT_DOCS, 'readme')
```

然后把 store 里的四处初始化改成引用常量：

```ts
  docLibraries: restored.docLibraries,
  docs: restored.docs,
  activeDocId: restored.activeDocId,
  docsMd: {} as Record<string, string>,
  nextUntitledIdx: restored.nextUntitledIdx,
```

- [ ] **步骤 2：写一个 `saveCatalog` 助手并在四处变更后调用**

在 `useEditorStore` 创建之前加：

```ts
function saveCatalog(): void {
  const s = useEditorStore.getState()
  persistCatalog({
    docs: (s.docs as Array<any>).map(d => ({
      id: d.id,
      title: d.title,
      path: d.path || '',
      libraryId: d.libraryId,
      system: d.system,
    })),
    docLibraries: s.docLibraries as Array<{ id: string; name: string }>,
    nextUntitledIdx: s.nextUntitledIdx,
    activeDocId: s.activeDocId || 'readme',
  })
}
```

然后在**这四个动作**的 `set(...)` 调用之后各加一行 `saveCatalog()`：
1. `createDoc`（`createDoc` 的 `return id` 之前）
2. `closeDoc`（`set({...})` 之后）
3. `renameDoc`（`set({...})` 之后）
4. `createLibrary`（`set({...})` 之后）

`switchDoc` **不加**——它会覆盖 `activeDocId` 的持久化，而「记住上次打开的文档」由 `switchDoc` 里已有的 `lzeditor-last-doc` 负责，两层记录会打架。

- [ ] **步骤 3：跑测试确认没回归**

运行：`npm test`
预期：PASS（76+ 个测试全绿，包括 `tests/meta-tabs-visibility.test.mjs` 那类断言文档列表结构的测试）

如果 `meta-tabs-visibility` 或 `mode-boundary` 失败，说明有测试断言了「文档列表等于内置列表」，需要把断言改成「包含内置文档」而不是精确相等。不要为了通过测试而删掉 `system: true` 标记。

- [ ] **步骤 4：验证 typecheck 仍然全绿**

运行：`npx tsc --noEmit`
预期：无任何输出（基准就是全绿，不允许引入新错误）

`Catalog.docs` 必须是 `CatalogEntry[]` 而不是不带 `system` 字段的窄类型——`persistCatalog` 里要用 `d.system` 过滤内置文档，类型窄了会在对象字面量上触发 excess property 错误。

- [ ] **步骤 5：Commit**

```bash
git add src/store/editorStore.ts
git commit -m "feat(persist): 文档库与新建文档刷新后可恢复"
```

---

### 任务 3：把落盘逻辑抽成 `persistEdit`，存储写满时给出提示

**文件：**
- 创建：`src/utils/pendingSave.ts`
- 修改：`src/components/editor/CM6Editor.tsx:55-75`

- [ ] **步骤 1：建 `pendingSave.ts`**

创建 `src/utils/pendingSave.ts`：

```ts
import { useEditorStore } from '../store/editorStore'
import { silentError } from './silentError'
import { toast } from './toast'

export interface PendingEdit {
  md: string
  html: string
}

let pending: PendingEdit | null = null
let warned = false

export function setPendingEdit(edit: PendingEdit | null): void {
  pending = edit
}

/**
 * 一次编辑真正落下去：版本快照 + 本地存储。
 * 从 CM6 的防抖回调里抽出来，pagehide 兜底也要用同一个入口，
 * 否则两处各写一份落盘逻辑，迟早有一份写错。
 */
export function persistEdit(docId: string, { md, html }: PendingEdit): void {
  const store = useEditorStore.getState()
  store.addVersion({
    id: String(Date.now()),
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString('zh-CN'),
    desc: md.trim().slice(0, 24) || '空文档',
    changes: md.length,
    html,
    md,
  })
  store.setSyncStatus('synced')
  try {
    localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md, html, savedAt: Date.now() }))
    warned = false
  } catch (e) {
    silentError('保存文档失败', e)
    // 一次会话只提示一次：配额满时防抖回调会连续触发，刷十条 toast 反而更糟
    if (!warned) {
      warned = true
      toast('本地存储已满，最新改动可能没保存', { type: 'warning' })
    }
  }
}

/**
 * 关闭页面前把还没到防抖窗口的那次编辑写下去。
 * 800ms 的防抖意味着硬关窗口必然丢最后一段输入。
 */
export function flushPendingEdit(): void {
  if (!pending) return
  setPendingEdit(null)
  const docId = useEditorStore.getState().activeDocId
  if (!docId) return
  persistEdit(docId, pending)
}
```

- [ ] **步骤 2：把 CM6Editor 的防抖回调改成调用它**

在 `src/components/editor/CM6Editor.tsx` 加 import：

```ts
import { flushPendingEdit, persistEdit, setPendingEdit } from '../../utils/pendingSave'
```

把 63-75 行那段：

```ts
        saveTimerRef.current = setTimeout(() => {
          addVersion({
            id: String(Date.now()),
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString('zh-CN'),
            desc: text.trim().slice(0, 24) || '空文档',
            changes: text.length,
            html,
            md: text,
          })
          useEditorStore.getState().setSyncStatus('synced')
          try {
            localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md: text, html, savedAt: Date.now() }))
          } catch {}
        }, 800)
```

替换成：

```ts
        saveTimerRef.current = setTimeout(() => {
          setPendingEdit(null)
          persistEdit(docId, { md: text, html })
        }, 800)
```

- [ ] **步骤 3：登记 `pagehide` 兜底**

在 `CM6Editor.tsx` 里 `useEditor` 的那次 `useEffect`（就是包含上面 setTimeout 的那个）**之后**新增：

```ts
  useEffect(() => {
    const before = () => flushPendingEdit()
    // pagehide 比 beforeunload 可靠：移动端和标签页复用都会触发它
    window.addEventListener('pagehide', before)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPendingEdit()
    })
    return () => {
      window.removeEventListener('pagehide', before)
    }
  }, [])
```

同时把防抖回调里 `setPendingEdit(null)` **之前**登记当前待存内容——修改 setTimeout 所在的作用域，在 `setTimeout` **调用之前**加一行：

```ts
        setPendingEdit({ md: text, html })
```

完整序列应是：

```ts
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        setPendingEdit({ md: text, html })
        saveTimerRef.current = setTimeout(() => {
          setPendingEdit(null)
          persistEdit(docId, { md: text, html })
        }, 800)
```

- [ ] **步骤 4：确认没有残留的静默 catch**

运行：`grep -n "localStorage.setItem" src/components/editor/CM6Editor.tsx src/components/editor/LZEditor.tsx`
预期：`CM6Editor.tsx` 里不再有 `localStorage.setItem`；`LZEditor.tsx:302` 还有一处，属于「离开编辑器切模式」的另一条写入路径，**本次不动**（避免和另一条在途改动冲突），在任务 5 记为遗留项。

- [ ] **步骤 5：Commit**

```bash
git add src/utils/pendingSave.ts src/components/editor/CM6Editor.tsx
git commit -m "feat(persist): 关闭页面前落盘未防抖完的编辑，配额满时提示"
```

---

### 任务 4：结构断言测试，锁住这条接线

**文件：**
- 创建：`tests/doc-persistence.test.mjs`

- [ ] **步骤 1：写测试**

创建 `tests/doc-persistence.test.mjs`：

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const cm6 = read('src/components/editor/CM6Editor.tsx')
const store = read('src/store/editorStore.ts')
const pendingSave = read('src/utils/pendingSave.ts')

test('待存内容在防抖回调外被登记，落盘走统一入口', () => {
  assert.match(cm6, /setPendingEdit\(\{ md: text, html \}\)/, '防抖窗口内登记待存内容')
  assert.match(cm6, /persistEdit\(docId, \{ md: text, html \}\)/, '防抖到期走 persistEdit')
  assert.doesNotMatch(cm6, /localStorage\.setItem/, 'CM6 不该再直接写 localStorage')
})

test('pagehide 与 hidden 两条路都会兜底落盘', () => {
  assert.match(cm6, /addEventListener\('pagehide'/)
  assert.match(cm6, /visibilityState === 'hidden'/)
  assert.match(cm6, /flushPendingEdit\(\)/)
})

test('配额写满走 silentError + toast，不再静默 catch', () => {
  assert.match(pendingSave, /silentError\(/)
  assert.match(pendingSave, /toast\(/)
  assert.match(pendingSave, /if \(!warned\)/, '一次会话只提示一次')
})

test('四个会改目录的动作都持久化，switchDoc 不持久化', () => {
  const count = (store.match(/saveCatalog\(\)/g) || []).length
  assert.ok(count >= 4, `saveCatalog 至少四处调用，实际 ${count} 处`)
  assert.doesNotMatch(store, /switchDoc[\s\S]{0,600}saveCatalog/, 'switchDoc 不该覆盖上次打开的记录')
})

test('store 启动时从存档恢复文档库', () => {
  assert.match(store, /restoreSession\(/)
  assert.match(store, /DEFAULT_DOCS/)
  assert.match(store, /docLibraries: restored\.docLibraries/)
  assert.match(store, /nextUntitledIdx: restored\.nextUntitledIdx/)
})
```

- [ ] **步骤 2：跑测试**

运行：`node --import tsx --test tests/doc-persistence.test.mjs`
预期：PASS，5 个测试全绿

- [ ] **步骤 3：全量回归**

运行：`npm test`
预期：全部 PASS，无 FAIL

- [ ] **步骤 4：Commit**

```bash
git add tests/doc-persistence.test.mjs
git commit -m "test(persist): 锁住目录恢复与关闭前落盘的接线"
```

---

### 任务 5：手工验收（必须做，纯单测验不出真丢稿）

**文件：** 无

- [ ] **步骤 1：起开发服务**

运行：`npm run dev:web`，打开 `http://localhost:5173`

- [ ] **步骤 2：验证刷新后文档还在**

1. 新建两个文档，各输入不同的正文，分别在两个库下建一个文档
2. `Ctrl+R` 刷新页面
3. 打开文档库面板，确认三个文档都在，标题、所属库都对
4. 点进去确认正文没丢

预期：刷新前能看到的文档，刷新后一一对应存在。

- [ ] **步骤 3：验证关闭前落盘**

1. 打开一个文档，快速连续输入 15 个字符然后**立刻**按 `Ctrl+W` 关掉标签页
2. 重新打开页面，打开该文档

预期：那 15 个字符都在。改动前这里会丢掉最后 800ms 内的输入。

- [ ] **步骤 4：验证配额满的提示**

在 DevTools 里 `localStorage.setItem('filler', 'x'.repeat(4_000_000))`，然后编辑文档并等 1 秒。

预期：出现一条 warning toast「本地存储已满，最新改动可能没保存」，且**只出现一次**（继续输入不再重复弹）。

- [ ] **步骤 5：验证回归项**

1. 删除一个文档后刷新，确认它不再出现（`closeDoc` → `persistCatalog`）
2. 确认打开的文档列表顺序是「用户文档在前、内置手册在后」

- [ ] **步骤 6：验证内置文档仍能还原出厂内容**

打开 `A01 特色功能`，改几个字，点「还原出厂内容」（`resetDocContent`），确认正文回到内置版本。

**遗留项（本次不做，记在提交说明里）：**
- `src/components/editor/LZEditor.tsx:302` 还有一处直写 localStorage 的落盘路径，与 `persistEdit` 重复。要合并就得动那条在途改动，先不碰。
- `versions` 仍是纯内存，刷新后历史版本清空。要做成持久化历史得单独一个计划（涉及 IndexedDB 和存储预算）。

---

## 验收标准

- `npm test` 全绿，新增 `tests/doc-catalog.test.mjs`（5 个）+ `tests/doc-persistence.test.mjs`（5 个）
- `npx tsc --noEmit` **全绿**（无输出）
- 手工验收步骤 1-6 全部通过
- `git show --stat` 每个提交只包含该任务列出的文件
