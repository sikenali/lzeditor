import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const themes = read('src/styles/themes.ts')
const ui = read('src/styles/ui.css')
const layout = read('src/styles/layout.css')
const settingsCss = read('src/styles/settings-dialog.css')
const modelTab = read('src/components/panels/settings/ModelSettingsTab.tsx')

// ── Issue A：hover 黑色 —— tooltip 改主题一致表面（浅色=白卡深字，深色=深卡浅字），绝不用近黑 ──
// themes.ts 的 --t-bg-11/--t-fg-10/--t-bd-5 是实际生效的 tooltip 组件 token（layout.css 覆盖块用它们）。
for (const theme of ['parchment', 'dark']) {
  const block = themes.match(new RegExp(`${theme}: \\{[\\s\\S]*?\\n  \\},`))?.[0] || ''
  assert.match(block, /'--t-bg-11':\s*'var\(--color-bg-card\)'/, `${theme} 主题 tooltip 背景必须走 --color-bg-card（不得黑）`)
  assert.match(block, /'--t-fg-10':\s*'var\(--color-text-body\)'/, `${theme} 主题 tooltip 文字必须走 --color-text-body（可读对比）`)
  assert.match(block, /'--t-bd-5':\s*'var\(--color-border\)'/, `${theme} 主题 tooltip 边框必须走 --color-border`)
}

// UiTip（模型行 编辑/删除 的 tooltip）背景必须走主题卡片，文字走 body，绝不用 rgba 近黑
const uiTip = ui.match(/\.ui-tip::after\s*\{[\s\S]*?\n\}/)?.[0] || ''
assert.match(uiTip, /background:\s*var\(--color-bg-card\)/, 'UiTip tooltip 背景必须走 --color-bg-card')
assert.match(uiTip, /color:\s*var\(--color-text-body\)/, 'UiTip tooltip 文字必须走 --color-text-body')
assert.ok(!uiTip.includes('rgba(28, 28, 30'), 'UiTip tooltip 不得用近黑 rgba 背景')

// data-title tooltip（顶栏/状态栏/页脚）fallback 也必须走主题 token（不再回退近黑）
for (const m of layout.matchAll(/var\(--chrome-tooltip-bg,\s*([^)]*)/g)) {
  assert.match(m[1], /var\(--color-bg-card/, 'data-title tooltip 背景 fallback 必须走 --color-bg-card')
}
assert.ok(!layout.includes('rgba(30,30,35,0.95)'), 'data-title tooltip 不得再回退近黑 rgba')

// ── Issue D：去掉「刷新模型」按钮 ──
assert.ok(!modelTab.includes('model-refresh-btn'), 'ModelSettingsTab 不得再有 model-refresh-btn')
assert.ok(!modelTab.includes('handleRefreshModels'), 'ModelSettingsTab 不得再有 handleRefreshModels')
assert.ok(!settingsCss.includes('.model-refresh-btn'), 'settings-dialog.css 不得再有 .model-refresh-btn')

console.log('settings tooltip contrast + refresh removal ok')
