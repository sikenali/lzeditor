import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Window } from 'happy-dom'

const { markersFromMarkdown, markersFromPreviewDom } = await import('../src/utils/railMarkers.ts')

const md = [
  '# 标题一',
  '',
  '## 标题二',
  '',
  '### 标题三',
  '',
  '> 一段引用',
  '',
  '![配图](a.png)',
  '',
  '| 列 | 列 |',
  '| --- | --- |',
  '| 值 | 值 |',
  '',
  '```ts',
  'const a = 1',
  'const b = 2',
  '```',
  '',
  '- 列表项一',
  '- 列表项二',
  '',
  '---',
  '',
  '普通段落',
].join('\n')

test('源码标记按块类型分类，标题层级不混淆', () => {
  const specs = markersFromMarkdown(md, 1000)
  const kinds = specs.map((s) => s.kind)
  assert.ok(kinds.includes('title'), 'H1 → title')
  assert.ok(kinds.includes('heading'), 'H2 → heading')
  assert.ok(kinds.includes('subheading'), 'H3 → subheading')
  assert.ok(kinds.includes('quote'), '引用')
  assert.ok(kinds.includes('image'), '图片')
  assert.ok(kinds.includes('table'), '表格只标一次')
  assert.ok(kinds.includes('code'), '代码围栏')
  assert.ok(kinds.includes('list'), '列表')
  assert.ok(kinds.includes('rule'), '分隔线')
  assert.ok(kinds.includes('paragraph'), '正文段落')
  assert.equal(specs.filter((s) => s.kind === 'table').length, 1, '同一张表只出现一个标记')
  assert.equal(specs.filter((s) => s.kind === 'list').length, 1, '同一列表只出现一个标记')
})

test('代码围栏内部的 # 与图片不产生标记', () => {
  const source = ['```md', '# 不是标题', '![不是图片](x.png)', '```'].join('\n')
  const specs = markersFromMarkdown(source, 500)
  assert.equal(specs.length, 1)
  assert.equal(specs[0].kind, 'code')
})

test('标记位置单调递增、落在内容范围内', () => {
  const specs = markersFromMarkdown(md, 1000)
  let prev = -1
  for (const spec of specs) {
    assert.ok(spec.top >= prev, '位置必须单调递增')
    assert.ok(spec.top >= 0 && spec.top <= 1000, '位置必须落在内容高度内')
    prev = spec.top
  }
})

test('空文档没有标记，超长文档有数量上限', () => {
  assert.deepEqual(markersFromMarkdown('', 800), [])
  const long = Array.from({ length: 900 }, (_, i) => `段落 ${i}`).join('\n\n')
  const specs = markersFromMarkdown(long, 5000)
  assert.ok(specs.length > 0)
  assert.ok(specs.length <= 600, '标记上限 600')
})

test('标签去掉 markdown 记号且截断', () => {
  const specs = markersFromMarkdown('## **加粗** `代码` 标题', 100)
  assert.equal(specs[0].label, '加粗 代码 标题')
  assert.ok(specs[0].label.length <= 28)
})

test('预览 DOM 标记按真实块位置测量', () => {
  const window = new Window()
  const document = window.document
  const scroller = document.createElement('div')
  const content = document.createElement('div')
  scroller.appendChild(content)
  document.body.appendChild(scroller)

  const blocks = [
    { tag: 'h1', text: '标题', top: 0, height: 30 },
    { tag: 'p', text: '正文', top: 60, height: 40 },
    { tag: 'div', text: '代码', top: 160, height: 200 },
    { tag: 'hr', text: '', top: 420, height: 1 },
  ]
  for (const block of blocks) {
    const el = document.createElement(block.tag)
    el.textContent = block.text
    if (block.tag === 'div') el.className = 'code-block-wrapper'
    el.getBoundingClientRect = () => ({
      top: block.top,
      bottom: block.top + block.height,
      height: block.height,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: block.top,
      toJSON: () => ({}),
    })
    content.appendChild(el)
  }
  // happy-dom 不做布局，scrollHeight / 滚动位置由测试固定
  Object.defineProperty(scroller, 'scrollHeight', { value: 800, configurable: true })
  scroller.scrollTop = 0
  scroller.getBoundingClientRect = () => ({
    top: 0, bottom: 0, height: 0, left: 0, right: 0, width: 0, x: 0, y: 0,
    toJSON: () => ({}),
  })

  const specs = markersFromPreviewDom(content, scroller)
  assert.deepEqual(specs.map((s) => s.kind), ['title', 'paragraph', 'code', 'rule'])
  assert.deepEqual(specs.map((s) => s.top), [0, 60, 160, 420])
})
