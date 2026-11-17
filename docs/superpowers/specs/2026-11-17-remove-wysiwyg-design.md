# 移除 WYSIWYG 模式入口 + 清理 WYSIWYG 死代码 —— 设计文档（短版）

> 日期：2026-11-17
> 目标：`lzeditor` 去掉 WYSIWYG 模式的入口，并清理 WYSIWYG 相关死代码
> 用户指定：**去掉入口 + 清理死代码**

## 意图

WYSIWYG 模式（Milkdown/Textus 只读预览）是历史遗留的并存模式，此前已造成
「WYSIWYG 与预览冲突」（`3a794cb` 修复）。用户决定去掉它的入口并清理其接线死代码，
让 WYSIWYG 从产品中不可进入。

## 当前事实（已探明）

- **唯一入口**：`editorActions.tsx:69` `MODE_ITEMS` 的 `{ icon:'ri-article-line', label:'WYSIWYG 模式', action:'wysiwyg' }`，由 Toolbar 与 LeftNav 的模式飞出菜单共用。点击 → `modeAction('wysiwyg')` → `setWysiwyg(!wysiwyg)`（`editorActions.tsx:295-297`）。
- **不持久化**：`editorStore.ts:129` `wysiwyg: false` 默认，`lzeditor-layout` 不存它 → 每次加载为 false。去掉入口后 WYSIWYG 永不可达。
- **接线死代码**（去掉入口后不可达）：
  - `App.tsx:83` `wysiwyg` selector；`:17` `TextusPreview` import；`:459-461` `wysiwyg ? <TextusPreview/> : <CodeEditor/>`；`:466` `shouldShowRightPreview({..., wysiwyg})`。
  - `modeLayout.ts:12-25` `shouldShowRightPreview` 的 `wysiwyg` 参数 + `&& !wysiwyg`。
  - `editorActions.tsx:88-103` `applyWysiwygItems`（wysiwyg 下禁用命令型菜单项）；`:238-243` runMapped 的 wysiwyg toast 守卫；`:311-314` `wysiwyg` 返回。
  - `Toolbar.tsx` / `LeftNav.tsx`：`applyWysiwygItems` import + `wysiwyg` 解构 + `disabled={wysiwyg}`（大纲/查找/粗体/斜体/删除线）+ `applyWysiwygItems(FORMAT_ITEMS, wysiwyg)` 调用。
  - `editorStore.ts:129,199` `wysiwyg` 字段 + `setWysiwyg`；`shared/types.ts:66-67,96` 对应类型。

## 目标

- WYSIWYG 模式入口（模式菜单项）移除；WYSIWYG 从产品不可进入。
- 所有 WYSIWYG 接线死代码（store/类型/App 分支/modeLayout 参数/applyWysiwygItems/disabled 状态）删除。

## 非目标（反目标）

- **不**删 Textus/Milkdown 编辑器子系统（`src/additional/milkdown/`，220 文件 / 27.8k LOC）。
  改后它不再被 import（App 只挂 CodeEditor），Vite 不再打包它，但源码与 `textus-*.test.mjs`
  测试保留在仓库 —— 删它是**另一个更大的清理**，本任务不做（见「后续」）。
- **不**改其余模式（预览/代码/排版/阅读）行为。`shouldShowRightPreview` 去掉 `wysiwyg` 参数后，非 WYSIWYG 路径行为不变（`wysiwyg` 恒 false，`&& !false` 恒 true，无行为变化）。
- **不**改 TextusPreview/CodeEditor 组件本身（只改 App 的挂载选择）。

## 具体改动（how）

| 位置 | 现在 | 改为 |
|------|------|------|
| `editorActions.tsx:69` | MODE_ITEMS 含 WYSIWYG 项 | 删该项 |
| `editorActions.tsx:88-103` | `applyWysiwygItems` | 删函数 |
| `editorActions.tsx:238-243` | runMapped wysiwyg toast 守卫 | 删守卫（回到 `return false`） |
| `editorActions.tsx:295-297` | modeAction wysiwyg 分支 | 删分支 |
| `editorActions.tsx:311-314` | `wysiwyg` 返回 | 删 `wysiwyg` 返回 |
| `editorStore.ts:129,199` | `wysiwyg` + `setWysiwyg` | 删字段/方法 |
| `shared/types.ts:66-67,96` | `wysiwyg` + `setWysiwyg` 类型 | 删 |
| `App.tsx:17,83,459-461,466` | TextusPreview import + wysiwyg selector + 三态分支 + shouldShowRightPreview 传参 | 删 import/selector；恒 `<CodeEditor/>`；删传参 |
| `modeLayout.ts:12-25` | `shouldShowRightPreview` 的 `wysiwyg` 参数 + `&& !wysiwyg` | 删参数 + `&& !wysiwyg` |
| `Toolbar.tsx` | `applyWysiwygItems`/`wysiwyg`/`disabled={wysiwyg}` | 删 |
| `LeftNav.tsx` | 同上 | 删 |

**测试**：
- 删 `tests/wysiwyg-toolbar-disable.test.mjs`（测的是被删的 applyWysiwygItems）。
- 改 `tests/mode-layout.test.mjs`：`shouldShowRightPreview` 调用去掉 `wysiwyg` 参数（行为不变）。
- 改 `tests/cm6-core-boundary.test.mjs:84-85`：删「App 必须挂 TextusPreview / 按 wysiwyg 切换」断言（改为断言 App 恒挂 CodeEditor 或删掉该断言）。

## 后续（不在本任务）

- 删 `src/additional/milkdown/`（220 文件）+ 相关 `textus-*.test.mjs` —— 若用户要彻底清掉 WYSIWYG 编辑器子系统，单独评估。

## 交给实现者

- 恒 `wysiwyg` 不可达后，确认 `shouldShowRightPreview` 行为不变（`wysiwyg` 恒 false 时 `&& !wysiwyg` 恒 true）。
- `modeLayout` 去掉 `wysiwyg` 参数是**签名变化**，同步所有调用方（App.tsx）。
- 全量 `npm run test` 必须 287→（减 1 个删掉的测试文件后）全部通过；`typecheck` 通过。
