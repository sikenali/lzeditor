import React, { useState, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { STYLE_SETS, applyStyleSet, getActiveStyleSetName } from '../../styles/themes'

export const StatusBar: React.FC = () => {
  const wordCount = useEditorStore(s => s.wordCount)
  const cursorPosition = useEditorStore(s => s.cursorPosition)
  const showOutline = useEditorStore(s => s.showOutline)
  const showPreview = useEditorStore(s => s.showPreview)
  const setShowOutline = useEditorStore(s => s.setShowOutline)
  const setShowPreview = useEditorStore(s => s.setShowPreview)
  const lastEditTime = useEditorStore(s => s.lastEditTime)

  const [styleIdx, setStyleIdx] = useState(() => {
    const name = getActiveStyleSetName()
    const idx = STYLE_SETS.findIndex(s => s.name === name)
    return idx >= 0 ? idx : 0
  })
  const [elapsed, setElapsed] = useState(0)

  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - lastEditTime) / 1000))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [lastEditTime])

  const cycleStyle = () => {
    const nextIdx = (styleIdx + 1) % STYLE_SETS.length
    setStyleIdx(nextIdx)
    applyStyleSet(STYLE_SETS[nextIdx].name)
  }

  const handleCollapse = () => {
    if (showOutline) setShowOutline(false)
    else if (showPreview) setShowPreview(false)
    else { setShowOutline(true); setShowPreview(false) }
  }

  const editingText = elapsed < 60 ? 'just now'
    : elapsed < 3600 ? `${Math.floor(elapsed / 60)} min ago`
    : `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m ago`

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <div className="statusbar-item" title="字数统计">
          <span className="remix ri-text"></span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Words: {wordCount.toLocaleString()}</span>
        </div>
        <div className="statusbar-item" title="预计阅读时间">
          <span className="remix ri-timer-line"></span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Read: {readTime} min</span>
        </div>
      </div>
      <div className="statusbar-center">
        <button className="statusbar-style-btn" onClick={cycleStyle} title={`切换样式集（当前: ${STYLE_SETS[styleIdx]?.name}）`}>
          <span className="remix ri-palette-fill"></span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Style Set:</span>
          <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 500 }}>{STYLE_SETS[styleIdx]?.name}</span>
        </button>
        <button className="statusbar-collapse-btn" onClick={handleCollapse} title="切换面板显示">
          <span className="remix ri-booklet-fill"></span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {showOutline || showPreview ? '收起' : '展开'}
          </span>
        </button>
        <span className="statusbar-divider" />
      </div>
      <div className="statusbar-right">
        <div className="statusbar-item" title={`距上次编辑 ${editingText}`}>
          <span className="remix ri-edit-fill"></span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Editing: {editingText}</span>
        </div>
        <div className="statusbar-badge" title={`行 ${cursorPosition.line}，列 ${cursorPosition.column}`}>
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
        </div>
      </div>
    </div>
  )
}

