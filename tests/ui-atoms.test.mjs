import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const modal = read('src/components/ui/UiModal.tsx')
assert.match(modal, /createPortal\(.*document\.body/, 'UiModal must teleport to body')
assert.match(modal, /border-radius|borderRadius/, 'UiModal must set radius')
const index = read('src/components/ui/index.ts')
for (const n of ['UiModal','UiInput','UiSelect','UiSwitch','UiCheck','UiSelectCard','UiRadioGroup','UiTabs','UiTip','UiButton']) {
  assert.match(index, new RegExp(n), `index must export ${n}`)
}
const icon = read('src/utils/icon.ts')
assert.match(icon, /ri-/, 'resolveIcon must accept ri- names')
console.log('ui atoms checks passed')
