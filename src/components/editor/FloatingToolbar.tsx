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

  const TOOLBAR_W = 60
  const clampedX = Math.min(position.x, window.innerWidth - TOOLBAR_W - 8)
  const clampedY = Math.min(position.y, window.innerHeight - 40)

  return (
    <div
      className="ai-floating-toolbar"
      style={{ left: clampedX, top: clampedY }}
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
