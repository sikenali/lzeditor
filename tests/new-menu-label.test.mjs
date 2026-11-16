import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 新建菜单第 2 项 label「新建文件-模板」但 action='open' 打开的是文件对话框
// （FilePanel，标题「文件 · 新建或打开文档」），并非直建模板——文案误导。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const actions = read('src/components/layout/editorActions.tsx')

// ── 不得再有「新建文件-模板」误导文案 ──
assert.ok(!actions.includes('新建文件-模板'), '不得用「新建文件-模板」误导（点击实际打开文件对话框）')

// ── NEW_ITEMS 不再有「打开文件 / 模板…」，只剩 新建文档 / 打开文件夹 ──
assert.ok(!actions.includes('打开文件 / 模板…'), '不得再有「打开文件 / 模板…」菜单项')
assert.ok(!actions.includes("action: 'open'"), 'NEW_ITEMS 不得再有 open 动作（FilePanel 已删）')
assert.match(actions, /label: '新建文档'/, 'NEW_ITEMS 仍保留「新建文档」')
assert.match(actions, /label: '打开文件夹…'/, 'NEW_ITEMS 仍保留「打开文件夹…」')

console.log('new menu label ok')
