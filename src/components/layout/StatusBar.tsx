import React, { useState, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const StatusBar: React.FC = () => {
  const wordCount      = useEditorStore(s => s.wordCount)
  const charCount      = useEditorStore(s => s.charCount)
  const cursorPosition = useEditorStore(s => s.cursorPosition)
  const syncStatus     = useEditorStore(s => s.syncStatus)
  const showSearch     = useEditorStore(s => s.showSearch)
  const setShowSearch  = useEditorStore(s => s.setShowSearch)
  const lastEditTime   = useEditorStore(s => s.lastEditTime)
  const activeDocId    = useEditorStore(s => s.activeDocId)
  const statusbarCollapsed = useEditorStore(s => s.statusbarCollapsed)
  const setStatusbarCollapsed = useEditorStore(s => s.setStatusbarCollapsed)

  const [formattedTime, setFormattedTime] = useState('')
  useEffect(() => {
    const tick = () => {
      const d = new Date(lastEditTime)
      const pad = (n: number) => String(n).padStart(2, '0')
      setFormattedTime(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      )
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [lastEditTime])

  const syncIcon = syncStatus === 'synced' ? 'ri-check-line' : syncStatus === 'saving' ? 'ri-loader-4-line spin' : 'ri-error-warning-line'
  const syncColor = syncStatus === 'synced' ? 'var(--accent-primary)' : syncStatus === 'saving' ? 'var(--text-muted)' : 'var(--accent-red)'

  if (activeDocId == null) return null

  const collapseButton = (
    <button className="statusbar-collapse" data-title={statusbarCollapsed ? '展开状态栏' : '收起状态栏'}
      onClick={() => setStatusbarCollapsed(!statusbarCollapsed)}>
      <span className={`remix ${statusbarCollapsed ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></span>
    </button>
  )

  if (statusbarCollapsed) {
    return (
      <div className="statusbar statusbar--collapsed">
        {collapseButton}
      </div>
    )
  }

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <div className="statusbar-sync">
          <span className={`remix ${syncIcon}`} style={{ color: syncColor }}></span>
          <span className="statusbar-sync-text">{syncStatus === 'synced' ? '已保存' : syncStatus === 'saving' ? '实时保存中' : '保存失败'}</span>
        </div>
        <div className="statusbar-divider" />
        <div className="statusbar-item">
          <span className="remix ri-clock-fill"></span>
          <span>{formattedTime}</span>
        </div>
      </div>
      <div className="statusbar-right">
        <button className={`statusbar-action ${showSearch ? 'active' : ''}`} data-title="查找与替换" onClick={() => setShowSearch(!showSearch)}>
          <span className="remix ri-search-line"></span>
        </button>
        <div className="statusbar-divider" />
        <div className="statusbar-item">
          <span className="remix ri-text"></span>
          <span>{wordCount.toLocaleString()} 字</span>
        </div>
        <div className="statusbar-divider" />
        <div className="statusbar-item">
          <span className="remix ri-hash"></span>
          <span>{charCount.toLocaleString()} 字符</span>
        </div>
        <div className="statusbar-divider" />
        <div className="statusbar-item">
          <span className="remix ri-cursor-fill"></span>
          <span>行 {cursorPosition.line} 列 {cursorPosition.column}</span>
        </div>
        <div className="statusbar-divider" />
        {collapseButton}
      </div>
    </div>
  )
}
