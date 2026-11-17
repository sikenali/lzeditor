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
assert.match(settingsDialog, /\.settings-save-btn\s*\{[^}]*border:\s*0\.7px solid var\(--accent-primary\)/, '.settings-save-btn 必须有统一线框')

// .ui-btn--primary 缺 base 规则（静止无底=不显示），必须补 accent 实底 + accent-foreground 字
assert.match(uiCss, /\.ui-btn--primary\s*\{[^}]*background:\s*var\(--accent-primary\)/, '.ui-btn--primary 必须补 accent 实底 base')
assert.match(uiCss, /\.ui-btn--primary\s*\{[^}]*color:\s*var\(--accent-foreground\)/, '.ui-btn--primary 文字必须走 accent-foreground')

assert.match(welcomeCss, /\.welcome-btn--primary\s*\{[^}]*color:\s*var\(--accent-foreground\)/, '.welcome-btn--primary 文字必须走 accent-foreground')

console.log('dialog buttons unify (primary) checks passed')
