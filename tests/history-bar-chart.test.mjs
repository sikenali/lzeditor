import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const panels = read('src/styles/panels.css')
const history = read('src/components/panels/HistoryPanel.tsx')

/** 取某选择器「全部」规则块（panels.css 有旧/新两套 history 样式，须定位 live 规则）。
 *  锚定在行首：`[data-theme="dark"] .history-bar...` 因前缀在同一行不会被误匹配。 */
const blocks = (css, selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp('(?:^|\\n)\\s*' + esc + '\\s*\\{[^}]*\\}', 'g')
  return [...css.matchAll(re)].map((m) => m[0].trim())
}
/** 取 live（非深色覆写）的最后一条规则块。 */
const last = (css, selector) => blocks(css, selector).filter((b) => !b.startsWith('[data-theme')).at(-1) || ''

// ── 历史柱状图：宽度加宽约 1/3，高度按索引确定性错落（每条都不同） ──

// 柱宽：live .history-bar 从 10px 加宽到 34px（约 1/3 宽），不再用 max-width 压成细线。
const barLive = blocks(panels, '.history-bar').filter((b) => b.includes('width: 34px') || b.includes('flex: 0 0 auto')).at(-1) || ''
assert.match(barLive, /width:\s*34px/, '.history-bar live 柱宽必须加宽到 34px')
assert.ok(!barLive.includes('max-width: 10px'), '.history-bar live 不得再压到 10px')

const barActiveBody = last(panels, '.history-bar.active .history-bar-body')
assert.match(barActiveBody, /width:\s*100%/, '.history-bar.active .history-bar-body live 必须 width:100%（与普通柱同宽）')

// 柱高：索引确定性错落（步长 37 与 60 互素，保证每条高度不同），不再是一排等高柱。
assert.match(
  history,
  /const barH = 12 \+ \(\(i \* 37\) % 60\)/,
  'HistoryPanel 柱高必须按索引确定性错落（12 + (i*37)%60）',
)

// 柱体容器 live 允许 8px 最小高度（防被旧 4px 压制）
const bodyLive = blocks(panels, '.history-bar-body').filter((b) => b.includes('min-height')).at(-1) || ''
assert.match(bodyLive, /min-height:\s*8px/, '.history-bar-body live 最小高度必须 8px')

console.log('history bar chart ok')
