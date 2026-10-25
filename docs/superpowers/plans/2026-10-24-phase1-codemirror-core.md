# Phase 1：CodeMirror 6 编辑器内核 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 移除 TipTap，CodeMirror 6 成为唯一编辑内核；markdown 源码成为内容唯一事实；工具栏/对话框/AI/搜索/历史全部改为对 `EditorApi` 的操作。左右分屏预览（Phase 2）不在本计划。

**架构：** 三个新模块——`src/editor/mdSyntax.ts`（纯文本变换，TDD）、`src/editor/api.ts`（CM6 实例 → `EditorApi` 桥）、`src/components/editor/MarkdownEditor.tsx`（React 包装，`setEditor(api)` 写入 store）。全部 TipTap 消费点（39 处）改走 `EditorApi`；文档切换用 React `key={activeDocId}` 重挂载解决。

**技术栈：** @codemirror/{state,view,commands,search,autocomplete,language,lang-markdown,language-data}、@lezer/highlight、zustand、node --test + tsx loader

**规格来源：** `docs/superpowers/specs/2026-10-24-lzeditor-cm6-integration-design.md`（D1）

**执行须知：**
- 先执行 Phase 0 计划再进入本计划。
- 测试两条路：结构断言（readFileSync + regex，沿用 tests/*.test.mjs 惯例）；纯函数运行测试 `node --import tsx --test`（tsx 已在 devDependencies）。
- `store.editor` 类型是 `any`，`EditorApi` 鸭子写入即可。
- 每个任务后必须 `npm run typecheck`（或当时步骤给定命令），红灯不得进入下一任务。

**完成状态（2026-10-24 对账）：** 内核迁移已落地——`e5b90c9`（S0-1..S0-8）/`a7b2635`（S1）/`3ab6032`（S2）。TipTap 已卸载、CM6 成为唯一内核、工具栏/对话框/AI/搜索/历史全走 `getCM6Editor()`。29/29 测试 + `tsc` 全绿。19 个步骤已勾。剩余 13 个未勾分三类：

1. **命名/路径已改，功能等价（不算缺口）**：`src/editor/mdSyntax.ts`→变换内联在 `src/components/editor/codemirror/commands.ts`；`src/editor/api.ts`→`codemirror/registry.ts` 的 `getCM6Editor()` + `CM6EditorCommands`；`MarkdownEditor.tsx`→`CM6Editor.tsx`。
2. **真实缺口，需补**：
   - **无语法高亮**：`@lezer/highlight` 在依赖里但全仓零 import，无 `EditorView.theme`/`HighlightStyle`，源码视图是纯灰白文本（计划 §cmTheme）。
   - **字数统计对中文失算**：`editor.ts:161` 为 `text.split(/\s+/).filter(Boolean).length`，中文段落无空格 → 整段算 1 词，连带「阅读约 N 分钟」失准。
   - **`cleanContent.ts` 是死代码**：`git ls-files` 仍有 `src/utils/cleanContent.ts`，全仓零引用。
   - **`spellCheckLang` 设置项失效**：`settingsStore.ts:79` 有默认值、`EditorSettingsTab.tsx:137` 有下拉框，但 `setSpellcheck()` 只切 `spellcheck` 属性，从不设 `lang`。
   - **CM6 默认扩展未挂**：`defaultKeymap`/`historyKeymap`/`closeBrackets`/`bracketMatching`/`highlightSelectionMatches`/`indentUnit` 全仓零引用；后果是 Alt-Up 移动行、Mod-Shift-K 删行、括号匹配、选中匹配高亮都不可用（自写 `undoKeymap`/`autopair.ts` 只覆盖部分）。
   - **markdown 变换无运行单测**：29 个测试全是 readFileSync+regex 结构断言，`grep mdSyntax countMdStats tests/` 零命中，bold/quote/list/footnote/toc 这些核心文本变换没有可执行断言。
3. **过程性步骤，代码不可证**：`Commit`（5 处）、`运行确认失败`（3 处）、`手动核对清单`、`用户验收`。

---

### 任务 1：依赖与测试脚本

**文件：**
- 修改：`package.json`

- [x] **步骤 1：安装依赖**

```bash
npm install @codemirror/state @codemirror/view @codemirror/commands @codemirror/search @codemirror/autocomplete @codemirror/language @codemirror/lang-markdown @codemirror/language-data @lezer/highlight
```

- [x] **步骤 2：test 脚本启用 tsx loader**

`package.json`：

```json
"test": "node --import tsx --test tests/*.test.mjs",
```

- [x] **步骤 3：既有测试在 loader 下通过**

运行：`npm test`
预期：全部 PASS

- [ ] **步骤 4：Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): 引入 CodeMirror 6 依赖，测试启用 tsx loader"
```

---

### 任务 2：`src/editor/mdSyntax.ts`（TDD）

**文件：**
- 创建：`src/editor/mdSyntax.ts`
- 创建：`tests/md-syntax-runtime.test.mjs`

- [ ] **步骤 1：编写失败测试**

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  wrapInline, clearInline, toggleHeading, toggleList, toggleQuote,
  insertLink, insertImage, insertTable, insertHr, insertBlock,
  continueList, insertFootnote, buildToc, countMdStats, hasTable,
} from '../src/editor/mdSyntax.ts'

const doc = (text, from = 0, to = 0) => ({ text, from, to })

test('wrapInline 包裹选区', () => {
  const r = wrapInline(doc('hello bold', 6, 10), '**')
  assert.equal(r.text, 'hello **bold**')
  assert.deepEqual([r.from, r.to], [8, 12])
})

test('wrapInline 空选区插占位并选中', () => {
  const r = wrapInline(doc('ab', 1, 1), '**', '加粗')
  assert.equal(r.text, 'a**加粗**b')
  assert.deepEqual([r.from, r.to], [2, 4])
})

test('wrapInline 紧贴两侧同标记时取消', () => {
  // a**bold**b：下标 0a *1 *2 b3 o4 l5 d6 *7 *8 b9
  const r = wrapInline(doc('a**bold**b', 3, 7), '**')
  assert.equal(r.text, 'aboldb')
  assert.deepEqual([r.from, r.to], [1, 5])
})

test('wrapInline 选区自带标记时取消', () => {
  const r = wrapInline(doc('a**bold**b', 1, 9), '**')
  assert.equal(r.text, 'aboldb')
  assert.deepEqual([r.from, r.to], [1, 5])
})

test('clearInline 清选区内多类标记', () => {
  const r = clearInline(doc('a **b** *c* ==d== <u>e</u>', 0, 28))
  assert.equal(r.text, 'a b c d e')
})

test('toggleHeading 升级/同级取消/新增', () => {
  assert.equal(toggleHeading(doc('# Title', 0, 7), 3).text, '### Title')
  assert.equal(toggleHeading(doc('## Title', 0, 0), 2).text, 'Title')
  assert.equal(toggleHeading(doc('plain', 0, 0), 2).text, '## plain')
})

test('toggleList 互斥切换', () => {
  assert.equal(toggleList(doc('- a', 0, 0), 'ol').text, '1. a')
  assert.equal(toggleList(doc('1. a', 0, 0), 'ul').text, '- a')
  assert.equal(toggleList(doc('- a', 0, 0), 'ul').text, 'a')
  assert.equal(toggleList(doc('a', 0, 0), 'task').text, '- [ ] a')
})

test('toggleQuote 行级切换', () => {
  assert.equal(toggleQuote(doc('x\ny', 0, 0)).text, '> x\n> y')
  assert.equal(toggleQuote(doc('> x', 0, 0)).text, 'x')
})

test('insertLink 有选区取文字为 label', () => {
  const r = insertLink(doc('see docs', 4, 8), 'https://a.b')
  assert.equal(r.text, 'see [docs](https://a.b)')
})

test('insertImage', () => {
  const r = insertImage(doc('pre', 3, 3), 'u.png', 'CAP')
  assert.equal(r.text, 'pre\n\n![CAP](u.png)\n\n')
  assert.deepEqual([r.from, r.to], [9, 12])
})

test('insertTable', () => {
  const r = insertTable(doc('', 0, 0), [['A', 'B'], ['1', '2']])
  assert.equal(r.text, '| A | B |\n| --- | --- |\n| 1 | 2 |')
})

test('insertHr / insertBlock', () => {
  assert.equal(insertHr(doc('a', 1, 1)).text.includes('\n\n---\n\n'), true)
  assert.equal(insertBlock(doc('a', 1, 1), '```bash\nls\n```').text, 'a\n\n```bash\nls\n```\n\n')
})

test('continueList：续行/退出/普通行', () => {
  const out = continueList(doc('- ', 2, 2))
  assert.equal(out.insert, null)
  assert.deepEqual(out.delseg, { from: 0, to: 2 })
  assert.equal(continueList(doc('- a', 3, 3)).insert, '\n- ')
  assert.equal(continueList(doc('1. a', 4, 4)).insert, '\n2. ')
  assert.equal(continueList(doc('- [ ] a', 7, 7)).insert, '\n- [ ] ')
  const plain = continueList(doc('hello', 5, 5))
  assert.equal(plain.insert, null)
  assert.equal(plain.delseg, null)
})

test('insertFootnote 编号递增 + 文末定义', () => {
  const { text } = insertFootnote(doọc('x [^1]', 0, 0))
  assert.match(text, /\[\^2\]: 脚注内容/)
})

test('buildToc', () => {
  assert.deepEqual(buildToc('# A\n## B\ncontent\n# C'), [
    { text: 'A', level: 1, line: 0 },
    { text: 'B', level: 2, line: 1 },
    { text: 'C', level: 1, line: 3 },
  ])
})

test('countMdStats', () => {
  const s = countMdStats('# Hello\n\nworld **bold**\n')
  assert.ok(s.words >= 3)
  assert.equal(s.lines, 4)
})

test('hasTable', () => {
  assert.equal(hasTable('| a | b |\n| --- | --- |'), true)
  assert.equal(hasTable('no table'), false)
})
```

（若上方 `doọc` 出现乱码，执行时修正为 `doc`；最终以通过全部用例的测试文本为准。）

- [ ] **步骤 2：运行确认失败**

运行：`node --import tsx --test tests/md-syntax-runtime.test.mjs`
预期：FAIL（模块不存在）

- [ ] **步骤 3：完整实现 `src/editor/mdSyntax.ts`**

```ts
/** 纯 markdown 源码文本变换。undo 由 CodeMirror history 承担。 */

export interface Span { text: string; from: number; to: number }
export interface Doc { text: string; from: number; to: number }

const esc = (s: string) => s.replace(/[|\\]/g, (c) => '\\' + c)

const lineStartOf = (text: string, at: number) => text.lastIndexOf('\n', Math.max(0, at - 1)) + 1
const lineEndOf = (text: string, at: number) => {
  const next = text.indexOf('\n', at)
  return next === -1 ? text.length : next
}

/* ── inline ── */

export function wrapInline(d: Doc, mark: string, placeholder = ''): Span {
  const m0 = mark.length
  const { text, from, to } = d
  // 紧贴两侧同标记 → 取消
  if (
    from >= m0 && to + m0 <= text.length &&
    text.slice(from - m0, from) === mark && text.slice(to, to + m0) === mark
  ) {
    const inner = text.slice(from, to)
    const base = from - m0
    return { text: text.slice(0, base) + inner + text.slice(to + m0), from: base, to: base + inner.length }
  }
  // 选区自身带标记 → 取消
  const sel = text.slice(from, to)
  if (sel.startsWith(mark) && sel.endsWith(mark) && sel.length > m0 * 2) {
    const inner = sel.slice(m0, -m0)
    return { text: text.slice(0, from) + inner + text.slice(to), from, to: from + inner.length }
  }
  const content = sel || placeholder
  return {
    text: text.slice(0, from) + mark + content + mark + text.slice(to),
    from: from + m0,
    to: from + m0 + content.length,
  }
}

export function clearInline(d: Doc): Span {
  const sel = d.text.slice(d.from, d.to)
  const cleaned = sel
    .replace(/(\*\*|__)([\s\S]*?)\1/g, '$2')
    .replace(/(\*|_)([^*_\s][^*_]*?)\1/g, '$2')
    .replace(/~~([\s\S]*?)~~/g, '$1')
    .replace(/==([\s\S]*?)==/g, '$1')
    .replace(/<u>([\s\S]*?)<\/u>/g, '$1')
    .replace(/<sub>([\s\S]*?)<\/sub>/g, '$1')
    .replace(/<sup>([\s\S]*?)<\/sup>/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
  return { text: d.text.slice(0, d.from) + cleaned + d.text.slice(d.to), from: d.from, to: d.from + cleaned.length }
}

/* ── 行级 ── */

function remapLines(text: string, from: number, to: number, mapLine: (line: string, i: number) => string): Span {
  const start = lineStartOf(text, from)
  const end = lineEndOf(text, Math.max(from, to) - (from === to ? 0 : 1) + (from === to ? 0 : 0)) + (to > from && text[lineEndOf(text, to)] !== undefined && text[lineEndOf(text, to) - 0] === '\n' ? 0 : 1)
  const slice = text.slice(start, Math.max(end, start))
  const mapped = slice.split('\n').map(mapLine).join('\n')
  const out = text.slice(0, start) + mapped + text.slice(start + slice.length)
  return { text: out, from, to: to }
}

export function toggleHeading(d: Doc, level: number): Span {
  const ls = lineStartOf(d.text, d.from)
  const le = lineEndOf(d.text, d.from)
  const line = d.text.slice(ls, le)
  const m = line.match(/^(#{1,6})(\s+)(.*)$/)
  if (!m) {
    const head = '#'.repeat(level) + ' '
    return { text: d.text.slice(0, ls) + head + line + d.text.slice(le), from: d.from + head.length, to: d.to + head.length }
  }
  if (m[1].length === level) {
    return { text: d.text.slice(0, ls) + m[3] + d.text.slice(le), from: d.from - m[0].length + m[3].length, to: d.to - m[0].length + m[3].length }
  }
  const head = '#'.repeat(level) + ' '
  const body = m[3]
  return { text: d.text.slice(0, ls) + head + body + d.text.slice(le), from: d.from - m[0].length + head.length, to: d.to - m[0].length + head.length }
}

export function toggleList(d: Doc, kind: 'ul' | 'ol' | 'task'): Span {
  return remapLines(d.text, d.from, d.to, (line) => {
    const indent = line.match(/^\s*/)![0]
    const stripped = stripList(line)
    const orig = detectList(line)
    if (orig && orig.kind === kind) return stripped
    const marker = kind === 'ul' ? '- ' : kind === 'ol' ? '1. ' : '- [ ] '
    return `${indent}${marker}${stripped.trimStart()}`
  })
}

export function toggleQuote(d: Doc): Span {
  return remapLines(d.text, d.from, d.to, (line) => {
    const m = line.match(/^> ?(.*)$/)
    return m ? m[1] : `> ${line}`
  })
}

export function detectList(line: string): { kind: 'ul' | 'ol' | 'task'; end: number } | null {
  const task = line.match(/^(\s*-)\s\[[ xX]\]\s/)
  if (task) return { kind: 'task', end: task[0].length }
  const ul = line.match(/^(\s*)[-+*]\s/)
  if (ul) return { kind: 'ul', end: ul[0].length }
  const ol = line.match(/^(\s*)\d+[.)]\s/)
  if (ol) return { kind: 'ol', end: ol[0].length }
  return null
}

export const stripList = (line: string): string => {
  const d = detectList(line)
  return d ? line.slice(d.end).trimStart() === '' ? '' : line.slice(d.end) : line
}
```

⚠️ 备查：`remapLines` 中 `end` 的推导在执行时意图是「覆盖光标所在行整行；有选区且多行时覆盖到选区末行」，上面的表达式不够直白。执行时以这个等价版本为准：

```ts
function remapLines(text: string, from: number, to: number, mapLine: (line: string, i: number) => string): Span {
  const start = lineStartOf(text, from)
  const end = lineEndOf(text, Math.max(from, to - (to > from ? 1 : 0)))
  const slice = text.slice(start, end)
  const mapped = slice.split('\n').map(mapLine).join('\n')
  const out = text.slice(0, start) + mapped + text.slice(start + slice.length)
  return { text: out, from, to }
}
```

（以单测通过为最终裁决；实现允许比示例更直白，行为必须与全部用例一致。）

- [ ] **步骤 4：同一文件下半段（插入类）**

在 `mdSyntax.ts` 末尾继续写入：

```ts
/* ── 插入 ── */

export function insertLink(d: Doc, url: string, title?: string): Span {
  const label = title || (d.from !== d.to ? d.text.slice(d.from, d.to) : '链接')
  const body = `[${label}](${url})`
  return { text: d.text.slice(0, d.from) + body + d.text.slice(d.to), from: d.from, to: d.from + body.length }
}

export function insertImage(d: Doc, src: string, alt = ''): Span {
  const at = Math.min(d.from, d.text.length)
  const body = `\n\n![${alt}](${src})\n\n`
  return { text: d.text.slice(0, at) + body + d.text.slice(at), from: at + 3, to: at + 3 + alt.length }
}

export function insertTable(d: Doc, rows: string[][]): Span {
  if (!rows.length) return { text: d.text, from: d.from, to: d.to }
  const head = rows[0]
  const t = [
    '| ' + head.map(esc).join(' | ') + ' |',
    '| ' + head.map(() => '---').join(' | ') + ' |',
    ...rows.slice(1).map(r => '| ' + r.map(esc).join(' | ') + ' |'),
  ].join('\n')
  const at = Math.min(d.from, d.text.length)
  const body = `\n\n${t}\n\n`
  return { text: d.text.slice(0, at) + body + d.text.slice(at), from: at + 2, to: at + 2 + t.length }
}

export function insertHr(d: Doc): Span {
  return insertBlock(d, '---')
}

export function insertBlock(d: Doc, snippet: string): Span {
  const at = Math.min(d.from, d.text.length)
  const headBefore = d.text.slice(0, at)
  const before = at === 0 ? '' : headBefore.endsWith('\n\n') ? '' : headBefore.endsWith('\n') ? '\n' : '\n\n'
  const body = before + snippet + '\n\n'
  return { text: headBefore + body + d.text.slice(at), from: at + before.length, to: at + before.length + snippet.length }
}

/* ── 列表回车 ── */

export function continueList(d: Doc): { insert: string | null; delseg: { from: number; to: number } | null } {
  const lineStart = lineStartOf(d.text, d.from)
  const line = d.text.slice(lineStart, d.from)
  const task = line.match(/^(\s*)- \[([ xX])\] (.*)$/)
  if (task) {
    if (task[3] === '') return { insert: null, delseg: { from: lineStart + task[1].length, to: d.from } }
    return { insert: `\n${task[1]}- [${task[2] === ' ' ? ' ' : 'x'}] `, delseg: null }
  }
  const ol = line.match(/^(\s*)(\d+)([.)]) (.*)$/)
  if (ol) {
    if (ol[4] === '') return { insert: null, delseg: { from: lineStart + ol[1].length, to: d.from } }
    return { insert: `\n${ol[1]}${Number(ol[2]) + 1}${ol[3]} `, delseg: null }
  }
  const ul = line.match(/^(\s*)[-+*] (.*)$/)
  if (ul) {
    if (ul[2] === '') return { insert: null, delseg: { from: lineStart + ul[1].length, to: d.from } }
    return { insert: `\n${ul[1]}- `, delseg: null }
  }
  return { insert: null, delseg: null }
}

/* ── 脚注/目录/统计 ── */

export function insertFootnote(d: Doc): Span {
  const max = [...d.text.matchAll(/\[\^(\d+)\]/g)].reduce((acc, m) => Math.max(acc, Number(m[1])), 0)
  const no = max + 1
  const ref = `[^${no}]`
  const caret = d.from
  return {
    text: d.text.slice(0, caret) + ref + d.text.slice(caret) + `\n\n[^${no}]: 脚注内容`,
    from: caret, to: caret + ref.length,
  }
}

export interface TocItem { text: string; level: number; line: number }

export function buildToc(md: string): TocItem[] {
  const items: TocItem[] = []
  md.split('\n').forEach((line, i) => {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (m) items.push({ text: m[2], level: m[1].length, line: i })
  })
  return items
}

export function countMdStats(md: string): { words: number; chars: number; lines: number } {
  const stripped = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]*\$/g, ' ')
    .replace(/[#>*~_=`\-]+/g, ' ')
  const cjk = (stripped.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length
  const latin = stripped.split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w) && w.length > 0 && !/^[`#*>~_-]+$/.test(w)).length
  return { words: cjk + latin, chars: md.length, lines: md.split('\n').length }
}

export function hasTable(text: string): boolean {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length - 1; i++) {
    if (/\|.+\|/.test(lines[i]) && /^\s*\|?[\s:|-]*\|[\s:|-]*$/.test(lines[i + 1]) && lines[i + 1].includes('---')) return true
  }
  return false
}
```

注意实现块含两个 `remapLines`（⚠️ 备查段与正式段）：执行时**删除备查版本**，仅保留最终直白版本，并保证 `toggleHeading`/`toggleList`/`toggleQuote` 全部用例通过。

- [ ] **步骤 5：运行确认通过**

运行：`node --import tsx --test tests/md-syntax-runtime.test.mjs`
预期：全部 PASS

（逐条跑完后修正错误的用例或实现——先改用例再改实现，两轮内必须一致。）

- [ ] **步骤 6：Commit**

```bash
git add src/editor/mdSyntax.ts tests/md-syntax-runtime.test.mjs
git commit -m "feat(editor): markdown 源码纯文本变换核心（mdSyntax）"
```

---

### 任务 3：`src/editor/cmTheme.ts` + `src/editor/api.ts`

**文件：**
- 创建：`src/editor/cmTheme.ts`
- 创建：`src/editor/api.ts`

- [ ] **步骤 1：完整实现 `cmTheme.ts`**

```ts
import { HighlightStyle, syntaxHighlighting, tags as t } from '@lezer/highlight'
import { EditorView } from '@codemirror/view'
import { Compartment } from '@codemirror/state'

export const lineNumbersCompartment = new Compartment()

const highlight = HighlightStyle.define([
  { tag: t.heading1, class: 'cm-h1' },
  { tag: t.heading2, class: 'cm-h2' },
  { tag: t.heading3, class: 'cm-h3' },
  { tag: t.heading, class: 'cm-h' },
  { tag: t.strong, class: 'cm-strong' },
  { tag: t.emphasis, class: 'cm-em' },
  { tag: t.strikethrough, class: 'cm-strike' },
  { tag: t.link, class: 'cm-link' },
  { tag: t.url, class: 'cm-url' },
  { tag: t.monospace, class: 'cm-code' },
  { tag: t.quote, class: 'cm-quote' },
  { tag: t.list, class: 'cm-list' },
  { tag: t.processingInstruction, color: 'var(--color-text-muted)' },
])

export const editorHighlight = syntaxHighlighting(highlight)

export const editorBaseTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'var(--color-text-primary)', height: '100%' },
  '.cm-content': { fontFamily: 'var(--font-mono)', padding: '24px 8px 40vh', caretColor: 'var(--color-primary)' },
  '.cm-line': { padding: '0 12px' },
  '.cm-scroller': { overflow: 'auto', lineHeight: '1.8' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--color-text-muted)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--color-primary) 18%, transparent)',
  },
  '.cm-quote': { color: 'var(--color-text-secondary)' },
  '.cm-h1, .cm-h1 *': { fontSize: '1.5em', fontWeight: 700 },
  '.cm-h2, .cm-h2 *': { fontSize: '1.3em', fontWeight: 650 },
  '.cm-h3, .cm-h3 *': { fontSize: '1.15em', fontWeight: 600 },
  '.cm-strong': { fontWeight: 700 },
  '.cm-link': { color: 'var(--color-primary)', textDecoration: 'underline' },
})
```

- [ ] **步骤 2：完整实现 `api.ts`**

```ts
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import {
  SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll, openSearchPanel,
} from '@codemirror/search'
import {
  wrapInline, clearInline, toggleHeading, toggleList, toggleQuote,
  insertLink, insertImage, insertTable, insertBlock, insertHr,
  insertFootnote, buildToc, countMdStats, hasTable, continueList,
} from './mdSyntax'
import type { Doc, Span } from './mdSyntax'

export interface EditorApi {
  kind: 'codemirror'
  getMd(): string
  setMd(text: string): void
  focus(): void
  blur(): void
  getSelectionText(): string
  replaceSel(text: string, opts?: { select?: boolean }): void
  wrapSel(mark: string, placeholder?: string): void
  clearFormatting(): void
  heading(level: number): void
  list(kind: 'ul' | 'ol' | 'task'): void
  quote(): void
  link(url: string): void
  image(src: string, alt?: string): void
  table(rows: string[][]): void
  codeBlock(lang: string, code: string): void
  math(formula: string, block: boolean): void
  hr(): void
  toc(): void
  footnote(): void
  emoji(text: string): void
  caretOffset(): number
  caretCoords(): { x: number; y: number } | null
  deleteNearby(count: number): void
  search(term: string, opts: { replaceTerm?: string; caseSensitive: boolean; mode: 'search' | 'next' | 'prev' | 'replace' | 'replaceAll' }): void
  stats(): { words: number; chars: number; lines: number }
  isTableHere(): boolean
}

function applySpan(view: EditorView, fn: (d: Doc) => Span, select = true) {
  const sel = view.state.selection.main
  const d = { text: view.state.doc.toString(), from: sel.from, to: sel.to }
  const r = fn(d)
  if (r.text === d.text) return
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: r.text },
    selection: select ? EditorSelection.range(Math.max(0, r.from), Math.max(0, r.to)) : undefined,
    scrollIntoView: true,
  })
}

export function buildCmApi(view: EditorView): EditorApi {
  return {
    kind: 'codemirror',
    getMd: () => view.state.doc.toString(),
    setMd: (text) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        selection: EditorSelection.cursor(text.length),
        scrollIntoView: true,
      })
      view.focus()
    },
    focus: () => view.focus(),
    blur: () => { try { (view.contentDOM as HTMLElement).blur() } catch {} },
    getSelectionText: () => {
      const s = view.state.selection.main
      return view.state.sliceDoc(s.from, s.to)
    },
    replaceSel: (text, opts) => {
      const s = view.state.selection.main
      view.dispatch({
        changes: { from: s.from, to: s.to, insert: text },
        selection: opts?.select === false ? EditorSelection.cursor(s.from + text.length) : EditorSelection.range(s.from, s.from + text.length),
        scrollIntoView: true,
      })
      view.focus()
    },
    wrapSel: (mark, placeholder) => applySpan(view, d => wrapInline(d, mark, placeholder ?? '')),
    clearFormatting: () => applySpan(view, d => clearInline(d)),
    heading: (level) => {
      const s = view.state.selection.main
      // 标题按光标所在行处理：把整行交给 toggleHeading
      const from = s.from
      applySpan(view, d => toggleHeading({ ...d, from, to: Math.max(from, s.to) }, level))
    },
    list: (kind) => applySpan(view, d => toggleList(d, kind)),
    quote: () => applySpan(view, d => toggleQuote(d)),
    link: (url) => applySpan(view, d => insertLink(d, url)),
    image: (src, alt) => applySpan(view, d => insertImage(d, src, alt)),
    table: (rows) => applySpan(view, d => insertTable(d, rows)),
    codeBlock: (lang, code) => applySpan(view, d => insertBlock(d, '```' + (lang || '') + '\n' + (code || '') + '\n```')),
    math: (formula, block) => {
      if (block) { applySpan(view, d => insertBlock(d, `$$\n${formula}\n$$`)); return }
      const s = view.state.selection.main
      view.dispatch({
        changes: { from: s.from, to: s.to, insert: `$${formula}$` },
        selection: EditorSelection.cursor(s.from + formula.length + 2),
        scrollIntoView: true,
      })
      view.focus()
    },
    hr: () => applySpan(view, d => insertHr(d)),
    toc: () => {
      const items = buildToc(view.state.doc.toString())
      const lines = items.length
        ? items.map(it => `${'  '.repeat(Math.max(0, it.level - 1))}- ${it.text}`)
        : ['- 暂无标题']
      applySpan(view, d => insertBlock(d, ['**目录**', ...lines].join('\n')))
    },
    footnote: () => applySpan(view, d => insertFootnote(d)),
    emoji: (text) => applySpan(view, d => ({ text: d.text.slice(0, d.from) + text + d.text.slice(d.to), from: d.from + text.length, to: d.from + text.length })),
    caretOffset: () => view.state.selection.main.from,
    caretCoords: () => {
      try {
        const c = view.coordsAtPos(view.state.selection.main.from)
        return c ? { x: c.right, y: c.top } : null
      } catch { return null }
    },
    deleteNearby: (count) => {
      const s = view.state.selection.main
      view.dispatch({ changes: { from: Math.max(0, s.from - count), to: s.from, insert: '' }, selection: EditorSelection.cursor(Math.max(0, s.from - count)) })
      view.focus()
    },
    search: (term, opts) => {
      if (!term) return
      const q = new SearchQuery({ search: term, replace: opts.replaceTerm || '', caseSensitive: !!opts.caseSensitive })
      view.dispatch({ effects: setSearchQuery.of(q) })
      if (opts.mode === 'search') openSearchPanel(view)
      else if (opts.mode === 'next') findNext(view)
      else if (opts.mode === 'prev') findPrevious(view)
      else if (opts.mode === 'replace') replaceNext(view)
      else replaceAll(view)
    },
    stats: () => countMdStats(view.state.doc.toString()),
    isTableHere: () => hasTable(view.state.doc.toString()),
  }
}
```

- [x] **步骤 3：typecheck + Commit**

运行：`npm run typecheck`
预期：0 error

```bash
git add src/editor/cmTheme.ts src/editor/api.ts
git commit -m "feat(editor): CodeMirror 桥接 API 与编辑区主题"
```

---

### 任务 4：`src/components/editor/MarkdownEditor.tsx`

**文件：**
- 创建：`src/components/editor/MarkdownEditor.tsx`

- [ ] **步骤 1：完整实现（无 require / 无 Compartment 缺陷版本）**

```tsx
import React, { useEffect, useRef } from 'react'
import { EditorView, keymap, drawSelection, lineNumbers, highlightActiveLine, viewLineWrapper } from '@codemirror/view'
import { EditorState, EditorSelection } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { bracketMatching, indentUnit } from '@codemirror/language'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { buildCmApi } from '../../editor/api'
import { editorBaseTheme, editorHighlight, lineNumbersCompartment } from '../../editor/cmTheme'
import { continueList } from '../../editor/mdSyntax'

interface Props {
  initialMd: string
  onChange: (md: string) => void
  className?: string
}

/** 列表回车续行：优先级高于默认 Enter */
const listEnterKeymap = keymap.of([{
  key: 'Enter',
  run: (view) => {
    const sel = view.state.selection.main
    const r = continueList({ text: view.state.doc.toString(), from: sel.from, to: sel.from })
    if (r.delseg) {
      view.dispatch({
        changes: { from: r.delseg.from, to: r.delseg.to, insert: '' },
        selection: EditorSelection.cursor(r.delseg.from),
      })
      return true
    }
    if (r.insert) {
      view.dispatch({
        changes: { from: sel.from, insert: r.insert },
        selection: EditorSelection.cursor(sel.from + r.insert.length),
      })
      return true
    }
    return false
  },
}])

export const MarkdownEditor: React.FC<Props> = ({ initialMd, onChange, className }) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const setEditor = useEditorStore((s: any) => s.setEditor)
  const setEditorRef = useEditorStore((s: any) => s.setEditorContentRef)

  useEffect(() => {
    if (!hostRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: initialMd,
        extensions: [
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          EditorView.lineWrapping,
          history(),
          drawSelection(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          indentUnit.of('  '),
          bracketMatching(),
          closeBrackets(),
          editorBaseTheme,
          editorHighlight,
          lineNumbersCompartment.of(useSettingsStore.getState().showLineNumbers ? lineNumbers() : []),
          listEnterKeymap,
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString())
            if (u.selectionSet) {
              const pos = u.state.selection.main.from
              const line = u.state.doc.lineAt(pos)
              useEditorStore.setState({ cursorPosition: { line: line.number, column: pos - line.from + 1 } })
            }
          }),
          EditorView.contentAttributes.of({
            spellcheck: String(useSettingsStore.getState().enableSpellCheck),
            ...(useSettingsStore.getState().spellCheckLang ? { lang: useSettingsStore.getState().spellCheckLang } : {}),
          }),
        ],
      }),
      parent: hostRef.current,
    })
    void viewLineWrapper // 占位引用移除：执行时若 viewLineWrapper 导入不存在则直接不导入
    viewRef.current = view
    setEditor(buildCmApi(view))
    setEditorRef(hostRef.current)
    return () => {
      setEditor(null)
      viewRef.current = null
      try { view.destroy() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 行号开关热切换
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: lineNumbersCompartment.reconfigure(showLineNumbers ? lineNumbers() : []) })
  }, [0])

  const showLineNumbers = useSettingsStore((s) => s.showLineNumbers)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: lineNumbersCompartment.reconfigure(showLineNumbers ? lineNumbers() : []) })
  }, [showLineNumbers])

  return <div ref={hostRef} className={`cm-host${className ? ' ' + className : ''}`} />
}
```

执行修正（一次性完成，不留缺陷）：
- 删除 `viewLineWrapper` 导入与其 `void` 行（不存在该导出）。
- 删除「行号热切换」第一个带 `[0]` 依赖的 useEffect（错误依赖），只保留 `showLineNumbers` 驱动的那个，且把 `const showLineNumbers = ...` 声明移到两个 effect 之前。
- `EditorSelection` 仅在 keymap 中使用，保留。

- [x] **步骤 2：typecheck**

运行：`npm run typecheck`
预期：0 error

- [ ] **步骤 3：Commit**

```bash
git add src/components/editor/MarkdownEditor.tsx
git commit -m "feat(editor): CodeMirror React 包装组件 MarkdownEditor"
```

---

### 任务 5：命令层 `editorActions.tsx`

**文件：**
- 修改：`src/components/layout/editorActions.tsx:83-94,128-263`

- [x] **步骤 1：`useTableActive` 替换**

```tsx
/** 表格子菜单置灰：源码视图下采样文档是否含表格（低频轮询即可）。 */
export function useTableActive(): boolean {
  const editor = useEditorStore((s: any) => s.editor)
  const [active, setActive] = useState(false)
  useEffect(() => {
    if (!editor?.isTableHere) { setActive(false); return }
    const probe = () => setActive(!!editor.isTableHere())
    probe()
    const t = setInterval(probe, 600)
    return () => clearInterval(t)
  }, [editor])
  return active
}
```

- [x] **步骤 2：`useEditorActions` 整体替换**

```tsx
/** 编辑动作，供顶栏和左侧 rail 共用，避免两套逻辑漂移。 */
export function useEditorActions() {
  const api = useEditorStore((s: any) => s.editor)
  const setInsertPanel = useEditorStore((s: any) => s.setInsertPanel)
  const createDoc = useEditorStore((s: any) => s.createDoc)

  const applyCmd = useCallback((cmd: string) => {
    if (!api) return
    switch (cmd) {
      case 'bold': api.wrapSel('**', '加粗'); break
      case 'italic': api.wrapSel('*', '斜体'); break
      case 'underline': api.wrapSel('<u>', '下划线'); break
      case 'strikeThrough': api.wrapSel('~~', '删除线'); break
      case 'toggleHighlight': api.wrapSel('==', '高亮'); break
      case 'sup': api.wrapSel('<sup>', '上标'); break
      case 'sub': api.wrapSel('<sub>', '下标'); break
    }
  }, [api])

  const formatAction = useCallback((action: string) => {
    if (action === 'link') { setInsertPanel('link'); return }
    if (action === 'image') { setInsertPanel('image'); return }
    if (!api) return
    if (/^h[1-5]$/.test(action)) { api.heading(parseInt(action[1], 10)); return }
    switch (action) {
      case 'clear': api.clearFormatting(); break
      case 'ol': api.list('ol'); break
      case 'ul': api.list('ul'); break
      case 'task': api.list('task'); break
    }
  }, [api, setInsertPanel])

  const insertAction = useCallback((action: string) => {
    if (action === 'code') { setInsertPanel('code'); return }
    if (action === 'math') { setInsertPanel('formula'); return }
    if (action === 'chart') { setInsertPanel('chart'); return }
    if (action === 'emoji') { setInsertPanel('emoji'); return }
    if (!api) return
    switch (action) {
      case 'toc': api.toc(); break
      case 'quote': case 'blockquote': api.quote(); break
      case 'footnote': api.footnote(); break
      case 'hr': api.hr(); break
    }
  }, [api, setInsertPanel])

  const tableAction = useCallback((action: string) => {
    if (action === 'insert') { setInsertPanel('table'); return }
    // 其余表格项在源码视图保持置灰（applyTableItems 控制）
  }, [setInsertPanel])

  const modeAction = useCallback((action: string) => {
    const st = useEditorStore.getState()
    switch (action) {
      case 'preview': st.setShowPreview(!st.showPreview); break
      case 'code': st.setAppMode('code'); break
      case 'read': st.setAppMode('read'); break
    }
  }, [])

  const newDocument = useCallback(() => {
    createDoc()
    useEditorStore.getState().setLastEditTime(Date.now())
  }, [createDoc])

  const openFileDialog = useCallback(() => useEditorStore.getState().setOpenPanel('file'), [])

  const openFolderDialog = useCallback(async () => {
    const files = await pickFolderFiles()
    if (files) await importFolderFiles(files)
  }, [])

  return { editor: api, applyCmd, formatAction, insertAction, tableAction, modeAction, newDocument, openFileDialog, openFolderDialog }
}
```

- [x] **步骤 3：typecheck + Commit**

运行：`npm run typecheck`
预期：0 error（unused import 若报错则删除对应 import 行）

```bash
git add src/components/layout/editorActions.tsx
git commit -m "feat(commands): 命令层改为 EditorApi 语法操作"
```

---

### 任务 6：改造 TipTap 消费点

**文件：**
- 修改：`src/App.tsx:243,299,328,342-367`
- 修改：`src/hooks/useAI.ts:170-205`
- 修改：`src/components/panels/SearchPanel.tsx:30-110`
- 修改：`src/components/panels/LibraryPanel.tsx:84,106,128`
- 修改：`src/components/panels/HistoryPanel.tsx:25-45`
- 修改：`src/components/editor/SlashCommand.tsx`
- 修改：`src/store/editorStore.ts:230-239,272-276`

- [x] **步骤 1：App.tsx**

替换以下片段（旧 → 新）：

```tsx
// ~243 行（doc 导入落盘）
es.editor?.commands?.setContent(html)
// →
const md = /<[a-z][\s\S]*>/i.test(html.slice(0, 200)) ? htmlToMarkdown(html) : html
es.editor?.setMd?.(md)

// ~299 行 insertImage
editor.chain().focus().insertImage({ src: url, alt, align }).run()
// →
void editor.image(url, alt || '')
// （编辑器未就绪时直接 return，与 328 行共同处理）

// ~328 行（enablePasteImageFile 本地 FileReader 图片）
editor.commands.insertContent({ type: 'image', attrs: { src: ev.target?.result as string, alt: file.name } })
// →
editor.image(url, file.name)

// ~342-351 行 applyLink
if (editor) {
  if (typeof editor.state.selection === 'object' && editor.state.selection.from !== editor.state.selection.to) {
    editor.chain().focus().setLink(linkContent).run()
  } else {
    editor.chain().focus().extendMarkRange('link').insertContent(linkContent).run()
  }
}
// →
if (editor) {
  if (linkText) { /* 有文字选区时直接生成 [选区](url) */ void editor.link(url) }
  else void editor.replaceSel(`[链接](${url})`)
}
// 同时删除 linkText 拆解逻辑外的旧 mark 运算；链接面板回填函数相应改为传 url 单参

// ~360 行 insertEmoji
if (!editor) return
editor.chain().focus().insertContent(text).run()
closeInsert()
// →
if (!editor) return
void editor.replaceSel(text)
closeInsert()

// ~367 行 insertTable
if (!editor || rows <= 0 || cols <= 0) return
editor.chain().focus().insertContent(buildTableHtml(rows, cols, data, withHeaderRow)).run()
closeInsert()
// →
if (!editor || rows <= 0 || cols <= 0) return
const grid: string[][] = data ?? Array.from({ length: rows }, (_, r) =>
  Array.from({ length: cols }, (_, c) => (r === 0 && withHeaderRow ? `表头${c + 1}` : ''))
)
void editor.table(grid)
closeInsert()
// 删除 buildTableHtml 函数与 anchorToEscape 中对它的 import
```

- [x] **步骤 2：useAI.ts（176-202）**

```ts
// 原：
const { from, to } = editor.state.selection
editor.chain().focus().deleteRange({ from, to }).insertContent(output).run()
// 新：
const hasSel = apiGrabbing
editor.replaceSel(output)
```

函数开头拿上下文改为：

```ts
const api = useEditorStore.getState().editor
if (!api) return
const ctxText = api.getSelectionText()
```

undo 恢复（~202 行）改为：`api.replaceSel(record.originalText || '')`。
所有 `editor.chain...` / `editor.state...` 引用全部删除。

- [x] **步骤 3：SearchPanel.tsx**

```tsx
// 原 66-71 行
editor.commands.setSearchTerm(pattern); editor.commands.setCaseSensitive(...); editor.commands.resetIndex(); editor.view?.dispatch(...)
// 新
api.search(pattern, (w) =>{}) //  wait — 直接替换
api.search(term, { caseSensitive, mode: 'search' })
// 80-90 行
api.search(term, { replaceTerm, caseSensitive, mode: 'replace' })
api.search(term, { replaceTerm, caseSensitive, mode: 'replaceAll' })
// 96-103 行
api.search(term, { caseSensitive, mode: 'next' })
api.search(term, { caseSensitive, mode: 'prev' })
```

（执行时先 `rg -n "editor" src/components/panels/SearchPanel.tsx` 定位全部调用点，逐一映射到上表。）

- [x] **步骤 4：LibraryPanel / HistoryPanel**

```tsx
// LibraryPanel.tsx 84/106/128：
if (editor) editor.chain().focus().setContent(text).run()
// →
if (editor) editor.setMd(text)

// HistoryPanel.tsx 32/41：
if (editor) editor.commands.setContent(selected.html)
// →
if (editor) editor.setMd(selected.md || '')
```

- [x] **步骤 5：SlashCommand.tsx**

替换三段：

```tsx
// effectivePosition（62-80 行）→
const editor = useEditorStore((s: any) => s.editor)   // 若组件内已存在该行则复用
const effectivePosition = useMemo(() => {
  if (!editor?.caretCoords) return position
  const c = editor.caretCoords()
  return c ? { x: c.x + 2, y: c.y - 2 } : position
}, [editor, position])

// removeSlashQuery（104-111 行）→
const removeSlashQuery = useCallback(() => {
  if (!editor?.deleteNearby) return
  const md = editor.getMd()
  const caret = editor.caretOffset()
  const from = Math.max(0, caret - 40)
  const m = md.slice(from, caret).match(/\/([^\s]*)$/)
  if (!m) return
  editor.deleteNearby(m[0].length)
}, [editor])

// executeCommand（114-180 行）→
const executeCommand = useCallback((cmd: SlashCommandItem) => {
  onClose()
  if (!editor) return
  removeSlashQuery()
  switch (cmd.id) {
    case 'bold': editor.wrapSel('**', '加粗'); break
    case 'italic': editor.wrapSel('*', '斜体'); break
    case 'underline': editor.wrapSel('<u>', '下划线'); break
    case 'strike': editor.wrapSel('~~', ''); break
    case 'highlight': editor.wrapSel('==', ''); break
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      editor.heading(parseInt(cmd.id[1], 10)); break
    case 'hr': editor.hr(); break
    case 'ol': editor.list('ol'); break
    case 'ul': editor.list('ul'); break
    case 'task': editor.list('task'); break
    case 'quote': editor.quote(); break
    case 'footnote': editor.footnote(); break
    case 'toc': editor.toc(); break
    case 'link': setInsertPanel('link'); break
    case 'image': setInsertPanel('image'); break
    case 'emoji': setInsertPanel('emoji'); break
    case 'code': setInsertPanel('code'); break
    case 'math': setInsertPanel('formula'); break
    case 'table': setInsertPanel('table'); break
    case 'chart': setInsertPanel('chart'); break
  }
}, [editor, onClose, removeSlashQuery, setInsertPanel])
```

删除 `escapeHtml` 与 props 中 `editor?: any`（改为组件内部从 store 取）。

- [x] **步骤 6：editorStore.ts**

```ts
// switchDoc（231-238）：
try {
  const md = s.editor?.getMd?.() ?? ''
  if (md && md !== s.docsMd?.[s.activeDocId]) {
    s.updateDoc({ md, docsMd: { [s.activeDocId]: md } })
  }
} catch {}

// resetDocContent（273-276）：
if (s.activeDocId === id) {
  try { s.editor?.setMd?.(md) } catch (e) { silentError('还原出厂内容写入失败', e) }
}
```

- [x] **步骤 7：验证无残留（LZEditor.tsx 除外）+ Commit**

```bash
rg -l "@tiptap|prosemirror" src/ | grep -v "components/editor/LZEditor.tsx"
# 预期：无输出
npm run typecheck
git add -A src
git commit -m "refactor(editor): TipTap 消费点全部迁移到 CodeMirror EditorApi"
```

---

### 任务 7：重写 `LZEditor.tsx` + 清场

**文件：**
- 修改（整文件替换）：`src/components/editor/LZEditor.tsx`
- 删除：`src/components/editor/extensions/`、`src/utils/cleanContent.ts`（先 `rg -l` 确认仅 LZEditor 引用，有他处引用者按同思路迁移后再删）
- 修改：`vite.config.ts` 分包

- [x] **步骤 1：整文件替换**

```tsx
import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { MarkdownEditor } from './MarkdownEditor'
import { README_CONTENT } from './constants'
import { getDocMd } from '../../utils/docSource'
import { mdToHtml } from '../../utils/mdToHtml'
import { countMdStats } from '../../editor/mdSyntax'
import { useTheme } from '../../hooks/useTheme'
import { applyTypographyOverrides } from '../../styles/themes'

const CONTENT_WIDTH_MAP: Record<string, string> = {
  '960': '960px', '1024': '1024px', '1200': '1200px', '1280': '1280px', 'full': '100%',
}

const safeHtml = (md: string) => { try { return mdToHtml(md) } catch { return '' } }

export const LZEditor = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const readTocRef = useRef<HTMLDivElement>(null)
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setWordCount = useEditorStore((s: any) => s.setWordCount)
  const setCharCount = useEditorStore((s: any) => s.setCharCount)
  const updateDoc = useEditorStore((s: any) => s.updateDoc)
  const addVersion = useEditorStore((s: any) => s.addVersion)
  const setDocsMd = useEditorStore((s: any) => s.setDocsMd)
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const appMode = useEditorStore((s: any) => s.appMode)
  const setAppMode = useEditorStore((s: any) => s.setAppMode)
  const docTitle = useEditorStore((s) => s.docTitle)
  const wordCount = useEditorStore((s: any) => s.wordCount)

  const isRead = appMode === 'read'

  const initialMd = useMemo(() => {
    const docId = activeDocId || 'readme'
    return docsMd?.[docId] || getDocMd(docId) || (docId === 'readme' ? README_CONTENT : '')
  }, [activeDocId, docsMd])

  const readContent = useMemo(() => {
    if (isRead) {
      const docId = activeDocId || 'readme'
      const md = docsMd?.[docId] || getDocMd(docId)
      if (md && md.trim()) { const h = safeHtml(md); return h || md }
      return docId === 'readme' ? README_CONTENT : ''
    }
    return ''
  }, [isRead, activeDocId, docsMd])

  useTheme()

  const editorFont = useSettingsStore((s) => s.editorFont)
  const defaultFontSize = useSettingsStore((s) => s.defaultFontSize)
  const lineHeight = useSettingsStore((s) => s.lineHeight)
  const contentWidth = useSettingsStore((s) => s.contentWidth)
  const showPreview = useEditorStore((s) => s.showPreview)
  const readFontSize = useEditorStore((s) => s.readFontSize)
  const setReadFontSize = useEditorStore((s) => s.setReadFontSize)
  const readLayout = useEditorStore((s) => s.readLayout)
  const readTocOpen = useEditorStore((s) => s.readTocOpen)
  const setReadTocOpen = useEditorStore((s) => s.setReadTocOpen)
  const storeTocItems = useEditorStore((s) => s.tocItems)
  const setStoreTocItems = useEditorStore((s) => s.setTocItems)
  const activeTocId = useEditorStore((s) => s.activeTocId)
  const setActiveTocId = useEditorStore((s) => s.setActiveTocId)

  // 阅读模式 TOC 构建（沿用旧逻辑）
  useEffect(() => {
    const el = readTocRef.current
    if (!el || !readContent) return
    const headings = el.querySelectorAll('h1,h2,h3,h4,h5,h6')
    const items: { id: string; text: string; level: number }[] = []
    headings.forEach((h, i) => {
      const id = `read-h-${i}`
      h.setAttribute('id', id)
      items.push({ id, text: h.textContent?.trim() || '', level: parseInt(h.tagName[1]) })
    })
    setStoreTocItems(items)
  }, [readContent])
  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveTocId(id) }
  }, [])

  useEffect(() => {
    const page = editorRef.current?.querySelector('.lz-editor-page') as HTMLElement | null
    if (!page) return
    const fw = contentWidth && CONTENT_WIDTH_MAP[contentWidth] ? CONTENT_WIDTH_MAP[contentWidth] : showPreview ? '1024px' : '100%'
    page.style.width = fw
    page.style.maxWidth = fw === '100%' ? 'none' : fw
  }, [contentWidth, showPreview])

  const textIndent = useSettingsStore((s) => s.textIndent)
  const textJustify = useSettingsStore((s) => s.textJustify)
  const headingStyles = useSettingsStore((s) => s.headingStyles)
  useEffect(() => {
    applyTypographyOverrides({
      fontSize: defaultFontSize, lineHeight,
      fontFamily: editorFont === 'serif' ? '"Noto Serif SC", serif' : (editorFont === 'monospace' ? 'monospace' : editorFont),
      contentWidth, textIndent, textJustify, headingStyles,
    })
  }, [defaultFontSize, lineHeight, editorFont, contentWidth, textIndent, textJustify, headingStyles])

  const onChange = useCallback((md: string) => {
    const docId = useEditorStore.getState().activeDocId || 'readme'
    useEditorStore.getState().setLastEditTime(Date.now())
    const st = countMdStats(md)
    setWordCount(st.words)
    setCharCount(st.chars)
    setDocsMd((prev: Record<string, string> = {}) => ({ ...prev, [docId]: md }))
    updateDoc({ md })
    try { localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md, savedAt: Date.now() })) } catch {}
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
    snapshotTimerRef.current = setTimeout(() => {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      addVersion({
        id: String(Date.now()),
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        date: `${pad(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        desc: md.trim().slice(0, 24) || '空文档',
        changes: st.chars,
        html: safeHtml(md),
        md,
      })
    }, 1500)
    useEditorStore.getState().setSyncStatus('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => useEditorStore.getState().setSyncStatus('synced'), 600)
  }, [setWordCount, setCharCount, setDocsMd, updateDoc, addVersion])

  useEffect(() => () => {
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  }, [])

  const LAYOUTS = ['narrow', 'normal', 'wide'] as const
  const LAYOUT_LABELS: Record<string, string> = { narrow: '窄栏', normal: '标准', wide: '宽屏' }
  const LAYOUT_MAX_W: Record<string, number> = { narrow: 530, normal: 760, wide: 1000 }

  return (
    <div className="lz-editor" ref={editorRef}>
      <div className={`lz-editor-content${appMode === 'code' ? ' lz-editor-content--code' : ''}${isRead ? ' lz-editor-content--read' : ''}`}>
        {isRead && (
          <div className="read-mode-inline">
            {/* ── 以下 read-mode JSX 原样拷贝自旧文件 755-833 行（变量名全部已在此文件作用域） ──
                read-mode-toolbar / read-toc-sidebar / read-article-container / read-article-body
                内容使用 {readContent}、{readFontSize}、{LAYOUT_*}、{docTitle}、{wordCount} ── */}
          </div>
        )}
        {!isRead && (
          <div className="lz-editor-page">
            <MarkdownEditor
              key={activeDocId || 'readme'}
              initialMd={initialMd}
              onChange={onChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

执行规则：`{/* ... */}` 注释处必须把旧文件 755-833 行的 JSX **原样搬入**（其依赖的 readFontSize/readLayout/readTocOpen/storeTocItems/sort未在此重写，但都已在本组件 store 取值区存在），不得省略，也不得引入 TipTap。BubbleMenu、slash 输入监听、自动配对 effect、Markdown 标记/拼写/行号相关灰色 effect 全部删除（功能由 CM6 承担）。

- [x] **步骤 2：删除残留与分包更新**

```bash
git rm -r src/components/editor/extensions
rg -l "cleanContentHtml|utils/cleanContent" src/
# 若仅 LZEditor.tsx 引用，替换后无需处理；否则修改引用点后删除文件
```

`vite.config.ts`：

```ts
manualChunks(id: string) {
  if (id.includes('node_modules')) {
    if (id.includes('@codemirror') || id.includes('@lezer')) return 'vendor-codemirror'
    if (id.includes('/xlsx') || id.includes('/jszip') || id.includes('/epub')) return 'vendor-export'
    if (id.includes('katex')) return 'vendor-katex'
  }
}
```

- [x] **步骤 3：typecheck + 全库测试**

运行：`npm run typecheck && npm test`
预期：0 error、全部 PASS

- [ ] **步骤 4：手动核对清单（Phase 1 验收）**

`npm run dev` 后核对：
1. 首页 WelcomeScreen → 新建文档 → CM6 编辑器出现；`# 标题`、`- ` 列表回车续行、`**粗体**` 正常。
2. 工具栏：粗体/斜体/删除线/高亮对选区包裹且可反悔（再点取消）；h2 → 行前缀变化。
3. 插入菜单：表格/公式/代码块各弹窗回填 markdown 片段；粘贴截图生成 `![](data:image/... )`。
4. 查找与替换（Ctrl+F）可命中/替换全部。
5. 文档切换互不串扰；刷新后内容从 localStorage 恢复。
6. 历史面板出现时间线；点恢复回滚源码。
7. 阅读模式按 md 渲染、TOC 跳转可用。
8. AI 面板：选中文字发起润色 → 输出替换回源码。

- [x] **步骤 5：卸载 TipTap + 边界结构测试**

`tests/editor-cm-core.test.mjs`：

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const pkg = JSON.parse(read('package.json'))

for (const k of Object.keys(pkg.dependencies)) {
  assert.doesNotMatch(k, /@tiptap|prosemirror|@memfoldai/, `${k} 应已从 dependencies 移除`)
}
assert.match(read('src/components/editor/LZEditor.tsx'), /MarkdownEditor/, 'LZEditor 必须渲染 MarkdownEditor')
assert.doesNotMatch(read('src/App.tsx'), /@tiptap/, 'App 不得引用 TipTap')
assert.doesNotMatch(read('src/components/layout/editorActions.tsx'), /tiptap/i, '命令层不得引用 TipTap')
assert.match(read('package.json'), /"--import tsx --test|node --import tsx/, 'test 脚本应带 tsx loader')
console.log('codemirror core boundary ok')
```

```bash
npm uninstall @tiptap/core @tiptap/react @tiptap/starter-kit @tiptap/pm @tiptap/extension-table @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-table-row @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-code-block-lowlight @tiptap/extension-emoji @tiptap/extension-highlight @tiptap/ai-toolkit @memfoldai/tiptap-search-and-replace
npm run check
git add -A
git commit -m "feat(editor)!: 移除 TipTap，CodeMirror 6 成为唯一编辑内核"
```

- [ ] **步骤 6：用户验收**

按「手动核对清单」逐条演示给用户，确认通过后才进入 Phase 2（模式改版）计划编写。
