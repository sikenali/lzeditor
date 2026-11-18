# 源码模式表格可操作 — 设计

## Intent / why
用户反馈表格菜单「不能操作」：编辑器已切到 CodeMirror 6 **markdown 源码编辑器**（TipTap/WYSIWYG 已有意移除），源码模式下 `CM6EditorFacade.getTableContext()` 恒返回 `null`，导致 `useTableActive()` 恒 false，表格结构菜单项（左侧插入列/右侧插入列/下方插入行/删除列/删除行/切换标题行/删除表格）**永久置灰**。

用户选择**方案 A：源码模式表格可操作**——检测光标在管道表格内，实现真正的插列/插行/删列/删行（改写 markdown 表格）。表格在预览/阅读/排版视图里照常带样式渲染（`globals.css:392/3230`、`read-mode.css:143` 已有表格边框样式）。

## Goals
- 光标位于 GFM 管道表格块内时，表格结构菜单项**亮起**并**真正生效**。
- 插列/插行/删列/删行改写 markdown 表格，保留对齐（`:---` / `:--:` / `---:`）与转义管道（`\|`）。
- 「删除表格」也实现（移除整块）。
- 表格块外的菜单项仍置灰（无副作用、无静默 no-op）。

## Non-goals / anti-goals
- **不**做 WYSIWYG 直接在编辑器里渲染/编辑表格（方案 B，被用户否决）。
- **不**改预览/阅读/排版视图的表格渲染样式（已正常）。
- **不**「切换标题行」：GFM 无法表达表头切换（首行恒为表头），该菜单项**保持置灰**——若用户要求可再移除。
- **不**做单元格合并/拆分（markdown 无法表达 colspan）。

## Constraints
- 所有改动走现有 `EditorFacade` 契约；`getTableContext()` 返回类型改为可含上下文的联合类型（或新增 `getTableContext()` 返回非空对象），不破坏其它调用方。
- 纯函数（表格解析/改写）放在 `src/utils/tableMd.ts` 或新 `src/utils/tableOps.ts`，node 可测、无 DOM。
- `applyEditorCommand`（cm6-commands.ts:221-222）的 `table.*` 回退（插入新表）保留为「无上下文时」兜底，有上下文时改走真实操作。

## Approaches（已定）
- **A（采用）**：源码模式表格可操作——`getTableContext()` 检测 + 真实表格改写命令。
- **B（否决）**：WYSIWYG 表格（直接显示+编辑），需重新引入被刻意移除的所见即所得层，架构级改动。

## How (decided)
1. **`CM6EditorFacade.getTableContext()`**：光标所在处向上/下找连续的管道表格行（含 `|---|` 分隔行），命中返回 `{ from, to, row, col }`（表格块范围 + 光标行列），否则 `null`。
2. **表格解析/改写纯函数**（`src/utils/tableOps.ts`）：
   - `parseTable(block): { rows: string[][], aligns: string[], headerRowCount }`（处理 `\|` 转义、`|` 拆分、对齐行）。
   - `insertColumn(block, col, side)` / `insertRow(block, row)` / `deleteColumn(block, col)` / `deleteRow(block, row)` / `deleteTable(block)`：改写并重新序列化。
3. **`applyEditorCommand`**：`table.insert-column-left/right`、`table.insert-row-below`、`table.delete-column`、`table.delete-row`、`table.delete-table` → 有上下文则 `replaceRange(table.from, table.to, rewritten)` + 重设光标；无上下文回退插入新表（现状）。
4. **`TABLE_OP_TO_YELI`**（editorActions.tsx:226）：新增 `delete: 'table.delete-table'`；headerRow 不入映射（保持置灰）。
5. **测试**：`tests/table-ops.test.mjs`（纯函数解析/改写）+ `tests/table-context.test.mjs`（getTableContext 检测 + 菜单亮起逻辑）。

## Left to builder
- GFM 表格边界情况的具体处理：单元格内含 `\|`、对齐行缺失、列宽不一致、光标在分隔行/表头行。
- 行列增删后光标落点。
