import React from 'react'
import { useEditorStore } from '../../store/editorStore'

export const StatusBar: React.FC = () => {
  const wordCount = useEditorStore((s: any) => s.wordCount)
  const charCount = useEditorStore((s: any) => s.charCount)
  const cursorPosition = useEditorStore((s: any) => s.cursorPosition)
  const isReadMode = useEditorStore((s: any) => s.isReadMode)

  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <div className="statusbar-item">
          <span className="remix" style={{ fontSize: 15, color: 'rgba(127,191,162,1)' }}></span>
          <span style={{ fontSize: 12, color: 'rgba(139,152,165,1)' }}>Words: {wordCount.toLocaleString()}</span>
        </div>
        <div className="statusbar-item">
          <span className="remix" style={{ fontSize: 15, color: 'rgba(127,191,162,1)' }}></span>
          <span style={{ fontSize: 12, color: 'rgba(139,152,165,1)' }}>Read: {readTime} min</span>
        </div>
      </div>
      <div className="statusbar-center">
        <span className="remix" style={{ fontSize: 15, color: 'rgba(127,191,162,1)' }}></span>
        <span style={{ fontSize: 12, color: 'rgba(125,139,153,1)' }}>Style Set:</span>
        <span style={{ fontSize: 12, color: 'var(--accent-primary)' }}>Ocean</span>
        <span className="remix" style={{ fontSize: 16, color: 'var(--accent-primary)' }}></span>
        <span className="statusbar-divider" />
        <span style={{ fontSize: 12, color: 'rgba(125,139,153,1)' }}>Collapse</span>
      </div>
      <div className="statusbar-right">
        <div className="statusbar-item">
          <span className="remix" style={{ fontSize: 15, color: 'rgba(127,191,162,1)' }}></span>
          <span style={{ fontSize: 12, color: 'rgba(139,152,165,1)' }}>Editing: in {readTime} minutes</span>
        </div>
        <div className="statusbar-badge">
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
        </div>
      </div>
    </div>
  )
}
