import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 新建菜单第 2 项 label「新建文件-模板」但 action='open' 打开的是文件对话框
// （FilePanel，标题「文件 · 新建或打开文档」），并非直建模板——文案误导。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const actions = read('src/components/layout/editorActions.tsx')

// ── 不得再有「新建文件-模板」误导文案 ──
assert.ok(!actions.includes('新建文件-模板'), '不得用「新建文件-模板」误导（点击实际打开文件对话框）')

// ── 第 2 项 label 必须反映真实行为（打开文件/模板）──
assert.match(actions, /label:\s*'打开文件\s*\/\s*模板…'|label:\s*'打开文件…'/, 'NEW_ITEMS 第 2 项 label 必须改为打开文件语义')

console.log('new menu label ok')
