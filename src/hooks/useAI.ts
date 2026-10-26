import { useState, useCallback, useRef } from 'react'
import { useAIStore } from '../store/aiStore'
import { useSettingsStore } from '../store/settingsStore'
import { getCM6Editor } from '../components/editor/codemirror/registry'
import { parseMdOutline, outlineToMarkdownTree } from '../utils/mdOutline'
import { buildPrompt } from '../services/promptTemplate'
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

export function useAI() {
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }, [])

  const send = useCallback(async (action: AIAction, input: string, selectedText: string) => {
    const settings = useSettingsStore.getState()
    const { apiKeys, selectedModelId, temperature, maxTokens } = settings
    const activeKey = (apiKeys || []).find(k => k.id === selectedModelId) || (apiKeys || []).find(k => k.enabled)

    if (!activeKey?.key) {
      useAIStore.getState().setPanelError('请先在设置中配置 API Key')
      useAIStore.getState().setPanelStatus('error')
      return
    }
    if (abortRef.current) return

    const store = useAIStore.getState()
    store.setPanelStatus('thinking')
    store.setPanelError(null)
    store.setPanelOutput('')
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    // 文档结构上下文从 markdown 源码解析（CM6 没有文档树）
    const schemaContext = outlineToMarkdownTree(parseMdOutline(getCM6Editor()?.getText() || ''))

    const vars: any = { selected_text: selectedText, schema_context: schemaContext }
    if (action === 'rewrite' || action === 'polish') vars.style = input || '流畅自然'
    if (action === 'continue') {
      vars.user_instruction = input
      vars.context_before = selectedText
    }
    if (action === 'translate') vars.target = input || '中文'
    if (action === 'question') vars.user_instruction = input

    const prompt = buildPrompt(action || 'question', vars)
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
          useAIStore.getState().setPanelOutput(accumulated)
          useAIStore.getState().setPanelStatus('result')
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
            const r = extractSSEText(frame, accumulated)
            accumulated = r.acc
            useAIStore.getState().setPanelOutput(accumulated)
          }
        }
        if (buffer.trim()) {
          accumulated = extractSSEText(buffer, accumulated).acc
          useAIStore.getState().setPanelOutput(accumulated)
        }
        useAIStore.getState().setPanelStatus(signal.aborted ? (accumulated ? 'result' : 'idle') : 'result')
      }
      useAIStore.getState().appendConversation({ role: 'user', content: prompt })
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        if (accumulated) {
          useAIStore.getState().setPanelOutput(accumulated)
          useAIStore.getState().setPanelStatus('result')
        } else {
          useAIStore.getState().setPanelStatus('idle')
        }
      } else {
        useAIStore.getState().setPanelError(err?.message || '请求失败')
        useAIStore.getState().setPanelStatus('error')
      }
    } finally {
      abortRef.current = null
      setIsStreaming(false)
    }
  }, [])

  const applyToDoc = useCallback(() => {
    const state = useAIStore.getState()
    if (state.panelStatus !== 'result') return
    const output = state.panelOutput || ''
    const cm = getCM6Editor()
    if (cm) {
      const range = cm.getSelectionRange()
      const original = cm.getSelectionText()
      cm.replaceRange(range.from, range.to, output)
      useAIStore.getState().recordApply({
        action: state.panelAction,
        originalText: original,
        newText: output,
        position: { from: range.from, to: range.from + output.length },
      })
      useAIStore.getState().setPanelStatus('applied')
      return
    }
    useAIStore.getState().setPanelStatus('applied')
  }, [])

  const undo = useCallback(() => {
    const record = useAIStore.getState().getUndoRecord()
    if (!record) return
    const cm = getCM6Editor()
    if (cm) {
      const text = cm.getText()
      const start = record.newText ? text.indexOf(record.newText) : record.position.from
      const end = start >= 0 ? start + record.newText.length : record.position.to
      if (start >= 0) cm.replaceRange(start, end, record.originalText || '')
      useAIStore.getState().undoLastApply()
      useAIStore.getState().setPanelStatus('result')
      return
    }
    useAIStore.getState().undoLastApply()
    useAIStore.getState().setPanelStatus('result')
  }, [])

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(useAIStore.getState().panelOutput)
  }, [])

  return { send, isStreaming, stop, applyToDoc, undo, copyOutput }
}
