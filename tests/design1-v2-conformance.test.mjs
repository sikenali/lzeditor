import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const tokens = read('src/styles/tokens.css')
const themes = read('src/styles/themes.ts')

// 圆角 v2 体系
for (const [t, v] of [['--radius-xs','4px'],['--radius-sm','8px'],['--radius-md','12px'],['--radius-lg','16px'],['--radius-xl','20px']]) {
  assert.match(tokens, new RegExp(`${t}:\\s*${v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`), `Missing ${t}=${v}`)
}
// 取一个主题对象的字面量文本（到对象结束的第一个 }）
const block = (name) => themes.slice(themes.indexOf(`${name}: {`), themes.indexOf('}', themes.indexOf(`${name}: {`)))
// 主题不变 token（system-blue / glow / focus-ring）在 tokens.css 与两个主题对象
for (const t of ['--color-system-blue','--color-system-blue-soft','--color-glow','--color-focus-ring']) {
  assert.match(tokens, new RegExp(t + ':'), `Missing ${t} in tokens.css`)
  assert.match(block('parchment'), new RegExp(`'${t}':`), `Missing ${t} in parchment theme`)
  assert.match(block('dark'), new RegExp(`'${t}':`), `Missing ${t} in dark theme`)
}
// 主题感知阴影：必须存在于两个主题对象，且 dark 与 parchment 值不同
for (const t of ['--color-modal-shadow','--color-popover-shadow','--color-inset-highlight']) {
  assert.match(block('parchment'), new RegExp(`'${t}':`), `Missing ${t} in parchment`)
  assert.match(block('dark'), new RegExp(`'${t}':`), `Missing ${t} in dark`)
}
assert.notEqual(block('parchment').match(/'--color-modal-shadow':\s*'([^']+)'/)?.[1], block('dark').match(/'--color-modal-shadow':\s*'([^']+)'/)?.[1], 'modal-shadow 必须随主题感知')
// §8.1 弹框阴影主题感知精确值：浅色柔和无深空晕，深色深空底 + 青绿内发光
assert.match(block('parchment'), /'--color-modal-shadow':\s*'0 8px 40px rgba\(0,\s*0,\s*0,\s*0\.1\)'/, '浅色弹框阴影必须柔和 0 8px 40px rgba(0,0,0,0.1)（§8.1 禁深空割裂）')
assert.match(block('dark'), /'--color-modal-shadow':\s*'0 8px 48px rgba\(0,\s*0,\s*0,\s*0\.55\),\s*inset 0 1px 0 rgba\(0,\s*212,\s*170,\s*0\.08\)'/, '深色弹框阴影必须深空底 + 青绿内发光（§8.1）')
// system-blue 常量 #007AFF（§7）
assert.match(tokens, /--color-system-blue:\s*#007AFF/)

// §8.1 弹框：UiModal 默认圆角 12px，阴影必须走主题感知 token
const modal = read('src/components/ui/UiModal.tsx')
assert.match(modal, /radius = 12/, 'UiModal 默认圆角必须 12px（§8.1）')
const uiCss = read('src/styles/ui.css')
assert.match(uiCss, /\.ui-modal\s*\{[\s\S]{0,400}?box-shadow:\s*var\(--color-modal-shadow\)/, '弹框阴影必须主题感知 var(--color-modal-shadow)（§8.1）')
