import { useState, useCallback, useRef } from 'react'
import { useAIStore } from '../store/aiStore'
import { useEditorStore } from '../store/editorStore'
import { useSettingsStore } from '../store/settingsStore'
import { buildPrompt } from '../services/promptTemplate'
import type { AIAction, ChatMessage } from '../shared/types'

const ACTION_PLACEHOLDERS: Record<string, string> = {
  rewrite: '改写为更正式的商务风格...',
  polish: '润色这段文字，优化表达...',
  continue: '续写以下内容，保持风格一致...',
  summarize: '提炼核心观点，生成摘要...',
  translate: '翻译为中文...',
  question: '输入你的问题...',
}

export function useAI() {
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (action: AIAction, input: string, selectedText: string) => {
    const settings = useSettingsStore.getState()
    const { provider, model, apiKey, customBaseUrl, temperature, maxTokens } = settings

    if (!apiKey) {
      useAIStore.getState().setPanelError('请先在设置中配置 API Key')
      return
    }

    useAIStore.getState().setPanelStatus('thinking')
    useAIStore.getState().setPanelError(null)
    setIsStreaming(true)

    const vars: any = { selected_text: selectedText }
    if (action === 'rewrite' || action === 'polish') vars.style = input || '流畅自然'
    if (action === 'continue') {
      vars.user_instruction = input
      vars.context_before = selectedText
    }
    if (action === 'translate') vars.target = input || '中文'

    const prompt = buildPrompt(action || 'question', vars)

    const messages: ChatMessage[] = [
      { role: 'user', content: prompt },
    ]

    try {
      let url: string
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }

      if (provider === 'anthropic') {
        url = `${customBaseUrl || 'https://api.anthropic.com'}/v1/messages`
        headers['anthropic-version'] = '2023-06-01'
        const body = JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          messages,
        })
        const resp = await fetch(url, { method: 'POST', headers, body })
        if (!resp.ok) throw new Error(`API Error: ${resp.status}`)
        const data = await resp.json()
        const output = data.content?.[0]?.text || ''
        useAIStore.getState().setPanelOutput(output)
        useAIStore.getState().setPanelStatus('result')
      } else {
        url = `/api/chat`
        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ messages, provider, model, temperature, maxTokens }),
        })
        if (!resp.ok) throw new Error(`API Error: ${resp.status}`)

        const reader = resp.body?.getReader()
        if (!reader) {
          const text = await resp.text()
          useAIStore.getState().setPanelOutput(text)
          useAIStore.getState().setPanelStatus('result')
          return
        }

        let accumulated = ''
        useAIStore.getState().setPanelStatus('thinking')
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = new TextDecoder().decode(value)
          accumulated += chunk
          useAIStore.getState().setPanelOutput(accumulated)
        }
        useAIStore.getState().setPanelStatus('result')
      }
    } catch (err: any) {
      useAIStore.getState().setPanelError(err.message || '请求失败')
      useAIStore.getState().setPanelStatus('error')
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const applyToDoc = useCallback(() => {
    const state = useAIStore.getState()
    if (state.panelStatus !== 'result') return
    const editor = useEditorStore.getState().editor
    const output = state.panelOutput || ''
    if (editor) {
      const selectedText = state.panelSelectedText || ''
      const escaped = output
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '</p><p>')
      const html = `<p>${escaped}</p>`
      const { from, to } = editor.state.selection
      if (selectedText && from !== to) {
        editor.chain().focus().deleteRange({ from, to }).insertContent(html).run()
      } else {
        editor.chain().focus().insertContent(html).run()
      }
    }
    useAIStore.getState().recordApply({
      action: state.panelAction,
      originalText: state.panelSelectedText,
      newText: output,
      position: { from: 0, to: state.panelSelectedText.length },
    })
    useAIStore.getState().setPanelStatus('applied')
  }, [])

  const undo = useCallback(() => {
    const record = useAIStore.getState().getUndoRecord()
    if (record) {
      useAIStore.getState().undoLastApply()
    }
  }, [])

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(useAIStore.getState().panelOutput)
  }, [])

  return { send, isStreaming, applyToDoc, undo, copyOutput }
}
