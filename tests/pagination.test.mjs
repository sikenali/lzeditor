import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { paginate, pageOfLine, spreadCount } from '../src/utils/pagination.ts'
import { tagToKind, isHeading } from '../src/utils/blockKind.ts'

let seq = 0
const mk = (h, kind = 'para', line = 0) => {
  const key = `k${seq}`
  seq += 1
  return { h, kind, line: line ?? seq - 1, key }
}
const reset = () => { seq = 0 }
const kinds = (pages) => pages.map(p => p.blocks.map(b => b.kind))
const keys = (pages) => pages.flatMap(p => p.blocks.map(b => b.key))
const lines = (pages) => pages.map(p => p.blocks.map(b => b.line))

// ── 装箱 ────────────────────────────────────────────────────────────────

test('按顺序装箱，不放就换页，块不丢不乱', () => {
  reset()
  const blocks = [mk(60), mk(40), mk(50), mk(40)]
  const pages = paginate(blocks, 100)
  assert.equal(pages.length, 2)
  assert.deepEqual(pages.map(p => p.height), [100, 90], '页高是槽位高之和')
  assert.deepEqual(keys(pages), blocks.map(b => b.key), '块顺序保持')
})

test('标题不做页尾孤行：连标题一起搬到下一页', () => {
  reset()
  const [a, h, p] = [mk(60), mk(30, 'heading'), mk(60)]
  const pages = paginate([a, h, p], 100)
  assert.deepEqual(kinds(pages), [['para'], ['heading', 'para']])
  assert.ok(!pages[0].blocks.some(b => b.kind === 'heading'), '第一页页尾没有标题')
})

test('标题与下一块合起来放不下时接受孤行，不另开空页', () => {
  reset()
  const pages = paginate([mk(60), mk(40, 'heading'), mk(70)], 100)
  assert.equal(pages.length, 2, '不因为搬不动标题而多出一页')
  assert.deepEqual(kinds(pages), [['para', 'heading'], ['para']])
})

test('紧跟一级标题时不搬：避免上一页只剩一个标题占满整页', () => {
  reset()
  const pages = paginate([mk(60), mk(30, 'heading'), mk(30, 'heading'), mk(60)], 100)
  assert.deepEqual(kinds(pages), [['para', 'heading'], ['heading', 'para']])
  assert.ok(pages.every(p => p.blocks.length > 1), '没有只放一个标题的页')
})

test('连续标题的孤行处理会收敛，不会无限后移', () => {
  reset()
  const pages = paginate([mk(60), mk(30, 'heading'), mk(30, 'heading'), mk(30, 'heading'), mk(60)], 100)
  assert.ok(pages.length >= 2 && pages.length <= 4, '页数在合理范围内')
  assert.equal(keys(pages).length, 5, '所有块都被分到某页')
})

test('单块超过页高时独占一页并标记 over', () => {
  reset()
  const pages = paginate([mk(150), mk(40)], 100)
  assert.equal(pages.length, 2)
  assert.deepEqual(pages.map(p => p.over), [true, false])
  assert.equal(pages[0].blocks.length, 1)
})

test('页高恰好整除时不产生多余空页', () => {
  reset()
  const pages = paginate([mk(50), mk(50), mk(50), mk(50)], 100)
  assert.equal(pages.length, 2)
  assert.deepEqual(pages.map(p => p.height), [100, 100])
})

// ── 边界 ────────────────────────────────────────────────────────────────

test('空数组、页高非正返回空页表', () => {
  assert.deepEqual(paginate([], 100), [])
  assert.deepEqual(paginate([{ h: 10, kind: 'para', line: 0, key: 'a' }], 0), [])
  assert.deepEqual(paginate([{ h: 10, kind: 'para', line: 0, key: 'a' }], -10), [])
  assert.deepEqual(paginate([{ h: 10, kind: 'para', line: 0, key: 'a' }], NaN), [])
})

test('块高非正按 1px 计，不产生零高页', () => {
  reset()
  const pages = paginate([mk(0), mk(0)], 100)
  assert.equal(pages.length, 1)
  assert.equal(pages[0].height, 2)
  assert.equal(pages[0].over, false)
})

test('单个块刚好等于页高时占满一页', () => {
  reset()
  const pages = paginate([mk(100)], 100)
  assert.deepEqual(pages.map(p => p.height), [100])
  assert.equal(pages[0].over, false)
})

// ── pageOfLine ──────────────────────────────────────────────────────────

test('pageOfLine 命中包含该行的页，取最早的一页', () => {
  reset()
  const pages = paginate([mk(60, 'para', 0), mk(40, 'para', 3), mk(50, 'para', 8), mk(40, 'para', 12)], 100)
  assert.deepEqual(lines(pages), [[0, 3], [8, 12]])
  assert.equal(pageOfLine(pages, 0), 0)
  assert.equal(pageOfLine(pages, 5), 0, '落在块内部也算这一页')
  assert.equal(pageOfLine(pages, 8), 1)
  assert.equal(pageOfLine(pages, 999), 1, '超出末尾收敛到最后一页')
})

test('pageOfLine 命中不了返回 null', () => {
  reset()
  const pages = paginate([mk(60, 'para', 5)], 100)
  assert.equal(pageOfLine(pages, 4), null, '早于首块')
  assert.equal(pageOfLine([], 3), null, '空页表')
  assert.equal(pageOfLine(pages, -1), null)
})

// ── 辅助 ────────────────────────────────────────────────────────────────

test('spreadCount 页数除以 2 向上取整', () => {
  assert.equal(spreadCount(0), 0)
  assert.equal(spreadCount(1), 1, '单页也是 1 页对')
  assert.equal(spreadCount(2), 1)
  assert.equal(spreadCount(3), 2)
  assert.equal(spreadCount(7), 4)
})

test('tagToKind 收录常见顶层标签，未收录的退化为 para', () => {
  assert.equal(tagToKind('H1'), 'heading')
  assert.equal(tagToKind('h2'), 'heading', '大小写不敏感')
  assert.equal(tagToKind('UL'), 'list')
  assert.equal(tagToKind('PRE'), 'code')
  assert.equal(tagToKind('TABLE'), 'table')
  assert.equal(tagToKind('BLOCKQUOTE'), 'quote')
  assert.equal(tagToKind('HR'), 'hr')
  assert.equal(tagToKind('FOOBAR'), 'para', '未收录退化为 para')
  assert.equal(isHeading('heading'), true)
  assert.equal(isHeading('para'), false)
})
