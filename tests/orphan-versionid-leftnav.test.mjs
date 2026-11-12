import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 冗余清理（历史功能重启前）：ImportButtons 的 leftNav 死导出（LibraryPanel 自带）。
// 注：versionId.ts 曾作为孤儿被删（c933433），历史功能（2026-11-12）已恢复它并
// 给 addVersion 接上真实调用方，故不再断言「必须删除」。
const f = (p) => new URL(`../${p}`, import.meta.url)

// ── ImportButtons 不得再导出 leftNav（LibraryPanel 自带，无人 import）──
const buttons = readFileSync(f('src/components/panels/ImportButtons.tsx'), 'utf8')
assert.ok(!/export const leftNav/.test(buttons), 'ImportButtons 不得导出 leftNav 死代码（无人 import）')

console.log('leftNav removed ok')
