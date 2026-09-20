import React, { useState, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { TYPOGRAPHY_THEMES, applyTypographyTheme } from '../../styles/typography-themes'

export const StatusBar: React.FC = () => {
  const wordCount = useEditorStore(s => s.wordCount)
  const cursorPosition = useEditorStore(s => s.cursorPosition)
  const showOutline = useEditorStore(s => s.showOutline)
  const showPreview = useEditorStore(s => s.showPreview)
  const setShowOutline = useEditorStore(s => s.setShowOutline)
  const setShowPreview = useEditorStore(s => s.setShowPreview)
  const lastEditTime = useEditorStore(s => s.lastEditTime)

  const typographyTheme = useSettingsStore(s => s.typographyTheme || 'classic')
  const [themeIdx, setThemeIdx] = useState(() => {
    const idx = TYPOGRAPHY_THEMES.findIndex(t => t.id === typographyTheme)
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

  useEffect(() => {
    const idx = TYPOGRAPHY_THEMES.findIndex(t => t.id === typographyTheme)
    if (idx >= 0) setThemeIdx(idx)
  }, [typographyTheme])

  const cycleTheme = () => {
    const nextIdx = (themeIdx + 1) % TYPOGRAPHY_THEMES.length
    setThemeIdx(nextIdx)
    const nextId = TYPOGRAPHY_THEMES[nextIdx].id
    applyTypographyTheme(nextId)
    useSettingsStore.getState().updateSetting('typographyTheme', nextId)
  }

  const handleCollapse = () => {
    if (showOutline) setShowOutline(false)
    else if (showPreview) setShowPreview(false)
    else { setShowOutline(true); setShowPreview(false) }
  }

  const editingText = elapsed < 60 ? '刚刚'
    : elapsed < 3600 ? `${Math.floor(elapsed / 60)} 分钟前`
    : `${Math.floor(elapsed / 3600)}小时${Math.floor((elapsed % 3600) / 60)}分钟前`

  return (
    <div className="statusbar">
      {/* Left: seal + doc stats */}
      <div className="statusbar-left">
        <div className="statusbar-seal" title="LZEditor">
          <span className="remix ri-quill-pen-line"></span>
        </div>
        <div className="statusbar-item">
          <span className="remix ri-text"></span>
          <span>{wordCount.toLocaleString()} 字</span>
        </div>
        <div className="statusbar-divider" />
        <div className="statusbar-item">
          <span className="remix ri-timer-line"></span>
          <span>约 {readTime} 分钟</span>
        </div>
      </div>

      {/* Center: theme toggle + panel toggle */}
      <div className="statusbar-center">
        <button className="statusbar-pill" onClick={cycleTheme} title={`切换排版样式（当前: ${TYPOGRAPHY_THEMES[themeIdx]?.name}）`}>
          <span className="remix ri-font-size"></span>
          <span>{TYPOGRAPHY_THEMES[themeIdx]?.name}</span>
        </button>
        <button className="statusbar-pill" onClick={handleCollapse} title="切换面板显示">
          <span className="remix ri-booklet-fill"></span>
          <span>{showOutline || showPreview ? '收起' : '展开'}</span>
        </button>
      </div>

      {/* Right: edit time + cursor + copyright-like */}
      <div className="statusbar-right">
        <div className="statusbar-item">
          <span className="remix ri-edit-fill"></span>
          <span>{editingText}</span>
        </div>
        <div className="statusbar-divider" />
        <div className="statusbar-badge">
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </div>
        <button className="statusbar-icon-btn" title="LZEditor" onClick={() => window.open('https://github.com/sikenali/lzeditor', '_blank')}>
          <span className="remix ri-github-fill"></span>
        </button>
      </div>
    </div>
  )
}
