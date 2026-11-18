import { useState, useCallback, useRef } from 'react'
import { useAIStore } from '../store/aiStore'
import { useSettingsStore } from '../store/settingsStore'
import { getEditorFacade } from '../components/editor/facade/registry'
import type { EditorFacade } from '../components/editor/facade/EditorFacade'
import { parseMdOutline, outlineToMarkdownTree } from '../utils/mdOutline'
import { buildPrompt } from '../services/promptTemplate'
import { planApply, type AIStreamState } from './aiApply'
import { AI_MODES } from '../shared/aiModes'
import type { AIAction, ChatMessage } from '../shared/types'

/** Parse one SSE event block and append its text payload. */
const extractSSEText = (frame: string, acc: string): { acc: string; done: boolean } => {
  for (const rawLine of frame.split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (!payload) continue
    if (payload === '[DONE]') return { acc, done: true }
    try {
      const json = JSON.parse(payload)
      const chunk =
        json.choices?.[0]?.delta?.content ??
        json.choices?.[0]?.message?.content ??
        json.output ??
        json.text
      if (typeof chunk === 'string') acc += chunk
    } catch {
      acc += payload
    }
  }
  return { acc, done: false }
}

/**
 * 上游报错体里可能回显请求头（某些网关/代理会把 Authorization 原样吐回来），
 * 这里在把 detail 展示到 UI 之前先抹掉疑似凭证的片段。
 */
function scrubSecrets(text: string): string {
  return text
    .replace(/\b(Bearer)\s+[A-Za-z0-9._\-~+/=]+/gi, '$1 ***')
    .replace(/(sk-[A-Za-z0-9_-]{8,})/g, '***')
    .replace(/([A-Za-z0-9]{2,40}[Aa]uthorization|x-api-key|api[-_]?key)["']?\s*[:=]\s*["']([^"']{8,})["']/gi, '$1="***"')
}

/** 聊天消息 id：消息不落盘，时间戳 + 自增即可避免同一 tick 内冲突。 */
let messageSeq = 0
const uid = () => `msg-${Date.now().toString(36)}-${(messageSeq++).toString(36)}`

const NO_API_KEY = '请先在设置中配置 API Key'

/** 新形态 `send(input, action?)`；旧 AIPanel 的三参数调用在 Task 3 前继续可用。 */
type SendFn = {
  (input: string, action?: AIAction): Promise<void>
  (action: AIAction, input: string, selectedText: string): Promise<void>
}

export function useAI() {
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // 流式插入的游标：跨 send/applyToDoc 共享，记录 anchor/revision 与已插入区间，
  // 使「已流式入文档」的 apply 幂等（不二次插入）且 undo 能精确回滚。
  const streamRef = useRef<AIStreamState>({
    active: false, stale: false, anchor: null, expectedRev: -1,
    originalText: '', insertStart: 0, totalLen: 0,
  })

  /** 把一段流式文本写入文档：首个 chunk 定位 anchor 并替换选区，后续在 anchor 后追加；
   *  revision 不匹配（用户中途编辑）则丢弃该 chunk 并停止实时插入，绝不覆盖最新内容。 */
  const streamIntoDoc = useCallback((facade: EditorFacade, delta: string) => {
    const s = streamRef.current
    if (!delta || s.stale) return
    try {
      if (!s.active || !s.anchor) {
        const sel = facade.getSelection()
        s.anchor = sel ?? { from: facade.getText().length, to: facade.getText().length }
        s.originalText = facade.getText().slice(s.anchor.from, s.anchor.to)
        s.insertStart = s.anchor.from
        s.expectedRev = facade.getRevision()
        s.active = true
      }
      facade.insertText(delta, s.anchor, s.expectedRev)
      const insertFrom = s.anchor.from + delta.length
      s.anchor = { from: insertFrom, to: insertFrom }
      s.expectedRev = facade.getRevision()
      s.totalLen += delta.length
    } catch {
      // revision 不匹配：用户在流式期间编辑了文档，丢弃该 chunk 并停止实时插入。
      s.stale = true
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }, [])

  const send = useCallback<SendFn>(async (first: string | AIAction, second?: string | AIAction, third?: string) => {
    // 兼容旧调用 send(action, input, selectedText)：第三个参数只有旧形态才有。
    const legacy = typeof third === 'string'
    const input = (legacy ? second : first) as string
    const explicitAction = (legacy ? first : second) as AIAction | undefined
    const selectedText = legacy ? third : useAIStore.getState().panelSelectedText

    const store = useAIStore.getState()
    const mode = store.mode
    const effAction = explicitAction ?? AI_MODES[mode].defaultAction

    const settings = useSettingsStore.getState()
    const { apiKeys, selectedModelId, temperature, maxTokens } = settings
    const activeKey = (apiKeys || []).find(k => k.id === selectedModelId) || (apiKeys || []).find(k => k.enabled)

    if (!activeKey?.key) {
      store.addMessage({ id: uid(), role: 'assistant', content: '', mode, status: 'error', error: NO_API_KEY })
      // 旧 AIPanel 仍读这些字段（Task 3 移除）。
      store.setPanelError(NO_API_KEY)
      store.setPanelStatus('error')
      return
    }
    if (abortRef.current) return

    store.setPanelStatus('thinking')
    store.setPanelError(null)
    store.setPanelOutput('')
    store.addMessage({ id: uid(), role: 'user', content: input, mode })
    const aid = uid()
    store.addMessage({ id: aid, role: 'assistant', content: '', mode, action: effAction, status: 'streaming' })
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    // 每次发送前重置流式游标（上一轮可能残留 stale/已插入状态）
    streamRef.current = {
      active: false, stale: false, anchor: null, expectedRev: -1,
      originalText: '', insertStart: 0, totalLen: 0,
    }
    const facade = getEditorFacade()

    // 文档结构上下文从 markdown 源码解析（yeli 是源码画布，无文档树）
    const schemaContext = outlineToMarkdownTree(parseMdOutline(facade?.getText() || ''))

    const vars: any = { selected_text: selectedText, schema_context: schemaContext }
    if (effAction === 'rewrite' || effAction === 'polish') vars.style = input || '流畅自然'
    if (effAction === 'continue') {
      vars.user_instruction = input
      vars.context_before = selectedText
    }
    if (effAction === 'translate') vars.target = input || '中文'
    if (effAction === 'question') vars.user_instruction = input

    const prompt = buildPrompt(effAction || 'question', vars)
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }]
    let accumulated = ''

    try {
      if (activeKey.format === 'anthropic') {
        const base = (activeKey.endpoint || 'https://api.anthropic.com').replace(/\/v1$/, '').replace(/\/$/, '')
        const url = `${base}/v1/messages`
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': activeKey.key,
          'anthropic-version': '2023-06-01',
        }
        const body = JSON.stringify({ model: activeKey.model, max_tokens: maxTokens, temperature, messages })
        const resp = await fetch(url, { method: 'POST', headers, body, signal })
        if (!resp.ok) throw new Error(`API Error: ${resp.status}`)
        const data = await resp.json()
        accumulated = data.content?.[0]?.text || ''
        if (accumulated) useAIStore.getState().appendStreamToMessage(aid, accumulated)
        useAIStore.getState().setPanelOutput(accumulated)
        useAIStore.getState().setPanelStatus('result')
      } else {
        const base = (activeKey.endpoint || 'https://api.openai.com').replace(/\/v1$/, '').replace(/\/$/, '')
        const url = `${base}/v1/chat/completions`
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey.key}`,
        }
        const body = JSON.stringify({ model: activeKey.model, messages, temperature, max_tokens: maxTokens, stream: true })
        const resp = await fetch(url, { method: 'POST', headers, body, signal })
        if (!resp.ok) {
          let detail = ''
          try { detail = await resp.text() } catch {}
          throw new Error(`API Error: ${resp.status}${detail ? ' ' + scrubSecrets(detail).slice(0, 160) : ''}`)
        }
        const reader = resp.body?.getReader()
        if (!reader) {
          accumulated = await resp.text()
          if (accumulated) useAIStore.getState().appendStreamToMessage(aid, accumulated)
          useAIStore.getState().setPanelOutput(accumulated)
          useAIStore.getState().setPanelStatus('result')
          useAIStore.getState().updateMessage(aid, { status: accumulated ? 'done' : 'idle' })
          return
        }
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (signal.aborted) break
          buffer += decoder.decode(value, { stream: true })
          const frames: string[] = []
          let cursor = 0
          let sep: number
          while ((sep = buffer.indexOf('\n\n', cursor)) !== -1) {
            frames.push(buffer.slice(cursor, sep))
            cursor = sep + 2
          }
          buffer = buffer.slice(cursor)
          for (const frame of frames) {
            const prevLen = accumulated.length
            const r = extractSSEText(frame, accumulated)
            accumulated = r.acc
            const delta = accumulated.slice(prevLen)
            useAIStore.getState().setPanelOutput(accumulated)
            if (delta) useAIStore.getState().appendStreamToMessage(aid, delta)
            // 逐 chunk 事务：把新到增量写入文档（stale 时自动丢弃，不覆盖用户编辑）
            if (facade) streamIntoDoc(facade, delta)
          }
        }
        if (buffer.trim()) {
          const prevLen = accumulated.length
          accumulated = extractSSEText(buffer, accumulated).acc
          const delta = accumulated.slice(prevLen)
          useAIStore.getState().setPanelOutput(accumulated)
          if (delta) useAIStore.getState().appendStreamToMessage(aid, delta)
          if (facade) streamIntoDoc(facade, delta)
        }
        useAIStore.getState().setPanelStatus(signal.aborted ? (accumulated ? 'result' : 'idle') : 'result')
      }
      useAIStore.getState().updateMessage(aid, { status: accumulated ? 'done' : 'idle' })
      useAIStore.getState().appendConversation({ role: 'user', content: prompt })
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        useAIStore.getState().updateMessage(aid, { status: accumulated ? 'done' : 'idle' })
        if (accumulated) {
          useAIStore.getState().setPanelOutput(accumulated)
          useAIStore.getState().setPanelStatus('result')
        } else {
          useAIStore.getState().setPanelStatus('idle')
        }
      } else {
        const message = err?.message || '请求失败'
        useAIStore.getState().updateMessage(aid, { status: 'error', error: message })
        useAIStore.getState().setPanelError(message)
        useAIStore.getState().setPanelStatus('error')
      }
    } finally {
      abortRef.current = null
      setIsStreaming(false)
    }
  }, [])

  const applyToDoc = useCallback(() => {
    const state = useAIStore.getState()
    // 只应用于最后一条「已完成且未应用」的 assistant 回复；已 applied 的不重复插入。
    const msg = [...state.messages].reverse().find(
      m => m.role === 'assistant' && m.status === 'done' && !m.applied,
    )
    if (!msg) return

    const facade = getEditorFacade()
    // 无 facade：仅标记 applied（与旧路径一致，不登记）。
    if (!facade) {
      state.updateMessage(msg.id, { applied: true, status: 'applied' })
      state.setPanelStatus('applied')
      return
    }
    // planApply 内含 stale 保护：首 chunk revision 不匹配时不覆盖用户中途编辑，
    // 且 replaceRange 事务失败（越界）不抛未捕获异常，只登记空应用。
    const plan = planApply(facade, streamRef.current, msg.content, msg.action ?? 'question')
    state.recordApply(plan.record)
    // recordApply 才生成 id/timestamp，撤销时靠它反查消息，所以回读完整记录。
    const record = useAIStore.getState().getUndoRecord()
    state.updateMessage(msg.id, { applied: true, status: 'applied', applyRecord: record ?? undefined })
    state.setPanelStatus('applied')
  }, [])

  const undo = useCallback(() => {
    const state = useAIStore.getState()
    const record = state.getUndoRecord()
    if (!record) return
    const msg = state.messages.find(m => m.applyRecord?.id === record.id)
    const facade = getEditorFacade()
    if (facade) {
      const text = facade.getText()
      const start = record.newText ? text.indexOf(record.newText) : record.position.from
      const end = start >= 0 ? start + record.newText.length : record.position.to
      if (start >= 0) facade.replaceRange(start, end, record.originalText || '')
    }
    state.undoLastApply()
    state.setPanelStatus('result')
    if (msg) state.updateMessage(msg.id, { applied: false, status: 'done', applyRecord: undefined })
  }, [])

  const copyOutput = useCallback(() => {
    const messages = useAIStore.getState().messages
    const last = [...messages].reverse().find(
      m => m.role === 'assistant' && (m.status === 'done' || m.status === 'applied'),
    )
    if (!last) return
    navigator.clipboard.writeText(last.content)
  }, [])

  return { send, isStreaming, stop, applyToDoc, undo, copyOutput }
}
