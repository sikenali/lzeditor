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
const btnRing = globalsCss4.match(/(?:^|\n)button:focus-visible\s*\{[^}]*\}/)?.[0] || ''
assert.match(btnRing, /box-shadow:\s*0 0 0 3px var\(--color-focus-ring\)/, 'button 键盘焦点环必须系统蓝')
// 文本输入框 focus 属于表单焦点处理（边框+外发光），必须保持主色，不能套系统蓝环
const inputRing = globalsCss4.match(/(?:^|\n)input:focus-visible\s*\{[^}]*\}/)?.[0] || ''
assert.match(inputRing, /box-shadow:\s*0 0 0 3px var\(--accent-a20\)/, 'input:focus-visible 必须保持主色调焦点环（§8.2 表单焦点）')
assert.doesNotMatch(inputRing, /--color-focus-ring/, 'input:focus-visible 不得使用系统蓝键盘环')
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

// §5.5 悬浮表面：阴影/内描高光必须主题感知（Task 5）
const layout = read('src/styles/layout.css')
const panels = read('src/styles/panels.css')
const floating = read('src/styles/floating.css')
// 悬浮表面阴影走主题感知 token
for (const [file, sel] of [[layout, /\.toolbar-submenu\s*\{/],[layout, /\.sidebar-outline\s*\{/],[layout, /\.sidebar-preview-wrapper\s*\{/],[floating, /\.ai-panel\s*\{/],[floating, /\.slash-command\s*\{/]]) {
  const block = file.match(new RegExp(sel.source + '[^}]*\\}'))?.[0] || ''
  assert.match(block, /var\(--color-popover-shadow\)/, `${sel} 悬浮表面阴影必须 var(--color-popover-shadow)`)
}
// .search-panel-inner 生效阴影在 panels.css:1192（var(--t-sh-5)，主题感知迁移 token）；
// panels.css:872 的 var(--color-popover-shadow) 声明被其覆盖，是故意保留的死声明。
const searchInnerLive = panels.match(/\.search-panel-inner\s*\{[\s\S]{0,200}?box-shadow:\s*var\(--t-sh-5\)/)?.[0] || ''
assert.ok(searchInnerLive.length > 0, '.search-panel-inner 生效阴影必须是 var(--t-sh-5)（主题感知迁移 token）')
// 历史面板是内联布局面板（.history-main-panel，flex:1），非弹框，不参与本规范 —— 断言它不被误改
assert.match(panels, /\.history-main-panel\s*\{[\s\S]{0,200}?flex:\s*1/, '历史面板保持内联全高面板（非弹框）')
// 内描高光走主题感知（代表性表面，spec §5.5 显式清单）
// 用 [^{}]*\{[^}]*var(...) 匹配「该选择器（或其状态变体）的某块含高亮」——
// 因为 .format-card.active 在 panels.css 出现两次（:9 是 1px accent 环、:109 才是 inset 高亮），
// .outline-jump-btn 只有 :hover（:370）有 inset 高亮（base 无 shadow），不能用首匹配。
for (const sel of [/\.insert-nav-item\s*\{/, /\.format-card\.active\s*\{/, /\.library-cat-btn\.active\s*\{/, /\.outline-jump-btn\s*\{/]) {
  const src = (sel.source.includes('outline') ? layout : panels)
  // sel.source 里的 \s*\{ 是字面字符，须按字面剥离，否则会残留孤立反斜杠把 [^{}]* 转义坏
  const b = src.match(new RegExp(sel.source.replace(/\\s\*\\\{$/, '') + '[^{}]*\\{[^}]*var\\(--color-inset-highlight\\)'))?.[0] || ''
  assert.ok(b.length > 0, `${sel} 必须有一个块含 var(--color-inset-highlight)`)
}

// §5.5 深色主题内描高光：--t-sh-13/14/15 必须走 var(--color-inset-highlight)，不得残留白色 inset
for (const k of ['--t-sh-13','--t-sh-14','--t-sh-15']) {
  assert.match(block('dark'), new RegExp(`'${k}':\\s*'[^']*var\\(--color-inset-highlight\\)`), `${k} 深色内描高光必须 var(--color-inset-highlight)`)
}
assert.doesNotMatch(block('dark'), /'--t-sh-1[345]':\s*'[^']*rgba\(255,\s*255,\s*255/, '深色 --t-sh-13/14/15 不得残留白色内描高光')
// 两条 live 规则（layout.css:633 / panels.css:284）的内描高光同样主题感知
assert.match(layout, /\.sidebar-library \.library-cat-btn\.active[^{]*\{[^}]*var\(--color-inset-highlight\)/, 'library-cat-btn.active 内描高光必须 var(--color-inset-highlight)')
assert.match(panels, /\.export-body-redesigned \.insert-nav-item[^{]*\{[^}]*var\(--color-inset-highlight\)/, 'export-body-redesigned .insert-nav-item 内描高光必须 var(--color-inset-highlight)')

// 持久激活态的内描高光同样必须主题感知（§5.5 扫除，active 非 hover 微反馈）
assert.match(panels, /\.insert-nav-item\.active[^{]*\{[^}]*var\(--color-inset-highlight\)/, '.insert-nav-item.active 内描高光必须 var(--color-inset-highlight)')
assert.match(panels, /\.export-body-redesigned \.insert-nav-item\.active[^{]*\{[^}]*var\(--color-inset-highlight\)/, '.export-body-redesigned .insert-nav-item.active 内描高光必须 var(--color-inset-highlight)')

// ── DESIGN-1.md §2.1 毛玻璃顶栏/页脚 + --bg-rgb 主题 token（方案 A 严格合规）──
assert.match(tokens, /--bg-rgb:\s*250,\s*247,\s*242/, '浅色 --bg-rgb 必须 = #FAF7F2（§1 羊皮纸基底）')
assert.match(block('parchment'), /'--bg-rgb':\s*'250,\s*247,\s*242'/, 'parchment 主题必须含 --bg-rgb=#FAF7F2')
assert.match(block('dark'), /'--bg-rgb':\s*'23,\s*23,\s*26'/, 'dark 主题必须含 --bg-rgb=#17171A')
const toolbarRule = layout.match(/\.toolbar\s*\{[^}]*\}/)?.[0] || ''
assert.match(toolbarRule, /rgba\(var\(--bg-rgb\),\s*0\.82\)/, '顶栏背景必须毛玻璃 rgba(var(--bg-rgb),0.82)（§2.1）')
assert.match(toolbarRule, /backdrop-filter:\s*blur\(16px\)/, '顶栏必须 backdrop-filter blur(16px)（§2.1）')
assert.match(toolbarRule, /app-region:\s*drag/, '顶栏 Electron 无边框窗口拖动区必须保留')
assert.match(toolbarRule, /border-bottom:\s*0\.7px/, '顶栏底部必须 0.7px 分割线（§2.1）')
const footerRule = layout.match(/\.app-footer\s*\{[^}]*height:\s*58px[^}]*\}/)?.[0] || ''
assert.match(footerRule, /rgba\(var\(--bg-rgb\),\s*0\.75\)/, '页脚背景必须毛玻璃 rgba(var(--bg-rgb),0.75)（§2.1）')

// ── 方案 A：Web 应用内容居中限宽 1280（窗口观感），高度仍铺满视口 ──
const appCss = read('src/styles/app.css')
const appRule = appCss.match(/\.app\s*\{[^}]*\}/)?.[0] || ''
assert.match(appRule, /max-width:\s*1280px/, '.app 必须 max-width:1280px（窗口观感）')
assert.match(appRule, /margin:\s*0 auto/, '.app 必须水平居中')
assert.match(appRule, /height:\s*100vh/, '.app 高度仍铺满视口')

// ── 方案 A：Electron 窗口 1280×900（min 保留）──
const main = read('electron/main.ts')
assert.match(main, /width:\s*1280/, 'Electron 窗口宽必须 1280')
assert.match(main, /height:\s*900/, 'Electron 窗口高必须 900')
assert.match(main, /minWidth:\s*1024/, 'minWidth 保留 1024')
