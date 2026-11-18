import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = p => readFileSync(new URL(`../src/vendor/acks/engine/${p}`, import.meta.url), 'utf8')
// package.json 无 "type":"module"，node 默认把 .js 当 CJS；测试用 read+eval 按序加载（等价 ACKS build 产物）
eval(read('theme-core.js'))
eval(read('theme-revision.js'))
eval(read('theme-catalog.generated.js'))
eval(read('theme-render.js'))
const MD = globalThis.MD
const RENDER = globalThis.ACKS_RENDER
assert.equal(MD.CATALOG_VERSION, 3, 'catalog version 应为 3')
assert.equal(Object.keys(MD.THEMES).length, 43, '必须正好 43 款主题')
const ms = Object.values(MD.THEMES).filter(t => t.milestoneKey)
assert.equal(ms.length, 24, 'Milestone 应为 24 款')
assert.equal(Object.keys(MD.THEMES).filter(id => !MD.THEMES[id].milestoneKey).length, 19, 'ACKS 应为 19 款')
for (const id of ['graphite','gold','milestone-clean-light','milestone-cnvertical-dark']) {
  assert.ok(MD.THEMES[id], `缺主题 ${id}`)
}
assert.equal(typeof MD.decoSVG, 'function', 'decoSVG 可用')
for (const fn of ['paintTokens','applyDesignAttrs','applyDecorations','applyLayout']) {
  assert.equal(typeof RENDER[fn], 'function', `ACKS_RENDER.${fn} 缺失`)
}
