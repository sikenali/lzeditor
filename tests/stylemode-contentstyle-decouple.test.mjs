import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const settings = read('src/components/panels/SettingsDialog.tsx')
const stylePanel = read('src/components/panels/StyleMainPanel.tsx')
const css = read('src/styles/settings-dialog.css')
const csPath = fileURLToPath(new URL('../src/components/panels/settings/ContentStyleTab.tsx', import.meta.url))

// 1. 设置窗口不再有「内容样式」选项卡
assert.doesNotMatch(settings, /ContentStyleTab/, 'SettingsDialog 不得再引用 ContentStyleTab')
assert.doesNotMatch(settings, /label: '内容样式'/, 'SettingsDialog 不得再有「内容样式」入口')
// 2. ContentStyleTab 文件已删除
assert.equal(existsSync(csPath), false, 'ContentStyleTab.tsx 必须删除')
// 3. 排版模式仍是全局 typographyTheme 唯一入口（仍写回）
assert.match(stylePanel, /updateSetting\('typographyTheme'/, '排版模式必须继续写回全局 typographyTheme（唯一入口）')
// 4. ContentStyleTab 专属死样式已清理
assert.doesNotMatch(css, /\.theme-grid\s*\{/, '.theme-grid 死样式必须删除')
assert.doesNotMatch(css, /\.theme-name\s*\{/, '.theme-name 死样式必须删除')
assert.doesNotMatch(css, /\.theme-tag\s*\{/, '.theme-tag 死样式必须删除')

console.log('stylemode contentstyle decouple checks passed')
