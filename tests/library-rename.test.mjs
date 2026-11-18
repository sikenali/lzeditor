import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const store = read('src/store/editorStore.ts')
const tree = read('src/components/panels/LibraryTree.tsx')
const panel = read('src/components/panels/LibraryPanel.tsx')
const layout = read('src/styles/layout.css')

// renameLibrary 必须同步文档 path（库重命名后树文件夹名跟随）
assert.match(store, /renameLibrary:[\s\S]*?docs:[\s\S]*?path/, 'renameLibrary 必须改写 docs path')
assert.match(store, /renameLibrary:[\s\S]*?startsWith\(\s*oldName/, 'renameLibrary 必须按旧名前缀改写 path')

// 树文件夹必须有重命名按钮 + 接收 onRenameFolder
assert.match(tree, /tree-rename-btn/, '树文件夹必须有重命名按钮')
assert.match(tree, /onRenameFolder/, 'LibraryTree 必须接收 onRenameFolder')

// 顶部文件夹列表已去除
assert.doesNotMatch(panel, /library-folder-list/, 'LibraryPanel 不得再有 library-folder-list')
assert.doesNotMatch(panel, /library-folder-rename-btn/, 'LibraryPanel 不得再有 library-folder-rename-btn')

// 树重命名输入必须复用 .library-folder-rename-input（input-css-boundary 测试钉死它）
assert.match(tree, /library-folder-rename-input/, '树重命名输入必须复用 library-folder-rename-input')
assert.match(layout, /\.library-folder-rename-input/, '.library-folder-rename-input 样式必须保留（树内重命名复用）')

// 样式
assert.match(layout, /\.tree-rename-btn/, '必须有 .tree-rename-btn 样式')

// 重命名按钮只出现在可映射到文档库的文件夹上（嵌套文件夹不显示 no-op 按钮）
assert.match(tree, /renameableTitles/, '树必须按库名过滤重命名按钮（嵌套文件夹不显示 no-op 按钮）')

console.log('library rename checks passed')
