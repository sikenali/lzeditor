import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const code = read('src/components/editor/CodeEditor.tsx')
const app = read('src/App.tsx')

// ── CodeEditor must build the CM6 facade and register it ──
assert.match(code, /createCM6EditorFacade/, 'CodeEditor must build the facade via createCM6EditorFacade')
assert.match(code, /registerEditorFacade\(facade\)/, 'must register the facade on mount')
assert.match(code, /facade\.getText\(\) !== md/, 'external md must not reset caret when equal')
assert.match(code, /onChange/, 'must subscribe to facade changes')
assert.match(code, /setEditorContentRef/, 'must expose the scroll container for scroll sync')

// ── App must mount the new CodeEditor, no old editor remnants ──
assert.match(app, /<CodeEditor md=\{editorMd\}/, 'App must mount CodeEditor')
assert.doesNotMatch(app, /<YeliEditor|<CM6Editor|<LZEditor/, 'App no longer mounts old editors')

console.log('code editor ok')
