import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const assist = read('src/components/editor/facade/cm6/cm6-assist.ts')
const logic = read('src/components/editor/facade/cm6/cm6-assist-logic.ts')

// ── static: CM6 assist wiring exists, no yeli assist re-export ──
assert.match(assist, /installAssist/, 'must export installAssist')
assert.match(assist, /typewriter/, 'must implement typewriter follow')
assert.match(assist, /smart.?paste|tsvRows|linkMarkdown/, 'must carry smart-paste URL/table logic')
assert.match(assist, /smartPasteExtension/, 'must export the CM6 paste extension')
assert.doesNotMatch(assist, /installSmartPaste/, 'no yeli assist re-export')

// ── behavior: pure helpers relocated from the deleted assist/ (no yeli facade) ──
const {
  autopairInsertion, autopairBackspace, isInsideCode,
  singleUrl, tsvRows, tableFromRows, linkMarkdown, imageMarkdown,
  typewriterScrollDelta,
} = await import('../src/components/editor/facade/cm6/cm6-assist-logic.ts')

test('autopairInsertion：成对符与代码上下文关闭', () => {
  assert.deepEqual(autopairInsertion('ab', 1, '('), { insertion: '()', caretDelta: 1 })
  assert.deepEqual(autopairInsertion('ab', 1, '*'), { insertion: '**', caretDelta: 1 })
  assert.equal(autopairInsertion('()', 1, '('), null)
  assert.equal(autopairInsertion('`code`', 3, '('), null)
  assert.equal(autopairInsertion('```\ncode\n```', 7, '('), null)
})

test('autopairBackspace：空配对整对删除', () => {
  assert.deepEqual(autopairBackspace('a()b', 2), { from: 1, to: 3 })
  assert.deepEqual(autopairBackspace('a**b', 2), { from: 1, to: 3 })
  assert.equal(autopairBackspace('a(b', 2), null)
})

test('isInsideCode：行内代码与围栏', () => {
  assert.equal(isInsideCode('`code` here', 3), true)
  assert.equal(isInsideCode('```js\nconst a = 1;\n```', 14), true)
  assert.equal(isInsideCode('plain text', 5), false)
})

test('smart-paste 纯逻辑：URL / TSV / 链接 / 图片', () => {
  assert.equal(singleUrl('https://example.com/a'), 'https://example.com/a')
  assert.equal(singleUrl('hello world'), null)
  assert.deepEqual(tsvRows('a\tb\n1\t2'), [['a', 'b'], ['1', '2']])
  assert.equal(tsvRows('single\tcolumn'), null)
  assert.equal(tableFromRows([['a', 'b|c'], ['1', '2']]), '| a | b\\|c |\n| --- | --- |\n| 1 | 2 |')
  assert.equal(linkMarkdown('https://x.y'), '[https://x.y](https://x.y)')
  assert.equal(linkMarkdown('https://x.y', '链接文字'), '[链接文字](https://x.y)')
  assert.equal(imageMarkdown('图', 'blob:abc'), '![图](blob:abc)')
})

test('typewriterScrollDelta：带内 0，带外滚到 anchor', () => {
  assert.equal(typewriterScrollDelta(300, 0, 600), 0)
  assert.equal(typewriterScrollDelta(900, 0, 600), Math.round(240 - 900))
})

console.log('cm6 assist ok')
