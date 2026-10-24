import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const toolbar = read('src/components/layout/Toolbar.tsx')
const slash = read('src/components/editor/SlashCommand.tsx')

// 斜杠面板走 CM6 的格式命令，不再拼富文本 HTML
assert.match(slash, /runFormatCommand/, 'SlashCommand 必须落到 CM6 的格式命令')
assert.match(slash, /COMMAND_MAP/, '格式类命令必须有显式映射表')
assert.match(slash, /PANEL_MAP/, '对话框类命令必须有显式映射表')
assert.doesNotMatch(slash, /<blockquote|<sup|<table|insertContent\(/, 'SlashCommand 不应再拼富文本 HTML')

// Toolbar 不直接拼插入内容，走 useEditorActions 的统一入口
assert.match(toolbar, /useEditorActions/, 'Toolbar must delegate insertions to useEditorActions')

for (const f of ['ImageDialog.tsx', 'LinkDialog.tsx', 'CodeDialog.tsx', 'FormulaDialog.tsx', 'TableDropdown.tsx', 'EmojiDialog.tsx', 'ChartDialog.tsx']) {
  assert.doesNotMatch(read(`src/components/panels/${f}`), /style\.cssText/, `${f} should not inject inline styles into document content`)
}

console.log('insert style boundary checks passed')
