import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const preview = read('src/components/sidebar/SidebarPreview.tsx')
const outline = read('src/components/sidebar/SidebarOutline.tsx')

// 预览侧栏不得再有「预览」标题
assert.doesNotMatch(preview, /sidebar-header-title">预览/, 'SidebarPreview 不得再有「预览」标题')
// 目录侧栏「目录」标题保留（样式/大纲不受影响）
assert.match(outline, /sidebar-header-title">目录/, 'SidebarOutline「目录」标题必须保留')
