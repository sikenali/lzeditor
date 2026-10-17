import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'

export const Footer: React.FC = () => {
  const showOutline = useEditorStore(s => s.showOutline)
  const showPreview = useEditorStore(s => s.showPreview)
  const appMode = useEditorStore(s => s.appMode)
  const setShowOutline = useEditorStore(s => s.setShowOutline)
  const setShowPreview = useEditorStore(s => s.setShowPreview)
  const setAppMode = useEditorStore(s => s.setAppMode)
  const updateSetting = useSettingsStore(s => s.updateSetting)

  return (
    <footer className="app-footer">
      <div className="app-footer-left">
        <img className="app-footer-logo" src="/logo.svg" alt="懒猫编辑器" />
        <span>懒猫编辑器</span>
      </div>
      <div className="app-footer-center">
        <button className="app-footer-btn" data-title="大纲" onClick={() => setShowOutline(!showOutline)}>
          <span className="remix ri-list-unordered"></span>
        </button>
        <button className="app-footer-btn" data-title="即时预览"
          onClick={() => { const n = !showPreview; setShowPreview(n); updateSetting('previewModeEnabled', n) }}>
          <span className="remix ri-eye-line"></span>
        </button>
        <button className="app-footer-btn" data-title="样式预览"
          onClick={() => setAppMode(appMode === 'style' ? 'edit' : 'style')}>
          <span className="remix ri-palette-fill"></span>
        </button>
      </div>
      <div className="app-footer-right">
        <span>© 2026 懒猫编辑器</span> Powered by <a href="https://lazycat.cloud/" target="_blank" rel="noopener noreferrer" className="app-footer-link">LightOS</a>
      </div>
    </footer>
  )
}
