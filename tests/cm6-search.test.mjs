import assert from 'node:assert/strict'
import { createSearchSession } from '../src/components/editor/facade/cm6/cm6-search.ts'

function mockFacade(text) {
  let source = text
  return {
    getText: () => source,
    replaceRange: (from, to, t) => { source = source.slice(0, from) + t + source.slice(to) },
    setSelection: () => {},
  }
}

const f = mockFacade('foo bar foo')
const s = createSearchSession(f)

// ── basic match count + findNext + replaceAll ──
assert.equal(s.searchMatches({ term: 'foo', regex: false, caseSensitive: true, wholeWord: false }), 2)
assert.equal(s.findNext(), true)
assert.equal(s.replaceAll('baz'), 2)
assert.equal(f.getText(), 'baz bar baz')

// ── invalid regex throws RangeError ──
assert.throws(
  () => s.searchMatches({ term: '(', regex: true, caseSensitive: true, wholeWord: false }),
  RangeError,
)

// ── whole-word only matches whole words ──
const f2 = mockFacade('foo foobar foo bar')
const s2 = createSearchSession(f2)
assert.equal(s2.searchMatches({ term: 'foo', regex: false, caseSensitive: true, wholeWord: true }), 2)

// ── case-insensitive by default ──
const f3 = mockFacade('Foo foo FOO')
const s3 = createSearchSession(f3)
assert.equal(s3.searchMatches({ term: 'foo', regex: false, caseSensitive: false, wholeWord: false }), 3)

// ── zero-length regex matches never infinite-loop ──
const f4 = mockFacade('abc')
const s4 = createSearchSession(f4)
assert.equal(s4.searchMatches({ term: 'x*', regex: true, caseSensitive: true, wholeWord: false }), 0)

// ── replaceCurrent replaces the highlighted match and advances ──
const f5 = mockFacade('one two three')
const s5 = createSearchSession(f5)
assert.equal(s5.searchMatches({ term: 't', regex: false, caseSensitive: true, wholeWord: false }), 2)
assert.equal(s5.replaceCurrent('X'), 1) // one 't' replaced, one remains
assert.equal(f5.getText(), 'one Xwo three')

console.log('cm6 search ok')
