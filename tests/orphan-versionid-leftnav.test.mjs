import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'

// 冗余清理：versionId.ts 生产零引用（仅被 tests/version-id.test.mjs 引用，而它自身
// 是被删的 pendingSave.ts 的助手）；ImportButtons 的 leftNav 死导出（LibraryPanel 自带）。
const f = (p) => new URL(`../${p}`, import.meta.url)

// ── versionId.ts 必须删除（孤儿：addVersion 无调用方，生产零引用）──
assert.equal(existsSync(f('src/utils/versionId.ts')), false, 'src/utils/versionId.ts 必须删除（生产零引用）')
assert.equal(existsSync(f('tests/version-id.test.mjs')), false, 'tests/version-id.test.mjs 必须删除（随孤儿模块）')

// ── ImportButtons 不得再导出 leftNav（LibraryPanel 自带，无人 import）──
const buttons = readFileSync(f('src/components/panels/ImportButtons.tsx'), 'utf8')
assert.ok(!/export const leftNav/.test(buttons), 'ImportButtons 不得导出 leftNav 死代码（无人 import）')

console.log('orphan versionId + leftNav removed ok')
