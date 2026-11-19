import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const ui = read('src/styles/ui.css')
const themes = read('src/styles/themes.ts')
const modal = read('src/components/ui/UiModal.tsx')

// §8.1 弹窗：.ui-modal 实心 bg-secondary + 主题感知阴影（非玻璃）
assert.match(ui, /\.ui-modal\s*\{[\s\S]{0,500}?background:\s*var\(--color-bg-secondary\)/, '.ui-modal 背景必须实心 var(--color-bg-secondary)（§8.1）')
assert.match(ui, /\.ui-modal\s*\{[\s\S]{0,500}?box-shadow:\s*var\(--color-modal-shadow\)/, '.ui-modal 阴影必须 var(--color-modal-shadow)（§8.1）')
// 深色玻璃令牌已移除（实心）
assert.doesNotMatch(themes, /--modal-glass-/, 'themes.ts 不得残留 --modal-glass-*')
// UiModal 默认圆角 12（§8.1）
assert.match(modal, /radius\s*=\s*12/, 'UiModal 默认圆角必须 12px（§8.1）')
// .ui-modal-title 前 4×16px 青发光条
assert.match(ui, /\.ui-modal-title[\s\S]{0,400}?::before[\s\S]{0,200}?width:\s*4px;[\s\S]{0,60}?height:\s*16px;[\s\S]{0,200}?box-shadow:\s*0 0 6px rgba\(var\(--tech-cyan-rgb\),\s*0\.35\)/, '标题前 4×16px 青发光条')
console.log('modal port ok')

const layout = read('src/styles/layout.css')
// 侧栏分区标题 4×16px 青发光条（inline-block，因标题非 flex 容器）
assert.match(layout, /\.sidebar-header-title[\s\S]{0,500}?::before[\s\S]{0,200}?width:\s*4px;[\s\S]{0,60}?height:\s*16px;[\s\S]{0,200}?box-shadow:\s*0 0 6px rgba\(var\(--tech-cyan-rgb\),\s*0\.35\)/, '侧栏标题前 4×16px 青发光条')
assert.match(layout, /\.library-section-title[\s\S]{0,500}?::before[\s\S]{0,200}?width:\s*4px;[\s\S]{0,60}?height:\s*16px;/, '库分区标题前 4×16px 发光条')
// rail-btn 弹簧微交互（现仅背景变，无 transform）
assert.match(layout, /\.rail-btn:hover[\s\S]{0,300}?transform:\s*translateY\(-1px\)/, 'rail-btn 悬停抬起')
console.log('layout port ok')
