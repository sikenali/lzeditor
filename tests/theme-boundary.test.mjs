import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const tokens = read('src/styles/tokens.css')
const themes = read('src/styles/themes.ts')
const colorTokens = read('src/styles/color-tokens.css')

for (const token of [
  '--color-primary', '--color-primary-soft', '--color-bg-main', '--color-bg-secondary',
  '--color-bg-card', '--color-bg-white', '--color-text-primary', '--color-text-muted',
  '--color-border', '--color-border-soft', '--color-border-hover', '--color-success',
  '--color-info', '--color-warning', '--color-error', '--radius-md', '--spacing-4',
  '--shadow-md', '--transition-base',
]) {
  assert.match(tokens, new RegExp(`${token}:`), `Missing token ${token}`)
}

// compatibility bridge present
for (const alias of ['--text-heading:', '--bg-code:', '--border-subtle:', '--font-sans:', '--accent-primary:']) {
  assert.match(tokens, new RegExp(alias), `Missing alias ${alias}`)
}

assert.match(themes, /parchment/, 'themes.ts must define parchment')
assert.match(themes, /dark/, 'themes.ts must define dark')
assert.doesNotMatch(colorTokens, /\[data-theme=/, 'color-tokens.css must not keep [data-theme] override blocks')

const settingsStore = read('src/store/settingsStore.ts')
assert.match(settingsStore, /theme: 'parchment'/, 'default theme must be parchment')
assert.doesNotMatch(settingsStore, /ACCEPT_PRESETS|id: 'red'/, 'legacy accent ids must be gone')
assert.match(settingsStore, /vermilion/, 'new accent presets must be used')

const layout1 = read('src/styles/layout.css')
assert.match(layout1, /\.toolbar\s*\{[\s\S]*height:\s*72px/, 'toolbar must be 72px tall')
assert.match(read('src/components/layout/Toolbar.tsx'), /navtop/, 'Toolbar must render navtop class')

// LeftNav 重构为 rail 图标条：hover 文案改用原生 aria-label，不再用独立 hover-label DOM
const leftNav = read('src/components/layout/LeftNav.tsx')
assert.match(leftNav, /aria-label={label}/, 'LeftNav rail buttons must expose an accessible label')
assert.match(layout1, /\.rail-btn\s*\{[\s\S]*transition:\s*background\s+var\(--transition-fast\)/, 'rail buttons must use the fast transition token')
assert.match(layout1, /\.rail-btn\s*\{[\s\S]*border-radius:\s*var\(--rail-btn-radius\)/, 'rail buttons must use the rail radius token')

const statusBar = read('src/components/layout/StatusBar.tsx')
assert.match(statusBar, /statusbar-collapse/, 'StatusBar must render a collapse control')
assert.doesNotMatch(statusBar, /statusbar-center/, 'center outline/preview/style pills must move to footer')
const editorStore = read('src/store/editorStore.ts')
assert.match(editorStore, /statusbarCollapsed/, 'store must persist statusbarCollapsed')

const footer = read('src/components/layout/Footer.tsx')
assert.match(layout1, /\.app-footer\s*\{[\s\S]*height:\s*58px/, 'footer must be 58px tall')
assert.match(footer, /懒猫编辑器/, 'footer must show brand name')
assert.match(footer, /https:\/\/lazycat\.cloud\//, 'footer must link to lazycat.cloud')
assert.match(footer, /Powered by\s*<a[^>]*>LightOS<\/a>/, 'footer must credit LightOS')
const app = read('src/App.tsx')
assert.match(app, /<Footer/, 'App must render Footer')
assert.match(app, /<StatusBar/, 'App must render StatusBar')

console.log('theme boundary checks passed')
