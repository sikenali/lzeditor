import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const lib = read('src/components/panels/LibraryPanel.tsx')
const img = read('src/components/panels/ImageDialog.tsx')
const link = read('src/components/panels/LinkDialog.tsx')
const code = read('src/components/panels/CodeDialog.tsx')
const formula = read('src/components/panels/FormulaDialog.tsx')
const emoji = read('src/components/panels/EmojiDialog.tsx')
const chart = read('src/components/panels/ChartDialog.tsx')
const table = read('src/components/panels/TableDropdown.tsx')

assert.match(lib, /useState\('url'\)/, '文档库默认 URL 在线导入标签')
assert.match(lib, /height=\{600\}/, '文档库弹框固定高度 600')
// 插入/图片/链接 等弹框统一固定高度
for (const [name, src] of [['图片', img], ['链接', link], ['代码', code], ['公式', formula], ['表情', emoji], ['图表', chart], ['表格', table]]) {
  assert.match(src, /height=\{520\}/, `${name}弹框固定高度 520`)
}

console.log('dialog fixed height ok')
