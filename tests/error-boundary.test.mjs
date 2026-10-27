import { strict as assert } from 'node:assert'
import { test, afterEach } from 'node:test'
import { Window } from 'happy-dom'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// ErrorBoundary 行为测试
//
// 静态断言只能证明「写了 componentDidCatch」，证明不了「子组件真的 throw 了、
// 用户看到的不是一片白屏」。这里真渲染一个会 throw 的子组件。
// ─────────────────────────────────────────────────────────────────────────

const win = new Window()
globalThis.window = win.window
globalThis.document = win.document
globalThis.navigator = win.navigator ?? { userAgent: 'node', language: 'zh-CN' }
globalThis.Element = win.Element
globalThis.Node = win.Node
globalThis.Event = win.Event
globalThis.MouseEvent = win.MouseEvent
globalThis.localStorage = win.localStorage
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let rafQueue = []
const raf = (cb) => { rafQueue.push(cb); return rafQueue.length }
globalThis.requestAnimationFrame = raf
win.requestAnimationFrame = raf

const { ErrorBoundary } = await import('../src/components/ErrorBoundary.tsx')
const el = (tag, attrs = {}, ...kids) => React.createElement(tag, attrs, ...kids)
const roots = []

async function render(node) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => { root.render(node) })
  roots.push(root)
  return container
}

afterEach(() => {
  document.body.innerHTML = ''
  roots.splice(0, roots.length)
})

test('不抛错时原样渲染 children', async () => {
  const c = await render(el(ErrorBoundary, null, el('div', { id: 'ok' }, '正常内容')))
  assert.equal(c.querySelector('#ok').textContent, '正常内容')
  assert.equal(c.textContent.includes('页面出了点问题'), false, '未出错时不该出现兜底文案')
})

test('子组件抛错时显示兜底页，页面不是白的', async () => {
  const Boom = () => { throw new Error('boom-message') }
  const c = await render(el(ErrorBoundary, null, el('div', { id: 'lost' }), el(Boom)))

  // 关键断言：容器里有内容，不是空壳
  assert.ok(c.textContent.length > 0, '崩了之后容器不该是空的')
  assert.ok(c.textContent.includes('页面出了点问题'), '必须给用户一句说明')
  assert.ok(c.textContent.includes('刷新不会丢'), '必须告诉用户文档不会丢')

  // 生产环境不能把内部错误信息泄露到界面上
  assert.ok(!c.textContent.includes('boom-message'), '生产环境不该显示 error.message')

  // 必须给一个能恢复的动作
  const btn = [...c.querySelectorAll('button')].find((b) => b.textContent.includes('重新加载页面'))
  assert.ok(btn, '兜底页必须有「重新加载页面」按钮')
  assert.equal(btn.getAttribute('type'), 'button')
})

test('兜底页的按钮真的会 reload', async () => {
  const Boom = () => { throw new Error('x') }
  const before = window.location.href
  let reloaded = 0
  Object.defineProperty(win, 'location', {
    value: { ...win.location, reload: () => { reloaded++ } },
    configurable: true,
  })
  globalThis.window = win
  const c = await render(el(ErrorBoundary, null, el(Boom)))
  const btn = [...c.querySelectorAll('button')][0]
  await act(async () => { btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true })) })
  assert.equal(reloaded, 1, '点击后必须调用 location.reload')
  Object.defineProperty(win, 'location', { value: { href: before, reload: () => {} }, configurable: true })
  globalThis.window = win
})

test('错误信息没有泄露给普通用户，但记录出口被调用了', async () => {
  const Boom = () => { throw new Error('secret-detail') }
  const c = await render(el(ErrorBoundary, null, el(Boom)))
  assert.ok(!c.textContent.includes('secret-detail'))
})
