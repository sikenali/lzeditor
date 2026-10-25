import React, { useEffect, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const StatusBar: React.FC = () => {
  const wordCount      = useEditorStore(s => s.wordCount)
  const charCount      = useEditorStore(s => s.charCount)
  const cursorPosition = useEditorStore(s => s.cursorPosition)
  const syncStatus     = useEditorStore(s => s.syncStatus)
  const showSearch     = useEditorStore(s => s.showSearch)
  const setShowSearch  = useEditorStore(s => s.setShowSearch)
  const activeDocId    = useEditorStore(s => s.activeDocId)
  const lastEditTime   = useEditorStore(s => s.lastEditTime)
  const collapsed      = useEditorStore(s => s.statusbarCollapsed)
  const setCollapsed   = useEditorStore(s => s.setStatusbarCollapsed)

  const [formattedTime, setFormattedTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const d = new Date(lastEditTime)
      const pad = (n: number) => String(n).padStart(2, '0')
      setFormattedTime(`${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`)
    }
    tick()
    const timer = setInterval(tick, 30000)
    return () => clearInterval(timer)
  }, [lastEditTime])

  if (activeDocId == null) return null

  const syncLabel = syncStatus === 'synced' ? '已保存' : syncStatus === 'saving' ? '保存中…' : '保存失败'
  const syncIcon = syncStatus === 'synced' ? 'ri-check-line' : syncStatus === 'saving' ? 'ri-loader-4-line spinning' : 'ri-error-warning-line'
  const readTime = Math.max(1, Math.ceil(wordCount / 200))
  const toggleSearch = () => setShowSearch(!showSearch)
  const toggle = () => setCollapsed(!collapsed)

  return (
    <div className={`statusbar${collapsed ? ' statusbar--collapsed' : ''}`} role="status" aria-label="编辑器状态">
      {!collapsed && (
        <>
          <div className="statusbar-left">
            <span className={`statusbar-sync ${syncStatus === 'synced' ? 'synced' : syncStatus === 'saving' ? 'saving' : 'failed'}`}>
              <span className={`remix ${syncIcon}`}></span>
              <span>{syncLabel}</span>
            </span>
            <span className="statusbar-divider" />
            <span className="statusbar-item">
              <span className="remix ri-clock-fill"></span>
              <span>{formattedTime}</span>
            </span>
          </div>

          <div className="statusbar-right">
            <span className="statusbar-item">
              <span className="remix ri-text"></span>
              <span>{wordCount.toLocaleString()} 字</span>
            </span>
            <span className="statusbar-divider" />
            <span className="statusbar-item">
              <span className="remix ri-hash"></span>
              <span>{charCount.toLocaleString()} 字符</span>
            </span>
            <span className="statusbar-divider" />
            <span className="statusbar-item">
              <span className="remix ri-clock-line"></span>
              <span>约 {readTime} 分钟</span>
            </span>
            <span className="statusbar-divider" />
            <span className="statusbar-item">
              <span className="remix ri-cursor-fill"></span>
              <span>行 {cursorPosition.line} 列 {cursorPosition.column}</span>
            </span>
            <button
              className={`statusbar-action${showSearch ? ' active' : ''}`}
              data-title="查找与替换"
              onClick={toggleSearch}
            >
              <span className="remix ri-search-line"></span>
            </button>
          </div>
        </>
      )}

      <button
        className="statusbar-collapse"
        data-title={collapsed ? '展开状态栏' : '收起状态栏'}
        onClick={toggle}
      >
        <span className={`remix ${collapsed ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></span>
      </button>
    </div>
  )
}
