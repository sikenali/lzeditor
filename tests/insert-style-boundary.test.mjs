import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const toolbar = read('src/components/layout/Toolbar.tsx')
const slash = read('src/components/editor/SlashCommand.tsx')
const insertDropdown = read('src/components/panels/InsertDropdown.tsx')
const globals = read('src/styles/globals.css')

for (const [name, source] of [
  ['Toolbar', toolbar],
  ['SlashCommand', slash],
]) {
  assert.match(source, /lz-insert lz-insert-toc/, `${name} TOC insert should use styled content classes`)
  assert.match(source, /lz-insert lz-insert-quote/, `${name} quote insert should use styled content classes`)
  assert.match(source, /lz-insert-footnote-ref/, `${name} footnote insert should use a styled content class`)
}

assert.doesNotMatch(insertDropdown, /style\.cssText/, 'InsertDropdown should not inject inline styles into document content')

for (const selector of [
  '.lz-editor-content .lz-insert',
  '.lz-editor-content .lz-insert-toc',
  '.lz-editor-content .lz-insert-quote',
  '.lz-editor-content .lz-insert-footnote-ref',
]) {
  assert.match(globals, new RegExp(selector.replaceAll('.', '\\.')), `Missing base insert style ${selector}`)
}

console.log('insert style boundary checks passed')
