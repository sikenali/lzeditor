import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// G13 编辑器纸面 + G14 WYSIWYG contentWidth 接线
const themes = read('src/styles/themes.ts')
const milkdown = read('src/additional/milkdown/milkdown.css')
const milk = read('src/components/editor/MilkdownEditor.tsx')

assert.match(themes, /'--doc-bg':\s*'#faf6ee'/, 'parchment 纸面必须羊皮纸 #faf6ee（G13）')
assert.match(themes, /'--doc-bg':\s*'#1C1C1F'/, 'dark 纸面必须 #1C1C1F（G13）')
assert.match(milkdown, /\.textus-editor-shell \.milkdown\s*\{[^}]*background:\s*var\(--doc-bg\)/, '纸面必须涂 var(--doc-bg)（G13）')
assert.match(milk, /setProperty\("--document-width"/, 'MilkdownEditor 必须接线 contentWidth → --document-width（G14）')
