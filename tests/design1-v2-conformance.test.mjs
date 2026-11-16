import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const tokens = read('src/styles/tokens.css')
const themes = read('src/styles/themes.ts')

// 圆角 v2 体系
for (const [t, v] of [['--radius-xs','4px'],['--radius-sm','8px'],['--radius-md','12px'],['--radius-lg','16px'],['--radius-xl','20px']]) {
  assert.match(tokens, new RegExp(`${t}:\\s*${v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`), `Missing ${t}=${v}`)
}
// 取一个主题对象的字面量文本（到对象结束的第一个 }）
const block = (name) => themes.slice(themes.indexOf(`${name}: {`), themes.indexOf('}', themes.indexOf(`${name}: {`)))
// 主题不变 token（system-blue / glow / focus-ring）在 tokens.css 与两个主题对象
for (const t of ['--color-system-blue','--color-system-blue-soft','--color-glow','--color-focus-ring']) {
  assert.match(tokens, new RegExp(t + ':'), `Missing ${t} in tokens.css`)
  assert.match(block('parchment'), new RegExp(`'${t}':`), `Missing ${t} in parchment theme`)
  assert.match(block('dark'), new RegExp(`'${t}':`), `Missing ${t} in dark theme`)
}
// 主题感知阴影：必须存在于两个主题对象，且 dark 与 parchment 值不同
for (const t of ['--color-modal-shadow','--color-popover-shadow','--color-inset-highlight']) {
  assert.match(block('parchment'), new RegExp(`'${t}':`), `Missing ${t} in parchment`)
  assert.match(block('dark'), new RegExp(`'${t}':`), `Missing ${t} in dark`)
}
assert.notEqual(block('parchment').match(/'--color-modal-shadow':\s*'([^']+)'/)?.[1], block('dark').match(/'--color-modal-shadow':\s*'([^']+)'/)?.[1], 'modal-shadow 必须随主题感知')
// §8.1 弹框阴影主题感知精确值：浅色柔和无深空晕，深色深空底 + 青绿内发光
assert.match(block('parchment'), /'--color-modal-shadow':\s*'0 8px 40px rgba\(0,\s*0,\s*0,\s*0\.1\)'/, '浅色弹框阴影必须柔和 0 8px 40px rgba(0,0,0,0.1)（§8.1 禁深空割裂）')
assert.match(block('dark'), /'--color-modal-shadow':\s*'0 8px 48px rgba\(0,\s*0,\s*0,\s*0\.55\),\s*inset 0 1px 0 rgba\(0,\s*212,\s*170,\s*0\.08\)'/, '深色弹框阴影必须深空底 + 青绿内发光（§8.1）')
// system-blue 常量 #007AFF（§7）
assert.match(tokens, /--color-system-blue:\s*#007AFF/)

// §8.1 弹框：UiModal 默认圆角 12px，阴影必须走主题感知 token
const modal = read('src/components/ui/UiModal.tsx')
assert.match(modal, /radius = 12/, 'UiModal 默认圆角必须 12px（§8.1）')
const uiCss = read('src/styles/ui.css')
assert.match(uiCss, /\.ui-modal\s*\{[\s\S]{0,400}?box-shadow:\s*var\(--color-modal-shadow\)/, '弹框阴影必须主题感知 var(--color-modal-shadow)（§8.1）')

// §5.1/§5.3 设置中心：1280px 上限，导航 180px/44px，系统蓝激活
const settings = read('src/components/panels/SettingsDialog.tsx')
assert.match(settings, /PANEL_MAX_WIDTH = 1280/, '设置弹框最大宽必须 1280px（§5.1）')
const sdlg = read('src/styles/settings-dialog.css')
const navList = sdlg.match(/\.settings-nav-list\s*\{[^}]*\}/)?.[0] || ''
assert.match(navList, /width:\s*180px/, '设置导航侧栏必须 180px（§5.3）')
const navRow = sdlg.match(/\.settings-nav-row\s*\{[^}]*\}/)?.[0] || ''
assert.match(navRow, /height:\s*44px/, '设置导航条目必须 44px（§5.3）')
const navActive = sdlg.match(/\.settings-nav-row\.active\s*\{[^}]*\}/)?.[0] || ''
assert.match(navActive, /var\(--color-system-blue-soft\)/, '激活态必须系统蓝浅底')
// 3px 左条是独立伪元素规则（.settings-nav-row.active::before），不能嵌在 .active 块里，单独断言
const navBefore = sdlg.match(/\.settings-nav-row\.active::before\s*\{[^}]*\}/)?.[0] || ''
assert.match(navBefore, /width:\s*3px/, '激活态必须 3px 左条（::before）')
assert.match(navBefore, /var\(--color-system-blue\)/, '左条必须系统蓝')
// 激活态文字/图标颜色在各自子规则（.settings-nav-row.active .settings-nav-ico/.txt），单独断言
assert.match(sdlg, /\.settings-nav-row\.active\s+\.settings-nav-ico[^}]*var\(--color-system-blue\)/, '激活态图标必须系统蓝')
assert.match(sdlg, /\.settings-nav-row\.active\s+\.settings-nav-txt[^}]*var\(--color-system-blue\)/, '激活态文字必须系统蓝')

// §8.2/§10.2 键盘焦点环统一系统蓝，但输入框 focus 边框与外发光保持主色
const uiCss4 = read('src/styles/ui.css')
const ring = uiCss4.match(/Global focus-visible[\s\S]*?\n\}/)?.[0] || ''
assert.match(ring, /var\(--color-focus-ring\)/, '全局 focus-visible 环必须用 var(--color-focus-ring)（系统蓝）')
assert.match(ring, /box-shadow:\s*0 0 0 2px[\s\S]{0,60}0 0 0 4px/, '环必须保留 2px 白内圈 + 4px 外圈结构')
// 输入框 focus 外发光保持主色（§8.2/§10.2），不得被系统蓝带走
assert.match(uiCss4, /\.ui-input:focus-within,\s*\.ui-select-trigger:focus[\s\S]{0,300}?box-shadow:\s*0 0 0 3px color-mix\(in srgb, var\(--color-primary\)/, '输入框 focus 外发光必须保持主色 color-mix(in srgb, var(--color-primary)…)（§8.2）')

// layout.css 其余键盘焦点环同样系统蓝（toolbar 子菜单 / 侧栏大纲跳转）
const layoutCss4 = read('src/styles/layout.css')
assert.match(layoutCss4, /\.toolbar-submenu-item:focus-visible[^{]*\{[^}]*box-shadow:\s*0 0 0 2px var\(--color-focus-ring\)/, 'toolbar 子菜单键盘焦点环必须系统蓝')
const jumpRing = layoutCss4.match(/\.sidebar-outline \.outline-jump-btn:focus-visible\s*\{[^}]*\}/)?.[0] || ''
assert.match(jumpRing, /box-shadow:\s*0 0 0 2px var\(--color-focus-ring\)/, '大纲跳转按钮键盘焦点环必须系统蓝')
assert.match(jumpRing, /0 2px 8px rgba\(0,\s*0,\s*0,\s*0\.10\)/, '大纲跳转按钮环需保留 drop shadow（非环）')

// §8.2 "全局" 键盘焦点环：globals / code-mode / welcome 其余环同样系统蓝
const globalsCss4 = read('src/styles/globals.css')
const btnRing = globalsCss4.match(/button:focus-visible, input:focus-visible\s*\{[^}]*\}/)?.[0] || ''
assert.match(btnRing, /box-shadow:\s*0 0 0 3px var\(--color-focus-ring\)/, 'button/input 键盘焦点环必须系统蓝')
const globalRing = globalsCss4.match(/\n:focus-visible\s*\{[^}]*\}/)?.[0] || ''
assert.match(globalRing, /outline:\s*2px solid var\(--color-focus-ring\)/, '全局 :focus-visible outline 必须系统蓝')
const codeCss4 = read('src/styles/code-mode.css')
assert.match(codeCss4, /\.code-splitter:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-focus-ring\)/, 'code splitter 键盘焦点环必须系统蓝')
const welcomeCss4 = read('src/styles/welcome-screen.css')
assert.match(welcomeCss4, /\.welcome-btn:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-focus-ring\)/, '欢迎页按钮键盘焦点环必须系统蓝')
assert.match(welcomeCss4, /\.welcome-recent-item:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-focus-ring\)/, '欢迎页最近项键盘焦点环必须系统蓝')
// 表单控件 select 的 focus 是边框+外发光（非键盘导航环），必须保持主色
const selectFocus = globalsCss4.match(/select:focus-visible\s*\{[^}]*\}/)?.[0] || ''
assert.match(selectFocus, /border-color:\s*var\(--accent-primary\)/, 'select focus 边框必须保持主色')
assert.match(selectFocus, /box-shadow:\s*0 0 0 3px var\(--accent-a10\)/, 'select focus 外发光必须保持主色')
