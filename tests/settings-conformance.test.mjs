import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const dialog = read('src/components/panels/SettingsDialog.tsx')
const css = read('src/styles/settings-dialog.css')

// §6.2 主题预览卡必须 Nebula 色 + 名（禁残留旧羊皮纸/墨夜）
assert.doesNotMatch(dialog, /#F7EED4|#333A45|#17171A|#FAF7F2|#E1DCD1|#404955|#8E939A/, '主题预览卡不得残留旧羊皮纸/墨夜色')
assert.match(dialog, /previewBg:\s*'#F4F7FA'/, '浅色预览卡必须 Nebula 冷科技 #F4F7FA')
assert.match(dialog, /previewBg:\s*'#0A0F18'/, '深色预览卡必须 Nebula 深空 #0A0F18')
assert.match(dialog, /name:\s*'浅色主题 · 冷科技'/, '浅色主题名必须冷科技')
assert.match(dialog, /name:\s*'深色主题 · 深空'/, '深色主题名必须深空')

// §5.1 弹窗尺寸
assert.match(dialog, /PANEL_MAX_WIDTH = 1280/, '弹窗最大宽必须 1280（§5.1）')
assert.match(dialog, /PANEL_HEIGHT = '92vh'/, '弹窗高必须 92vh（§5.1）')

// §5.3 导航条目高 44px
assert.match(css, /\.settings-nav-row\s*\{[\s\S]{0,220}height:\s*44px;/, '导航条目必须 44px（§5.3）')

// §6.3 选中名称 Bold
assert.match(css, /\.accent-name\.current\s*\{[^}]*font-weight:\s*700/, '选中强调色名必须 Bold（§6.3）')

// §6.3 ✓ 图标深色（Nebula 对比模型，禁白字）
assert.match(css, /\.accent-check-icon[^{]*\{[^}]*color:\s*var\(--color-on-primary\)/, '✓ 必须深色 on-primary')
assert.doesNotMatch(css, /\.accent-check-icon[^{]*\{[^}]*color:\s*#fff/, '✓ 不得白字')

// §6.2/6.3 紧凑覆写已移除（缩略图回到 128px、色盘回到 80px）
assert.doesNotMatch(css, /\.theme-settings-view \.accent-circle\s*\{[^}]*width:\s*60px/, '紧凑覆写不得把色盘缩到 60px')
assert.doesNotMatch(css, /\.theme-settings-view \.theme-preview-thumb\s*\{[^}]*height:\s*112px/, '紧凑覆写不得把缩略图缩到 112px')
assert.doesNotMatch(css, /\.theme-settings-view \.accent-group\s*\{[^}]*gap:\s*28px/, '紧凑覆写不得把色盘间距缩到 28px')

console.log('settings conformance ok')
