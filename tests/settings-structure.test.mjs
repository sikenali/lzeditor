import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const settings = read('src/components/panels/SettingsDialog.tsx')

for (const label of ['主题设置', '模型管理', '个性设置', '关于']) {
  assert.match(settings, new RegExp(label), `missing top nav ${label}`)
}
for (const label of ['内容样式', '编辑设置', '应用行为', '快捷键设置']) {
  assert.match(settings, new RegExp(label), `missing profile sub-tab ${label}`)
}
assert.doesNotMatch(settings, /同步备份/, 'sync/backup group must be removed')
assert.doesNotMatch(settings, /@heroui|PanelContainer|UnifiedDialog|LFInput|SelectBox/, 'no legacy shells or inputs')
assert.match(settings, /from '\.\.\/\.\.\/components\/ui'/, 'must import the ui barrel')

console.log('settings structure checks passed')
