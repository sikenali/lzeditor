import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const sources = {
  Toolbar: read('src/components/layout/Toolbar.tsx'),
  InsertDropdown: read('src/components/panels/InsertDropdown.tsx'),
  ImageDialog: read('src/components/panels/ImageDialog.tsx'),
  LinkDialog: read('src/components/panels/LinkDialog.tsx'),
  TableDropdown: read('src/components/panels/TableDropdown.tsx'),
  ChartDialog: read('src/components/panels/ChartDialog.tsx'),
  EmojiDialog: read('src/components/panels/EmojiDialog.tsx'),
  CodeDialog: read('src/components/panels/CodeDialog.tsx'),
  FormulaDialog: read('src/components/panels/FormulaDialog.tsx'),
}

const panelsCss = read('src/styles/panels.css')
const settingsCss = read('src/styles/settings-dialog.css')
const settingsDialog = read('src/components/panels/SettingsDialog.tsx')

for (const [name, source] of Object.entries(sources)) {
  assert.doesNotMatch(source, /ri-toc|ri-quotation-text|ri-footprint(?!-line)/, `${name} uses an invalid or unreliable Remix icon`)
}

for (const name of ['ImageDialog', 'LinkDialog', 'TableDropdown', 'ChartDialog', 'EmojiDialog', 'CodeDialog', 'FormulaDialog']) {
  const source = sources[name]
  assert.match(source, /insert-nav-icon/, `${name} left navigation should use a dedicated icon slot`)
  assert.match(source, /insert-nav-name/, `${name} left navigation should use a dedicated name slot`)
  assert.match(source, /insert-nav-desc/, `${name} left navigation should use a dedicated description slot`)
}

assert.match(panelsCss, /\.insert-nav-item\s*\{[\s\S]*grid-template-areas:\s*"icon name" "icon desc"/, 'Insert left nav should match export compact chip layout')
assert.match(settingsCss, /\.settings-nav-item\s*\{[\s\S]*grid-template-areas:\s*"icon name" "icon desc"/, 'Settings left nav should match export compact chip layout')
assert.match(settingsDialog, /desc:/, 'Settings nav items should include descriptions like export format chips')

console.log('insert navigation UI checks passed')
