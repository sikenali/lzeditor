import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const preview = read('src/components/sidebar/SidebarPreview.tsx')
const outline = read('src/components/sidebar/SidebarOutline.tsx')

// 预览侧栏不得再有「预览」标题
assert.doesNotMatch(preview, /sidebar-header-title">预览/, 'SidebarPreview 不得再有「预览」标题')
// 目录侧栏「目录」标题保留（样式/大纲不受影响）
assert.match(outline, /sidebar-header-title">目录/, 'SidebarOutline「目录」标题必须保留')

// ── 页脚：右侧信息挪到左侧下方 ──
const layout = read('src/styles/layout.css')
// 页脚右侧信息必须排在左侧下方（grid 两行），文字缩小
assert.match(layout, /\.app-footer\s*\{[^}]*display:\s*grid/, '.app-footer 必须改 grid 布局')
assert.match(layout, /\.app-footer-right\s*\{[^}]*font-size:\s*1[01]px/, '.app-footer-right 文字必须缩小到 ~11px')

// ── 设置窗口：更紧凑 + 固定尺寸 ──
const settings = read('src/components/panels/SettingsDialog.tsx')
assert.match(settings, /PANEL_MAX_WIDTH\s*=\s*1280/, '设置窗口 maxWidth 必须 1280（§5.1）')
assert.match(settings, /PANEL_HEIGHT\s*=\s*'92vh'/, '设置窗口 height 必须 92vh（§5.1）')
