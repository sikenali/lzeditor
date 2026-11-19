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

// lzc2vsdx 弹窗尺寸（88vw / max 1100 / 86vh）
assert.match(dialog, /PANEL_WIDTH = '88vw'/, '弹窗宽必须 88vw（lzc2vsdx）')
assert.match(dialog, /PANEL_MAX_WIDTH = 1100/, '弹窗最大宽必须 1100（lzc2vsdx）')
assert.match(dialog, /PANEL_HEIGHT = '86vh'/, '弹窗高必须 86vh（lzc2vsdx）')

// lzc2vsdx 导航：200px 软底 / 条目 42px / 激活青色发光条 / 弹簧
assert.match(css, /\.settings-nav-list\s*\{[\s\S]{0,240}width:\s*200px;/, '设置导航侧栏必须 200px（lzc2vsdx）')
assert.match(css, /\.settings-nav-list\s*\{[\s\S]{0,320}background:\s*var\(--color-bg-secondary\)/, '设置导航侧栏必须软底（lzc2vsdx）')
assert.match(css, /\.settings-nav-row\s*\{[\s\S]{0,240}height:\s*42px;/, '导航条目必须 42px（lzc2vsdx）')
assert.match(css, /\.settings-nav-row\.active::before\s*\{[^}]*width:\s*3px;[^}]*height:\s*22px;/, '激活左条必须 3×22px（lzc2vsdx）')
assert.match(css, /\.settings-nav-row\.active::before\s*\{[^}]*box-shadow:\s*0 0 8px rgba\(var\(--tech-cyan-rgb\),\s*0\.5\)/, '激活左条必须青色发光')
assert.match(css, /\.settings-nav-row\.active::before\s*\{[^}]*background:\s*var\(--color-primary\)/, '激活左条必须主色青')
assert.match(css, /\.settings-nav-row:hover[^{]*\{[^}]*transform:\s*translateY\(-1px\)/, '导航悬停抬起（lzc2vsdx 弹簧）')

// 选中名称 Bold（§6.3 保留）
assert.match(css, /\.accent-name\.current\s*\{[^}]*font-weight:\s*700/, '选中强调色名必须 Bold')

// ✓ 图标深色（Nebula 对比模型，禁白字）
assert.match(css, /\.accent-check-icon[^{]*\{[^}]*color:\s*var\(--color-on-primary\)/, '✓ 必须深色 on-primary')
assert.doesNotMatch(css, /\.accent-check-icon[^{]*\{[^}]*color:\s*#fff/, '✓ 不得白字')

// lzc2vsdx 尺寸：缩略图 100px / 色盘 64px / ✓ 20px
assert.match(css, /\.theme-preview-thumb\s*\{[\s\S]{0,300}?height:\s*100px;/, '缩略图必须 100px（lzc2vsdx）')
assert.match(css, /\.accent-circle\s*\{[^}]*width:\s*64px;[^}]*height:\s*64px;/, '色盘必须 64px（lzc2vsdx）')
assert.match(css, /\.accent-check-icon\s*\{[^}]*font-size:\s*20px;/, '✓ 徽标必须 20px（lzc2vsdx）')

// 选中色盘青晕（lzc2vsdx .accent-swatch.active）：预设圆盘选中必须挂 current class，且 .current/.active 有青晕
assert.match(dialog, /className=\{`accent-circle\$\{accent === p\.id \? ' current' : ''\}`\}/, '预设色盘选中必须挂 current class')
assert.match(css, /\.accent-circle\.current,\s*\.accent-circle-custom\.active\s*\{[^}]*box-shadow:\s*0 0 0 3px rgba\(var\(--tech-cyan-rgb\),\s*0\.2\)/, '选中色盘（预设+自定义）必须青色光晕')

console.log('settings conformance ok')
