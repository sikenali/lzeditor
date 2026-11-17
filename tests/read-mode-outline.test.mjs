import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const mode = readFileSync(new URL('../src/components/editor/ReadMode.tsx', import.meta.url), 'utf8')

// 去掉内嵌目录：不再渲染 read-toc-sidebar，不再用 readTocOpen
assert.doesNotMatch(mode, /read-toc-sidebar/, 'ReadMode 不再内嵌目录侧栏')
assert.doesNotMatch(mode, /readTocOpen/, 'ReadMode 不再用 readTocOpen')

// 目录按钮改造成切换统一大纲面板（showOutline）
assert.match(mode, /setShowOutline\(!showOutline\)/, '目录按钮切换 showOutline')

// 翻页同步：订阅 spread/pages 变化时 setActiveTocId
assert.match(mode, /setActiveTocId/, '翻页时必须更新 store activeTocId')

// 跳转注册：挂载注册，卸载清理
assert.match(mode, /registerOutlineJumper\(/, '挂载时注册大纲跳转')
assert.match(mode, /clearOutlineJumper/, '卸载时清理大纲跳转')

// 跳转实现：用 pageOfLine 反查章节所在页，jumpTo 到对应页对
assert.match(mode, /pageOfLine\(/, '跳转必须经 pageOfLine 反查所在页')
assert.match(mode, /jumpTo\(/, '跳转必须经 jumpTo 到对应页')

console.log('read-mode outline checks passed')
