import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'

// 构建产物/垃圾（gitignore 忽略，非源码）：
// - server/core：46MB ELF 崩溃转储，非后端核心逻辑
// - lzc/*.lpk：历史 LPK 打包产物（~464MB）
// - lzc/_lpk_content、lzc/_runtime_cache：构建/运行缓存
// - electron/*.js、*.d.ts：tsc 编译产物，与 .ts 源并存
const root = new URL('..', import.meta.url)
const f = (p) => new URL(p, root)

// ── server/core 不得存在（core dump 垃圾）──
assert.equal(existsSync(f('server/core')), false, 'server/core 必须删除（46MB core dump）')

// ── lzc 下不得有 .lpk 历史包与缓存目录 ──
const lzc = f('lzc')
if (existsSync(lzc)) {
  const names = readdirSync(lzc)
  for (const n of names) {
    if (n.endsWith('.lpk')) assert.equal(false, true, `lzc/${n} 必须删除（历史 LPK 打包产物）`)
    if (n === '_lpk_content' || n === '_runtime_cache') assert.equal(false, true, `lzc/${n} 必须删除（构建缓存）`)
  }
}

// ── electron 下不得有编译产物 ──
for (const n of ['api', 'main', 'preload']) {
  for (const ext of ['.js', '.d.ts']) {
    assert.equal(existsSync(f(`electron/${n}${ext}`)), false, `electron/${n}${ext} 必须删除（tsc 编译产物，源为 .ts）`)
  }
}

console.log('build artifacts removed ok')
