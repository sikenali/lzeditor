import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const lib = read('src/components/panels/LibraryPanel.tsx')
const img = read('src/components/panels/ImageDialog.tsx')
const link = read('src/components/panels/LinkDialog.tsx')

assert.match(lib, /useState\('url'\)/, '文档库默认 URL 在线导入标签')
assert.match(lib, /height=\{600\}/, '文档库弹框固定高度 600')
assert.match(img, /height=\{520\}/, '图片弹框固定高度 520')
assert.match(link, /height=\{520\}/, '链接弹框固定高度 520')

console.log('dialog fixed height ok')
