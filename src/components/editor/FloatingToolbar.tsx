import React from 'react'
import { useAIStore } from '../../store/aiStore'
import { useFloatingToolbar } from '../../hooks/useFloatingToolbar'
import type { AIAction } from '../../shared/types'

const BUTTONS: { action: AIAction; icon: string; label: string }[] = [
  { action: 'rewrite', icon: '\uEB41', label: '改写' },
  { action: 'polish', icon: '\uE8D9', label: '润色' },
  { action: 'continue', icon: '\uF44A', label: '续写' },
  { action: 'summarize', icon: '\uE83A', label: '摘要' },
  { action: 'translate', icon: '\uE9B2', label: '翻译' },
  { action: 'question', icon: '\uF371', label: '提问' },
]

interface FloatingToolbarProps {
  position: { x: number; y: number }
  selectedText: string
  visible: boolean
  onAction: (action: AIAction) => void
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ position, visible, onAction }) => {
  if (!visible) return null

  return (
    <div
      className="ai-floating-toolbar"
      style={{ left: position.x, top: position.y }}
    >
      {BUTTONS.map((btn) => (
        <button
          key={btn.action}
          className="ai-toolbar-btn"
          onClick={() => onAction(btn.action)}
          title={btn.label}
        >
          <span className="remix" style={{ fontSize: 16 }}>{btn.icon}</span>
          <span className="tooltip">{btn.label}</span>
        </button>
      ))}
    </div>
  )
}
