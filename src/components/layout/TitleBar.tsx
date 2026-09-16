import React from 'react'
import { useEditorStore } from '../../store/editorStore'

export const TitleBar: React.FC = () => {
  const docTitle = useEditorStore((s: any) => s.docTitle)
  const syncStatus = useEditorStore((s: any) => s.syncStatus)
  const isElectron = typeof window !== 'undefined' && window.electronAPI
  const isMac = typeof window !== 'undefined' && window.electronAPI?.platform === 'darwin'

  const handleMinimize = () => {
    if (isElectron) { window.electronAPI.minimize() }
  }

  const handleMaximize = () => {
    if (isElectron) { window.electronAPI.maximize() }
  }

  const handleClose = () => {
    if (isElectron) { window.electronAPI.close() }
  }

  return (
    <div className="titlebar">
      <div className="titlebar-controls">
        {isMac && <span className="titlebar-btn close" onClick={handleClose} style={{ cursor: 'pointer' }} />}
        {isMac && <span className="titlebar-btn min" onClick={handleMinimize} style={{ cursor: 'pointer' }} />}
        {isMac && <span className="titlebar-btn max" onClick={handleMaximize} style={{ cursor: 'pointer' }} />}
        {!isMac && (
          <>
            <span className="titlebar-btn min" onClick={handleMinimize} style={{ cursor: 'pointer' }} title="最小化" />
            <span className="titlebar-btn close" onClick={handleClose} style={{ cursor: 'pointer' }} title="关闭" />
          </>
        )}
      </div>
      <div className="titlebar-drag-region">
        <div className="titlebar-title">
          <span className="remix titlebar-logo ri-ball-pen-fill"></span>
          <span>{docTitle}</span>
        </div>
        <div className="titlebar-actions">
          <div className={`sync-status ${syncStatus}`}>
            <span className="sync-dot" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {syncStatus === 'synced' ? '已自动保存' : syncStatus === 'saving' ? '保存中...' : '保存失败'}
            </span>
          </div>
          <button className="titlebar-btn-icon" title="更多">
            <span className="remix ri-menu-fill"></span>
          </button>
        </div>
      </div>
    </div>
  )
}
