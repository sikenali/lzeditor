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
          <span className="remix ri-text"></span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Words: {wordCount.toLocaleString()}</span>
        </div>
        <div className="statusbar-item">
          <span className="remix ri-timer-line"></span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Read: {readTime} min</span>
        </div>
      </div>
      <div className="statusbar-center">
        <span className="remix ri-message-3-fill"></span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Style Set:</span>
        <span style={{ fontSize: 12, color: 'var(--accent-primary)' }}>Ocean</span>
        <span className="remix ri-booklet-fill"></span>
        <span className="statusbar-divider" />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Collapse</span>
      </div>
      <div className="statusbar-right">
        <div className="statusbar-item">
          <span className="remix ri-edit-fill"></span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Editing: in {readTime} minutes</span>
        </div>
        <div className="statusbar-badge">
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
        </div>
      </div>
    </div>
  )
}
