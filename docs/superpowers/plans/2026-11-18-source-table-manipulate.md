# 源码模式表格可操作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让源码模式下表格结构菜单项在光标位于 GFM 管道表格内时亮起并真正生效（插列/插行/删列/删行/删表）。

**Architecture:** 在 `CM6EditorFacade.getTableContext()` 里用纯函数 `locateTable(source, cursor)` 检测光标所在管道表格块；新增纯函数 `tableOps.ts`（解析/改写 markdown 表格）；`applyEditorCommand` 的 `table.*` 分支在有上下文时改写表格、无上下文保留「插入新表」兜底；`TABLE_OP_TO_YELI` 增加 `delete → table.delete-table`。

**Tech Stack:** TypeScript、CodeMirror 6（EditorFacade）、node:test（`node --import tsx --test`）。

**Spec:** `docs/superpowers/specs/2026-11-18-source-table-manipulate-design.md`

## Global Constraints

- 表格解析/改写必须是**纯函数、无 DOM**（node 可测），放 `src/utils/tableOps.ts`。
- 所有编辑器改动走现有 `EditorFacade` 契约；不改预览/阅读/排版视图的表格渲染样式。
- 「切换标题行」保持置灰（GFM 无法表达表头切换），不入 `TABLE_OP_TO_YELI`。
- 命令名沿用现有 yeli 风格：`table.insert-column-left` / `table.insert-column-right` / `table.insert-row-below` / `table.delete-column` / `table.delete-row` / `table.delete-table`。

## Review Focus

1. 光标在分隔行（`|---|`）内：菜单应视为在表格内（行 index = 分隔行）。
2. 单元格内含转义管道 `\|`：解析不得拆错列。
3. 对齐行含 `:---` / `:--:` / `---:`：插入列后对齐行新增单元格须保持该列对齐标记。
4. 删列后只剩 0 列：整块表格删除（不残留非法 markdown）。
5. 删行命中表头/分隔行：守卫，不产生非法表格（分隔行被删则整块退化为非表格时删除整块）。

---

### Task 1: `tableOps.ts` 纯函数 — 定位/解析/改写

**Files:**
- Create: `src/utils/tableOps.ts`
- Test: `tests/table-ops.test.mjs`

**Interfaces:**
- Consumes: nothing (standalone pure util)
- Produces:
  - `type Align = 'left' | 'center' | 'right' | 'none'`
  - `interface TableContext { from: number; to: number; row: number; col: number }`
  - `locateTable(source: string, cursor: number): TableContext | null`
  - `parseTable(lines: string[]): { rows: string[][]; aligns: Align[] }`
  - `insertColumn(lines: string[], col: number, side: 'left' | 'right'): string[]`
  - `insertRow(lines: string[], row: number): string[]`
  - `deleteColumn(lines: string[], col: number): string[] | null`（null → 删整块）
  - `deleteRow(lines: string[], row: number): string[] | null`

- [ ] **Step 1: Write the failing test** `tests/table-ops.test.mjs`

```js
import assert from 'node:assert/strict'
import { locateTable, parseTable, insertColumn, insertRow, deleteColumn, deleteRow } from '../src/utils/tableOps.ts'

const BLOCK = ['| H1 | H2 |', '| --- | --- |', '| a | b |'].join('\n')

// locateTable: 光标在表格内
const src = ['before', ...BLOCK.split('\n'), 'after'].join('\n')
const ctx = locateTable(src, src.indexOf('a'))
assert.deepEqual(ctx, { from: src.indexOf('| H1'), to: src.indexOf('| a') + '| a | b |'.length, row: 2, col: 0 })
assert.equal(locateTable(src, 0), null)          // 表格外 → null
assert.equal(locateTable('plain\ntext', 3), null) // 无表格 → null

// parseTable
const p = parseTable(BLOCK.split('\n'))
assert.equal(p.rows.length, 3)
assert.deepEqual(p.rows[0], [' H1 ', ' H2 '])
assert.deepEqual(p.aligns, ['none', 'none'])

// insertColumn(col=0, 'right')：在 H1 右侧插入新列，分隔行加 ---
const afterIns = insertColumn(BLOCK.split('\n'), 0, 'right')
assert.deepEqual(afterIns[0].split('|').map(s => s.trim()).filter(Boolean), ['H1', '', 'H2'])
assert.equal((afterIns[1].match(/-/g) || []).length >= 3, true)

// insertRow：在表体行(2)下方插入空行
const afterRow = insertRow(BLOCK.split('\n'), 2)
assert.equal(afterRow.length, 4)
assert.deepEqual(afterRow[3].split('|').map(s => s.trim()).filter(Boolean), ['', ''])

// deleteColumn：删 H2 列
const afterDelCol = deleteColumn(BLOCK.split('\n'), 1)
assert.deepEqual(afterDelCol[0].split('|').map(s => s.trim()).filter(Boolean), ['H1'])
assert.equal(afterDelCol[2].split('|').map(s => s.trim()).filter(Boolean)[0], 'a')

// deleteRow：删表体行
const afterDelRow = deleteRow(BLOCK.split('\n'), 2)
assert.equal(afterDelRow.length, 2)

// 转义管道 \| 不拆列
const esc = ['| a \\| b | c |', '| --- | --- |', '| x | y |'].join('\n')
assert.equal(locateTable(esc, esc.indexOf('x')).col, 0)

// Review Focus #1：光标在分隔行内 → 仍定位在表格内（row = 分隔行索引）
const delimCtx = locateTable(src, src.indexOf('| --- |'))
assert.equal(delimCtx.row, 1)

// Review Focus #3：对齐标记保留（:--- / :--: / ---:）
const aligned = ['| L | C | R |', '| :--- | :--: | ---: |', '| a | b | c |'].join('\n')
const afterAlignIns = insertColumn(aligned.split('\n'), 0, 'right')
assert.match(afterAlignIns[1], /:---/)
assert.match(afterAlignIns[1], /:--:/)

// Review Focus #4：删到 0 列 → 返回 null（整块删除）
const oneCol = ['| H |', '| --- |', '| a |'].join('\n')
assert.equal(deleteColumn(oneCol.split('\n'), 0), null)

// Review Focus #5：删分隔行 → 非法（退化为非表格）→ 返回 null
const guard = deleteRow(BLOCK.split('\n'), 1)
assert.equal(guard, null)
// 删表头行 → 分隔行顶上，仍返回行数-1（分隔行成为表头）
const afterHeaderDel = deleteRow(BLOCK.split('\n'), 0)
assert.equal(afterHeaderDel.length, 2)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/table-ops.test.mjs`
Expected: FAIL — `locateTable` is not a function / module not found

- [ ] **Step 3: Implement `src/utils/tableOps.ts`**

`locateTable`：从 cursor 所在行向上下扩展连续的「表格行」（每行去掉首尾空白后以 `|` 开头，或整行为分隔行），块内须含一条分隔行（`/^\|?[\s:|-]+\|?\s*$/` 且含 `-`）；命中返回 `{ from, to, row, col }`，`col` 由该行 cursor 前未转义 `|` 数确定。`parseTable`：按 `|` 拆分（`\|` 视为字面），分隔行解析 `Align`。插入/删除按行列改写并重新序列化；对齐行新增单元格写对应 `---`/`:--:` 等。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/table-ops.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/tableOps.ts tests/table-ops.test.mjs
git commit -m "feat(table): markdown 表格纯函数 — locateTable/parseTable/insertColumn/insertRow/deleteColumn/deleteRow"
```

---

### Task 2: `getTableContext()` 检测 — 接入 EditorFacade

**Files:**
- Modify: `src/components/editor/facade/EditorFacade.ts:75`
- Modify: `src/components/editor/facade/cm6/CM6EditorFacade.ts:170-174`
- Test: `tests/table-context.test.mjs`

**Interfaces:**
- Consumes: `locateTable` + `TableContext` from Task 1
- Produces: `EditorFacade.getTableContext(): TableContext | null`

- [ ] **Step 1: Write the failing test** `tests/table-context.test.mjs`

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// 接口返回类型放宽：getTableContext 不再恒 null
const facade = read('src/components/editor/facade/EditorFacade.ts')
assert.match(facade, /getTableContext\(\):\s*TableContext\s*\|\s*null/, 'EditorFacade.getTableContext 返回 TableContext | null')
// 实现不再无条件 return null
const cm6 = read('src/components/editor/facade/cm6/CM6EditorFacade.ts')
assert.match(cm6, /getTableContext\(\)[^}]*locateTable/, 'CM6EditorFacade.getTableContext 用 locateTable 检测')
assert.doesNotMatch(cm6, /getTableContext\(\):\s*null\s*\{\s*return null/, 'getTableContext 不再恒返回 null')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/table-context.test.mjs`
Expected: FAIL — `TableContext | null` 未出现

- [ ] **Step 3: Implement**

- `EditorFacade.ts`：`import type { TableContext } from '../../utils/tableOps'`；`getTableContext(): TableContext | null`（更新顶部契约注释）。
- `CM6EditorFacade.ts`：`getTableContext()` 返回 `locateTable(getDoc(), view.state.selection.main.head)`（getDoc 为当前源码），并导入 `locateTable`。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/table-context.test.mjs`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/facade/EditorFacade.ts src/components/editor/facade/cm6/CM6EditorFacade.ts tests/table-context.test.mjs
git commit -m "feat(table): CM6EditorFacade.getTableContext 用 locateTable 检测管道表格（不再恒 null）"
```

---

### Task 3: 接线 `table.*` 命令 + 菜单启用

**Files:**
- Modify: `src/components/editor/facade/cm6/cm6-commands.ts:221-222`
- Modify: `src/components/layout/editorActions.tsx:226-232`
- Test: `tests/table-command-dispatch.test.mjs`

**Interfaces:**
- Consumes: `getTableContext()`（Task 2）+ `insertColumn/insertRow/deleteColumn/deleteRow`（Task 1）
- Produces: 无新接口；`TABLE_OP_TO_YELI` 增加 `delete → 'table.delete-table'`

- [ ] **Step 1: Write the failing test** `tests/table-command-dispatch.test.mjs`

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const cmds = read('src/components/editor/facade/cm6/cm6-commands.ts')
const actions = read('src/components/layout/editorActions.tsx')

// table.* 命令在有上下文时改写，而非一律插入新表
assert.match(cmds, /name\.startsWith\("table\."\)[^}]*getTableContext/, 'table.* 分支先查 getTableContext')
assert.match(cmds, /name\.startsWith\("table\."\)[^}]*insertColumn|table\.delete-table/, 'table.* 分支走表格改写')
// 删除表格加入映射
assert.match(actions, /delete:\s*'table\.delete-table'/, 'TABLE_OP_TO_YELI 增加 delete → table.delete-table')
// headerRow 不入映射（保持置灰）
const mapBlock = actions.match(/TABLE_OP_TO_YELI[\s\S]*?\n}/)?.[0] || ''
assert.doesNotMatch(mapBlock, /headerRow/, 'headerRow 不入 TABLE_OP_TO_YELI')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/table-command-dispatch.test.mjs`
Expected: FAIL — 断言未匹配

- [ ] **Step 3: Implement**

- `cm6-commands.ts`：`applyEditorCommand` 的 `table.*` 分支改为——`const ctx = facade.getTableContext(); if (ctx) { const src = facade.getText(); const lines = src.slice(ctx.from, ctx.to).split('\n'); let next: string[] | null = null; switch(name){ case 'table.insert-column-left': next = insertColumn(lines, ctx.col, 'left'); break; case 'table.insert-column-right': next = insertColumn(lines, ctx.col, 'right'); break; case 'table.insert-row-below': next = insertRow(lines, ctx.row); break; case 'table.delete-column': next = deleteColumn(lines, ctx.col); break; case 'table.delete-row': next = deleteRow(lines, ctx.row); break; case 'table.delete-table': next = []; break; } if (next) { if (next.length === 0) facade.replaceRange(ctx.from, ctx.to, ''); else facade.replaceRange(ctx.from, ctx.to, next.join('\n')); facade.setSelection(ctx.from, ctx.from); return true } return insertCommand(facade, 'insert.table', args) } return insertCommand(facade, 'insert.table', args)`。`deleteColumn`/`deleteRow` 返回 `null`（0 列/非法）同样走 `next.length===0` 分支删除整块。
- `editorActions.tsx`：`TABLE_OP_TO_YELI` 增加 `delete: 'table.delete-table'`；`tableAction` 里 `delete` 不再被 `getTableContext()` 短路拦截（删除表格无需光标在单元格内才可用，但保持与其它项一致：仍要求上下文存在）。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/table-command-dispatch.test.mjs`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/facade/cm6/cm6-commands.ts src/components/layout/editorActions.tsx tests/table-command-dispatch.test.mjs
git commit -m "feat(table): table.* 命令在上下文内改写表格，删除表格可用；TABLE_OP_TO_YELI 加 delete"
```

---

### Task 4: 全量验证

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm run test`
Expected: 全部通过（既有 301 + 新增 table-ops/table-context/table-command-dispatch）

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: typecheck 无错，build 成功

- [ ] **Step 3: 无头浏览器验证菜单亮起**

在 dist 下 serve，进入编辑模式，在文档中插入 `| a | b |\n| --- | --- |\n| 1 | 2 |` 并把光标置于表内，打开表格飞出菜单，断言「左侧插入列/删除行」等项 `disabled` 为 false；光标移到表格外则恢复置灰。

- [ ] **Step 4: Commit（如有测试/脚本改动）或记录验证结论**

```bash
git add -A && git commit -m "test(table): 全量验证表格操作" || echo "no changes to commit"
```
