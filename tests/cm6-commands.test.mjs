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

console.log('cm6 commands ok')
