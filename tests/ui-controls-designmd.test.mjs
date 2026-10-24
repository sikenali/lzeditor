import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/ui.css', import.meta.url), 'utf8')

assert.match(css, /\.ui-input:focus-within[\s\S]{0,200}?box-shadow/, 'ui-input focus-within 必须有外发光（DESIGN.md §10.2）')
assert.match(css, /\.ui-select-trigger:focus[\s\S]{0,400}?box-shadow/, 'ui-select-trigger focus 必须有外发光')
console.log('ui controls conform to DESIGN.md')
