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
// 侧边栏：始终 icon-only（不挂 rail-nav--labels），由 CSS hover 展开显示内联标签
assert.match(leftNav, /className="rail-nav"/, '侧边栏 rail 始终 icon-only（无 labels 类）')
assert.match(leftNav, /const tip = \(_label: string, node: React\.ReactNode\) => node/, '侧边栏按钮不再包 UiTip（hover 展开替代）')
// 侧边栏 hover 展开：rail 加宽 + 内联标签显示
assert.match(layoutCss, /\.rail-nav:hover \.rail-label[^}]*display:\s*block/, '侧边栏 hover 显示内联标签')
assert.match(layoutCss, /\.rail-nav:hover[\s\S]{0,80}width:\s*168px/, '侧边栏 hover rail 加宽')
// 侧边栏关闭态 tooltip 浅色卡片（右侧弹出，logo/版本 仍在用）
assert.match(uiCss, /\.rail-nav \.ui-tip--right::after[^}]*background:\s*var\(--color-bg-card\)/, '侧边栏 tooltip 浅色卡片')

console.log('toolbar labels always ok')
