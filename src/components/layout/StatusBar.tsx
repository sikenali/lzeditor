import React, { useState, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'

interface StatusBarProps {
  className?: string
}

export const StatusBar: React.FC<StatusBarProps> = ({ className }) => {
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
  const isVertical = className === 'statusbar-vertical'

  if (isVertical) {
    return (
      <div className="statusbar statusbar-vertical">
        <div className="statusbar-logo-wrap">
          <img className="statusbar-logo" src="/logo.svg" alt="LZEditor" />
        </div>
        <div className="statusbar-v-section">
          <span className={`remix ${syncIcon}`} style={{ color: syncColor, fontSize: 14 }}></span>
          <span>{syncStatus === 'synced' ? '已保存' : syncStatus === 'saving' ? '保存中' : '失败'}</span>
        </div>
        <div className="statusbar-v-divider" />
        <div className="statusbar-v-section">
          <button className="statusbar-pill" onClick={() => setShowOutline(!showOutline)} data-title="大纲">
            <span className="remix ri-list-unordered"></span>
          </button>
          <button className="statusbar-pill" onClick={() => { const n = !showPreview; setShowPreview(n); updateSetting('previewModeEnabled', n) }} data-title="预览">
            <span className="remix ri-eye-line"></span>
          </button>
          <button className="statusbar-pill" onClick={() => setAppMode(appMode === 'style' ? 'edit' : 'style')} data-title="样式">
            <span className="remix ri-palette-fill"></span>
          </button>
        </div>
        <div className="statusbar-v-divider" />
        <div className="statusbar-v-section">
          <button className="statusbar-action" onClick={() => setShowSearch(!showSearch)} data-title="查找与替换">
            <span className="remix ri-search-line"></span>
          </button>
        </div>
        <div className="statusbar-v-divider" />
        <div className="statusbar-v-section">
          <span className="remix ri-clock-fill"></span>
          <span>{formattedTime}</span>
        </div>
        <div className="statusbar-v-section">
          <span className="remix ri-text"></span>
          <span>{wordCount.toLocaleString()} 字</span>
        </div>
        <div className="statusbar-v-section">
          <span className="remix ri-hash"></span>
          <span>{charCount.toLocaleString()} 字符</span>
        </div>
        <div className="statusbar-v-divider" />
        <div className="statusbar-v-section">
          <span className="remix ri-cursor-fill"></span>
          <span>行{cursorPosition.line} 列{cursorPosition.column}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="statusbar">
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
      <div className="statusbar-center">
        <button className={`statusbar-pill ${showOutline ? 'active' : ''}`} onClick={() => setShowOutline(!showOutline)} data-title="大纲">
          <span className="remix ri-list-unordered"></span>
        </button>
        <button className={`statusbar-pill ${showPreview ? 'active' : ''}`} onClick={() => { const n = !showPreview; setShowPreview(n); updateSetting('previewModeEnabled', n) }} data-title="预览">
          <span className="remix ri-eye-line"></span>
        </button>
        <button className={`statusbar-pill ${appMode === 'style' ? 'active' : ''}`} onClick={() => setAppMode(appMode === 'style' ? 'edit' : 'style')} data-title="样式预览">
          <span className="remix ri-palette-fill"></span>
        </button>
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
      </div>
    </div>
  )
}
