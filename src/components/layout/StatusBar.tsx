import React, { useState, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'

interface StatusBarProps {
  vertical?: boolean
}

export const StatusBar: React.FC<StatusBarProps> = ({ vertical }) => {
  const wordCount      = useEditorStore(s => s.wordCount)
  const charCount      = useEditorStore(s => s.charCount)
  const cursorPosition = useEditorStore(s => s.cursorPosition)
  const syncStatus     = useEditorStore(s => s.syncStatus)
  const showOutline    = useEditorStore(s => s.showOutline)
  const showPreview    = useEditorStore(s => s.showPreview)
  const setShowOutline = useEditorStore(s => s.setShowOutline)
  const setShowPreview = useEditorStore(s => s.setShowPreview)
  const appMode        = useEditorStore(s => s.appMode)
  const setAppMode     = useEditorStore(s => s.setAppMode)
  const updateSetting  = useSettingsStore(s => s.updateSetting)
  const lastEditTime   = useEditorStore(s => s.lastEditTime)
  const showSearch     = useEditorStore(s => s.showSearch)
  const setShowSearch  = useEditorStore(s => s.setShowSearch)

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

  if (vertical) {
    return (
      <div className="statusbar statusbar--vertical">
        {/* Logo & sync */}
        <div className="statusbar-section">
          <img className="statusbar-logo" src="/logo.svg" alt="LZEditor" />
          <div className="statusbar-sync">
            <span className={`remix ${syncIcon}`} style={{ color: syncColor }}></span>
            <span className="statusbar-sync-text">{syncStatus === 'synced' ? '已保存' : syncStatus === 'saving' ? '实时保存中' : '保存失败'}</span>
          </div>
        </div>

        <div className="statusbar-divider-v" />

        {/* Toggles */}
        <div className="statusbar-section">
          <button className={`statusbar-pill ${showOutline ? 'active' : ''}`} onClick={() => setShowOutline(!showOutline)} title="大纲">
            <span className="remix ri-list-unordered"></span>
          </button>
          <button className={`statusbar-pill ${showPreview ? 'active' : ''}`} onClick={() => { const n = !showPreview; setShowPreview(n); updateSetting('previewModeEnabled', n) }} title="预览">
            <span className="remix ri-eye-line"></span>
          </button>
          <button className={`statusbar-pill ${appMode === 'style' ? 'active' : ''}`} onClick={() => setAppMode(appMode === 'style' ? 'edit' : 'style')} title="样式">
            <span className="remix ri-palette-fill"></span>
          </button>
        </div>

        <div className="statusbar-divider-v" />

        {/* Search */}
        <div className="statusbar-section">
          <button className={`statusbar-action ${showSearch ? 'active' : ''}`} title="查找与替换" onClick={() => setShowSearch(!showSearch)}>
            <span className="remix ri-search-line"></span>
          </button>
        </div>

        <div className="statusbar-divider-v" />

        {/* Stats */}
        <div className="statusbar-section">
          <div className="statusbar-item"><span className="remix ri-clock-fill"></span><span>{formattedTime}</span></div>
          <div className="statusbar-divider" />
          <div className="statusbar-item"><span className="remix ri-text"></span><span>{wordCount.toLocaleString()} 字</span></div>
          <div className="statusbar-divider" />
          <div className="statusbar-item"><span className="remix ri-hash"></span><span>{charCount.toLocaleString()} 字符</span></div>
          <div className="statusbar-divider" />
          <div className="statusbar-item"><span className="remix ri-cursor-fill"></span><span>行 {cursorPosition.line} 列 {cursorPosition.column}</span></div>
        </div>
      </div>
    )
  }

  return (
    <div className="statusbar">
      {/* Left */}
      <div className="statusbar-left">
        <img className="statusbar-logo" src="/logo.svg" alt="LZEditor" />
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

      {/* Center: 大纲 | 预览 | 样式 */}
      <div className="statusbar-center">
        <button className={`statusbar-pill ${showOutline ? 'active' : ''}`} onClick={() => setShowOutline(!showOutline)} title="显示/隐藏大纲">
          <span className="remix ri-list-unordered"></span>
        </button>
        <button className={`statusbar-pill ${showPreview ? 'active' : ''}`} onClick={() => { const n = !showPreview; setShowPreview(n); updateSetting('previewModeEnabled', n) }} title="显示/隐藏预览">
          <span className="remix ri-eye-line"></span>
        </button>
        <button className={`statusbar-pill ${appMode === 'style' ? 'active' : ''}`} onClick={() => setAppMode(appMode === 'style' ? 'edit' : 'style')} title="样式预览">
          <span className="remix ri-palette-fill"></span>
        </button>
      </div>

      {/* Right */}
      <div className="statusbar-right">
        <button className={`statusbar-action ${showSearch ? 'active' : ''}`} title="查找与替换" onClick={() => setShowSearch(!showSearch)}>
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
      </div>
    </div>
  )
}
