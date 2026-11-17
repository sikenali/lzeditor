import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const panel = readFileSync(new URL('../src/components/panels/StyleMainPanel.tsx', import.meta.url), 'utf8')

// 去掉内嵌目录与旧 readTocOpen/tocItems 依赖
assert.doesNotMatch(panel, /read-toc-sidebar/, 'StyleMainPanel 不再内嵌目录侧栏')
assert.doesNotMatch(panel, /readTocOpen/, 'StyleMainPanel 不再用 readTocOpen')
assert.doesNotMatch(panel, /tocItems|setTocItems/, 'StyleMainPanel 不再用 store tocItems')

// 目录按钮改造成切换 showOutline
assert.match(panel, /setShowOutline\(!showOutline\)/, '目录按钮切换 showOutline')

// 滚动同步 id 来自 parseMdOutline（不再 style-h-${i}）
assert.match(panel, /parseMdOutline/, '滚动同步必须用 parseMdOutline 的 id')
assert.doesNotMatch(panel, /style-h-\$\{i\}/, '不再给标题造 style-h-N 假 id')

// 同步 store activeTocId + 跳转注册
assert.match(panel, /setActiveTocId/, '滚动同步必须更新 store activeTocId')
assert.match(panel, /registerOutlineJumper\(/, '挂载时注册大纲跳转')
assert.match(panel, /clearOutlineJumper/, '卸载时清理大纲跳转')
assert.match(panel, /scrollIntoView/, '跳转必须 scrollIntoView 到章节')

console.log('style-panel outline checks passed')
