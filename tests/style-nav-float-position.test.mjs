import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const css = read('src/styles/read-mode.css')
const panel = read('src/components/panels/StyleMainPanel.tsx')

// 1. 浮导航必须不再 absolute top:0（原来顶到样式面板顶部，与底部工具栏的「显示/隐藏」按钮脱节）
assert.doesNotMatch(css, /\.main-nav-float\s*\{[^}]*position:\s*absolute[^}]*top:\s*0/, '浮导航不得再 absolute top:0')
// 2. 浮导航必须锚到阅读区底部（工具栏「显示/隐藏」按钮正上方），水平居中 —— bottom 定位
assert.match(css, /\.main-nav-float\s*\{[^}]*position:\s*absolute[^}]*bottom:\s*0/, '浮导航必须 absolute bottom:0')
assert.match(css, /\.main-nav-float\s*\{[^}]*left:\s*0[^}]*right:\s*0/, '浮导航必须水平居中（left/right 0 + margin auto）')
// 3. 阅读区必须成为定位上下文（nav-float 锚在它底部，即工具栏正上方）—— inline style position:relative
assert.match(panel, /className="read-mode-body"[^}]*position:\s*'relative'/, 'read-mode-body 必须 position:relative（inline）')
// 4. 移除白色背景：nav-float-btn 不得再有 rgba(255,255,255) 底 + backdrop blur
const btn = css.match(/\.nav-float-btn\s*\{[^}]*\}/)?.[0] || ''
assert.doesNotMatch(btn, /rgba\(255,\s*255,\s*255,\s*0\.25\)/, 'nav-float-btn 不得有半透明白底')
assert.doesNotMatch(btn, /backdrop-filter:\s*blur/, 'nav-float-btn 不得有 backdrop blur 白雾')
// 5. 浮导航仍在 StyleMainPanel 内（JSX 未移动）
assert.match(panel, /className=\{`main-nav-float/, '浮导航仍在 StyleMainPanel 内')

console.log('style nav-float above button ok')
