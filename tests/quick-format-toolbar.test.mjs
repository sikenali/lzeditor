import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const toolbar = read('src/components/layout/Toolbar.tsx')
const settings = read('src/components/panels/settings/EditorSettingsTab.tsx')

// 查找 + AI + 格式按钮组都包在 quickFormatButtons 块（关闭时收敛为 12 核心）
const qfCount = (toolbar.match(/quickFormatButtons &&/g) || []).length
assert.ok(qfCount >= 3, `查找/AI/粗体/斜体/删除线都应包在 quickFormatButtons 块（当前 ${qfCount} 处）`)

// desc 文案更新
assert.match(settings, /在工具栏上显示常用的样式菜单，开启后全部显示/, 'desc 文案已更新')
assert.doesNotMatch(settings, /粗体、斜体、下划线、删除线、高亮五个按钮/, '旧「五个按钮」文案已移除')

console.log('quick format toolbar ok')
