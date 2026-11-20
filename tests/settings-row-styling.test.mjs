import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// ── task 1：设置「内容排版 / 缩进大小 / 快捷键设置」统一成 UDSettingRow 样式（图标+上下文字+右对齐控件）──

const layout = read('src/components/panels/settings/LayoutSettingsTab.tsx')
const editor = read('src/components/panels/settings/EditorSettingsTab.tsx')
const shortcut = read('src/components/panels/settings/ShortcutSettingsTab.tsx')
const ui = read('src/components/ui/sections.tsx')

// UDSettingRow 组件结构：图标 + (名称+描述上下排列) + 右对齐控制槽
assert.match(ui, /ud-setting-icon/, 'UDSettingRow 必须有图标槽')
assert.match(ui, /ud-setting-name/, 'UDSettingRow 必须有名称槽')
assert.match(ui, /ud-setting-desc/, 'UDSettingRow 必须有描述槽')
assert.match(ui, /ud-setting-control/, 'UDSettingRow 必须右对齐控制槽')

// 「内容排版」4 行（默认字体/默认字号/行高/内容宽度）全部用 UDSettingRow，不再用 .setting-row/.setting-label
const contentBlock = layout.match(/内容排版[\s\S]{0,1600}/)?.[0] || ''
for (const label of ['默认字体', '默认字号', '行高', '内容宽度']) {
  assert.ok(contentBlock.includes(`label="${label}"`) || contentBlock.includes(`label={'${label}'}`) || contentBlock.includes(`label='${label}'`),
    `内容排版「${label}」必须是 UDSettingRow（图标+上下文字）`)
}
assert.match(contentBlock, /<UDSettingRow/, '内容排版必须用 UDSettingRow 行组件')
assert.ok(!/className="setting-row"/.test(contentBlock), '内容排版不得再用 .setting-row（改 UDSettingRow）')
assert.ok(!/className="setting-label"/.test(contentBlock), '内容排版不得再用 .setting-label（改 UDSettingRow）')

// 「缩进大小」（Tab 键与空格的宽度）用 UDSettingRow
const indentBlock = editor.match(/<UDSettingRow[^>]*缩进大小[\s\S]{0,400}/)?.[0] || ''
assert.match(indentBlock, /<UDSettingRow/, '缩进大小必须用 UDSettingRow')
assert.match(indentBlock, /Tab 键与空格的宽度/, '缩进大小描述必须保留「Tab 键与空格的宽度」')

// 「快捷键设置」所有行用 UDSettingRow（图标 + 键帽右对齐）
// 行由 row(icon, desc, key, note) 助手生成，助手内部渲染 UDSettingRow；统计 row(...) 调用数。
const rowCalls = (shortcut.match(/\{row\('/g) || shortcut.match(/\n\s*row\('/g) || []).length
assert.ok((shortcut.match(/row\('/g) || []).length >= 30, `快捷键设置必须全部用 UDSettingRow（现 ${(shortcut.match(/row\('/g)||[]).length} 行，应 ≥30）`)
assert.match(shortcut, /<UDSettingRow icon=\{icon\} label=\{desc\}/, '快捷键行助手必须渲染 UDSettingRow（图标+上下文字）')
assert.ok(!/className="shortcut-row"/.test(shortcut), '快捷键不得再用 .shortcut-row（改 UDSettingRow）')
assert.match(shortcut, /<kbd className="shortcut-key">/, '快捷键键帽仍用 .shortcut-key')
// 每行带图标（row 助手第一个参数 icon）
assert.match(shortcut, /row\('ri-[a-z0-9-]+',/, '快捷键行必须传图标')

console.log('settings row styling ok')
