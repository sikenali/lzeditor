import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const toolbar = read('src/components/layout/Toolbar.tsx')
const leftNav = read('src/components/layout/LeftNav.tsx')
const layoutCss = read('src/styles/layout.css')

// 顶栏恒 icon-only + showToolbarLabels 开时加 hover-labels
assert.match(toolbar, /navtop toolbar toolbar-icon-only\$\{showToolbarLabels \? ' toolbar-hover-labels' : ''\}/, '顶栏恒 icon-only，showToolbarLabels 开时加 hover-labels')
// hover 显 label：绝对定位下置，不挤压布局
assert.match(layoutCss, /\.toolbar-icon-only\.toolbar-hover-labels \.toolbar-btn:hover \.toolbar-label[^}]*position:\s*absolute/, '顶栏 hover 显示 label（绝对定位）')
// 键盘焦点也显示 label（可访问性）
assert.match(layoutCss, /\.toolbar-icon-only\.toolbar-hover-labels \.toolbar-btn:focus-visible \.toolbar-label/, '键盘 focus-visible 也显示 label')
// 每个工具栏按钮都有 aria-label（可访问名；label 常显隐藏不在 AT 树）
for (const label of ['文档库', '新建', '大纲', '查找', '粗体', '斜体', '删除线', '格式', '图片', '链接', '表格', '插入', 'AI 助手', '模式', '历史', '导出', '设置']) {
  assert.match(toolbar, new RegExp(`aria-label="${label}"`), `工具栏「${label}」按钮应有 aria-label`)
}
// 侧边栏已 icon-only（rail-label 隐藏）+ UiTip right hover 文字（既有，无需改）
assert.match(layoutCss, /\.rail-label\s*\{[^}]*display:\s*none/, '侧边栏 rail-label 隐藏（icon-only，既有）')
assert.match(leftNav, /placement="right"/, '侧边栏 UiTip 右侧 hover 文字（既有）')

console.log('toolbar hover labels ok')
