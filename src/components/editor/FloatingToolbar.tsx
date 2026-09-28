import React from 'react'
import { useAIStore } from '../../store/aiStore'
import type { AIAction } from '../../shared/types'

interface FloatingToolbarProps {
  position: { x: number; y: number }
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
      <button
        className="ai-toolbar-btn"
        onClick={() => onAction('question')}
        title="AI"
      >
        <span className="remix ri-openai-fill" style={{ fontSize: 14 }}></span>
        <span className="tooltip">AI</span>
      </button>
    </div>
  )
}
