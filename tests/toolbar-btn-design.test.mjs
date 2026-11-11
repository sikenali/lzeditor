import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// DESIGN.md §2.3.3/2.3.4 顶栏标签按钮：hover → --color-bg-secondary + translateY(-1px)；
// 激活 → --color-primary-soft + 主色 600。lzeditor .toolbar-btn 当前 hover 无底色无位移
// （background: transparent），激活用灰底 rgba(0,0,0,0.08) 非 primary-soft，违背规范。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const css = read('src/styles/layout.css')

// ── .toolbar-btn:hover 必须有底色 + 上移反馈（不再 background: transparent）──
const hover = css.match(/\.toolbar-btn:hover\s*\{[^}]*\}/)?.[0] || ''
assert.ok(!hover.includes('transparent'), '.toolbar-btn:hover 不得用 transparent（需 hover 反馈底色）')
assert.match(css, /\.toolbar-btn:hover[^}]*var\(--color-bg-secondary\)/, '.toolbar-btn:hover 必须用 --color-bg-secondary 底色')
assert.match(css, /\.toolbar-btn:hover[^}]*translateY\(-1px\)/, '.toolbar-btn:hover 必须 translateY(-1px) 上移反馈')

// ── .toolbar-btn.active 必须用 --color-primary-soft（非灰底）──
const active = css.match(/\.toolbar-btn\.active\s*\{[^}]*\}/)?.[0] || ''
assert.ok(!active.includes('rgba(0,0,0,0.08)'), '.toolbar-btn.active 不得用灰底 rgba(0,0,0,0.08)（须 primary-soft）')
assert.match(css, /\.toolbar-btn\.active[^}]*var\(--color-primary-soft\)/, '.toolbar-btn.active 必须用 --color-primary-soft')

console.log('toolbar button design ok')
