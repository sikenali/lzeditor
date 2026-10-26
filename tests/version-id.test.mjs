import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 历史面板「版本 #N」编号错乱、React key 撞车的根因：
// 快照 id 原来直接用 Date.now()，防抖落盘一次可能连落多条，同一毫秒内 id 重复。
// versionId.ts 是无依赖纯模块，可以直接 import 做行为测试。
const { nextVersionId } = await import('../src/utils/versionId.ts')

test('连续快速取 id 不重复（防抖批量落盘场景）', () => {
  const ids = new Set()
  for (let i = 0; i < 200; i++) ids.add(nextVersionId())
  assert.equal(ids.size, 200, '200 次连续取用应产出 200 个互不相同的 id')
})

test('id 保持纯数字字符串，HistoryPanel 的 Number(id) 排序和短哈希继续成立', () => {
  for (let i = 0; i < 20; i++) {
    const id = nextVersionId()
    assert.equal(typeof id, 'string')
    assert.match(id, /^\d+$/)
    assert.equal(Number.isNaN(Number(id)), false)
    // HistoryPanel 用 parseInt(id,10).toString(16).slice(-6) 生成短哈希，不能出 NaN
    assert.notEqual(parseInt(id, 10).toString(16).slice(-6), '')
  }
})

test('id 单调递增，HistoryPanel 按 Number(b.id) - Number(a.id) 倒序即最新在前', () => {
  const a = Number(nextVersionId())
  const b = Number(nextVersionId())
  const c = Number(nextVersionId())
  assert.ok(a < b && b < c, `期望 ${a} < ${b} < ${c}`)
})

// 第二个修复靠结构断言锁住：CM6 卸载时把未防抖完的编辑兜底落盘。
// 行为测试跑不动这条链——editorStore 链式加载 ?raw 内容文件，node 解析不了
// （见 doc-persistence.test.mjs 的说明），只能锁源码形状。
test('CM6 卸载清理里必须调用 flushPendingEdit', () => {
  const cm6 = readFileSync(new URL('../src/components/editor/CM6Editor.tsx', import.meta.url), 'utf8')
  // 锚定卸载清理里那句清定时器，往后取一个窗口。两处陷阱：
  // clearTimeout 在 onChange 里也有一次（要先清再加定时器），所以用 lastIndexOf；
  // destroyCM6Editor 在 import 行也出现，所以不能拿它当锚点。
  const atClear = cm6.lastIndexOf('clearTimeout(saveTimerRef.current)')
  assert.ok(atClear !== -1, '卸载时应清除防抖定时器')
  const cleanup = cm6.slice(atClear, atClear + 500)
  const atFlush = cleanup.indexOf('flushPendingEdit()')
  assert.ok(atFlush !== -1, '卸载时应兜底落盘未防抖完的编辑')
  assert.ok(cleanup.indexOf('destroyCM6Editor(view)') !== -1, '卸载时应销毁编辑器实例')
})
