import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const sidebar = readFileSync(new URL('../src/components/sidebar/SidebarOutline.tsx', import.meta.url), 'utf8')

// 必须感知模式：读 appMode 并区分内容模式
assert.match(sidebar, /appMode/, 'SidebarOutline 必须订阅 editorStore.appMode')
assert.match(sidebar, /appMode === 'read' \|\| appMode === 'style'/, '内容模式 = 阅读/样式')

// 内容模式下高亮走 store activeTocId
assert.match(sidebar, /activeTocId/, '内容模式高亮必须订阅 store activeTocId')

// 跳转：内容模式走注册表，编辑模式走 facade（保留）
assert.match(sidebar, /getOutlineJumper\(\)/, '内容模式点击必须经 getOutlineJumper 跳转')
assert.match(sidebar, /getEditorFacade\(\)/, '编辑模式点击仍经 getEditorFacade（编辑路径不变）')
assert.match(sidebar, /setSelection\(item\.pos/, '编辑模式跳转仍选中标题源码区间')

console.log('outline mode-aware checks passed')
