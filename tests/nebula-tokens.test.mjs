import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const tokens = read('src/styles/tokens.css')

// ── 新增 Nebula token 必须存在（Task 2）──
for (const t of ['--tech-cyan:', '--tech-cyan-rgb:', '--glow-xs:', '--glow-sm:', '--glow-md:', '--glow-lg:', '--btn-shadow:', '--font-display:', '--t-snap:', '--ease-spring:']) {
  assert.match(tokens, new RegExp(t), `Missing token ${t}`)
}

// ── 电光青 token 值 ──
assert.match(tokens, /--tech-cyan:\s*#00D4AA/, 'tech-cyan 必须 #00D4AA')
assert.match(tokens, /--tech-cyan-rgb:\s*0,\s*212,\s*170/, 'tech-cyan-rgb 必须 0,212,170')

// ── 显示字体（Space Grotesk 已自托管，仅接线）──
assert.match(tokens, /--font-display:\s*'Space Grotesk'/, 'font-display 必须 Space Grotesk')

// ── 动效收紧：snap80/fast120/base180/slow280 ──
assert.match(tokens, /--t-snap:\s*80ms/, 't-snap 必须 80ms')
assert.match(tokens, /--t-fast:\s*120ms/, 't-fast 必须 120ms')
assert.match(tokens, /--t-base:\s*180ms/, 't-base 必须 180ms')
assert.match(tokens, /--t-slow:\s*280ms/, 't-slow 必须 280ms')

// ── glow 体系引用 tech-cyan-rgb ──
assert.match(tokens, /--glow-sm:\s*0 4px 20px rgba\(var\(--tech-cyan-rgb\),\s*0\.12\)/, 'glow-sm 必须引用 tech-cyan-rgb')

// ── 评审 Important #3：焦点环必须 Nebula 电光青（替代系统蓝 #007AFF，设计 §3.5）──
const themes = read('src/styles/themes.ts')
assert.match(tokens, /--color-focus-ring:\s*rgba\(var\(--tech-cyan-rgb\),\s*0\.4\)/, 'tokens.css 焦点环必须 Nebula 电光青')
assert.equal((themes.match(/'--color-focus-ring':\s*'rgba\(var\(--tech-cyan-rgb\),\s*0\.4\)'/g) || []).length, 2, 'themes.ts 浅/深焦点环都必须 Nebula 电光青')

console.log('nebula tokens ok')
