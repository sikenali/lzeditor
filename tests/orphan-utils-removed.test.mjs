import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

// src/utils/pendingSave.ts（65 行）与 src/utils/split.ts（38 行）生产零引用：
// 仅被测试引用（doc-persistence 文本断言 / split.test 直接 import），
// editorStore 改版后遗留。确认无生产消费后删除。
const f = (p) => new URL(`../src/utils/${p}`, import.meta.url)

assert.equal(existsSync(f('pendingSave.ts')), false, 'pendingSave.ts 必须删除（生产零引用，仅测试断言）')
assert.equal(existsSync(f('split.ts')), false, 'split.ts 必须删除（生产零引用，仅测试 import）')

console.log('orphan utils removed ok')
