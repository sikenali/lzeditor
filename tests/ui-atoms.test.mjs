import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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

console.log('ui atoms checks passed')
