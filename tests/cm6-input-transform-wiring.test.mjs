import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 输入变换接线：必须用 inputHandler（先于 closeBrackets 生效）并读取每个设置。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const wiring = read('src/components/editor/facade/cm6/cm6-input-transform.ts')

assert.match(wiring, /inputHandler/, 'must use EditorView.inputHandler')
assert.match(wiring, /smartQuotes|cornerQuotes|autoSpaceCJK|fullwidthSymbols|autoCompleteMarkdownPairs|allowMarkdownSymbols/, 'must read every transform setting')
for (const fn of ['smartQuoteReplacement', 'cornerQuoteTransform', 'cjkAutoSpace', 'fullwidthChar', 'markdownPairInsertion', 'markdownSymbolWrap']) {
  assert.match(wiring, new RegExp(fn), `must use ${fn}`)
}

console.log('cm6 input transform wiring ok')
