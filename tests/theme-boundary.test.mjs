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
assert.match(layout1, /\.navtop\s*\{[\s\S]*height:\s*72px/, 'navtop must be 72px tall')
assert.match(read('src/components/layout/Toolbar.tsx'), /navtop/, 'Toolbar must render navtop class')

const leftNav = read('src/components/layout/LeftNav.tsx')
assert.match(leftNav, /left-nav-hover-label/, 'LeftNav must render hover label element')
assert.match(layout1, /\.left-nav-hover-label\s*\{[\s\S]*box-shadow:\s*var\(--shadow-md\)/, 'hover label must use shadow-md')
assert.match(layout1, /\.left-nav-sep\s*\{[\s\S]*margin/, 'nav groups must have visual spacing')

console.log('theme boundary checks passed')
