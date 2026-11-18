import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const toolbar = read('src/components/layout/Toolbar.tsx')
const settings = read('src/components/panels/settings/EditorSettingsTab.tsx')

// 12 核心按钮常显
for (const label of ['文档库', '新建', '大纲', '格式', '图片', '链接', '表格', '插入', '模式', '历史', '导出', '设置']) {
  assert.match(toolbar, new RegExp(`toolbar-label">${label}<`), `核心按钮「${label}」应常显`)
}
// 查找 + AI 各自包在 quickFormatButtons 块
assert.match(toolbar, /\{quickFormatButtons && \(\s*<button className="toolbar-btn" aria-label="查找"/, '查找按钮包在 quickFormatButtons 块')
assert.match(toolbar, /\{quickFormatButtons && \(\s*<button[\s\S]{0,260}aria-label="AI 助手"/, 'AI 按钮包在 quickFormatButtons 块')
// 粗体/斜体/删除线包在格式 quickFormat 块
const fmtBlock = toolbar.match(/\{quickFormatButtons && <>([\s\S]*?)<\/>\}/)?.[1] || ''
assert.ok(fmtBlock.includes('粗体') && fmtBlock.includes('斜体') && fmtBlock.includes('删除线'), '粗体/斜体/删除线包在格式 quickFormat 块')
// 恰好 3 个 quickFormatButtons 守卫（查找 / 格式组 / AI）
assert.equal((toolbar.match(/quickFormatButtons &&/g) || []).length, 3, '应有 3 个 quickFormatButtons 守卫')

// desc 文案更新
assert.match(settings, /在工具栏上显示常用的样式菜单，开启后全部显示/, 'desc 文案已更新')
assert.doesNotMatch(settings, /粗体、斜体、下划线、删除线、高亮五个按钮/, '旧「五个按钮」文案已移除')

console.log('quick format toolbar ok')
