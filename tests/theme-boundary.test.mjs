import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const colorTokens = read('src/styles/color-tokens.css')
const layout = read('src/styles/layout.css')
const settings = read('src/components/panels/SettingsDialog.tsx')
const typography = read('src/styles/typography-themes.ts')

const block = (source, selector) => {
  const start = source.indexOf(selector)
  assert.notEqual(start, -1, `Missing selector ${selector}`)
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    if (source[i] === '}') depth -= 1
    if (depth === 0) return source.slice(open + 1, i)
  }
  throw new Error(`Unclosed block ${selector}`)
}

for (const token of [
  '--chrome-toolbar-bg',
  '--chrome-toolbar-hover-bg',
  '--chrome-toolbar-icon',
  '--chrome-toolbar-label',
  '--chrome-statusbar-bg',
  '--chrome-statusbar-text',
  '--chrome-statusbar-muted',
]) {
  assert.match(colorTokens, new RegExp(`${token}:`), `Missing ${token}`)
}

const darkRoot = block(colorTokens, ':root')
const lightRoot = block(colorTokens, '[data-theme="light"]')

assert.equal((darkRoot.match(/--statusbar-bg:/g) || []).length, 0, 'Dark root should not define legacy statusbar bg')
assert.equal((lightRoot.match(/--statusbar-bg:/g) || []).length, 0, 'Light theme should not define legacy statusbar bg')
assert.match(darkRoot, /--chrome-statusbar-bg:/, 'Dark root must define chrome statusbar bg')
assert.match(lightRoot, /--chrome-statusbar-bg:/, 'Light theme must define chrome statusbar bg')

const toolbarBlock = block(layout, '.toolbar')
const statusbarBlock = block(layout, '.statusbar')

assert.match(toolbarBlock, /background:\s*var\(--chrome-toolbar-bg\)/, 'Toolbar must use chrome background token')
assert.match(toolbarBlock, /border-bottom:\s*1px solid var\(--chrome-toolbar-border\)/, 'Toolbar must use chrome border token')
assert.match(statusbarBlock, /background:\s*var\(--chrome-statusbar-bg\)/, 'Statusbar must use chrome background token')
assert.match(statusbarBlock, /color:\s*var\(--chrome-statusbar-muted\)/, 'Statusbar must use chrome text token')

assert.match(settings, /界面主题/, 'Settings should separate app shell theme')
assert.match(settings, /内容样式/, 'Settings should separate document content style')
assert.match(settings, /不影响文档排版样式/, 'Theme mode copy should explain content styles are independent')

assert.doesNotMatch(typography, /\.toolbar|\.statusbar/, 'Typography themes must not target toolbar or statusbar')

console.log('theme boundary checks passed')
