import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const toolbar = read('src/components/layout/Toolbar.tsx')
const slash = read('src/components/editor/SlashCommand.tsx')
const globals = read('src/styles/globals.css')

for (const [name, source] of [
  ['SlashCommand', slash],
]) {
  assert.match(source, /lz-insert lz-insert-toc/, `${name} TOC insert should use styled content classes`)
  assert.match(source, /lz-insert lz-insert-quote/, `${name} quote insert should use styled content classes`)
  assert.match(source, /lz-insert-footnote-ref/, `${name} footnote insert should use a styled content class`)
}

// Toolbar 不直接拼插入 HTML，走 useEditorActions 的统一入口
assert.match(toolbar, /useEditorActions/, 'Toolbar must delegate insertions to useEditorActions')

for (const f of ['ImageDialog.tsx', 'LinkDialog.tsx', 'CodeDialog.tsx', 'FormulaDialog.tsx', 'TableDropdown.tsx', 'EmojiDialog.tsx', 'ChartDialog.tsx']) {
  assert.doesNotMatch(read(`src/components/panels/${f}`), /style\.cssText/, `${f} should not inject inline styles into document content`)
}

for (const selector of [
  '.lz-editor-content .lz-insert',
  '.lz-editor-content .lz-insert-toc',
  '.lz-editor-content .lz-insert-quote',
  '.lz-editor-content .lz-insert-footnote-ref',
]) {
  assert.match(globals, new RegExp(selector.replaceAll('.', '\\.')), `Missing base insert style ${selector}`)
}

console.log('insert style boundary checks passed')
