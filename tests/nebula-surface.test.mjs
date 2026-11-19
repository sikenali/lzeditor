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
assert.match(dialog, /u\('accentColor',\s*'cyan'\)/, '重置必须写默认 cyan')

console.log('nebula surface ok')
