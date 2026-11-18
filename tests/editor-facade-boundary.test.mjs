import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const facade = read('src/components/editor/facade/EditorFacade.ts')
const registry = read('src/components/editor/facade/registry.ts')

// ── EditorFacade contract: every method the app consumes must be declared ──
const members = [
  'setText', 'getText', 'getRevision', 'replaceRange', 'insertText',
  'insertBlock', 'insertCodeBlock', 'insertFormula', 'onChange',
  'getSelection', 'setSelection', 'onSelectionChange', 'getTableContext',
  'setViewRoot', 'focus', 'scrollToBlock', 'undo', 'redo', 'execCommand',
  'searchMatches', 'findNext', 'findPrev', 'replaceCurrent', 'replaceAll',
]
for (const m of members) {
  assert.match(facade, new RegExp(m), `EditorFacade must declare ${m}`)
}

// ── Table context: source mode has none; WYSIWYG returns a real one ──
assert.match(facade, /getTableContext\(\): TableContext \| null/, 'getTableContext must be TableContext | null')
assert.match(facade, /interface TableContext/, 'must declare TableContext')
assert.doesNotMatch(facade, /getDocumentStore/, 'yeli getDocumentStore must not leak')

// ── Neutral registry names ──
assert.match(registry, /registerEditorFacade/, 'must export registerEditorFacade')
assert.match(registry, /getEditorFacade/, 'must export getEditorFacade')
assert.doesNotMatch(registry, /Yeli/, 'registry must not reference yeli')

console.log('editor facade boundary ok')
