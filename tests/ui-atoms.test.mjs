import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const modal = read('src/components/ui/UiModal.tsx')
assert.match(modal, /createPortal\(.*document\.body/, 'UiModal must teleport to body')
assert.match(modal, /border-radius|borderRadius/, 'UiModal must set radius')
const index = read('src/components/ui/index.ts')
for (const n of ['UiModal','UiInput','UiSelect','UiSwitch','UiCheck','UiSelectCard','UiTip','UiButton']) {
  assert.match(index, new RegExp(n), `index must export ${n}`)
}
const icon = read('src/utils/icon.ts')
assert.match(icon, /ri-/, 'resolveIcon must accept ri- names')

const insertDialogs = ['ImageDialog','LinkDialog','CodeDialog','FormulaDialog','TableDropdown','EmojiDialog','ChartDialog']
for (const d of insertDialogs) {
  const src = read(`src/components/panels/${d}.tsx`)
  assert.doesNotMatch(src, /UnifiedDialog|PanelContainer|@heroui\/react/, `${d} must not use legacy dialog/HeroUI`)
  assert.match(src, /from '\.\.\/ui'/, `${d} must import from the ui barrel`)
}

const panelDialogs = ['ExportDialog','HistoryPanel','LibraryPanel','FilePanel','SearchPanel']
for (const d of panelDialogs) {
  const src = read(`src/components/panels/${d}.tsx`)
  assert.doesNotMatch(src, /UnifiedDialog|PanelContainer|@heroui\/react/, `${d} must not use legacy dialog/HeroUI`)
}

for (const f of ['src/components/editor/AIPanel.tsx','src/components/layout/Toolbar.tsx','src/App.tsx']) {
  const src = read(f)
  assert.doesNotMatch(src, /UnifiedDialog|PanelContainer|@heroui\/react/, `${f} must not use legacy dialog/HeroUI`)
}

// ── §8.1 统一弹框：每个弹框都必须渲染 <UiModal>，不许再冒出别的遮罩弹层 ──
const MODALS = ['SettingsDialog','ExportDialog','ImageDialog','LinkDialog','CodeDialog','FormulaDialog','ChartDialog','EmojiDialog','FilePanel','LibraryPanel','TableDropdown']
for (const d of MODALS) {
  const src = read(`src/components/panels/${d}.tsx`)
  assert.match(src, /<UiModal/, `${d} 必须渲染 <UiModal>（§8.1 统一弹框）`)
  assert.doesNotMatch(src, /UnifiedDialog|PanelContainer|@heroui\/react/, `${d} must not use legacy dialog`)
}

// 任何 position:fixed + inset:0 + rgba 背景的弹层遮罩，只许是 .ui-modal-overlay（UiModal）
// 或 .style-select-backdrop（下拉框的点击外关闭）。其余都是非统一弹层。
const cssFiles = readdirSync(new URL('../src/styles/', import.meta.url)).filter((f) => f.endsWith('.css'))
const allCss = cssFiles.map((f) => read(`src/styles/${f}`)).join('\n')
const rogue = [...allCss.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(([, sel, body]) =>
  /position\s*:\s*fixed/.test(body) && /inset\s*:\s*0/.test(body) && /rgba\(/.test(body) &&
  /(overlay|backdrop|mask)/.test(sel) && !/ui-modal-overlay/.test(sel) && !/style-select-backdrop/.test(sel))
assert.equal(rogue.length, 0, `不许有自定义遮罩弹层（§8.1）：\n${rogue.map(([s]) => s.trim()).join('\n')}`)

// 层级：modal 遮罩 1040 < 子菜单 9999 < toast 10000
assert.match(read('src/styles/tokens.css'), /--z-modal-backdrop:\s*1040/, '遮罩 z-index 必须走 token')
assert.match(read('src/utils/toast.ts'), /zIndex:\s*'10000'/, 'toast 必须高于一切弹层')

console.log('ui atoms checks passed')
