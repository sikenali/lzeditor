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

// ── 优化 #③：历史柱状图宽度收窄（含 active），高度按修改量映射且保最小高度 ──

// 柱宽：live .history-bar 必须收窄到 10px（旧 22px 移除）；live active 柱体同宽（width:100%），
// 不再放大到旧 30px —— active 仅靠强调色/描边区分，宽度同样收窄。
const barLive = blocks(panels, '.history-bar').filter((b) => b.includes('flex: 1')).at(-1) || ''
assert.match(barLive, /max-width:\s*10px/, '.history-bar live 柱宽必须收窄到 10px（优化 #③）')
assert.ok(!barLive.includes('22px'), '.history-bar live 不得再是 22px 宽（优化 #③ 收窄）')

const barActiveBody = last(panels, '.history-bar.active .history-bar-body')
assert.match(barActiveBody, /width:\s*100%/, '.history-bar.active .history-bar-body live 必须 width:100%（与普通柱同宽）')
assert.ok(!barActiveBody.includes('30px'), '.history-bar.active .history-bar-body 不得再放大到 30px（优化 #③ active 收窄）')

// 柱高：线性映射（修改越多越高）+ 8px 最小高度，量程 8→72 拉开层次感
assert.match(
  history,
  /const barH = Math\.max\(8,\s*8\s*\+\s*\(v\.changes\s*\/\s*maxChanges\)\s*\*\s*64\)/,
  'HistoryPanel 柱高必须按修改量线性映射（8 + 比例*64），保留 8px 最小高度（优化 #③）',
)

// 柱体容器 live 允许 8px 最小高度（与 barH 下限一致，防被旧 4px 压制）
const bodyLive = blocks(panels, '.history-bar-body').filter((b) => b.includes('min-height')).at(-1) || ''
assert.match(bodyLive, /min-height:\s*8px/, '.history-bar-body live 最小高度必须 8px（优化 #③）')

console.log('history bar chart ok')
