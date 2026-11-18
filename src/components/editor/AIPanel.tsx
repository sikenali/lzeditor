import React, { useEffect, useRef, useState } from 'react'
import { useAIStore } from '../../store/aiStore'
import { useAI } from '../../hooks/useAI'
import { getEditorFacade } from './facade/registry'
import { AI_MODES, AI_MODE_ORDER } from '../../shared/aiModes'
import { mdToHtml } from '../../utils/mdToHtml'
import type { AIAction, ChatEntry } from '../../shared/types'

/** 快速动作行：保留旧浮层的 6 个动作，作为「下一条发送意图」覆盖模式默认动作。 */
const QUICK_ACTIONS: Array<{ action: Exclude<AIAction, null>; label: string }> = [
  { action: 'rewrite', label: '改写' },
  { action: 'polish', label: '润色' },
  { action: 'continue', label: '续写' },
  { action: 'summarize', label: '摘要' },
  { action: 'translate', label: '翻译' },
  { action: 'question', label: '提问' },
]

/** 选区提示只展示开头，完整内容留在 title 里。 */
function summarizeSelection(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > 80 ? `${flat.slice(0, 80)}…` : flat
}

interface AssistantCardProps {
  msg: ChatEntry
  actionable: boolean
  onApply: () => void
  onUndo: () => void
  onCopy: () => void
}

function AssistantCard({ msg, actionable, onApply, onUndo, onCopy }: AssistantCardProps) {
  const status = msg.status ?? 'done'

  return (
    <div className={`ai-chat-assistant-card ai-chat-assistant-card--${status}`}>
      <div className="ai-chat-assistant-meta">
        <span className={`remix ${AI_MODES[msg.mode].icon}`}></span>
        <span>{AI_MODES[msg.mode].label}</span>
        {status === 'applied' && <span className="ai-chat-applied-badge">已应用</span>}
      </div>

      {status === 'streaming' ? (
        <div className="ai-chat-reply ai-chat-reply--streaming">
          {msg.content}
          <span className="ai-chat-cursor" aria-hidden="true"></span>
        </div>
      ) : status === 'error' ? (
        <div className="ai-chat-error">
          <span className="remix ri-error-warning-line"></span>
          {msg.error || '请求失败'}
        </div>
      ) : status === 'idle' ? (
        <div className="ai-chat-reply ai-chat-reply--empty" aria-label="已停止生成"></div>
      ) : (
        <div
          className="ai-chat-reply"
          dangerouslySetInnerHTML={{ __html: mdToHtml(msg.content) }}
        />
      )}

      {actionable && (status === 'done' || status === 'applied') && (
        <div className="ai-chat-actions">
          <button className="ai-chat-action ai-chat-action--primary" onClick={onApply}>
            应用到文档
          </button>
          <button className="ai-chat-action" onClick={onUndo}>
            撤销
          </button>
          <button className="ai-chat-action" onClick={onCopy}>
            复制
          </button>
        </div>
      )}
    </div>
  )
}

export const AIPanel: React.FC = () => {
  const panelVisible = useAIStore(s => s.panelVisible)
  const mode = useAIStore(s => s.mode)
  const messages = useAIStore(s => s.messages)
  const panelInput = useAIStore(s => s.panelInput)
  const panelStatus = useAIStore(s => s.panelStatus)
  const panelSelectedText = useAIStore(s => s.panelSelectedText)
  const { send, isStreaming, stop, applyToDoc, undo, copyOutput } = useAI()

  const [sendAction, setSendAction] = useState<AIAction>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 停止信号有两个来源：本次 hook 的流式态，以及 store 里的 thinking 状态
  // （后者让面板重挂载后仍能显示停止按钮）。
  const streaming = isStreaming || panelStatus === 'thinking'

  // 面板每次打开都重新读编辑区选区，覆盖 store 里可能残留的旧选区。
  useEffect(() => {
    if (!panelVisible) return
    const facade = getEditorFacade()
    if (!facade) return
    const range = facade.getSelection()
    if (!range || range.from >= range.to) {
      useAIStore.getState().setSelectedText('')
      return
    }
    useAIStore.getState().setSelectedText(facade.getText().slice(range.from, range.to))
  }, [panelVisible])

  // 新消息或流式增量后贴底。
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  if (!panelVisible) return null

  // 操作行只挂在最后一条可操作的 assistant 回复上：applyToDoc/undo/copyOutput
  // 都是「最后一条」语义，挂在旧卡片上会让人误以为作用于那一条。
  const lastActionableId = [...messages]
    .reverse()
    .find(m => m.role === 'assistant' && (m.status === 'done' || m.status === 'applied'))
    ?.id

  const submit = () => {
    const input = useAIStore.getState().panelInput.trim()
    if (!input || streaming) return
    void send(input, sendAction ?? undefined)
    setSendAction(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      useAIStore.getState().hidePanel()
    }
  }

  return (
    <aside className="ai-chat-panel" aria-label="AI 助手">
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <span className="remix ri-sparkling-line"></span>
          AI 助手
        </div>
        <button
          className="ai-chat-close"
          onClick={() => useAIStore.getState().hidePanel()}
          title="关闭"
          aria-label="关闭 AI 面板"
        >
          <span className="remix ri-close-line"></span>
        </button>
      </div>

      <div className="ai-chat-modes" role="tablist" aria-label="AI 模式">
        {AI_MODE_ORDER.map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            className={`ai-chat-mode ${mode === m ? 'active' : ''}`}
            onClick={() => useAIStore.getState().setMode(m)}
          >
            <span className={`remix ${AI_MODES[m].icon}`}></span>
            {AI_MODES[m].label}
          </button>
        ))}
      </div>

      <div className="ai-chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            <span className="remix ri-chat-3-line"></span>
            <p>开始一段对话：选中文字可做改写、审校，也可以直接提问。</p>
          </div>
        )}
        {messages.map(msg => (
          msg.role === 'user' ? (
            <div key={msg.id} className="ai-chat-user-bubble">
              <div className="ai-chat-user-text">{msg.content}</div>
              <span className="ai-chat-mode-tag">{AI_MODES[msg.mode].label}</span>
            </div>
          ) : (
            <AssistantCard
              key={msg.id}
              msg={msg}
              actionable={msg.id === lastActionableId}
              onApply={applyToDoc}
              onUndo={undo}
              onCopy={copyOutput}
            />
          )
        ))}
      </div>

      <div className="ai-chat-composer">
        <div className="ai-chat-quick">
          {QUICK_ACTIONS.map(({ action, label }) => (
            <button
              key={action}
              className={`ai-chat-quick-chip ${sendAction === action ? 'active' : ''}`}
              onClick={() => setSendAction(cur => (cur === action ? null : action))}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ai-chat-input-row">
          <textarea
            className="ai-chat-input"
            value={panelInput}
            onChange={e => useAIStore.getState().setPanelInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={AI_MODES[mode].hint}
            rows={3}
          />
          {streaming ? (
            <button className="ai-chat-stop" onClick={stop} title="停止生成">
              <span className="remix ri-stop-fill"></span>
              停止
            </button>
          ) : (
            <button
              className="ai-chat-send"
              onClick={submit}
              disabled={!panelInput.trim()}
              title="发送"
              aria-label="发送"
            >
              <span className="remix ri-send-plane-fill"></span>
            </button>
          )}
        </div>

        {panelSelectedText && (
          <div className="ai-chat-context" title={panelSelectedText}>
            <span className="remix ri-text"></span>
            选区：{summarizeSelection(panelSelectedText)}
          </div>
        )}
      </div>
    </aside>
  )
}
