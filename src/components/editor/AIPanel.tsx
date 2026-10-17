import React, { useEffect, useRef } from 'react'
import { useAIStore } from '../../store/aiStore'
import { useAI } from '../../hooks/useAI'
import { useEditorStore } from '../../store/editorStore'
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
  rewrite: '改写为更正式的商务风格…',
  polish: '润色这段文字，优化表达…',
  continue: '续写以下内容，保持风格一致…',
  summarize: '提炼核心观点，生成摘要…',
  translate: '翻译为中文…',
  question: '输入你的问题…',
}

const ACTION_ICONS: Record<string, string> = {
  rewrite: 'ri-pen-nib-fill',
  polish: 'ri-brush-line',
  continue: 'ri-arrow-right-s-line',
  summarize: 'ri-article-fill',
  translate: 'ri-translate-2',
  question: 'ri-chat-history-line',
}

function getActionKey(action: AIAction): string {
  return action ?? 'question'
}

const ACTIONS: AIAction[] = ['rewrite', 'polish', 'continue', 'summarize', 'translate', 'question']

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function clampPanelX(x: number, w: number): number {
  return clamp(x, 8, window.innerWidth - w - 8)
}

function clampPanelY(y: number, h: number): number {
  return clamp(y, 8, window.innerHeight - h - 8)
}

export const AIPanel: React.FC = () => {
  const state = useAIStore()
  const { send, isStreaming, applyToDoc, undo, copyOutput } = useAI()
  const editorRef = useEditorStore(s => s.editorRef)
  const panelRef = useRef<HTMLDivElement>(null)

  const PANEL_W = 360
  const PANEL_H = 420

  const computePanelPosition = (): { x: number; y: number } => {
    const stored = state.panelPosition
    if (stored) return stored

    const editorEl = editorRef?.querySelector?.('.ProseMirror') as HTMLElement | null
    if (!editorEl) return { x: 8, y: 120 }

    const editorRect = editorEl.getBoundingClientRect()
    const x = clampPanelX(editorRect.right + 8, PANEL_W)
    const y = clampPanelY(editorRect.top + editorRect.height / 2 - PANEL_H / 2, PANEL_H)
    return { x, y }
  }

  const panelPosition = computePanelPosition()

  // Clamp position to viewport on open / resize
  useEffect(() => {
    if (!state.panelVisible) return
    const update = () => {
      const x = clampPanelX(panelPosition.x, PANEL_W)
      const y = clampPanelY(panelPosition.y, PANEL_H)
      if (panelRef.current) {
        panelRef.current.style.left = x + 'px'
        panelRef.current.style.top = y + 'px'
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [state.panelVisible, panelPosition.x, panelPosition.y])

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

  const placeholder = ACTION_PLACEHOLDERS[getActionKey(state.panelAction)] || '输入指令…'
  const actionLabel = ACTION_LABELS[getActionKey(state.panelAction)] || 'AI'
  const actionIcon = ACTION_ICONS[getActionKey(state.panelAction)] || 'ri-speed-up-line'

  return (
    <div
      ref={panelRef}
      className={`ai-panel ${state.panelStatus === 'thinking' ? 'thinking' : ''}`}
      style={{
        position: 'fixed',
        left: panelPosition.x,
        top: panelPosition.y,
      }}
    >
      {/* Header */}
      <div className="ai-panel-header">
        <span className={`remix ai-panel-icon ${actionIcon}`}></span>
        <span className="ai-panel-title">{actionLabel}</span>
        <button className="ai-panel-close" onClick={() => useAIStore.getState().hidePanel()}>
          <span className="remix ri-close-line"></span>
        </button>
      </div>

      {/* Action chips */}
      <div className="ai-chip-group">
        {ACTIONS.map((a) => (
          <button
            key={a}
            className={`ai-chip ${state.panelAction === a ? 'active' : ''}`}
            onClick={() => {
              const sel = state.panelSelectedText
              const pos = computePanelPosition()
              useAIStore.getState().showPanel(a, sel, pos)
            }}
          >
            {ACTION_LABELS[getActionKey(a)] || a}
          </button>
        ))}
      </div>

      {/* Input area */}
      {(state.panelStatus === 'idle' || state.panelStatus === 'thinking' || state.panelStatus === 'error') && (
        <div className="ai-input-wrapper">
          <textarea
            className="ai-input"
            value={state.panelInput}
            onChange={(e) => useAIStore.getState().setPanelInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isStreaming}
            rows={3}
          />
          <button
            className="ai-send-btn"
            disabled={!state.panelInput.trim() || isStreaming}
            onClick={handleSubmit}
          >
            <span className="remix ri-send-plane-fill"></span>
          </button>
        </div>
      )}

      {/* Thinking indicator */}
      {state.panelStatus === 'thinking' && (
        <div className="ai-loading-dots">
          <span></span><span></span><span></span>
          <span className="ai-loading-text">AI 思考中…</span>
        </div>
      )}

      {/* Error message */}
      {state.panelStatus === 'error' && state.panelError && (
        <div className="ai-error-msg">
          <span className="remix ri-error-warning-line"></span>
          {state.panelError}
          <button onClick={() => useAIStore.getState().setPanelError(null)} className="ai-error-close">
            <span className="remix ri-close-line"></span>
          </button>
        </div>
      )}

      {/* Result */}
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
              <span className="remix ri-arrow-go-back-line"></span> 撤销
            </button>
            <button className="ai-action-btn secondary" onClick={copyOutput}>
              <span className="remix ri-file-copy-line"></span> 复制
            </button>
          </div>
        </>
      )}

      {/* Applied confirmation */}
      {state.panelStatus === 'applied' && (
        <div className="ai-applied-bar">
          <span><span className="remix ri-checkbox-circle-fill"></span> 已应用到文档</span>
          <span className="ai-applied-time">{new Date().toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  )
}
