import React from 'react'
import { useAIStore } from '../../store/aiStore'
import { useAI } from '../../hooks/useAI'
import type { AIAction } from '../../shared/types'

const ACTION_LABELS: Record<string, string> = {
  rewrite: '改写',
  polish: '润色',
  continue: '续写',
  summarize: '摘要',
  translate: '翻译',
  question: '提问',
}

const ACTION_PLACEHOLDERS: Record<string, string> = {
  rewrite: '改写为更正式的商务风格...',
  polish: '润色这段文字，优化表达...',
  continue: '续写以下内容，保持风格一致...',
  summarize: '提炼核心观点，生成摘要...',
  translate: '翻译为中文...',
  question: '输入你的问题...',
}

export const AIPanel: React.FC = () => {
  const state = useAIStore()
  const { send, isStreaming, applyToDoc, undo, copyOutput } = useAI()

  const handleSubmit = () => {
    const input = state.panelInput.trim()
    if (!input || isStreaming) return
    send(state.panelAction || 'question', input, state.panelSelectedText)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      useAIStore.getState().hidePanel()
    }
  }

  if (!state.panelVisible) return null

  const placeholder = ACTION_PLACEHOLDERS[state.panelAction || 'question'] || '输入指令...'
  const actionLabel = ACTION_LABELS[state.panelAction || 'question'] || 'AI'

  return (
    <div className={`ai-panel ${state.panelStatus === 'thinking' ? 'thinking' : ''}`}>
      <div className="ai-panel-header">
        <span className="remix ri-speed-up-line"></span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{actionLabel}</span>
        <button
          onClick={() => useAIStore.getState().hidePanel()}
          style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 16 }}
        >
          <span className="remix ri-close-line"></span>
        </button>
      </div>

      <div className="ai-chip-group">
        {(['rewrite', 'polish', 'continue', 'summarize', 'translate', 'question'] as AIAction[]).map((a) => (
          <button
            key={a}
            className={`ai-chip ${state.panelAction === a ? 'active' : ''}`}
            onClick={() => { const pos = state.panelPosition || { x: 0, y: 0 }; useAIStore.getState().showPanel(a, state.panelSelectedText, pos) }}
          >
            {ACTION_LABELS[a as string] || a}
          </button>
        ))}
      </div>

      {(state.panelStatus === 'idle' || state.panelStatus === 'thinking' || state.panelStatus === 'error') && (
        <div className="ai-input-wrapper">
          <textarea
            className="ai-input"
            value={state.panelInput}
            onChange={(e) => useAIStore.getState().setPanelInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isStreaming}
            rows={2}
          />
          <button
            className="ai-send-btn"
            disabled={!state.panelInput.trim() || isStreaming}
            onClick={handleSubmit}
          >
            <span className="remix ri-checkbox-fill"></span>
          </button>
        </div>
      )}

      {state.panelStatus === 'thinking' && (
        <div className="ai-loading-dots">
          <span></span><span></span><span></span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>AI 思考中...</span>
        </div>
      )}

      {state.panelStatus === 'result' && state.panelOutput && (
        <>
          <div className="ai-output">
            <div className="ai-output-content">{state.panelOutput}</div>
          </div>
          <div className="ai-actions">
            <button className="ai-action-btn primary" onClick={applyToDoc}>
              <span className="remix ri-checkbox-fill"></span> 应用到文档
            </button>
            <button className="ai-action-btn secondary" onClick={undo}>
              <span className="remix ri-arrow-go-forward-fill"></span> 撤销
            </button>
            <button className="ai-action-btn secondary" onClick={copyOutput}>
              <span className="remix ri-file-copy-fill"></span> 复制
            </button>
          </div>
        </>
      )}

      {state.panelStatus === 'applied' && (
        <div className="ai-applied-bar">
          <span><span className="remix ri-checkbox-fill"></span>已应用到文档</span>
          <span style={{ fontSize: 11, opacity: 0.7 }}>{new Date().toLocaleTimeString()}</span>
        </div>
      )}

      {state.panelError && (
        <div className="ai-error-msg">
          <span className="remix ri-error-warning-fill"></span>
          {state.panelError}
          <button onClick={() => useAIStore.getState().setPanelError(null)} style={{ marginLeft: 'auto' }}className="remix ri-close-line"></button>
        </div>
      )}
    </div>
  )
}
