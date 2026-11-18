import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const toolbar = read('src/components/layout/Toolbar.tsx')
const leftNav = read('src/components/layout/LeftNav.tsx')
const layoutCss = read('src/styles/layout.css')
const uiCss = read('src/styles/ui.css')

// 顶栏：开启→常显文字（无 icon-only）；关闭→icon-only + hover 显字
assert.match(toolbar, /navtop toolbar\$\{showToolbarLabels \? '' : ' toolbar-icon-only toolbar-hover-labels'\}/, '顶栏开启常显 / 关闭 icon-only+hover')
// 关闭态 hover 显示 label（绝对定位，不挤布局）
assert.match(layoutCss, /\.toolbar-icon-only\.toolbar-hover-labels \.toolbar-btn:hover \.toolbar-label[^}]*position:\s*absolute/, '关闭态 hover 显示 label（绝对定位）')
// 侧边栏：开启挂 rail-nav--labels
assert.match(leftNav, /rail-nav\$\{showToolbarLabels \? ' rail-nav--labels' : ''\}/, '侧边栏开启挂 rail-nav--labels')
// 侧边栏开启时 rail-label 显示
assert.match(layoutCss, /\.rail-nav--labels \.rail-label[^}]*display:\s*(block|flex|inline-flex)/, '侧边栏开启 rail-label 显示')
// 侧边栏关闭态 tooltip 浅色卡片（右侧弹出）
assert.match(uiCss, /\.rail-nav \.ui-tip--right::after[^}]*background:\s*var\(--color-bg-card\)/, '侧边栏 tooltip 浅色卡片')
// 侧边栏开启时不再包 UiTip（label 常显，避免双重提示）
assert.match(leftNav, /useSettingsStore\(\(s\) => s\.showToolbarLabels\)/, '侧边栏读取 showToolbarLabels')
assert.match(leftNav, /showToolbarLabels \? node : <UiTip text=\{tipText \|\| label\} placement="right">\{node\}<\/UiTip>/, '侧边栏开启时不包 UiTip')

console.log('toolbar labels always ok')
