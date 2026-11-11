import assert from 'node:assert/strict'
import {
  smartQuoteReplacement,
  cornerQuoteTransform,
  cjkAutoSpace,
  fullwidthChar,
  markdownPairInsertion,
  markdownSymbolWrap,
} from '../src/components/editor/facade/cm6/cm6-input-transform-logic.ts'

// ── 智能引号 ──
assert.equal(smartQuoteReplacement('"', null), '\u201C', '句首 " → 开引号')
assert.equal(smartQuoteReplacement('"', ' '), '\u201C', '空格后 " → 开引号')
assert.equal(smartQuoteReplacement('"', 'a'), '\u201D', '字母后 " → 闭引号')
assert.equal(smartQuoteReplacement("'", 'a'), '\u2019', "字母后 ' → 闭引号")
assert.equal(smartQuoteReplacement('x', 'a'), null, '非引号不变')

// ── 直角引号：成对替换 ──
assert.equal(cornerQuoteTransform('"', 1, '"')?.insert, '\u300C\u300D', '"" → 「」')
assert.deepEqual(cornerQuoteTransform('"', 1, '"'), { from: 0, to: 1, insert: '\u300C\u300D', caret: 2 })
assert.equal(cornerQuoteTransform("'", 1, "'")?.insert, '\u300E\u300F', "'' → 『』")
assert.equal(cornerQuoteTransform('a', 1, '"'), null, '前一个字符不是引号则不替换')

// ── 中日韩自动空格 ──
assert.deepEqual(cjkAutoSpace('你', 1, 'a'), { before: ' ', after: '' }, 'CJK 后输入字母补前空格')
assert.deepEqual(cjkAutoSpace('a', 1, '你'), { before: ' ', after: '' }, '字母后输入汉字补前空格')
assert.deepEqual(cjkAutoSpace('你a', 1, 'b'), { before: ' ', after: '' }, '字母后输入字母不补')
assert.deepEqual(cjkAutoSpace('你你', 1, '你'), null, '汉字后输入汉字不补')
assert.deepEqual(cjkAutoSpace('你a', 1, '你'), { before: '', after: ' ' }, '字母后汉字与后续字母之间补空格')

// ── 全角符号 ──
assert.equal(fullwidthChar(','), '\uFF0C', ', → ，')
assert.equal(fullwidthChar(';'), '\uFF1B', '; → ；')
assert.equal(fullwidthChar('.'), null, '其他符号不变')

// ── Markdown 符号对自动补完 ──
assert.deepEqual(markdownPairInsertion('*'), { insertion: '**', caretDelta: 1 })
assert.deepEqual(markdownPairInsertion('"'), null, '双引号不属于此列表（由 closeBrackets 处理）')

// ── 符号键设置格式 ──
assert.equal(markdownSymbolWrap('*', 'hi'), '**hi**')
assert.equal(markdownSymbolWrap('_', 'hi'), '_hi_')
assert.equal(markdownSymbolWrap('~', 'hi'), '~~hi~~')
assert.equal(markdownSymbolWrap('`', 'hi'), '`hi`')
assert.equal(markdownSymbolWrap('+', 'hi'), null, '加号无对应格式')
assert.equal(markdownSymbolWrap('*', ''), null, '空选区不包裹')

console.log('cm6 input transform logic ok')
