import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const panel = read('src/components/panels/LibraryPanel.tsx')

// handleImportUrl：调 fetchMarkdownFromUrl + openMarkdownDoc
assert.match(panel, /handleImportUrl/)
assert.match(panel, /fetchMarkdownFromUrl\(/)
assert.match(panel, /openMarkdownDoc\(/)

// 传给 ImportButtons 的是 onImportUrl / onImportLocal（不再传 onImportGit 等）
assert.match(panel, /onImportUrl=\{handleImportUrl\}/)
assert.match(panel, /onImportLocal=\{handleImportLocal\}/)
assert.ok(!panel.includes('onImportGit'))
assert.ok(!panel.includes('onImportBlog'))
assert.ok(!panel.includes('onImportGitbook'))

// 本地选择器仍保留（.md 多选）
assert.match(panel, /type = 'file'/)
assert.match(panel, /accept = '\.md,\.markdown,\.mdown,\.mkd,\.txt'/)

console.log('library import wiring ok')
