import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
test('装配不含被剔特性且走 noDiskImages', () => {
  const src = readFileSync('src/additional/milkdown/textus/editor/editor-extensions.ts', 'utf8')
  for (const sym of ['createTypewriterPlugin','zenFocusPlugin','createNoteEmbedPlugin','createObsidianEmbedPreviewPlugin','lazyBlocksPlugin','withLazyBlockViews']) {
    assert.equal(src.includes(sym), false, `装配不得再引用 ${sym}`)
  }
  assert.ok(src.includes('noDiskImages'))
})
