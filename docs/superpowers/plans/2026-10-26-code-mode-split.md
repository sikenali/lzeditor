# 代码模式改为 backtickle 风格左右分栏 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 把 `appMode === 'code'` 从「全屏裸 textarea + 自制阅读器壳」重写成 backtickle 风格的左右分栏工作区：左栏源码（复用现有 CM6 实例）、右栏实时渲染预览、中间可拖拽分割线。

**架构：** 新增两个纯基建单元 —— `src/utils/split.ts`（分栏几何，纯函数）与 `src/components/splitter/Splitter.tsx`（分割线交互，不持有比例状态）；LZEditor 在 codeMode 下用 `gridColumns()` 把三列 grid 挂到 `.lz-editor-content--code` 上，CM6 的 DOM 位置保持不变以免实例重建；右栏渲染管线照 `SidebarPreview` 抄（`mdToHtml(md, undefined, { lines: true })` → `.preview-doc` → `getTypographyTheme` → `renderMermaidBlocks` → `useScrollSync`）；分栏比例存 `settingsStore.codeSplitRatio`，走已有的「全 store 订阅 + 250ms 防抖」落盘通道。

**技术栈：** React 18 + TypeScript（`noUnusedLocals` / `noUnusedParameters` 已开，删旧代码必须连 import 一起清干净）+ 纯手写 CSS（无 UI 库）；测试用 `node:test` + `node:assert/strict`，几何测试跑真实函数，边界测试用 `readFileSync` 静态断言。

**规格：** `docs/superpowers/specs/2026-10-26-lzeditor-code-mode-split-design.md`

---

## 文件结构

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `src/utils/split.ts` | 新建 | 分栏几何纯函数：`clampRatio` / `ratioFromPointer` / `gridColumns` |
| `tests/split.test.mjs` | 新建 | 上面三个函数的单测 |
| `src/components/splitter/Splitter.tsx` | 新建 | 6px 可见线 + 24px 命中区，拖拽 / 键盘 / 双击，纯展示 + 回调 |
| `src/shared/types.ts` | 修改 | `SettingsState` 加 `codeSplitRatio?: number` |
| `src/store/settingsStore.ts` | 修改 | `DEFAULT_SETTINGS` 加 `codeSplitRatio: 0.5` |
| `src/styles/layout.css` | 修改 | `.sidebar-preview .preview-doc` 系列选择器前缀改为 `.preview-pane .preview-doc`（供两个预览复用） |
| `src/components/sidebar/SidebarPreview.tsx` | 修改 | 根 div 追加 `preview-pane` class，保持预览排版不变 |
| `src/styles/code-mode.css` | 新建 | 分栏布局 + 栏头 + 分割线 + 预览容器样式 |
| `src/main.tsx` | 修改 | 引入 `./styles/code-mode.css` |
| `src/components/editor/LZEditor.tsx` | 修改 | 代码模式分支重写；删掉全部代码模式私有状态 |
| `src/styles/floating.css` / `src/styles/read-mode.css` / `src/styles/globals.css` | 修改 | 删除仅代码模式使用的旧样式 |
| `tests/code-mode-boundary.test.mjs` | 新建 | 接线与「防误删共用样式」回归断言 |

---

## 任务 1：分栏几何纯函数 `src/utils/split.ts`

**文件：**
- 创建：`src/utils/split.ts`
- 测试：`tests/split.test.mjs`

- [ ] **步骤 1：写失败的测试**

创建 `tests/split.test.mjs`：

```js
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  SPLITTER_WIDTH,
  MIN_PANE_WIDTH,
  DEFAULT_RATIO,
  KEY_STEP,
  clampRatio,
  ratioFromPointer,
  gridColumns,
} from '../src/utils/split.ts'

test('常量取值与 backtickle 对齐', () => {
  assert.equal(SPLITTER_WIDTH, 6)
  assert.equal(MIN_PANE_WIDTH, 240)
  assert.equal(DEFAULT_RATIO, 0.5)
  assert.equal(KEY_STEP, 0.02)
})

test('clampRatio 区间内原样返回', () => {
  assert.equal(clampRatio(0.5, 1200), 0.5)
  assert.equal(clampRatio(0.3, 1200), 0.3)
  assert.equal(clampRatio(0.8, 1200), 0.8)
})

test('clampRatio 触碰最小栏宽时夹住', () => {
  const containerWidth = 1000
  const min = MIN_PANE_WIDTH / (containerWidth - SPLITTER_WIDTH)
  assert.equal(clampRatio(0.05, containerWidth), min, '低于下限夹到最小占比')
  assert.equal(clampRatio(0.99, containerWidth), 1 - min, '高于上限夹到 1 - 最小占比')
  assert.equal(clampRatio(0.0, containerWidth), min)
  assert.equal(clampRatio(1.0, containerWidth), 1 - min)
})

test('容器装不下两栏时退回 50/50', () => {
  // 400 - 6 = 394 可用，小于 240 * 2 = 480
  assert.equal(clampRatio(0.2, 400), DEFAULT_RATIO)
  assert.equal(clampRatio(0.8, 400), DEFAULT_RATIO)
  assert.equal(clampRatio(0.5, 0), DEFAULT_RATIO, '容器宽度未知')
  assert.equal(clampRatio(0.5, -50), DEFAULT_RATIO, '容器宽度为负')
})

test('ratioFromPointer 中间位置是 50/50', () => {
  const containerLeft = 100
  const containerWidth = 1000
  const usable = containerWidth - SPLITTER_WIDTH
  const mid = containerLeft + SPLITTER_WIDTH / 2 + usable / 2
  assert.equal(ratioFromPointer(mid, containerLeft, containerWidth), 0.5)
})

test('ratioFromPointer 越出边界会被夹住', () => {
  const containerLeft = 100
  const containerWidth = 1000
  const min = MIN_PANE_WIDTH / (containerWidth - SPLITTER_WIDTH)
  assert.equal(ratioFromPointer(0, containerLeft, containerWidth), min, '拉到左边外')
  assert.equal(ratioFromPointer(2000, containerLeft, containerWidth), 1 - min, '拉到右边外')
})

test('ratioFromPointer 容器太窄时退回 50/50', () => {
  assert.equal(ratioFromPointer(50, 0, 400), DEFAULT_RATIO)
  assert.equal(ratioFromPointer(50, 0, 0), DEFAULT_RATIO)
})

test('gridColumns 输出两栏 fr 加中间 6px', () => {
  assert.match(gridColumns(0.3, 1200), /^minmax\(0, [\d.]+fr\) 6px minmax\(0, [\d.]+fr\)$/)
  assert.match(gridColumns(0.5, 1200), /^minmax\(0, 0\.5fr\) 6px minmax\(0, 0\.5fr\)$/)
})

test('gridColumns 两栏占比和为 1', () => {
  for (const ratio of [0.5, 0.3, 0.8, 0.618]) {
    const m = gridColumns(ratio, 1200).match(/minmax\(0, ([\d.]+)fr\) 6px minmax\(0, ([\d.]+)fr\)/)
    assert.ok(m, '必须输出两栏 fr')
    assert.ok(Math.abs(Number(m[1]) + Number(m[2]) - 1) < 1e-9, '两栏占比和为 1')
  }
})

test('gridColumns 比例超界时先夹住，两栏都不会低于最小宽度', () => {
  const containerWidth = 1000
  const min = MIN_PANE_WIDTH / (containerWidth - SPLITTER_WIDTH)
  for (const ratio of [0.01, 0.99, 0, 1]) {
    const m = gridColumns(ratio, containerWidth).match(/minmax\(0, ([\d.]+)fr\) 6px minmax\(0, ([\d.]+)fr\)/)
    assert.ok(m, '必须输出两栏 fr')
    assert.ok(Number(m[1]) >= min - 1e-6, '左栏不低于最小占比')
    assert.ok(Number(m[2]) >= min - 1e-6, '右栏不低于最小占比')
  }
})
```

- [ ] **步骤 2：跑测试确认失败**

运行：`node --import tsx --test tests/split.test.mjs`
预期：FAIL，报 `Cannot find module .../src/utils/split.ts`

- [ ] **步骤 3：实现 `src/utils/split.ts`**

```ts
/**
 * 两栏之间的分栏几何。全部在 CSS 像素下工作，纯函数，不碰 DOM。
 * 数值抄 backtickle 的 src/shell/split.ts。
 */

/** 可见分割线宽度。 */
export const SPLITTER_WIDTH = 6
/** 单栏不允许比这更窄，否则代码根本写不下去。 */
export const MIN_PANE_WIDTH = 240
export const DEFAULT_RATIO = 0.5
/** 一次键盘调整左栏占比的量。 */
export const KEY_STEP = 0.02

/**
 * 夹住左栏占比，保证两栏都 ≥ MIN_PANE_WIDTH。
 * 容器装不下两栏时退回 50/50 —— 宁可放弃用户设置的比例，也不能让某一栏变负。
 */
export function clampRatio(ratio: number, containerWidth: number): number {
  const usable = containerWidth - SPLITTER_WIDTH
  if (usable < MIN_PANE_WIDTH * 2) return DEFAULT_RATIO
  const min = MIN_PANE_WIDTH / usable
  return Math.min(1 - min, Math.max(min, ratio))
}

/** 分割线中心指在 x 时左栏的占比，已夹住边界。 */
export function ratioFromPointer(x: number, containerLeft: number, containerWidth: number): number {
  const usable = containerWidth - SPLITTER_WIDTH
  if (usable <= 0) return DEFAULT_RATIO
  return clampRatio((x - containerLeft - SPLITTER_WIDTH / 2) / usable, containerWidth)
}

/** 左栏 + 分割线 + 右栏的 grid 列模板。比例先夹住，外面传未夹的值也不会算坏。 */
export function gridColumns(ratio: number, containerWidth: number): string {
  const clamped = clampRatio(ratio, containerWidth)
  const left = Number(clamped.toFixed(4))
  const right = Number((1 - clamped).toFixed(4))
  return `minmax(0, ${left}fr) ${SPLITTER_WIDTH}px minmax(0, ${right}fr)`
}
```

- [ ] **步骤 4：跑测试确认通过**

运行：`node --import tsx --test tests/split.test.mjs`
预期：全部 PASS

- [ ] **步骤 5：Commit**

```bash
git add src/utils/split.ts tests/split.test.mjs
git commit -m "feat(split): 分栏几何纯函数，两栏最小宽度与指针换算"
```

---

## 任务 2：分割线组件 `src/components/splitter/Splitter.tsx`

**文件：**
- 创建：`src/components/splitter/Splitter.tsx`

组件只负责把 ratio 变更抛出去，自己不持有比例，也不负责持久化。`containerWidth` 由父级量好后传入，用来夹住边界 —— 否则拿到的是像素差，`clampRatio` 会算错。

- [ ] **步骤 1：写组件**

```tsx
import React, { useCallback, useRef, useState } from 'react'
import { DEFAULT_RATIO, KEY_STEP, clampRatio, ratioFromPointer } from '../../utils/split'

interface SplitterProps {
  /** 左栏占比，0..1。 */
  ratio: number
  /** 分割线父容器（grid）的像素宽，用来夹住边界。 */
  containerWidth: number
  onChange: (next: number) => void
}

/**
 * 两栏之间的可拖拽分割线。可见线 6px，命中区 24px（左右各扩 9px）——
 * WCAG 2.5.8 要求可点击目标够宽，只有 6px 的线在触控设备上根本点不中。
 */
export const Splitter: React.FC<SplitterProps> = ({ ratio, containerWidth, onChange }) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const gridRect = useCallback((): DOMRect | null => {
    const parent = hostRef.current?.parentElement
    return parent ? parent.getBoundingClientRect() : null
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    hostRef.current?.setPointerCapture(e.pointerId)
    setDragging(true)
    e.preventDefault() // 拖拽期间禁掉文本选择，否则拖出选中态
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = gridRect()
      if (!rect) return
      onChange(ratioFromPointer(e.clientX, rect.left, rect.width))
    },
    [gridRect, onChange],
  )

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (hostRef.current?.hasPointerCapture(e.pointerId)) {
      hostRef.current.releasePointerCapture(e.pointerId)
    }
    setDragging(false)
  }, [])

  // 指针没按下时 move 不该动位置，但捕获已经建好也懒得拆，直接判 dragging
  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return
      onPointerMove(e)
    },
    [dragging, onPointerMove],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const width = gridRect()?.width ?? 0
      let next: number | null = null
      if (e.key === 'ArrowLeft') next = ratio - KEY_STEP
      else if (e.key === 'ArrowRight') next = ratio + KEY_STEP
      else if (e.key === 'Enter' || e.key === 'Home') next = DEFAULT_RATIO
      if (next === null) return
      onChange(clampRatio(next, width))
      e.preventDefault()
    },
    [gridRect, ratio, onChange],
  )

  return (
    <div
      ref={hostRef}
      className={`code-splitter${dragging ? ' dragging' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="调整源码与预览宽度"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuetext={`${Math.round(ratio * 100)}%`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={handleMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onChange(clampRatio(DEFAULT_RATIO, containerWidth))}
      onKeyDown={onKeyDown}
    >
      <div className="code-splitter-line" aria-hidden="true" />
    </div>
  )
}
```

- [ ] **步骤 2：类型检查**

运行：`npx tsc --noEmit -p tsconfig.json`
预期：无输出，退出码 0

- [ ] **步骤 3：Commit**

```bash
git add src/components/splitter/Splitter.tsx
git commit -m "feat(splitter): 可拖拽分割线，键盘与双击复位，带 aria 值"
```

---

## 任务 3：分栏比例落盘字段 `codeSplitRatio`

**文件：**
- 修改：`src/shared/types.ts`
- 修改：`src/store/settingsStore.ts`

落盘走 settingsStore 已有的「全 store 订阅 + 250ms 防抖 + `beforeunload` flush」通道，`PERSIST_SKIP` 里只有 `activeGroup` / `subTab` 两个导航态字段，新字段自动被覆盖，不需要改落盘逻辑。

- [ ] **步骤 1：`types.ts` 加字段**

在 `src/shared/types.ts` 的 `SettingsState` 里，紧跟 `navMode?: 'top' | 'left'`（约 144 行）之后加：

```ts
  /** 代码模式分栏：左栏（源码）占整宽的比重，0..1 */
  codeSplitRatio?: number
```

- [ ] **步骤 2：`settingsStore.ts` 加默认值**

在 `src/store/settingsStore.ts` 的 `DEFAULT_SETTINGS` 里，紧跟 `navMode: 'top' as 'top' | 'left',`（约 70 行）之后加：

```ts
  codeSplitRatio: 0.5,
```

写入用现有的 `updateSetting('codeSplitRatio', v)`，不新增 setter —— `updateSetting` 是 `keyof SettingsState` 泛型，加字段后自动可用。

- [ ] **步骤 3：类型检查 + 测试**

运行：`npx tsc --noEmit -p tsconfig.json && npm test 2>&1 | tail -8`
预期：tsc 退出码 0，测试全部 PASS

- [ ] **步骤 4：Commit**

```bash
git add src/shared/types.ts src/store/settingsStore.ts
git commit -m "feat(settings): 代码模式分栏比例可落盘，默认五五开"
```

---

## 任务 4：预览排版选择器提到 `.preview-pane`

**文件：**
- 修改：`src/styles/layout.css`（约 553-564 行）
- 修改：`src/components/sidebar/SidebarPreview.tsx`

`.preview-doc` 的排版规则现在挂在 `.sidebar-preview` 下。代码模式要一个新的预览容器，把前缀换成一个中性的 `.preview-pane`，两个预览共用同一份规则，不重复写。

- [ ] **步骤 1：改 `layout.css` 前缀**

在 `src/styles/layout.css` 里，把 `.sidebar-preview .preview-doc` 全部替换成 `.preview-pane .preview-doc`。这一段是 553-564 行的 12 条规则：

```
.sidebar-preview .preview-doc
.sidebar-preview .preview-doc h1
.sidebar-preview .preview-doc h2
.sidebar-preview .preview-doc h3
.sidebar-preview .preview-doc p
.sidebar-preview .preview-doc a
.sidebar-preview .preview-doc code
.sidebar-preview .preview-doc pre
.sidebar-preview .preview-doc pre code
.sidebar-preview .preview-doc blockquote
.sidebar-preview .preview-doc ul, .sidebar-preview .preview-doc ol
.sidebar-preview .preview-doc li
.sidebar-preview .preview-doc strong
.sidebar-preview .preview-doc hr
```

不要动 `.sidebar-preview`、`.sidebar-preview .sidebar-scroll`、`.sidebar-preview .sidebar-header*` 这些布局规则 —— 它们只服务侧栏。

- [ ] **步骤 2：`SidebarPreview` 根节点补 class**

`src/components/sidebar/SidebarPreview.tsx` 约 142 行，把：

```tsx
      <div className="sidebar-preview">
```

改成：

```tsx
      <div className="sidebar-preview preview-pane">
```

- [ ] **步骤 3：验证预览排版没变**

运行：`npx tsc --noEmit -p tsconfig.json && npm test 2>&1 | tail -8`
预期：tsc 退出码 0，测试全部 PASS

- [ ] **步骤 4：Commit**

```bash
git add src/styles/layout.css src/components/sidebar/SidebarPreview.tsx
git commit -m "refactor(preview): 预览排版选择器提到 .preview-pane，两个预览共用"
```

---

## 任务 5：新增 `src/styles/code-mode.css`

**文件：**
- 创建：`src/styles/code-mode.css`
- 修改：`src/main.tsx`

- [ ] **步骤 1：写样式**

```css
/* ── 代码模式：左右分栏工作区 ──────────────────────────────────────────
   左栏源码（CM6）、中间可拖拽分割线、右栏实时预览。
   .lz-editor-content 在编辑模式是唯一的滚动容器；进代码模式后它变成 grid 壳，
   滚动权交给左栏 .code-source-pane。 */

.lz-editor-content--code {
  display: grid;
  padding: 0;
  overflow: hidden;
  background: var(--chrome-surface);
}

.lz-editor-content--code .code-source-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--chrome-surface);
}

/* 左栏是滚动容器：CM6 本身 height:auto + overflow:visible，见 app.css 注释 */
.lz-editor-content--code .lz-editor-page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  padding: 20px 0;
  margin: 0;
  width: 100%;
}

/* 栏头：细长小标，只放状态信息 */
.code-pane-header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-code);
  font-size: 11px;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
  user-select: none;
}

.code-pane-title {
  font-weight: 700;
  color: var(--text-muted);
  white-space: nowrap;
}

.code-pane-sep { color: var(--text-faint); opacity: 0.6; }

.code-pane-meta {
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 分割线：可见线 6px，命中区 24px（左右各扩 9px） */
.code-splitter {
  position: relative;
  z-index: 1;
  margin: 0 -9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  touch-action: none;
  user-select: none;
}

.code-splitter-line {
  width: 6px;
  height: 100%;
  background: var(--border-subtle);
  transition: background 0.12s ease;
}

.code-splitter:hover .code-splitter-line,
.code-splitter.dragging .code-splitter-line {
  background: var(--accent-primary);
  opacity: 0.55;
}

.code-splitter:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
}

.lz-editor-content--code .code-preview-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--bg-code);
  border-left: 1px solid var(--border-subtle);
}

.code-preview-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 18px 20px;
}
```

- [ ] **步骤 2：在 `main.tsx` 引入**

`src/main.tsx` 第 14 行是 `import './styles/read-mode.css'`，在它后面加一行（放在 `floating.css` 之前，让 floating 的旧规则还能压过来）：

```tsx
import './styles/code-mode.css'
```

- [ ] **步骤 3：构建验证**

运行：`npm run build 2>&1 | tail -3`
预期：`✓ built`

- [ ] **步骤 4：Commit**

```bash
git add src/styles/code-mode.css src/main.tsx
git commit -m "feat(code-mode): 分栏布局与栏头样式，左栏持有滚动权"
```

---

## 任务 6：LZEditor 重写代码模式分支

**文件：**
- 修改：`src/components/editor/LZEditor.tsx`

这是本计划里唯一的大改动。两处原则：

1. **CM6 的 DOM 位置不动**。`.lz-editor-page` 里的 `<CM6Editor>` 永远是 `.lz-editor-content` 的第一个子节点；代码模式只是在它后面追加兄弟节点。如果换成条件分支渲染，切模式时 CM6 会 unmount 再 mount，`getCM6Editor()` 单例被换掉，光标与 undo 历史全丢。
2. **`editorContentRef` 必须指向当前真正的滚动容器**。编辑模式是 `.lz-editor-content`，代码模式是左栏 `.code-source-pane`。这个 ref 被 `SidebarPreview` 和 `editorStore` 的 `setShowPreview` 消费，代码模式里不能设成 null。

- [ ] **步骤 1：改 import**

把 `src/components/editor/LZEditor.tsx` 第 1-13 行的 import 块替换为：

```tsx
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { README_CONTENT } from './constants'
import { mdToHtml } from '../../utils/mdToHtml'
import { getDocMd } from '../../utils/docSource'
import { useTheme, resolveTheme } from '../../hooks/useTheme'
import { applyTypographyOverrides } from '../../styles/themes'
import { CM6Editor } from './CM6Editor'
import { getCM6Editor } from './codemirror/registry'
import { setSlashHost, type SlashRange } from './codemirror/slash'
import { setInputFormatSettings } from './codemirror/input-format'
import { SlashCommand } from './SlashCommand'
import { Splitter } from '../splitter/Splitter'
import { gridColumns } from '../../utils/split'
import { useScrollSync, lineBridgeOf } from '../../hooks/scrollSync'
import { getTypographyTheme } from '../../styles/typography-themes'
import { renderMermaidBlocks } from '../../utils/markdown/mermaid'
```

（相比原来的 import 块，只做了两件事：新增最后 5 行，把 `useTheme` 改成 `useTheme, resolveTheme`。`mdToHtml` 保留 —— 现在改用于预览栏渲染。）

紧跟 `CONTENT_WIDTH_MAP`（第 15-21 行）之后加字体标签映射，供源栏栏头显示：

```tsx
const FONT_LABELS: Record<string, string> = {
  'sans-serif': '无衬线',
  serif: '衬线',
  monospace: '等宽',
}
```

- [ ] **步骤 2：删掉代码模式私有状态**

删除以下各行（行号是当前文件的行号，删的时候从上往下删，避免前面删完后面行号全乱）：

- 第 25 行：`const codeAreaRef = useRef<HTMLTextAreaElement>(null)`
- 第 26 行：`const remarkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)`
- 第 37 行：`const setAppMode = useEditorStore((s: any) => s.setAppMode)`
- 第 38 行：`const wordCount = useEditorStore((s: any) => s.wordCount)`
- 第 41-46 行：`readFontSize` / `setReadFontSize` / `readLayout` / `setReadLayout` / `readTocOpen` / `setReadTocOpen` 六行
- 第 47 行：`const docTitle = useEditorStore((s) => s.docTitle)`
- 第 56-57 行：注释 + `const cm6Visible = !codeMode`
- 第 59-64 行：`codeEditMdRef`、`codeEditMd` 及其 `useEffect`
- 第 79-81 行：`LAYOUTS`、`LAYOUT_LABELS`、`LAYOUT_MAX_W`
- 第 82-83 行：`activeTocId`、`setActiveTocId`
- 第 85-105 行：`codeTocItems` 的 `useMemo`
- 第 107-118 行：`scrollToCodeHeading` 的 `useCallback`

保留第 237-245 行的「进入代码模式同步 mdContent」effect —— 它是给预览栏兜底的，CM6 接管后它无害。

- [ ] **步骤 3：加代码模式分栏状态**

在第 237-245 行那个 effect 之后（`docsMd` 初始化 effect 之后）加：

```tsx
  // ── 代码模式：左右分栏 ──
  const updateSetting = useSettingsStore((s) => s.updateSetting)
  const codeSplitRatio = useSettingsStore((s) => s.codeSplitRatio ?? 0.5)
  const typographyTheme = useSettingsStore((s) => s.typographyTheme)
  const appTheme = useSettingsStore((s) => s.theme)
  const tabSize = useSettingsStore((s) => s.tabSize ?? 2)
  const editorContentRef = useEditorStore((s) => s.editorContentRef)
  const docHTML = useEditorStore((s) => s.docHTML || '')

  const splitHostRef = useRef<HTMLDivElement>(null)
  const [splitWidth, setSplitWidth] = useState(0)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const previewArticleRef = useRef<HTMLDivElement>(null)

  // 量容器宽：clampRatio 需要像素宽才能夹出最小栏宽
  useEffect(() => {
    const el = splitHostRef.current
    if (!el) return
    const measure = () => setSplitWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [codeMode])

  // Markdown → 预览 HTML。开 lines：每个顶层块带源码行号，滚动同步按行对位
  const previewHtml = useMemo(() => {
    if (docHTML) return docHTML
    if (!mdContent) return ''
    try {
      return mdToHtml(mdContent, undefined, { lines: true })
    } catch {
      return mdContent
    }
  }, [mdContent, docHTML])

  useEffect(() => {
    const previewEl = previewArticleRef.current
    if (!previewEl) return
    const theme = getTypographyTheme(typographyTheme || 'classic')
    previewEl.innerHTML = previewHtml
      || '<p style="color:var(--text-muted);text-align:center;padding:40px 16px;">暂无内容，请先编辑文档</p>'
    previewEl.style.cssText = ''
    if (theme) {
      const css = theme.css
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.\lz-editor-content/g, '.preview-doc')
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.read-article-body/g, '.preview-doc')
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.export-preview-body/g, '.preview-doc')
      // 独立 style 节点：SidebarPreview 用的是 lz-sidebar-typography-css，
      // 两者选择器相同，共用 id 会互相摘掉对方的样式
      const styleEl = document.getElementById('lz-code-preview-typography-css') as HTMLStyleElement | null
      if (styleEl) styleEl.remove()
      const el = document.createElement('style')
      el.id = 'lz-code-preview-typography-css'
      el.textContent = css
      document.head.appendChild(el)
    }
    // mermaid 是异步增强：占位符先显示，渲完再换成图
    void renderMermaidBlocks(previewEl, resolveTheme(appTheme) === 'dark')
  }, [previewHtml, typographyTheme])

  // 换主题不会重新生成 html，也就不会重建 .mermaid-diagram，已渲染的图要自己重渲。
  // 单独成一个 effect：并进上面那个会在换主题时和 innerHTML 赋值打架。
  useEffect(() => {
    if (!previewArticleRef.current) return
    void renderMermaidBlocks(previewArticleRef.current, resolveTheme(appTheme) === 'dark')
  }, [appTheme])

  useScrollSync({
    editorEl: editorContentRef as React.RefObject<HTMLElement>,
    scroller: previewScrollRef,
    article: previewArticleRef,
    enabled: codeMode,
    onSourceLine: (line) => {
      lineBridgeOf(editorContentRef)?.goToLine(line)
    },
  })
```

- [ ] **步骤 4：让 `editorContentRef` 指向真正的滚动容器**

把第 122-125 行：

```tsx
  React.useEffect(() => {
    setEditorRef(editorRef.current)
    setEditorContentRef(editorRef.current?.querySelector('.lz-editor-content') ?? null)
  }, [])
```

替换为：

```tsx
  const sourcePaneRef = useRef<HTMLElement | null>(null)
  React.useEffect(() => {
    setEditorRef(editorRef.current)
    // 代码模式下 .lz-editor-content 是 grid 壳，滚动权在左栏；
    // 编辑模式滚容器还是 .lz-editor-content 本身。这个 ref 被 SidebarPreview
    // 和 editorStore.setShowPreview 消费，代码模式里不能设成 null。
    const scroll = codeMode
      ? sourcePaneRef.current
      : editorRef.current?.querySelector('.lz-editor-content')
    setEditorContentRef(scroll ?? null)
  }, [codeMode, setEditorContentRef, setEditorRef])
```

- [ ] **步骤 5：改 `.lz-editor-page` 宽度逻辑**

第 134-158 行的样式 effect 里，把：

```tsx
    const fw = contentWidth && CONTENT_WIDTH_MAP[contentWidth]
      ? CONTENT_WIDTH_MAP[contentWidth]
      : showPreview
        ? '1024px'
        : '100%'
```

替换为：

```tsx
    // 代码模式左栏比整宽窄得多，1024px 会直接溢出，源码栏必须 100%
    const fw = codeMode
      ? '100%'
      : contentWidth && CONTENT_WIDTH_MAP[contentWidth]
        ? CONTENT_WIDTH_MAP[contentWidth]
        : showPreview
          ? '1024px'
          : '100%'
```

并把该 effect 的依赖数组 `[editorFont, defaultFontSize, lineHeight, contentWidth, showPreview]` 改成
`[editorFont, defaultFontSize, lineHeight, contentWidth, showPreview, codeMode]`。

- [ ] **步骤 6：删掉 `handleCodeModeChange`**

删除第 284-302 行整段（`const handleCodeModeChange = useCallback(...)`）。内容写入现在由 CM6 自己的 onChange 驱动，和编辑模式同一条路径。

- [ ] **步骤 7：替换 JSX**

把 return 里的这一整块（第 304-406 行，从 `return (` 到 `</div>` 之前的 `}` 之后）：

```tsx
  return (
    <div className="lz-editor" ref={editorRef}>
      <div className={`lz-editor-content${codeMode ? ' lz-editor-content--code' : ''}`}>
        {codeMode && (
          ...整块 read-mode-inline read-mode-code...
        )}
        <div className="lz-editor-page">
          {/* CM6 保持挂载：切到阅读/代码/历史模式时只用 display:none 隐藏。
              卸载后 getCM6Editor() 返回 null，工具栏与搜索命令会全部失效。 */}
          <div style={{ display: cm6Visible ? 'block' : 'none', height: '100%' }}>
            <CM6Editor
              docId={activeDocId || 'readme'}
              initialContent={mdContent}
            />
          </div>
        </div>
      </div>
```

替换为：

```tsx
  return (
    <div className="lz-editor" ref={editorRef}>
      <div
        ref={splitHostRef}
        className={`lz-editor-content${codeMode ? ' lz-editor-content--code' : ''}`}
        style={codeMode ? { gridTemplateColumns: gridColumns(codeSplitRatio, splitWidth) } : undefined}
      >
        {/* CM6 永远是第一个子节点：代码模式只是在它后面追加兄弟节点，
            不让它 unmount —— 切模式重建实例会丢光标和 undo 历史。 */}
        <div ref={sourcePaneRef as React.RefObject<HTMLDivElement>} className="code-source-pane">
          {codeMode && (
            <header className="code-pane-header">
              <span className="code-pane-title">MARKDOWN SOURCE</span>
              <span className="code-pane-sep">·</span>
              <span className="code-pane-meta">UTF-8</span>
              <span className="code-pane-sep">|</span>
              <span className="code-pane-meta">
                {FONT_LABELS[editorFont] ?? editorFont} {defaultFontSize}px · Tab {tabSize} 空格
              </span>
            </header>
          )}
          <div className="lz-editor-page">
            <CM6Editor
              docId={activeDocId || 'readme'}
              initialContent={mdContent}
            />
          </div>
        </div>
        {codeMode && (
          <Splitter
            ratio={codeSplitRatio}
            containerWidth={splitWidth}
            onChange={(next) => updateSetting('codeSplitRatio', next)}
          />
        )}
        {codeMode && (
          <section className="code-pane preview-pane code-preview-pane" aria-label="预览">
            <header className="code-pane-header">
              <span className="code-pane-title">LIVE PREVIEW</span>
              <span className="code-pane-sep">·</span>
              <span className="code-pane-meta">滚动同步</span>
            </header>
            <div className="code-preview-scroll" ref={previewScrollRef}>
              <div className="preview-doc" ref={previewArticleRef} />
            </div>
          </section>
        )}
      </div>
```

后面的 `<SlashCommand ... />` 和结尾的 `</div>` 保持原样。

注意 `<header>` 是块级元素、在 `.code-source-pane`（flex column）里，`{codeMode && ...}` 为 false 时不会渲染任何节点，`.lz-editor-page` 仍是该 flex 容器的唯一子节点，编辑模式布局不受影响。

- [ ] **步骤 8：类型检查**

运行：`npx tsc --noEmit -p tsconfig.json`
预期：无输出，退出码 0。如果报 `noUnusedLocals` 相关的错，说明还有旧变量没删干净，把报错的名字删掉即可。

- [ ] **步骤 9：Commit**

```bash
git add src/components/editor/LZEditor.tsx
git commit -m "feat(code-mode): 源码与预览左右分栏，复用 CM6 实例并接滚动同步"
```

---

## 任务 7：删除旧代码模式 CSS

**文件：**
- 修改：`src/styles/floating.css`
- 修改：`src/styles/read-mode.css`
- 修改：`src/styles/globals.css`

只删**仅代码模式使用**的规则。已经逐类比对过组件引用，下面这组「必须保留」的规则各有其它消费者，误删会弄坏阅读模式或面板：

| 必须保留的规则 | 谁在用 |
| --- | --- |
| `.read-mode-inline` | `ReadMode.tsx` |
| `.read-mode-body` | `ReadMode.tsx` / `StyleMainPanel.tsx` |
| `.read-mode-toolbar` | `ReadMode.tsx` |
| `.read-mode-controls` / `.read-mode-exit-btn` / `.read-mode-label` / `.read-font-size-value` | `ReadMode.tsx` |
| `.read-tool-btn` / `.read-toc-*` | `ReadMode.tsx` |
| `.read-tag` / `.read-tag-tech` | `StyleMainPanel.tsx` |
| `.read-article` / `.read-article-body` | `ReadMode.tsx` / `StyleMainPanel.tsx` |
| `.read-frog*` | 翻译扩展的 DOM 清理，与代码模式无关 |

可删清单（已确认只被 `LZEditor.tsx` 第 339-395 行的代码模式块使用）：

```
read-article-wrapper      仅 globals.css
read-article-container    仅 globals.css
read-mode-meta            仅 globals.css
read-mode-code            仅 floating.css
read-article-code         仅 read-mode.css
read-article-header       globals.css + read-mode.css
read-tags-row             globals.css + read-mode.css
read-tag-system           globals.css + read-mode.css
read-author-info          globals.css + read-mode.css
read-author-name          globals.css + read-mode.css
read-author-date          globals.css + read-mode.css
read-avatar               globals.css + read-mode.css
read-divider-v            globals.css + read-mode.css
read-views                globals.css + read-mode.css
read-views-icon           globals.css + read-mode.css
read-views-text           globals.css + read-mode.css
read-meta                 globals.css + read-mode.css
```

- [ ] **步骤 1：删 `floating.css`**

`src/styles/floating.css` 第 419-426 行整块：

```css
/* ── 代码模式：内联阅读视图的容器 ── */
.read-mode-code  {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
```

- [ ] **步骤 2：删 `read-mode.css`**

删掉 `.read-article-code` 整块（第 444-462 行，含注释与 `::placeholder` / `:focus` 两条附属规则），以及下面这 12 条规则（用 `grep -n` 先定位，规则块大小不一）：

```
.read-article-header
.read-tags-row
.read-tag-system
.read-author-info
.read-author-name
.read-author-date
.read-avatar
.read-divider-v
.read-views
.read-views-icon
.read-views-text
.read-meta
```

- [ ] **步骤 3：删 `globals.css`**

删掉 `.read-article-wrapper`、`.read-article-container`、`.read-mode-meta` 三条，以及上面「可删清单」里标注 `globals.css` 的其余全部规则。

- [ ] **步骤 4：确认没有残留引用**

运行：

```bash
grep -rn "read-article-wrapper\|read-article-container\|read-article-header\|read-tags-row\|read-tag-system\|read-author\|read-avatar\|read-divider-v\|read-views\|read-meta\|read-mode-meta\|read-mode-code\|read-article-code" src/ --include='*.tsx' --include='*.ts' --include='*.css'
```

预期：无输出

- [ ] **步骤 5：确认共用规则没被误删**

运行：

```bash
grep -rn "\.read-mode-inline\|\.read-mode-toolbar\|\.read-mode-label\|\.read-mode-exit-btn\|\.read-tag \|\.read-tag-tech\|\.read-article-body\|\.read-toc-sidebar\|\.read-tool-btn" src/styles/*.css | wc -l
```

预期：大于 0，且包含 `read-tag-tech`、`read-mode-toolbar` 的命中

- [ ] **步骤 6：测试 + 构建**

运行：`npm test 2>&1 | tail -8 && npm run build 2>&1 | tail -3`
预期：测试全部 PASS，`✓ built`

- [ ] **步骤 7：Commit**

```bash
git add src/styles/floating.css src/styles/read-mode.css src/styles/globals.css
git commit -m "chore(css): 删掉旧代码模式阅读器壳的样式"
```

---

## 任务 8：边界回归测试 + 全量验证

**文件：**
- 创建：`tests/code-mode-boundary.test.mjs`

- [ ] **步骤 1：写测试**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const lz = read('src/components/editor/LZEditor.tsx')
const splitter = read('src/components/splitter/Splitter.tsx')
const app = read('src/App.tsx')
const sidebarPreview = read('src/components/sidebar/SidebarPreview.tsx')
const layoutCss = read('src/styles/layout.css')
const readModeCss = read('src/styles/read-mode.css')
const floatingCss = read('src/styles/floating.css')
const globalsCss = read('src/styles/globals.css')
const mainTsx = read('src/main.tsx')

// ── 几何与分割线 ──
assert.match(splitter, /role="separator"/, '分割线必须有 separator 角色')
assert.match(splitter, /aria-orientation="vertical"/, '竖分隔线要声明方向')
assert.match(splitter, /aria-valuenow=\{Math\.round\(ratio \* 100\)\}/, '要报出当前占比')
assert.match(splitter, /onKeyDown=\{onKeyDown\}/, '分割线必须可键盘调整')
assert.match(splitter, /ArrowLeft/, '左箭头缩小编辑栏')
assert.match(splitter, /ArrowRight/, '右箭头放大编辑栏')
assert.match(splitter, /onDoubleClick/, '双击复位到 50/50')
assert.match(splitter, /setPointerCapture/, '拖拽要捕获指针，移出窗口也不掉')

// ── 代码模式不再有裸 textarea 与阅读器壳 ──
assert.doesNotMatch(lz, /<textarea/, '代码模式不再用裸 textarea')
assert.doesNotMatch(lz, /read-article-code/, '不再套阅读器壳的正文容器')
assert.doesNotMatch(lz, /read-mode-code/, '不再套阅读器壳的根容器')
assert.doesNotMatch(lz, /codeEditMd/, '不再自己维护一份编辑缓冲区')
assert.doesNotMatch(lz, /handleCodeModeChange/, '内容写入走 CM6 的 onChange')

// ── 分栏接线 ──
assert.match(lz, /gridColumns\(codeSplitRatio, splitWidth\)/, '代码模式必须按分栏比例排 grid')
assert.match(lz, /<Splitter/, '两栏之间必须挂分割线')
assert.match(lz, /updateSetting\('codeSplitRatio'/, '拖出的比例必须落盘')
assert.match(lz, /codeSplitRatio \?\? 0\.5/, '没存过比例时按 50/50 开')

// ── CM6 不被重建 ──
assert.match(lz, /className="code-source-pane"[^>]*>[\s\S]*?<CM6Editor/, 'CM6 必须挂在 code-source-pane 里')
assert.doesNotMatch(lz, /cm6Visible/, '不再靠 display:none 切代码模式，那会让 CM6 反复重建')

// ── 滚动容器与同步 ──
assert.match(lz, /codeMode\s*\n\s*\?\s*sourcePaneRef\.current/, '代码模式滚容器要指到左栏')
assert.match(lz, /enabled: codeMode/, '滚动同步只在代码模式启用')
assert.match(lz, /useScrollSync/, '分栏预览必须接滚动同步')
assert.match(lz, /\{ lines: true \}/, '预览块要带源码行号，同步才能按行对位')
assert.match(lz, /lz-code-preview-typography-css/, '预览排版样式要用独立 style 节点')

// ── App 层不变：代码模式不占右面板 ──
assert.match(app, /appMode !== 'code'/, '代码模式自己的右栏不占 App 的右面板')

// ── 共用样式没被误删 ──
assert.match(readModeCss, /\.read-mode-inline/, '阅读模式的容器样式必须还在')
assert.match(readModeCss, /\.read-tag\b/, 'read-tag 基类被 StyleMainPanel 用，不能删')
assert.match(readModeCss, /\.read-tag-tech/, 'read-tag-tech 被 StyleMainPanel 用，不能删')
assert.match(globalsCss, /\.read-mode-toolbar/, '阅读模式的工具栏样式必须还在')
assert.match(globalsCss, /\.read-toc-sidebar/, '目录侧栏样式必须还在')
assert.doesNotMatch(readModeCss, /read-article-code/, '旧代码模式 textarea 样式应已删除')
assert.doesNotMatch(floatingCss, /read-mode-code/, '旧代码模式容器样式应已删除')

// ── 预览排版共用 ──
assert.match(sidebarPreview, /className="sidebar-preview preview-pane"/, '侧栏预览要挂 preview-pane')
assert.match(layoutCss, /\.preview-pane \.preview-doc/, '预览排版规则要挂在共用前缀上')
assert.match(layoutCss, /\.sidebar-preview \.sidebar-scroll/, '侧栏布局规则保持不变')
assert.match(mainTsx, /import '\.\/styles\/code-mode\.css'/, '分栏样式必须被引入')

console.log('code mode boundary checks passed')
```

- [ ] **步骤 2：跑测试**

运行：`node --import tsx --test tests/code-mode-boundary.test.mjs`
预期：`code mode boundary checks passed`

- [ ] **步骤 3：全量验证**

运行：`npx tsc --noEmit -p tsconfig.json && npx tsc -p electron/tsconfig.json --noEmit && npm test 2>&1 | tail -8 && npm run build 2>&1 | tail -3`
预期：两个 tsc 退出码都是 0，测试全部 PASS，`✓ built`

- [ ] **步骤 4：工作区干净**

运行：`git status --short`
预期：只剩本任务新增的测试文件

- [ ] **步骤 5：Commit**

```bash
git add tests/code-mode-boundary.test.mjs
git commit -m "test(code-mode): 分栏接线与共用样式防误删回归断言"
```

---

## 明确不做

- 不做 backtickle 的三态切换（纯源码 / 双栏 / 纯预览）—— 代码模式固定双栏
- 不复用、不改造 `SidebarPreview`，只共享它的预览排版选择器
- 不保留旧的单栏 textarea 与阅读器壳，直接删
- 不在代码模式加独立的「退出代码模式」按钮，退出交给顶部工具栏的模式切换
- 预览栏不放公众号复制按钮
- 不动 CM6 的创建方式与 `getCM6Editor()` 单例约定
- 不动 `SidebarPreview` 的宽度逻辑（`MIN_WIDTH` / `MAX_WIDTH` / `previewWidth`）
