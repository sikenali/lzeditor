import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const actions = read('src/components/layout/editorActions.tsx')
const gutter = read('src/components/editor/MilkdownLineGutter.tsx')
const milkdownEditor = read('src/components/editor/MilkdownEditor.tsx')
const milkdownCss = read('src/additional/milkdown/milkdown.css')
const symbolTab = read('src/components/panels/settings/SymbolSpellSettingsTab.tsx')

// #13 已按用户拍板改为「插入表情」：插入菜单不提供「标签」(HTML <mark>)，无 tag 特判
assert.doesNotMatch(actions, /label: '标签'/, '插入菜单不再提供「标签」HTML 标签项（#13 为表情插入）')
assert.doesNotMatch(actions, /action === 'tag'/, 'insertAction 无 tag 特判（#13 为表情插入）')
assert.doesNotMatch(actions, /<mark>/, '不再插入 <mark>（#13 为表情插入）')

// ── #28 编辑模式行号：开关在「符号拼写」子tab，Milkdown 渲染行号栏 ──
assert.match(symbolTab, /label="显示行号"/, '设置含「显示行号」开关（#28）')
assert.match(symbolTab, /showLineNumbers/, '「显示行号」绑 showLineNumbers（#28）')
assert.match(gutter, /milkdown-line-gutter/, 'MilkdownLineGutter 渲染 .milkdown-line-gutter（#28）')
assert.match(gutter, /showLineNumbers/, '行号栏按 showLineNumbers 开关渲染（#28）')
assert.match(gutter, /milkdown-line-num/, '行号栏每行一个数字（#28）')
assert.match(milkdownEditor, /MilkdownLineGutter/, 'MilkdownEditor 挂载 MilkdownLineGutter（#28）')
assert.match(milkdownEditor, /setEditorContentRef/, 'Milkdown 把 .milkdown 交给 store 供滚动同步（#28 依赖 #9）')
assert.match(milkdownCss, /\.milkdown-line-gutter/, 'milkdown.css 定义行号栏样式（#28）')

console.log('line-gutter conformance ok (tag 已移除, #13 为表情插入)')
