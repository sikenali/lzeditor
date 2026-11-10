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

// 编辑器卸载时不再有 CM6 视图可销毁，改为锁住：CodeEditor 卸载必须把
// editorContentRef 重置为 null，避免切到历史/阅读模式后残留指向已卸载的
// 编辑容器（滚动同步 / 定位据此回退）。editorStore 链式加载 ?raw 内容文件，
// node 解析不了，只能锁源码形状。
test('CodeEditor 卸载必须重置 editorContentRef', () => {
  const code = readFileSync(new URL('../src/components/editor/CodeEditor.tsx', import.meta.url), 'utf8')
  assert.match(code, /setEditorContentRef\(null\)/, '卸载时应重置编辑容器引用')
})
