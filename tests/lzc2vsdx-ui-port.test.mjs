import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const ui = read('src/styles/ui.css')
const themes = read('src/styles/themes.ts')
const modal = read('src/components/ui/UiModal.tsx')

// 深色玻璃弹窗：.ui-modal 用 --modal-glass-* 回退（浅色不透明）
assert.match(ui, /\.ui-modal\s*\{[\s\S]{0,500}?background:\s*var\(--modal-glass-bg,\s*var\(--color-bg-secondary\)\)/, '.ui-modal 必须玻璃回退（浅色不透明）')
assert.match(ui, /\.ui-modal\s*\{[\s\S]{0,500}?border:\s*0\.6px solid var\(--modal-glass-border,\s*var\(--color-border-soft\)\)/, '玻璃边 0.6px')
// 深色令牌在 themes.ts
assert.match(themes, /'--modal-glass-bg':\s*'rgba\(10,\s*22,\s*40,\s*0\.95\)'/, '深色玻璃底')
assert.match(themes, /'--modal-glass-border':\s*'rgba\(0,\s*212,\s*170,\s*0\.12\)'/, '深色玻璃青边')
// UiModal 默认圆角 14（lzc2vsdx）
assert.match(modal, /radius\s*=\s*14/, 'UiModal 默认圆角必须 14（lzc2vsdx）')
// .ui-modal-title 前 4×16px 青发光条
assert.match(ui, /\.ui-modal-title[\s\S]{0,400}?::before[\s\S]{0,200}?width:\s*4px;[\s\S]{0,60}?height:\s*16px;[\s\S]{0,200}?box-shadow:\s*0 0 6px rgba\(var\(--tech-cyan-rgb\),\s*0\.35\)/, '标题前 4×16px 青发光条')
console.log('modal port ok')
