import assert from 'node:assert/strict'
import { applyEditorCommand } from '../src/components/editor/facade/cm6/cm6-commands.ts'

/** Minimal source-mode facade for the shared Markdown-source commands. */
function makeFacade(source, selection) {
  const state = { source, selection: { ...selection } }
  return {
    state,
    getText: () => state.source,
    getSelection: () => state.selection,
    setSelection: (from, to) => { state.selection = { from, to } },
    replaceRange: (from, to, text) => {
      state.source = state.source.slice(0, from) + text + state.source.slice(to)
    },
    insertText: (text, anchor) => {
      const from = anchor ? anchor.from : state.source.length
      const to = anchor ? anchor.to : from
      state.source = state.source.slice(0, from) + text + state.source.slice(to)
    },
    insertBlock: (text) => { state.source += text },
    undo: () => false,
    redo: () => false,
  }
}

// ── 上标/下标：标准 HTML 标签，选区包裹，光标留在内容上 ──
{
  const f = makeFacade('H2O', { from: 1, to: 2 })
  assert.equal(applyEditorCommand(f, 'selection.sub'), true)
  assert.equal(f.state.source, 'H<sub>2</sub>O')
  assert.deepEqual(f.state.selection, { from: 6, to: 7 })
}
{
  const f = makeFacade('E = mc2', { from: 6, to: 7 })
  assert.equal(applyEditorCommand(f, 'selection.sup'), true)
  assert.equal(f.state.source, 'E = mc<sup>2</sup>')
}
{
  // 光标（空选区）也应插入一对标签并把光标放进去，而不是 no-op。
  const f = makeFacade('x', { from: 1, to: 1 })
  assert.equal(applyEditorCommand(f, 'selection.sup'), true)
  assert.equal(f.state.source, 'x<sup></sup>')
  assert.deepEqual(f.state.selection, { from: 6, to: 6 })
}

// ── 引言：斜体引用块，与普通引用（`> `）区分 ──
{
  const f = makeFacade('', { from: 0, to: 0 })
  assert.equal(applyEditorCommand(f, 'insert.intro'), true)
  assert.equal(f.state.source, '> *引言内容*')
  assert.deepEqual(f.state.selection, { from: 3, to: 7 })
}
{
  const f = makeFacade('原句', { from: 0, to: 2 })
  applyEditorCommand(f, 'insert.intro')
  assert.equal(f.state.source, '> *原句*')
}
{
  // 行中插入引言：前后补换行，否则 `>` 不在块首，不会渲染成引用块。
  const f = makeFacade('前文后文', { from: 2, to: 2 })
  applyEditorCommand(f, 'insert.intro')
  assert.equal(f.state.source, '前文\n> *引言内容*\n后文')
}

// ── 目录：静态 Markdown 目录，锚点与渲染器一致 ──
{
  const f = makeFacade('# 第一章\n正文\n## 小节', { from: 14, to: 14 })
  assert.equal(applyEditorCommand(f, 'insert.toc'), true)
  assert.match(f.state.source, /\*\*目录\*\*/)
  assert.match(f.state.source, /- \[第一章\]\(#第一章\)/)
  assert.match(f.state.source, /  - \[小节\]\(#小节\)/)
}

// ── 脚注：引用编号递增，附带定义 ──
{
  const f = makeFacade('已有[^2]', { from: 6, to: 6 })
  assert.equal(applyEditorCommand(f, 'insert.footnote'), true)
  assert.match(f.state.source, /\[\^3\]/)
  assert.match(f.state.source, /\[\^3\]: 脚注内容/)
  assert.deepEqual(f.state.selection, { from: 6, to: 10 })
}

console.log('insert/format source commands ok')
