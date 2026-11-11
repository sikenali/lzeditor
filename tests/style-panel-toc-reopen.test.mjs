import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 样式面板关闭目录侧栏（readTocOpen=false）后没有重开入口：仅关闭按钮
// setReadTocOpen(false)，工具栏没有切换/重开按钮。修复：工具栏提供目录切换。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const panel = read('src/components/panels/StyleMainPanel.tsx')

// ── 必须存在目录切换（不仅关闭）──
assert.match(
  panel,
  /setReadTocOpen\(!readTocOpen\)/,
  '工具栏必须提供目录切换 setReadTocOpen(!readTocOpen)，关闭后可重开侧栏',
)

// ── 切换按钮带目录标识 ──
const toggleBtn = panel.match(/setReadTocOpen\(!readTocOpen\)[\s\S]{0,220}/)?.[0] || ''
assert.ok(
  toggleBtn.includes('目录') || toggleBtn.includes('ri-list') || toggleBtn.includes('ri-menu'),
  '目录切换按钮必须有「目录」标识（图标或文案）',
)

console.log('style panel toc reopen ok')
