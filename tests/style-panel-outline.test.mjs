import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const panel = readFileSync(new URL('../src/components/panels/StyleMainPanel.tsx', import.meta.url), 'utf8')

// 去掉内嵌目录与旧 readTocOpen/tocItems 依赖
assert.doesNotMatch(panel, /read-toc-sidebar/, 'StyleMainPanel 不再内嵌目录侧栏')
assert.doesNotMatch(panel, /readTocOpen/, 'StyleMainPanel 不再用 readTocOpen')
assert.doesNotMatch(panel, /tocItems|setTocItems/, 'StyleMainPanel 不再用 store tocItems')

// 目录按钮已删除：大纲由顶栏工具栏「大纲」按钮统一开关
assert.doesNotMatch(panel, /setShowOutline\(!showOutline\)/, '「目录」按钮已删除（大纲由顶栏工具栏统一开关）')
assert.doesNotMatch(panel, /showOutline/, 'StyleMainPanel 不再用 showOutline')

// 滚动同步 id 来自 parseMdOutline（不再 style-h-${i}）
assert.match(panel, /parseMdOutline/, '滚动同步必须用 parseMdOutline 的 id')
assert.doesNotMatch(panel, /style-h-\$\{i\}/, '不再给标题造 style-h-N 假 id')

// 同步 store activeTocId + 跳转注册
assert.match(panel, /setActiveTocId/, '滚动同步必须更新 store activeTocId')
assert.match(panel, /registerOutlineJumper\(/, '挂载时注册大纲跳转')
assert.match(panel, /clearOutlineJumper/, '卸载时清理大纲跳转')
assert.match(panel, /scrollToChapter\(id\)/, '跳转经 scrollToChapter（内部 scrollIntoView）')

// 浮导航默认隐藏，点内容区显示（不再绑 previewVisible）
assert.match(panel, /navVisible/, '浮导航默认隐藏，由 navVisible 控制')
assert.match(panel, /setNavVisible\(true\)/, '点内容区显示浮导航')

console.log('style-panel outline checks passed')
