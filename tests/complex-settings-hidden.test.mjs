import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 经决策：livePreview / showMarkdownMarkers / continueLists 在 CM6 源码编辑器里
// 需新写内联渲染/输入变换逻辑，工作量大，本次「先接简单项」——从设置页隐藏并
// 从 store/类型移除，避免「有开关却无效」的假控件。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const tab = read('src/components/panels/settings/EditorSettingsTab.tsx')
const store = read('src/store/settingsStore.ts')
const types = read('src/shared/types.ts')

for (const key of ['livePreview', 'showMarkdownMarkers', 'continueLists']) {
  assert.doesNotMatch(tab, new RegExp(key), `EditorSettingsTab 必须隐藏 ${key} 开关（无对应实现）`)
  assert.doesNotMatch(store, new RegExp(`${key}:`), `settingsStore 不得默认 ${key}`)
  assert.doesNotMatch(types, new RegExp(`${key}\\??:`), `types 不得声明 ${key}`)
}

console.log('complex settings hidden ok')
