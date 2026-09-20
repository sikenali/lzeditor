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
  assert.match(source, /chip-name/, `${name} left navigation should use the export chip name slot`)
  assert.match(source, /chip-desc/, `${name} left navigation should use the export chip description slot`)
  assert.doesNotMatch(source, /insert-nav-name|insert-nav-desc/, `${name} should not keep insert-specific text slot classes`)
}

assert.match(panelsCss, /\.insert-nav-item\s*\{[\s\S]*grid-template-areas:\s*"icon name" "icon desc"/, 'Insert left nav should match export compact chip layout')
assert.match(settingsCss, /\.settings-nav-item\s*\{[\s\S]*grid-template-areas:\s*"icon name" "icon desc"/, 'Settings left nav should match export compact chip layout')
assert.match(panelsCss, /\.insert-nav-item \.chip-name/, 'Insert left nav should style the shared chip name slot')
assert.match(panelsCss, /\.insert-nav-item \.chip-desc/, 'Insert left nav should style the shared chip description slot')
assert.doesNotMatch(panelsCss, /insert-nav-name|insert-nav-desc/, 'Insert left nav styles should not keep insert-specific text slot classes')
assert.match(settingsDialog, /desc:/, 'Settings nav items should include descriptions like export format chips')
assert.match(settingsDialog, /chip-name/, 'Settings left nav should use the export chip name slot')
assert.match(settingsDialog, /chip-desc/, 'Settings left nav should use the export chip description slot')
assert.match(settingsCss, /\.settings-nav-item \.chip-name/, 'Settings left nav should style the shared chip name slot')
assert.match(settingsCss, /\.settings-nav-item \.chip-desc/, 'Settings left nav should style the shared chip description slot')
assert.doesNotMatch(settingsDialog, /settings-nav-name|settings-nav-desc/, 'Settings left nav should not keep settings-specific text slot classes')
assert.doesNotMatch(settingsCss, /settings-nav-name|settings-nav-desc/, 'Settings left nav styles should not keep settings-specific text slot classes')

console.log('insert navigation UI checks passed')
