import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// 1. 整站 CSS 不得残留羊皮纸暖色/朱红 hex（tokens.css :root 已换 Nebula，全文件应零残留）
const cssFiles = readdirSync(new URL('../src/styles/', import.meta.url)).filter(f => f.endsWith('.css'))
const warm = /#(FAF7F2|F7F3EA|FCFBF8|FDF9F0|C0392B|BE3B2E|FBE9E7|E5DFD3|EDE9E0|D9D2C2|E05050)/i
for (const f of cssFiles) {
  const bad = read(`src/styles/${f}`).split('\n').filter(l => warm.test(l))
  assert.equal(bad.length, 0, `${f} 残留暖色 hex：\n${bad.join('\n')}`)
}
// themes.ts 的 --t-hui-bg 是浅色暖值（#FDF9F0），必须冷调改白
assert.doesNotMatch(read('src/styles/themes.ts'), /'--t-hui-bg':\s*'#FDF9F0'/, 'themes.ts --t-hui-bg 不得残留暖色 #FDF9F0')

// 2. 品牌/标题必须用 --font-display
const layout = read('src/styles/layout.css')
assert.match(layout, /\.rail-logo[^{]*\{[^}]*var\(--font-display\)/, '左导航品牌 logo 必须用 --font-display')
assert.match(layout, /\.sidebar-header-title[^{]*\{[^}]*var\(--font-display\)/, '侧栏标题必须用 --font-display')

// 3. 关键 CTA 用 glow
assert.match(read('src/styles/ai-chat.css'), /\.ai-chat-send[^{]*\{[^}]*var\(--glow-(sm|md)\)/, 'AI 发送按钮必须 glow')
assert.match(read('src/styles/welcome-screen.css'), /\.welcome-btn--primary[^{]*\{[^}]*var\(--glow-(sm|md)\)/, '欢迎页 CTA 必须 glow')

// 4. 主色填充表面文字必须 on-primary / accent-foreground（禁止 #fff 白字压青底）
const panels = read('src/styles/panels.css')
assert.doesNotMatch(panels, /background[^;]*var\(--color-primary\)[^}]*color:\s*#fff/, '主色填充不得白字')

// 5. 评审 Important #2：强调色/主色填充上的文字必须 on-primary / accent-foreground，
//    禁止 #fff 白字压亮青底（白字对青底仅 ~1.9:1）。逐个核对评审列出的 5 处。
const settingsDialog = read('src/styles/settings-dialog.css')
for (const [file, sel] of [
  [layout, /\.app-footer-btn:hover[^{]*\{[^}]*color:\s*#fff/],
  [settingsDialog, /\.config-tab\.active[^{]*\{[^}]*color:\s*#fff/],
  [settingsDialog, /\.lf-checkbox\.checked[^{]*\{[^}]*color:\s*#fff/],
  [panels, /\.lf-checkbox\.checked[^{]*\{[^}]*color:\s*#fff/],
  [settingsDialog, /\.accent-check-icon[^{]*\{[^}]*color:\s*#fff/],
]) {
  assert.doesNotMatch(file, sel, '强调色/主色填充不得白字（用 --accent-foreground/--color-on-primary）')
}
// 全站：同规则内 accent/primary 填充 + color:#fff 一律禁止
const fillWhite = /(background|border-color)[^;]*var\(--(?:color-primary|accent-primary)\)[^}]*color:\s*#fff|color:\s*#fff[^}]*background[^;]*var\(--(?:color-primary|accent-primary)\)/
for (const f of cssFiles) {
  assert.doesNotMatch(read(`src/styles/${f}`), fillWhite, `${f} 主色/强调色填充不得白字`)
}

// 6. 评审 Important #4：重置强调色必须写新默认 id 'cyan'（旧 'vermilion' 落回青但色块不选中）
const dialog = read('src/components/panels/SettingsDialog.tsx')
assert.doesNotMatch(dialog, /u\('accentColor',\s*'vermilion'\)/, '重置不得写旧 vermilion id')
assert.match(dialog, /resetSettings\(\)/, '重置必须走 resetSettings（含强调色 cyan）')
assert.match(read('src/store/settingsStore.ts'), /accentColor:\s*'cyan'/, '默认强调色必须是 cyan')

console.log('nebula surface ok')

// G2/G3/G4/G15/G16 玻璃 + 0.6px 发丝（Nebula）
const aiChat = read('src/styles/ai-chat.css')
const leftNav = layout.match(/\.app-left-nav\s*\{[^}]*\}/)?.[0] || ''
assert.match(leftNav, /backdrop-filter:\s*blur\(12px\)/, '左 rail 必须玻璃 blur(12px)（G2）')
const ai = aiChat.match(/\.ai-chat-panel\s*\{[^}]*\}/)?.[0] || ''
assert.match(ai, /backdrop-filter:\s*blur\(12px\)/, 'AI 聊天面板必须玻璃 blur(12px)（G4）')
assert.match(ai, /border-left:\s*0\.6px/, 'AI 聊天面板左边必须 0.6px 发丝（G4）')
const footer = layout.match(/^\.app-footer\s*\{[^}]*\}/m)?.[0] || ''
assert.match(footer, /backdrop-filter:\s*blur\(12px\)/, '页脚必须玻璃 blur(12px)（G15）')
const outline = layout.match(/\.sidebar-outline\s*\{[^}]*\}/)?.[0] || ''
assert.match(outline, /backdrop-filter:\s*blur\(12px\)/, '侧栏 outline 必须玻璃 blur(12px)（G3）')
assert.match(outline, /border-right:\s*0\.6px/, '侧栏 outline 右边必须 0.6px（G3）')
const library = layout.match(/\.sidebar-library\s*\{[^}]*\}/)?.[0] || ''
assert.match(library, /border-right:\s*0\.6px/, '侧栏 library 右边必须 0.6px（G3）')
const preview = layout.match(/\.sidebar-preview-wrapper\s*\{[^}]*\}/)?.[0] || ''
assert.match(preview, /backdrop-filter:\s*blur\(12px\)/, '预览面板必须玻璃 blur(12px)（G3）')
const readMode = read('src/styles/read-mode.css')
const floatNav = readMode.match(/^\.main-nav-float\s*\{[^}]*\}/m)?.[0] || ''
assert.match(floatNav, /backdrop-filter:\s*blur\(12px\)/, '阅读浮航容器必须玻璃 blur(12px)（G16）')
assert.match(floatNav, /border-radius:\s*8px/, '阅读浮航容器必须 8px 圆角（G16）')

// G7/G10/G11/G19 slash 命令玻璃 + 按钮 8px + toast 10px
const floating = read('src/styles/floating.css')
const settingsCss = read('src/styles/settings-dialog.css')
const welcomeCss = read('src/styles/welcome-screen.css')
const panelsCss = read('src/styles/panels.css')
const slash = floating.match(/\.slash-command\s*\{[^}]*\}/)?.[0] || ''
assert.match(slash, /border:\s*0\.6px/, 'slash 命令必须 0.6px 边（G7）')
assert.match(slash, /border-radius:\s*8px/, 'slash 命令必须 8px 圆角（G7）')
assert.match(slash, /backdrop-filter/, 'slash 命令必须玻璃（G7）')
assert.match(settingsCss, /\.ud-btn\s*\{[^}]*border-radius:\s*8px;/, '.ud-btn 必须 8px 圆角（G10）')
assert.match(welcomeCss, /\.welcome-btn\s*\{[^}]*border-radius:\s*8px;/, '.welcome-btn 必须 8px 圆角（G10）')
assert.match(panelsCss, /\.search-btn\s*\{[^}]*border-radius:\s*8px;/, '.search-btn 必须 8px 圆角（G10）')
assert.match(settingsCss, /\.page-reset-button\s*\{[^}]*border-radius:\s*8px;/, '.page-reset-button 必须 8px 圆角（G11）')
const toast = read('src/utils/toast.ts')
assert.match(toast, /borderRadius\s*=\s*'10px'|borderRadius:\s*'10px'/, 'toast 必须 10px 圆角（G19）')
