import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const settings = read('src/components/panels/SettingsDialog.tsx')
const model = read('src/components/panels/settings/ModelSettingsTab.tsx')
const about = read('src/components/panels/settings/AboutSettingsTab.tsx')

for (const label of ['主题设置', '模型管理', '个性设置', '关于']) {
  assert.match(settings, new RegExp(label), `missing top nav ${label}`)
}
for (const label of ['内容样式', '编辑设置', '行为设置', '快捷键设置']) {
  assert.match(settings, new RegExp(label), `missing profile sub-tab ${label}`)
}
assert.doesNotMatch(settings, /同步备份/, 'sync/backup group must be removed')
assert.doesNotMatch(settings, /@heroui|PanelContainer|UnifiedDialog|LFInput|SelectBox/, 'no legacy shells or inputs')
assert.match(settings, /from '\.\.\/\.\.\/components\/ui'/, 'must import the ui barrel')

for (const [f, marker] of [
  ['ContentStyleTab.tsx', '内容样式'],
  ['EditorSettingsTab.tsx', '排版'],
  ['BehaviorSettingsTab.tsx', '行为设置'],
  ['ShortcutSettingsTab.tsx', '文档操作'],
  ['AboutSettingsTab.tsx', '懒猫编辑器'],
  ['ModelSettingsTab.tsx', '自定义配置'],
]) {
  assert.match(read(`src/components/panels/settings/${f}`), new RegExp(marker), `${f} marker ${marker}`)
}

assert.match(model, /模型制造商/, 'provider sub-tab label')
assert.match(model, /apiKeys/, 'must use the apiKeys store')
assert.match(about, /LightOS/, 'about must credit LightOS')

for (const f of ['UnifiedDialog.tsx', 'PanelContainer.tsx', 'LFInput.tsx', 'LFSInput.internal.tsx', 'SelectBox.tsx', 'Checkbox.tsx']) {
  assert.equal(existsSync(new URL(`../src/components/ui/${f}`, import.meta.url)), false, `legacy ui file must be deleted: ${f}`)
}

console.log('settings structure checks passed')
