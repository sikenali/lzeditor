import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// DESIGN.md §8.3 UiCheck：勾选时显示 ✓，颜色为主题主色。
// 当前 .ui-check.on 用 color: var(--color-on-primary)（白勾），违背规范。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const css = read('src/styles/ui.css')

const on = css.match(/\.ui-check\.on\s*\{[^}]*\}/)?.[0] || ''
assert.ok(!on.includes('var(--color-on-primary)'), '.ui-check.on 不得用 on-primary（白勾），须主色勾')
assert.match(css, /\.ui-check\.on[^}]*var\(--color-primary\)/, '.ui-check.on 勾必须为主题主色 var(--color-primary)')

console.log('ui check primary ok')
