import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const colorTokens = read('src/styles/color-tokens.css')
const settingsDialog = read('src/styles/settings-dialog.css')
const uiCss = read('src/styles/ui.css')
const welcomeCss = read('src/styles/welcome-screen.css')

// 根因：--accent-hover 必须加深（不再 20% 浅红），主按钮 hover 白字才可读
assert.match(colorTokens, /--accent-hover:\s*color-mix\(in srgb,\s*var\(--accent-primary\)\s*88%,\s*#000\)/, '--accent-hover 必须加深 accent')

// 主按钮文字/背景/线框统一走 accent token，禁硬编码白字
assert.match(settingsDialog, /\.ud-btn--primary\s*\{[^}]*color:\s*var\(--accent-foreground\)/, '.ud-btn--primary 文字必须走 accent-foreground')
assert.doesNotMatch(settingsDialog, /\.ud-btn--primary\s*\{[^}]*color:\s*(white|#fff)\b/, '.ud-btn--primary 不得硬编码白字')
assert.match(settingsDialog, /\.settings-save-btn\s*\{[^}]*border:\s*0\.6px solid var\(--accent-primary\)/, '.settings-save-btn 必须有统一线框')

// .ui-btn--primary 缺 base 规则（静止无底=不显示），必须补 accent 实底 + accent-foreground 字
assert.match(uiCss, /\.ui-btn--primary\s*\{[^}]*background:\s*var\(--accent-primary\)/, '.ui-btn--primary 必须补 accent 实底 base')
assert.match(uiCss, /\.ui-btn--primary\s*\{[^}]*color:\s*var\(--accent-foreground\)/, '.ui-btn--primary 文字必须走 accent-foreground')

assert.match(welcomeCss, /\.welcome-btn--primary\s*\{[^}]*color:\s*var\(--accent-foreground\)/, '.welcome-btn--primary 文字必须走 accent-foreground')

// 次/幽灵按钮：统一线框 + 文字 + hover 走 accent，不得绕过 token
assert.match(uiCss, /\.ui-btn--outline\s*\{[^}]*border:\s*0\.7px solid var\(--border-subtle\)/, '.ui-btn--outline 必须有统一线框')
assert.match(uiCss, /\.ui-btn--outline\s*\{[^}]*color:\s*var\(--text-secondary\)/, '.ui-btn--outline 文字必须走 text-secondary')
assert.match(uiCss, /\.ui-btn--outline:hover[^{]*\{[^}]*border-color:\s*var\(--accent-primary\)/, '.ui-btn--outline hover 边框必须走 accent-primary')
assert.match(uiCss, /\.ui-btn--ghost:hover[^{]*\{[^}]*background:\s*var\(--bg-hover\)/, '.ui-btn--ghost hover 背景必须走 bg-hover')
assert.doesNotMatch(welcomeCss, /\.welcome-btn--ghost\s*\{[^}]*color:\s*(white|#fff)\b/, '.welcome-btn--ghost 不得硬编码白字')

// 最终审查补漏：.btn-save（ModelSettingsTab 保存）必须走 accent token，不得硬编码白字/绕过 accent
assert.match(settingsDialog, /\.btn-save\s*\{[^}]*background:\s*var\(--accent-primary\)/, '.btn-save 背景必须走 accent-primary')
assert.match(settingsDialog, /\.btn-save\s*\{[^}]*color:\s*var\(--accent-foreground\)/, '.btn-save 文字必须走 accent-foreground')
assert.match(settingsDialog, /\.btn-save\s*\{[^}]*border:\s*0\.6px solid var\(--accent-primary\)/, '.btn-save 必须有统一线框')
assert.doesNotMatch(settingsDialog, /\.btn-save\s*\{[^}]*color:\s*(white|#fff)\b/, '.btn-save 不得硬编码白字')
// .search-btn--primary 静止态文字也必须走 accent-foreground（panels.css 两处定义）
const panelsCss = read('src/styles/panels.css')
assert.doesNotMatch(panelsCss, /\.search-btn--primary\s*\{[^}]*color:\s*(white|#fff)\b/, '.search-btn--primary 不得硬编码白字')
assert.match(panelsCss, /\.search-btn--primary\s*\{[^}]*color:\s*var\(--accent-foreground\)/, '.search-btn--primary 文字必须走 accent-foreground')

console.log('dialog buttons unify (primary) checks passed')
