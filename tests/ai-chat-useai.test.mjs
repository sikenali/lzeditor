import { strict as assert } from 'node:assert'
import { test, beforeEach, afterEach } from 'node:test'
import { Window } from 'happy-dom'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// useAI 是 hook，必须在真 React 树里跑；window 要在 import settingsStore
// 之前装好（它模块顶层注册 beforeunload）。fetch 全局 mock，不打真网络。
// ─────────────────────────────────────────────────────────────────────────

const win = new Window()
globalThis.window = win.window
globalThis.document = win.document
globalThis.navigator = win.navigator ?? { userAgent: 'node', language: 'zh-CN' }
globalThis.localStorage = win.localStorage
globalThis.HTMLElement = win.HTMLElement
globalThis.Element = win.Element
globalThis.Node = win.Node
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { useAI } = await import('../src/hooks/useAI.ts')
const { useAIStore } = await import('../src/store/aiStore.ts')
const { useSettingsStore, DEFAULT_API_KEYS } = await import('../src/store/settingsStore.ts')
const { registerEditorFacade } = await import('../src/components/editor/facade/registry.ts')

const aiInitial = useAIStore.getState()
const settingsInitial = useSettingsStore.getState()
const realFetch = globalThis.fetch

let api = null
let root = null
let container = null

const tick = () => new Promise((r) => setTimeout(r, 0))

async function mountHook() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const Harness = () => { api = useAI(); return null }
  await act(async () => { root.render(React.createElement(Harness)) })
}

const enableKey = () => {
  useSettingsStore.setState({
    apiKeys: [{
      id: 'test-key', provider: 'OpenAI', model: 'gpt-4o', modelName: 'GPT-4o',
      key: 'sk-test', enabled: true, format: 'openai',
    }],
    selectedModelId: 'test-key',
  })
}

const noKey = () => {
  useSettingsStore.setState({
    apiKeys: DEFAULT_API_KEYS.map((k) => ({ ...k, key: '', enabled: false })),
    selectedModelId: 'anthropic-claude',
  })
}

/** 把若干文本 chunk 编成一条 SSE 响应（OpenAI 流式格式）。 */
const sseResponse = (chunks) => {
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    start(c) {
      for (const chunk of chunks) {
        c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`))
      }
      c.enqueue(enc.encode('data: [DONE]\n\n'))
      c.close()
    },
  })
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

/** 最小可用的 EditorFacade：只实现 apply/undo 会走到的读写方法。 */
const makeFacade = (text, selection = null) => {
  let content = text
  let revision = 1
  return {
    getText: () => content,
    getSelection: () => selection,
    getRevision: () => revision,
    replaceRange(from, to, next) {
      content = content.slice(0, from) + next + content.slice(to)
      revision++
    },
    insertText(next, anchor, expectedRevision) {
      if (expectedRevision !== undefined && expectedRevision !== revision) throw new RangeError('stale revision')
      const from = anchor ? anchor.from : content.length
      const to = anchor ? anchor.to : from
      content = content.slice(0, from) + next + content.slice(to)
      revision++
    },
  }
}

beforeEach(() => {
  useAIStore.setState(aiInitial, true)
  useSettingsStore.setState(settingsInitial, true)
  registerEditorFacade(null)
})

afterEach(async () => {
  if (root) {
    await act(async () => { root.unmount() })
    container?.remove()
    root = null
    container = null
    api = null
  }
  globalThis.fetch = realFetch
  registerEditorFacade(null)
})

// ════════════════════════ 发送 ════════════════════════

test('无 API Key：只追加一条 assistant error，不追加 user 消息', async () => {
  noKey()
  await mountHook()

  await act(async () => { await api.send('hello') })

  const { messages } = useAIStore.getState()
  assert.equal(messages.length, 1, '无 Key 时只允许出现一条错误卡片')
  const [m] = messages
  assert.equal(m.role, 'assistant')
  assert.equal(m.status, 'error')
  assert.equal(m.error, '请先在设置中配置 API Key')
  assert.equal(m.mode, 'write')
  assert.ok(messages.every((x) => x.role !== 'user'), '失败请求不能留下 user 消息')
})

test('有 Key：先追加 user，再追加 streaming assistant，chunk 增量累积，完成后 done', async () => {
  enableKey()
  let atFetch = null
  globalThis.fetch = async () => {
    // fetch 发出时两条消息必须都已就位，assistant 处于 streaming 且内容为空。
    atFetch = useAIStore.getState().messages.map((m) => ({ ...m }))
    return sseResponse(['你', '好'])
  }
  await mountHook()

  await act(async () => { await api.send('hello', 'rewrite') })

  assert.equal(atFetch.length, 2, '发请求前必须已有 user + assistant 两条消息')
  assert.equal(atFetch[0].role, 'user')
  assert.equal(atFetch[0].content, 'hello')
  assert.equal(atFetch[0].mode, 'write')
  assert.equal(atFetch[1].role, 'assistant')
  assert.equal(atFetch[1].status, 'streaming')
  assert.equal(atFetch[1].content, '')
  assert.equal(atFetch[1].action, 'rewrite')

  const { messages } = useAIStore.getState()
  assert.equal(messages.length, 2)
  assert.equal(messages[1].content, '你好', '两个 chunk 必须按序追加到同一条 assistant 消息')
  assert.equal(messages[1].status, 'done')
})

test('send(input, action) 用 store 里的选区作为上下文，并同步 panelStatus', async () => {
  enableKey()
  let body = null
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(init.body)
    return sseResponse(['改写结果'])
  }
  await mountHook()
  useAIStore.setState({ panelSelectedText: '待改写文本' })

  await act(async () => { await api.send('更正式一些', 'rewrite') })

  const prompt = body.messages[0].content
  assert.match(prompt, /待改写文本/, '选中的文本必须进入 prompt')
  assert.match(prompt, /更正式一些/, '输入框内容必须进入 prompt')

  const st = useAIStore.getState()
  assert.equal(st.panelStatus, 'result')
  assert.equal(st.messages.length, 2, '新形态调用也要进入聊天消息流')
  assert.equal(st.messages[1].content, '改写结果')
  assert.equal(st.messages[1].action, 'rewrite')
})

// ════════════════════════ 应用 / 撤销 ════════════════════════

test('applyToDoc：作用于最后一条 done assistant，登记撤销记录并标记 applied', async () => {
  await mountHook()
  const facade = makeFacade('原文', { from: 0, to: 2 })
  registerEditorFacade(facade)
  useAIStore.getState().addMessage({
    id: 'a1', role: 'assistant', content: '改写结果', mode: 'write', action: 'rewrite', status: 'done',
  })

  await act(async () => { api.applyToDoc() })

  const st = useAIStore.getState()
  const msg = st.messages.find((m) => m.id === 'a1')
  assert.equal(msg.applied, true)
  assert.equal(msg.status, 'applied')
  assert.ok(msg.applyRecord, '必须把撤销记录挂回消息，undo 才能定位')
  const record = st.getUndoRecord()
  assert.ok(record, 'apply 后必须登记撤销记录')
  assert.equal(record.newText, '改写结果')
  assert.equal(facade.getText(), '改写结果', '内容必须真的写进文档')
})

test('已 applied 再 applyToDoc 无操作：不二次写入、记录数不变', async () => {
  await mountHook()
  const facade = makeFacade('原文', { from: 0, to: 2 })
  registerEditorFacade(facade)
  useAIStore.getState().addMessage({
    id: 'a1', role: 'assistant', content: '改写结果', mode: 'write', action: 'rewrite', status: 'done',
  })

  await act(async () => { api.applyToDoc() })
  const historyLen = useAIStore.getState().applyHistory.length
  const textAfterFirst = facade.getText()

  await act(async () => { api.applyToDoc() })

  assert.equal(useAIStore.getState().applyHistory.length, historyLen, '重复应用不能新增撤销记录')
  assert.equal(facade.getText(), textAfterFirst, '重复应用不能二次插入内容')
  assert.equal(useAIStore.getState().messages[0].status, 'applied')
})

test('undo：回滚文档并把消息恢复成 done / 未 applied', async () => {
  await mountHook()
  const facade = makeFacade('原文', { from: 0, to: 2 })
  registerEditorFacade(facade)
  useAIStore.getState().addMessage({
    id: 'a1', role: 'assistant', content: '改写结果', mode: 'write', action: 'rewrite', status: 'done',
  })

  await act(async () => { api.applyToDoc() })
  await act(async () => { api.undo() })

  assert.equal(facade.getText(), '原文', '撤销必须把原文本写回')
  assert.equal(useAIStore.getState().getUndoRecord(), null, '撤销后记录必须出栈')
  const msg = useAIStore.getState().messages[0]
  assert.equal(msg.status, 'done')
  assert.equal(msg.applied, false)
  assert.equal(msg.applyRecord, undefined)
})

// ════════════════════════ 中断 ════════════════════════

test('流式中断且无内容：assistant 状态回 idle', async () => {
  enableKey()
  globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => {
      const err = new Error('Aborted')
      err.name = 'AbortError'
      reject(err)
    })
  })
  await mountHook()

  await act(async () => {
    const pending = api.send('hello', 'rewrite')
    await tick()
    api.stop()
    await pending
  })

  const assistant = useAIStore.getState().messages.find((m) => m.role === 'assistant')
  assert.ok(assistant, '中断前 assistant 卡片必须已存在')
  assert.equal(assistant.content, '')
  assert.equal(assistant.status, 'idle', '无内容的中断必须回到 idle，不能留 streaming')
})

// ════════════════════════ 归属门控 / 复制 / 错误 ════════════════════════

test('归属门控：apply 更旧的 done 消息时不二次插入、不登记撤销记录、不标记 applied', async () => {
  enableKey()
  const facade = makeFacade('原文', { from: 0, to: 2 })
  registerEditorFacade(facade)
  let call = 0
  globalThis.fetch = async () => {
    call++
    // 第一次：正常流式返回，内容已写入文档并 done。
    if (call === 1) return sseResponse(['结果A'])
    // 第二次：立即 abort（无任何 chunk）→ 该消息应回 idle，streamRef 归属变成它。
    const err = new Error('Aborted')
    err.name = 'AbortError'
    throw err
  }
  await mountHook()

  await act(async () => { await api.send('first', 'rewrite') })
  const msgA = useAIStore.getState().messages.find((m) => m.role === 'assistant')
  assert.equal(msgA.status, 'done')
  assert.equal(facade.getText(), '结果A', '第一条消息的内容必须已流式写入文档')

  await act(async () => { await api.send('second', 'rewrite') })
  const secondAssistant = useAIStore.getState().messages.filter((m) => m.role === 'assistant').at(-1)
  assert.equal(secondAssistant.status, 'idle', '无内容的 abort 必须回 idle')
  assert.notEqual(secondAssistant.id, msgA.id)

  const textBeforeApply = facade.getText()
  await act(async () => { api.applyToDoc() })

  const st = useAIStore.getState()
  assert.equal(facade.getText(), textBeforeApply, '更旧的 done 消息不得再次插入内容')
  assert.equal(st.getUndoRecord(), null, '归属不符时不得登记撤销记录')
  const a = st.messages.find((m) => m.id === msgA.id)
  assert.equal(a.status, 'done', '被门控拦下的消息状态不能变')
  assert.ok(!a.applied, '被门控拦下的消息不能被标记 applied')
  assert.equal(a.applyRecord, undefined)
})

test('copyOutput：复制最后一条 done/applied 的 assistant 内容；无可用消息时不调用', async () => {
  await mountHook()
  const writes = []
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: { writeText: async (t) => { writes.push(t) } },
    configurable: true,
    writable: true,
  })

  // 没有 done/applied 的 assistant 消息：不触碰剪贴板。
  useAIStore.getState().addMessage({
    id: 'err1', role: 'assistant', content: '不应复制', mode: 'write', status: 'error',
  })
  await act(async () => { api.copyOutput() })
  assert.equal(writes.length, 0, '没有可复制消息时不能调用 writeText')

  useAIStore.getState().addMessage({
    id: 's1', role: 'assistant', content: '仍是流式', mode: 'write', status: 'streaming',
  })
  await act(async () => { api.copyOutput() })
  assert.equal(writes.length, 0, 'streaming 消息不可复制')

  useAIStore.getState().addMessage({
    id: 'd1', role: 'assistant', content: '复制内容', mode: 'write', status: 'done',
  })
  await act(async () => { api.copyOutput() })
  assert.deepEqual(writes, ['复制内容'], '必须复制该 done 消息的 content')
})

test('非 abort 请求错误：assistant 置 error 并带错误信息，不崩溃', async () => {
  enableKey()
  globalThis.fetch = async () => { throw new Error('boom: 网关挂了') }
  await mountHook()

  await act(async () => { await api.send('hello', 'rewrite') })

  const st = useAIStore.getState()
  const assistant = st.messages.find((m) => m.role === 'assistant')
  assert.ok(assistant, '失败请求仍要留下错误卡片')
  assert.equal(assistant.status, 'error')
  assert.ok(assistant.error && assistant.error.includes('boom'), 'error 必须携带原始信息')
  assert.equal(st.panelStatus, 'error', '面板状态同步为 error')
  assert.equal(st.messages.find((m) => m.role === 'user')?.content, 'hello')
})
