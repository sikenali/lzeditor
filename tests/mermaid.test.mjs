import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Window } from 'happy-dom'

// mermaid 真实渲染在 happy-dom 下跑不了：CSSStyleSheet 缺失，补上后返回长度为 0
// 的空 svg（happy-dom 的 SVG 序列化不完整）。两者都已实测。
// 所以这里注入一个假渲染器，只测块发现、替换、幂等和失败回退；
// 浏览器真渲染走手工验收。
const win = new Window()
globalThis.window = win.window
globalThis.document = win.document
globalThis.navigator = win.navigator

const { collectMermaidJobs, renderMermaidBlocks, _setMermaidForTest } =
  await import('../src/utils/markdown/mermaid.ts')

const SRC = 'flowchart LR\n  A --> B'

function makeDom(withDone = false) {
  const root = win.document.createElement('div')
  root.innerHTML =
    '<p>前置段落</p>\n' +
    `<pre><code class="hljs language-mermaid">${SRC.replace(/&/g, '&amp;').replace(/>/g, '&gt;')}</code></pre>\n` +
    '<p>结尾段落</p>\n'
  if (withDone) {
    const done = win.document.createElement('div')
    done.className = 'mermaid-diagram'
    done.setAttribute('data-mermaid-src', SRC)
    done.innerHTML = '<svg>旧</svg>'
    root.insertBefore(done, root.firstChild)
  }
  return root
}

const okRenderer = {
  initialize: () => {},
  render: async (_id, src) => ({ svg: `<svg data-src="${src.replace(/"/g, '&quot;')}"></svg>` }),
}

test('发现 <pre><code class="language-mermaid">，源码从 textContent 保真取出', () => {
  const jobs = collectMermaidJobs(makeDom())
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].kind, 'fresh')
  assert.equal(jobs[0].src, SRC)
  assert.ok(jobs[0].holder.tagName === 'PRE')
})

test('已渲染的块靠 data-mermaid-src 发现，供换主题重渲', () => {
  const jobs = collectMermaidJobs(makeDom(true))
  assert.equal(jobs.length, 2)
  const done = jobs.find(j => j.kind === 'done')
  assert.equal(done.src, SRC)
  assert.equal(done.holder.getAttribute('class'), 'mermaid-diagram')
})

test('渲染后 <pre> 被换成 .mermaid-diagram，svg 写入', async () => {
  _setMermaidForTest(okRenderer)
  try {
    const root = makeDom()
    await renderMermaidBlocks(root)
    assert.equal(root.querySelector('pre'), null)
    assert.equal(root.querySelector('.mermaid-diagram svg'), root.querySelector('svg'))
    assert.equal(root.querySelector('.mermaid-diagram').getAttribute('data-mermaid-src'), SRC)
  } finally {
    _setMermaidForTest(null)
  }
})

test('前后段落不受影响', async () => {
  _setMermaidForTest(okRenderer)
  try {
    const root = makeDom()
    await renderMermaidBlocks(root)
    assert.equal(root.querySelectorAll('p').length, 2)
    assert.equal(root.querySelector('p').textContent, '前置段落')
  } finally {
    _setMermaidForTest(null)
  }
})

test('渲染失败保留源码，不静默吞掉', async () => {
  _setMermaidForTest({
    initialize: () => {},
    render: async () => { throw new Error('语法错误') },
  })
  try {
    const root = makeDom()
    await renderMermaidBlocks(root)
    assert.equal(root.querySelector('.mermaid-error'), root.querySelector('.mermaid-diagram'))
    assert.equal(root.querySelector('.mermaid-error code').textContent, SRC)
  } finally {
    _setMermaidForTest(null)
  }
})

test('已失败的块不反复重试', async () => {
  _setMermaidForTest({
    initialize: () => {},
    render: async () => { throw new Error('语法错误') },
  })
  try {
    const root = makeDom()
    await renderMermaidBlocks(root)
    await renderMermaidBlocks(root)
    assert.equal(collectMermaidJobs(root).length, 0)
  } finally {
    _setMermaidForTest(null)
  }
})

test('空容器直接返回，不加载 mermaid', async () => {
  let loaded = false
  _setMermaidForTest({ initialize: () => {}, render: async () => { loaded = true; return { svg: '' } } })
  try {
    await renderMermaidBlocks(win.document.createElement('div'))
    assert.equal(loaded, false)
  } finally {
    _setMermaidForTest(null)
  }
})
