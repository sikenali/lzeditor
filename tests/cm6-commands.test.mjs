import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { wrapSelection, applyBlockConvert, applyEditorCommand } from '../src/components/editor/facade/cm6/cm6-commands.ts'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const cmds = read('src/components/editor/facade/cm6/cm6-commands.ts')

// ── static: selection.* and insert.*/block.* ids must be recognized ──
assert.match(cmds, /selection\.bold/, 'must map selection.bold')
assert.match(cmds, /selection\.italic/, 'must map selection.italic')
assert.match(cmds, /selection\.strike/, 'must map selection.strike')
assert.match(cmds, /selection\.code/, 'must map selection.code')
assert.match(cmds, /insert\.table/, 'must map insert.table')
assert.match(cmds, /block\.convert\.heading/, 'must map block.convert.heading')
assert.match(cmds, /template\.meeting-notes/, 'must map meeting-notes template')

// ── behavior: selection wrap uses the same delimiters as the old editor ──
assert.equal(wrapSelection('hi', 'selection.bold'), '**hi**')
assert.equal(wrapSelection('hi', 'selection.italic'), '*hi*')
assert.equal(wrapSelection('hi', 'selection.strike'), '~~hi~~')
assert.equal(wrapSelection('hi', 'selection.code'), '`hi`')
assert.equal(wrapSelection('hi', 'selection.link', { url: 'https://x' }), '[hi](https://x)')
assert.equal(wrapSelection('**hi**', 'selection.clear'), 'hi')
// collapsed selection (from === to) is a no-op, never corrupts
const collapsed = {
  _source: 'hello world',
  getText() { return this._source },
  getSelection: () => ({ from: 5, to: 5 }),
  setSelection: () => {},
  replaceRange: () => { throw new Error('must not write on collapsed selection') },
  insertText: () => { throw new Error('must not write on collapsed selection') },
  insertBlock: () => { throw new Error('must not write on collapsed selection') },
  undo: () => false,
  redo: () => false,
}
assert.equal(applyEditorCommand(collapsed, 'selection.bold'), null)

// ── behavior: block convert rewrites the current line prefix ──
assert.equal(applyBlockConvert('# old', '## ').text, '## old')
assert.equal(applyBlockConvert('- [ ] todo', '## ').text, '## todo')
assert.equal(applyBlockConvert('> quote', '- ').text, '- quote')
assert.equal(applyBlockConvert('plain', '- [ ] ').text, '- [ ] plain')

// ── behavior: insert.section (H2 按钮) 必须产出 `## `，不能静默 no-op ──
let isSource = 'hello'
const insertSectionFacade = {
  getText: () => isSource,
  getSelection: () => ({ from: 5, to: 5 }),
  setSelection: () => {},
  replaceRange: (from, to, text) => {
    isSource = isSource.slice(0, from) + text + isSource.slice(to)
  },
  insertText: (text, anchor) => {
    const at = anchor ? anchor.from : isSource.length
    isSource = isSource.slice(0, at) + text + isSource.slice(at)
  },
  insertBlock: (text) => { isSource += text },
  undo: () => false,
  redo: () => false,
}
applyEditorCommand(insertSectionFacade, 'insert.section')
assert.equal(isSource, 'hello## ', 'H2 必须插入 `## ` 前缀（不吞掉 H2 按钮）')
applyEditorCommand(insertSectionFacade, 'insert.heading2')
assert.equal(isSource, 'hello## ## ', 'insert.heading2 也必须产出 `## `')

// ── behavior: block.delete 末行必须连同前一换行一起删（不能空删） ──
let dlSource = 'a\nb'
const deleteLastFacade = {
  getText: () => dlSource,
  getSelection: () => ({ from: 2, to: 2 }), // 光标在末行 'b' 行首
  setSelection: () => {},
  replaceRange: (from, to, text) => {
    dlSource = dlSource.slice(0, from) + text + dlSource.slice(to)
  },
  insertText: () => {},
  insertBlock: () => {},
  undo: () => false,
  redo: () => false,
}
applyEditorCommand(deleteLastFacade, 'block.delete')
assert.equal(dlSource, 'a', 'block.delete 末行必须删掉 b 与其前换行，得 a')

console.log('cm6 commands ok')
