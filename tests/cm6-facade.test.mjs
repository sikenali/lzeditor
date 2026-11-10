import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const f = read('src/components/editor/facade/cm6/CM6EditorFacade.ts')

// ── the facade must be CM6-backed and expose the full contract ──
assert.match(f, /from ['"]@codemirror\/view['"]/, 'must import from @codemirror/view')
assert.match(f, /EditorView/, 'must bind a CM6 EditorView')
assert.match(f, /getText/, 'must expose getText')
assert.match(f, /replaceRange/, 'must expose replaceRange')
assert.match(f, /getTableContext\(\): null|getTableContext\(\)\s*\{\s*return null/, 'must expose getTableContext returning null')
assert.match(f, /getRevision/, 'must expose getRevision')
assert.match(f, /createCM6EditorFacade/, 'must export the factory')
assert.match(f, /applyEditorCommand/, 'must route execCommand through the command mapping')
assert.match(f, /createSearchSession/, 'must delegate search to the search session')

// ── source-mode: table context is null, no yeli store leak ──
assert.doesNotMatch(f, /getDocumentStore/, 'no yeli getDocumentStore')

console.log('cm6 facade ok')
