import { strict as assert } from 'node:assert'
import { test, afterEach } from 'node:test'
import { Window } from 'happy-dom'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// 聊天式 AI 面板渲染测试
//
// 面板不是纯结构组件：模式标签要真的切换 placeholder、assistant 回复要真的
// 走 Markdown 渲染、操作行要真的出现。只有真渲染才能证明这些。
//
// happy-dom 在 <textarea> 上派发事件到不了 React 合成处理器（见
// ui-interactions.test.mjs 的说明），所以点击一律派发到 <button>。
// ─────────────────────────────────────────────────────────────────────────

const win = new Window()
globalThis.window = win.window
globalThis.document = win.document
globalThis.navigator = win.navigator ?? { userAgent: 'node', language: 'zh-CN' }
globalThis.HTMLInputElement = win.HTMLInputElement
globalThis.HTMLElement = win.HTMLElement
globalThis.Element = win.Element
globalThis.Node = win.Node
globalThis.MouseEvent = win.MouseEvent
globalThis.KeyboardEvent = win.KeyboardEvent
globalThis.Event = win.Event
globalThis.localStorage = win.localStorage
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { useAIStore } = await import('../src/store/aiStore.ts')
const { AI_MODES, AI_MODE_ORDER } = await import('../src/shared/aiModes.ts')
const { AIPanel } = await import('../src/components/editor/AIPanel.tsx')

const roots = []

async function render(node) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => { root.render(node) })
  roots.push(root)
  return container
}

const click = (node) => act(() => {
  node.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }))
})

afterEach(async () => {
  while (roots.length) {
    const root = roots.pop()
    await act(async () => { root.unmount() })
  }
  document.body.innerHTML = ''
})

function seedChat() {
  useAIStore.setState({
    panelVisible: true,
    mode: 'write',
    panelInput: '',
    panelSelectedText: '',
    panelStatus: 'result',
    messages: [
      { id: 'u1', role: 'user', content: '帮我把这段写得更简洁', mode: 'write' },
      {
        id: 'a1',
        role: 'assistant',
        content: '第一段普通文字。\n\n**加粗** 的第二段回复。',
        mode: 'write',
        action: 'rewrite',
        status: 'done',
      },
    ],
  })
}

test('渲染 4 个模式标签，当前 mode 高亮', async () => {
  seedChat()
  const container = await render(React.createElement(AIPanel))

  const tabs = [...container.querySelectorAll('.ai-chat-mode')]
  assert.equal(tabs.length, 4, '必须渲染 4 个模式标签')
  assert.deepEqual(
    tabs.map((t) => t.textContent.trim()),
    AI_MODE_ORDER.map((m) => AI_MODES[m].label),
    '模式标签顺序与文案必须来自 AI_MODE_ORDER / AI_MODES',
  )

  const active = tabs.filter((t) => t.classList.contains('active'))
  assert.equal(active.length, 1, '只有当前 mode 一个标签高亮')
  assert.equal(active[0].textContent.trim(), AI_MODES.write.label, '初始 mode=write 必须高亮「写作」')
})

test('消息列表含 user 气泡与 assistant 卡片，卡片带应用/撤销/复制', async () => {
  seedChat()
  const container = await render(React.createElement(AIPanel))

  const bubble = container.querySelector('.ai-chat-user-bubble')
  assert.ok(bubble, '必须有用户气泡')
  assert.match(bubble.textContent, /帮我把这段写得更简洁/)
  assert.match(bubble.textContent, /写作/, '用户气泡要带 mode 标签')

  const card = container.querySelector('.ai-chat-assistant-card')
  assert.ok(card, '必须有 assistant 卡片')

  const actions = [...card.querySelectorAll('.ai-chat-actions button')].map((b) => b.textContent.trim())
  assert.deepEqual(actions, ['应用到文档', '撤销', '复制'], 'done 卡片必须有三个操作按钮')
})

test('点击模式「审校」后 placeholder 变为该模式 hint', async () => {
  seedChat()
  const container = await render(React.createElement(AIPanel))

  const textarea = container.querySelector('.ai-chat-input')
  assert.equal(textarea.getAttribute('placeholder'), AI_MODES.write.hint, '初始 placeholder 用 write 的 hint')

  const review = [...container.querySelectorAll('.ai-chat-mode')]
    .find((t) => t.textContent.trim() === AI_MODES.review.label)
  assert.ok(review, '必须有「审校」模式标签')
  await click(review)

  assert.equal(
    container.querySelector('.ai-chat-input').getAttribute('placeholder'),
    AI_MODES.review.hint,
    '切换模式下 placeholder 必须跟着变',
  )
  assert.equal(useAIStore.getState().mode, 'review', 'setMode 必须写回 store')
  assert.ok(review.classList.contains('active'), '被点的标签必须高亮')
})

test('assistant 回复用 mdToHtml 渲染成 HTML', async () => {
  seedChat()
  const container = await render(React.createElement(AIPanel))

  const reply = container.querySelector('.ai-chat-assistant-card .ai-chat-reply')
  assert.ok(reply, 'assistant 卡片必须有 Markdown 回复容器')
  assert.match(reply.innerHTML, /<p>/, '必须渲染出段落元素')
  assert.match(reply.innerHTML, /<strong>加粗<\/strong>/, 'Markdown 加粗必须渲染成 <strong>')
  assert.doesNotMatch(reply.textContent, /\*\*/, '回复不能停留在未解析的 Markdown 原文')})

test('快速动作行含 6 个动作', async () => {
  seedChat()
  const container = await render(React.createElement(AIPanel))

  const chips = [...container.querySelectorAll('.ai-chat-quick .ai-chat-quick-chip')]
  assert.deepEqual(
    chips.map((c) => c.textContent.trim()),
    ['改写', '润色', '续写', '摘要', '翻译', '提问'],
    '快速动作行必须保留现有 6 个动作',
  )
})
