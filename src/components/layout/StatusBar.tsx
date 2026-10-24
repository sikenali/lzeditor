import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const StatusBar: React.FC = () => {
  const wordCount      = useEditorStore(s => s.wordCount)
  const charCount      = useEditorStore(s => s.charCount)
  const cursorPosition = useEditorStore(s => s.cursorPosition)
  const syncStatus     = useEditorStore(s => s.syncStatus)
  const showSearch     = useEditorStore(s => s.showSearch)
  const setShowSearch  = useEditorStore(s => s.setShowSearch)
  const activeDocId    = useEditorStore(s => s.activeDocId)

  const [visible, setVisible] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [formattedTime, setFormattedTime] = useState('')

  const lastEditTime = useEditorStore(s => s.lastEditTime)
  useEffect(() => {
    const tick = () => {
      const d = new Date(lastEditTime)
      const pad = (n: number) => String(n).padStart(2, '0')
      setFormattedTime(`${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`)
    }
    tick()
    timerRef.current = setInterval(tick, 30000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [lastEditTime])

  // Click outside to close
  useEffect(() => {
    if (!visible) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setVisible(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [visible])

  const syncIcon = syncStatus === 'synced' ? 'ri-check-line' : syncStatus === 'saving' ? 'ri-loader-4-line spin' : 'ri-error-warning-line'
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  const toggle = useCallback(() => setVisible(v => !v), [])
  const toggleSearch = useCallback(() => setShowSearch(!showSearch), [showSearch, setShowSearch])

  if (activeDocId == null) return null

  return (
    <>
      {/* Toggle button — always visible pill at bottom-right */}
      <button
        className="statusbar-float-toggle"
        data-title={visible ? '收起状态栏' : '展开状态栏'}
        onClick={toggle}
        title={visible ? '收起状态栏' : '展开状态栏'}
      >
        {visible
          ? <span className="remix ri-information-line"></span>
          : <span className="remix ri-information-line"></span>
        }
        {visible && (
          <span className="statusbar-float-toggle-summary">
            {wordCount.toLocaleString()} 字
          </span>
        )}
      </button>

      {/* Floating vertical panel */}
      {visible && (
        <div ref={panelRef} className="statusbar-float-panel" role="status" aria-label="编辑器状态">
          <div className="statusbar-float-panel-header">
            <span className="statusbar-float-panel-title">状态</span>
            <button className="statusbar-float-close statusbar-collapse" onClick={toggle} title="收起">
              <span className="remix ri-close-line"></span>
            </button>
          </div>

          <div className="statusbar-float-row">
            <span className={`statusbar-float-icon statusbar-sync-dot${syncStatus === 'synced' ? ' synced' : syncStatus === 'saving' ? ' saving' : ''}`}>
              <span className={`remix ${syncIcon}`}></span>
            </span>
            <span className="statusbar-float-label">{syncStatus === 'synced' ? '已保存' : syncStatus === 'saving' ? '保存中…' : '保存失败'}</span>
          </div>

          <div className="statusbar-float-row">
            <span className="statusbar-float-icon"><span className="remix ri-clock-fill"></span></span>
            <span className="statusbar-float-label">{formattedTime}</span>
          </div>

          <div className="statusbar-float-divider" />

          <button className="statusbar-float-row statusbar-float-btn" onClick={toggleSearch} data-title="查找与替换">
            <span className="statusbar-float-icon"><span className={`remix ri-search-line${showSearch ? ' active' : ''}`}></span></span>
            <span className="statusbar-float-label">查找</span>
          </button>

          <div className="statusbar-float-divider" />

          <div className="statusbar-float-row">
            <span className="statusbar-float-icon"><span className="remix ri-text"></span></span>
            <span className="statusbar-float-value">{wordCount.toLocaleString()}</span>
            <span className="statusbar-float-unit">字</span>
          </div>

          <div className="statusbar-float-row">
            <span className="statusbar-float-icon"><span className="remix ri-hash"></span></span>
            <span className="statusbar-float-value">{charCount.toLocaleString()}</span>
            <span className="statusbar-float-unit">字符</span>
          </div>

          <div className="statusbar-float-row">
            <span className="statusbar-float-icon"><span className="remix ri-clock-line"></span></span>
            <span className="statusbar-float-value">约 {readTime}</span>
            <span className="statusbar-float-unit">分钟阅读</span>
          </div>

          <div className="statusbar-float-divider" />

          <div className="statusbar-float-row">
            <span className="statusbar-float-icon"><span className="remix ri-cursor-fill"></span></span>
            <span className="statusbar-float-value">行 {cursorPosition.line}</span>
            <span className="statusbar-float-unit">列 {cursorPosition.column}</span>
          </div>
        </div>
      )}
    </>
  )
}
