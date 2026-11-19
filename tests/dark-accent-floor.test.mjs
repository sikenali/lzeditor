import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 深色强调色地板：DESIGN.md §1/§7 要求深色下强调色相对背景对比度 ≥ 4.5:1，
// 亮度地板约为 #E05050。当前 useTheme 的 DARK_ACCENT_BOOST 只提亮两个红色，
// 鎏金/玉绿/云蓝/黛墨在深色下直接写暗色——黛墨 #2F3640 对 #17171A 仅 ~1.5:1。
// 修复：通用深色提亮（保色相、升亮度至地板），覆盖所有预设与自定义色。
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const theme = read('src/hooks/useTheme.ts')

// ── 必须保留 DARK_ACCENT_BOOST 的提亮语义但不再只限两红 ──
assert.match(theme, /DARK_ACCENT_BOOST/, 'useTheme 必须保留深色提亮')
assert.match(theme, /ensureDarkAccent|lightenToFloor|darkAccentBoost/i, '必须用通用深色提亮（保色相、升亮度）')

// ── 必须能保持色相提亮（HSL 转换工具）──
assert.match(theme, /hexToHsl|relativeLuminance|hslToHex/, '必须实现 HSL/亮度转换（保色相提亮而非混白褪色）')

// ── 深色分支必须调用通用提亮而非只查两个红色的映射 ──
assert.match(theme, /type === 'dark'[\s\S]{0,400}ensureDarkAccent/, '深色分支必须调用通用提亮函数')

// ── 评审 Critical #1 回归：深色下仅真命中 Nebula 预设（id/色值）才用 dark 变体；
//    自定义 hex / 旧 id 落回默认时，必须走 ensureDarkAccent 保色相提亮，不得被预设吞掉 ──
assert.match(theme, /resolveAccentPreset/, '必须实现「仅真预设命中」判定')
assert.match(theme, /accentPreset\s*\?\s*accentPreset\.dark/, '深色下仅真预设用 dark 变体')
assert.match(theme, /ensureDarkAccent\(hex\)/, '自定义 hex 必须走保色相提亮')

console.log('dark accent floor ok')
