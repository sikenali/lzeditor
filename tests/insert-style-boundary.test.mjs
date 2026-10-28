import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const toolbar = read('src/components/layout/Toolbar.tsx')

// Toolbar 不直接拼插入内容，走 useEditorActions 的统一入口
assert.match(toolbar, /useEditorActions/, 'Toolbar must delegate insertions to useEditorActions')

for (const f of ['ImageDialog.tsx', 'LinkDialog.tsx', 'CodeDialog.tsx', 'FormulaDialog.tsx', 'TableDropdown.tsx', 'EmojiDialog.tsx', 'ChartDialog.tsx']) {
  assert.doesNotMatch(read(`src/components/panels/${f}`), /style\.cssText/, `${f} should not inject inline styles into document content`)
}

console.log('insert style boundary checks passed')
