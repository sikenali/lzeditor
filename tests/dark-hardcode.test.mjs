import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// DESIGN.md §10.3 深色硬编码反模式：.history-bar-body 近白 rgba(253,253,253,1)、
// .version-bar.active 亮蓝 rgba(26,115,232,1)，深色下无主题覆写仍显示浅色。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const panels = read('src/styles/panels.css')
const readMode = read('src/styles/read-mode.css')

// ── panels.css 必须有深色覆写 .history-bar-body（不再近白）──
assert.match(panels, /\[data-theme="dark"\][^{]*\.history-bar-body[^{]*\{/, 'panels.css 必须有 [data-theme=dark] .history-bar-body 深色覆写')
const darkHistory = panels.match(/\[data-theme="dark"\][^{]*\.history-bar-body[^{]*\{[^}]*\}/)?.[0] || ''
assert.ok(!darkHistory.includes('rgba(253, 253, 253, 1)') && !darkHistory.includes('#fff'), '深色 .history-bar-body 不得用近白/纯白（须 CSS 变量）')
assert.match(darkHistory, /var\(--color-bg/, '深色 .history-bar-body 必须用 --color-bg-* 变量')

// ── read-mode.css 必须有深色覆写 .version-bar（不再亮蓝/白）──
assert.match(readMode, /\[data-theme="dark"\][^{]*\.version-bar[^{]*\{/, 'read-mode.css 必须有 [data-theme=dark] .version-bar 深色覆写')

console.log('dark hardcode override ok')
