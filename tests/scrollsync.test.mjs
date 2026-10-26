import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import MarkdownIt from 'markdown-it'

const { FollowGuard, FOLLOW_MS } = await import('../src/hooks/scrollSync.ts')
const {
  DATA_LINE, DATA_END_LINE, annotateBlockLines, buildScrollMap, sourceLineOfClick,
} = await import('../src/utils/markdown/lines.ts')

const md = new MarkdownIt('commonmark')
const tokensOf = (src) => md.parse(src, {})

// ── FollowGuard ──────────────────────────────────────────────────────────

test('FollowGuard 主导期间另一侧的事件是回声，被忽略', () => {
  const g = new FollowGuard()
  assert.equal(g.shouldFollow('editor', 100), true, '第一次滚动就是真滚动')
  assert.equal(g.shouldFollow('preview', 110), false, '100ms 内另一侧的回声被吃掉')
  assert.equal(g.shouldFollow('editor', 110), true, '同一侧继续滚还是主导')
})

test('静默超过 FOLLOW_MS 之后另一侧可以重新主导', () => {
  const g = new FollowGuard()
  g.shouldFollow('editor', 0)
  assert.equal(g.shouldFollow('preview', FOLLOW_MS - 1), false, '窗口没关另一侧还是回声')
  assert.equal(g.shouldFollow('preview', FOLLOW_MS), true, '窗口关掉就可以主导')
})

test('lead 标记谁在主导，主导期内另一侧的回声被压掉', () => {
  const g = new FollowGuard()
  g.lead('editor', 50)
  assert.equal(g.shouldFollow('preview', 60), false, '它带回声的是另一侧')
  assert.equal(g.shouldFollow('preview', 151), true, '窗口关掉之后另一侧可以主导')
})

test('shouldFollow 成功会把主导窗口从那一刻往后推', () => {
  const g = new FollowGuard()
  g.shouldFollow('editor', 0)
  g.shouldFollow('editor', 60)
  assert.equal(g.shouldFollow('preview', 110), false, '从最近一次滚动起算 100ms')
  assert.equal(g.shouldFollow('preview', 161), true)
})

test('mute 期间两侧滚动都不跟随，reset 清掉全部状态', () => {
  const g = new FollowGuard()
  g.mute(0, 400)
  assert.equal(g.shouldFollow('editor', 100), false, '静音期内谁都不跟')
  assert.equal(g.shouldFollow('preview', 399), false)
  g.reset()
  assert.equal(g.shouldFollow('editor', 400), true, 'reset 之后立即恢复')
  g.mute(500, 100)
  g.mute(500, 300)
  assert.equal(g.shouldFollow('editor', 700), false, '取更长的静音窗口')
  assert.equal(g.shouldFollow('editor', 801), true)
})

// ── annotateBlockLines ───────────────────────────────────────────────────

test('annotateBlockLines 只给顶层块写行号，嵌套块不标', () => {
  const tokens = tokensOf('- 第一项\n  - 嵌套\n\n普通段落\n')
  annotateBlockLines(tokens)
  const marked = tokens.filter(t => t.attrIndex(DATA_LINE) >= 0)
  assert.equal(marked.length, 2, '只有 bullet_list_open 和 paragraph_open 两个顶层块')
  assert.deepEqual(marked.map(t => t.type), ['bullet_list_open', 'paragraph_open'])
  assert.equal(tokens.find(t => t.type === 'list_item_open')?.attrIndex(DATA_LINE), -1, '嵌套项不标')
})

test('data-line 是 0-based 起始行，data-end-line 是末行', () => {
  const tokens = tokensOf('标题\n\n正文第一行\n正文第二行\n')
  annotateBlockLines(tokens)
  const [h, p] = tokens.filter(t => t.type === 'heading_open' || t.type === 'paragraph_open')
  assert.equal(String(h.attrGet(DATA_LINE)), '0')
  assert.equal(String(h.attrGet(DATA_END_LINE)), '0')
  assert.equal(String(p.attrGet(DATA_LINE)), '2')
  assert.equal(String(p.attrGet(DATA_END_LINE)), '3')
})

test('行号只写一遍，不重复覆盖', () => {
  const tokens = tokensOf('# 标题\n')
  annotateBlockLines(tokens)
  annotateBlockLines(tokens)
  assert.equal(tokens[0].attrIndex(DATA_LINE), tokens[0].attrs.findIndex(a => a[0] === DATA_LINE))
  assert.equal(tokens[0].attrs.filter(a => a[0] === DATA_LINE).length, 1)
})

// ── buildScrollMap ──────────────────────────────────────────────────────

const block = (line, end, top, bottom) => ({
  hasAttribute: () => true,
  getAttribute: (k) => (k === DATA_LINE ? String(line) : k === DATA_END_LINE ? String(end) : null),
  getBoundingClientRect: () => ({ top, bottom }),
})
const containerOf = (children) => ({
  getBoundingClientRect: () => ({ top: 0 }),
  children,
})

test('buildScrollMap 两个方向的查表都单调，锚点处取整', () => {
  const map = buildScrollMap(containerOf([
    block(0, 1, 0, 40),
    block(2, 5, 40, 200),
  ]))
  assert.equal(map.blocks, 2)

  assert.equal(map.offsetForLine(0), 0)
  assert.equal(map.offsetForLine(2), 40)
  assert.equal(map.offsetForLine(6), 200)
  assert.equal(map.offsetForLine(4), 120, '两锚点之间线性插值')

  assert.equal(map.lineForOffset(0), 0)
  assert.equal(map.lineForOffset(40), 2)
  assert.equal(map.lineForOffset(200), 6)
  assert.equal(map.lineForOffset(120), 4)
})

test('超出两端收敛到表首表尾', () => {
  const map = buildScrollMap(containerOf([block(3, 5, 0, 40)]))
  assert.equal(map.offsetForLine(-1), 0)
  assert.equal(map.offsetForLine(0), 0)
  assert.equal(map.offsetForLine(99), 40)
  assert.equal(map.lineForOffset(-10), 3)
  assert.equal(map.lineForOffset(999), 6)
})

test('行号倒退的块（脚注类）被夹住，两个方向仍然单调', () => {
  const map = buildScrollMap(containerOf([
    block(0, 20, 0, 100),
    block(1, 1, 100, 140),
  ]))
  let prev = -1
  for (let line = 0; line <= 25; line++) {
    const offset = map.offsetForLine(line)
    assert.ok(offset >= prev - 1e-9, `offsetForLine(${line}) 倒退`)
    prev = offset
  }
  prev = -1
  for (let offset = 0; offset <= 140; offset++) {
    const line = map.lineForOffset(offset)
    assert.ok(line >= prev - 1e-9, `lineForOffset(${offset}) 倒退`)
    prev = line
  }
  assert.ok(map.offsetForLine(1) >= 0 && map.offsetForLine(1) <= 100, '倒退块落在前一个块的区间内')
})

test('不带 data-line 的孩子不是锚点，空容器返回空表', () => {
  const map = buildScrollMap(containerOf([block(0, 1, 0, 40)]))
  assert.equal(map.blocks, 1)
  const empty = buildScrollMap(containerOf([]))
  assert.equal(empty.blocks, 0)
  assert.equal(empty.offsetForLine(3), 0)
  assert.equal(empty.lineForOffset(3), 0)
})

// ── sourceLineOfClick ───────────────────────────────────────────────────
// 源码用 `target instanceof Element` 判类型，node 里没有这个全局，补一个空壳类
globalThis.Element ??= class Element {}
class FakeElement extends globalThis.Element {
  constructor(attrs = {}, { parent = null, ownAction = false } = {}) {
    super()
    this.attrs = attrs
    this.parentElement = parent
    this.ownAction = ownAction
  }
  getAttribute(k) {
    return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null
  }
  closest() {
    return this.ownAction ? this : null
  }
}
const el = (attrs, opts) => new FakeElement(attrs, opts)
const articleEl = (contains) => ({
  contains,
  ownerDocument: { getSelection: () => ({ isCollapsed: true, anchorNode: null, focusNode: null }) },
})
const click = (target, overrides = {}) => ({
  button: 0,
  detail: 1,
  defaultPrevented: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  target,
  ...overrides,
})

test('sourceLineOfClick 沿父链向上找最近的 data-line', () => {
  const outer = el({ 'data-line': '7' })
  const inner = el({}, { parent: outer })
  const article = articleEl((n) => n === inner || n === outer)
  assert.equal(sourceLineOfClick(click(inner), article), 7)
})

test('落在块本身时命中块自己的行号', () => {
  const self = el({ 'data-line': '3', 'data-end-line': '4' })
  const article = articleEl((n) => n === self)
  assert.equal(sourceLineOfClick(click(self), article), 3)
})

test('其它意图的点击不跳转：非主键、双击、修饰键、已有 handler、点在链接上', () => {
  const target = el({ 'data-line': '3' })
  const article = articleEl((n) => n === target)
  assert.equal(sourceLineOfClick(click(target, { button: 2 }), article), null, '右键')
  assert.equal(sourceLineOfClick(click(target, { detail: 2 }), article), null, '双击')
  assert.equal(sourceLineOfClick(click(target, { metaKey: true }), article), null, '带修饰键')
  assert.equal(sourceLineOfClick(click(target, { defaultPrevented: true }), article), null, '已被拦截')
  const link = el({ 'data-line': '3' }, { ownAction: true })
  assert.equal(sourceLineOfClick(click(link), articleEl((n) => n === link)), null, '点在链接上')
})

test('点在外面或没有行号标注时返回 null', () => {
  const outside = el({ 'data-line': '3' })
  assert.equal(sourceLineOfClick(click(outside), articleEl(() => false)), null, '不在文章内')
  const plain = el({})
  assert.equal(sourceLineOfClick(click(plain), articleEl((n) => n === plain)), null, '没有标注')
  const bad = el({ 'data-line': '2.5' })
  assert.equal(sourceLineOfClick(click(bad), articleEl((n) => n === bad)), null, '非整数行号')
  assert.equal(sourceLineOfClick(click(bad, { target: null }), articleEl(() => true)), null, 'target 不是元素')
})
