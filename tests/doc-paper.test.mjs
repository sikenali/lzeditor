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
// 级联感知（评审 Important #1）：vendored content-themes.css 的 [data-content-theme="paper"]
// 只认 shell 上的 data-theme 或 OS prefers-color-scheme。壳必须镜像 app data-theme 并钉死
// --doc-bg inline（覆盖 vendored 暗纸 #1f1b16），否则暗色纸面跟 OS 走、plan 的 #1C1C1F 永不生效。
assert.match(milk, /setAttribute\("data-theme"/, 'MilkdownEditor 壳必须镜像 app data-theme，纸面才跟 app 主题（G13）')
assert.match(milk, /setProperty\("--doc-bg"/, 'MilkdownEditor 壳必须钉死 --doc-bg inline，暗纸才命中 #1C1C1F（G13）')
