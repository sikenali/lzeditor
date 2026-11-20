import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const actions = read('src/components/layout/editorActions.tsx')
const gutter = read('src/components/editor/MilkdownLineGutter.tsx')
const milkdownEditor = read('src/components/editor/MilkdownEditor.tsx')
const milkdownCss = read('src/additional/milkdown/milkdown.css')
const symbolTab = read('src/components/panels/settings/SymbolSpellSettingsTab.tsx')

// ── #13 插入标签：INSERT_ITEMS 含「标签」，insertAction 有 action==='tag' 特判包 <mark> ──
assert.match(actions, /label: '标签', action: 'tag'/, '插入菜单含「标签」项（#13）')
assert.match(actions, /action === 'tag'/, 'insertAction 特判 action==="tag"（#13）')
assert.match(actions, /<mark>/, '标签特判插入 <mark>（#13）')
// 选区包裹：选中文本用 <mark>text</mark>；无选区插入 <mark></mark>
assert.match(actions, /`<mark>\$\{selected\}<\/mark>`/, '选中文本包 <mark>（#13）')
assert.match(actions, /'<mark><\/mark>'/, '无选区插入 <mark></mark>（#13）')

// ── #28 编辑模式行号：开关在「符号拼写」子tab，Milkdown 渲染行号栏 ──
assert.match(symbolTab, /label="显示行号"/, '设置含「显示行号」开关（#28）')
assert.match(symbolTab, /showLineNumbers/, '「显示行号」绑 showLineNumbers（#28）')
assert.match(gutter, /milkdown-line-gutter/, 'MilkdownLineGutter 渲染 .milkdown-line-gutter（#28）')
assert.match(gutter, /showLineNumbers/, '行号栏按 showLineNumbers 开关渲染（#28）')
assert.match(gutter, /milkdown-line-num/, '行号栏每行一个数字（#28）')
assert.match(milkdownEditor, /MilkdownLineGutter/, 'MilkdownEditor 挂载 MilkdownLineGutter（#28）')
assert.match(milkdownEditor, /setEditorContentRef/, 'Milkdown 把 .milkdown 交给 store 供滚动同步（#28 依赖 #9）')
assert.match(milkdownCss, /\.milkdown-line-gutter/, 'milkdown.css 定义行号栏样式（#28）')

console.log('insert-tag + line-gutter conformance ok')
