import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/welcome-screen.css', import.meta.url), 'utf8')
const tsx = readFileSync(new URL('../src/components/layout/WelcomeScreen.tsx', import.meta.url), 'utf8')

assert.doesNotMatch(css, /\.welcome-icon\s*\{[^}]*box-shadow/, 'welcome-icon 不应再有外框投影')
assert.doesNotMatch(css, /\.welcome-icon-inner/, 'welcome-icon-inner 不应保留')
assert.doesNotMatch(tsx, /welcome-icon-inner/, 'WelcomeScreen 标记中不应有内嵌方块')
assert.match(tsx, /className="welcome-icon-logo"/, 'logo 直接展示')
console.log('welcome icon structure ok')
