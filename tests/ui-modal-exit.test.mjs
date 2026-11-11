import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// DESIGN.md §8.1 UiModal：当前只有 ui-pop-in 进入动画，无离开动画（open→false 直接卸载）。
// 修复：UiModal 支持 closing 过渡（播 exit 再卸载），CSS 加 ui-pop-out。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const modal = read('src/components/ui/UiModal.tsx')
const css = read('src/styles/ui.css')

// ── UiModal 必须有 closing 过渡状态 ──
assert.match(modal, /closing/, 'UiModal 必须有 closing 状态（离开过渡）')
assert.match(modal, /setTimeout/, 'UiModal 必须用 setTimeout 延迟卸载（等 exit 动画播完）')

// ── 渲染必须带 closing class ──
assert.match(modal, /closing \? ' closing'|\$\{closing/, 'UiModal 渲染必须按 closing 加 class')

// ── CSS 必须有离开动画 ui-pop-out ──
assert.match(css, /ui-pop-out/, 'ui.css 必须定义 ui-pop-out 离开动画')
assert.match(css, /\.ui-modal-overlay\.closing|\.ui-modal\.closing/, 'ui.css 必须按 closing 触发离开动画')

console.log('ui modal exit anim ok')
