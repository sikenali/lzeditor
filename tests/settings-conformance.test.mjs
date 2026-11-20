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

// DESIGN-1 §5.1 弹窗尺寸（74vw / max 1040 / 82vh，优化 #30 紧凑化）
assert.match(dialog, /PANEL_WIDTH = '74vw'/, '弹窗宽必须 74vw（优化 #30 紧凑化）')
assert.match(dialog, /PANEL_MAX_WIDTH = 1040/, '弹窗最大宽必须 1040（优化 #30 紧凑化）')
assert.match(dialog, /PANEL_HEIGHT = '82vh'/, '弹窗高必须 82vh（优化 #30 紧凑化）')

// DESIGN-1 §5.3 导航：180px 白底 / 条目 44px / 激活 system-blue（无左条）/ 弹簧
assert.match(css, /\.settings-nav-list\s*\{[\s\S]{0,240}width:\s*180px;/, '设置导航侧栏必须 180px（§5.3）')
assert.match(css, /\.settings-nav-list\s*\{[\s\S]{0,320}background:\s*var\(--color-bg-white\)/, '设置导航侧栏必须白底（§5.3）')
assert.match(css, /\.settings-nav-row\s*\{[\s\S]{0,240}height:\s*44px;/, '导航条目必须 44px（§5.3）')
assert.doesNotMatch(css, /\.settings-nav-row\.active::before\s*\{[^}]*width:\s*3px;/, '§5.3 无激活左条')
assert.match(css, /\.settings-nav-row\.active\s*\{[^}]*var\(--color-system-blue-soft\)/, '激活态必须 system-blue-soft 底（§7）')
assert.match(css, /\.settings-nav-row\.active\s+\.settings-nav-ico[^}]*var\(--color-system-blue\)/, '激活态图标必须 system-blue（§7）')
assert.match(css, /\.settings-nav-row\.active\s+\.settings-nav-txt[^}]*var\(--color-system-blue\)/, '激活态文字必须 system-blue（§7）')
assert.match(css, /\.settings-nav-row:hover[^{]*\{[^}]*transform:\s*translateY\(-1px\)/, '导航悬停抬起（lzc2vsdx 弹簧）')

// 选中名称 Bold（§6.3 保留）
assert.match(css, /\.accent-name\.current\s*\{[^}]*font-weight:\s*700/, '选中强调色名必须 Bold')

// ✓ 图标深色（Nebula 对比模型，禁白字）
assert.match(css, /\.accent-check-icon[^{]*\{[^}]*color:\s*var\(--color-on-primary\)/, '✓ 必须深色 on-primary')
assert.doesNotMatch(css, /\.accent-check-icon[^{]*\{[^}]*color:\s*#fff/, '✓ 不得白字')

// DESIGN-1 §6 尺寸：缩略图 128px / 色盘 80px
assert.match(css, /\.theme-preview-thumb\s*\{[\s\S]{0,300}?height:\s*128px;/, '缩略图必须 128px（§6.2）')
assert.match(css, /\.accent-circle\s*\{[^}]*width:\s*80px;[^}]*height:\s*80px;/, '色盘必须 80px（§6.3）')
assert.match(css, /\.accent-check-icon\s*\{[^}]*font-size:\s*20px;/, '✓ 徽标必须 20px（lzc2vsdx）')

// 选中色盘青晕（lzc2vsdx .accent-swatch.active）：预设圆盘选中必须挂 current class，且 .current/.active 有青晕
assert.match(dialog, /className=\{`accent-circle\$\{accent === p\.id \? ' current' : ''\}`\}/, '预设色盘选中必须挂 current class')
assert.match(css, /\.accent-circle\.current,\s*\.accent-circle-custom\.active\s*\{[^}]*box-shadow:\s*0 0 0 3px rgba\(var\(--tech-cyan-rgb\),\s*0\.2\)/, '选中色盘（预设+自定义）必须青色光晕')

console.log('settings conformance ok')

// DESIGN-1 §6.2/§6.3/§6.1 主题卡/色盘/区块卡字面
assert.match(css, /\.theme-preview-thumb\s*\{[^}]*height:\s*128px;/, '主题预览缩略图必须 128px（§6.2）')
assert.match(css, /\.accent-group\s*\{[^}]*gap:\s*40px;/, '色盘间距必须 40px（§6.3）')
assert.match(css, /\.accent-circle\s*\{[^}]*width:\s*80px;[^}]*height:\s*80px;/, '色盘直径必须 80px（§6.3）')
assert.match(css, /\.settings-section\s*\{[^}]*border-radius:\s*16px;/, '区块卡必须 16px 圆角（§6.1）')
assert.doesNotMatch(css, /\.settings-section\s*\{[^}]*backdrop-filter:\s*blur/, '区块卡必须实心（§6.1 不玻璃化）')
