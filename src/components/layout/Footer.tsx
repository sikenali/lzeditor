import React, { useEffect, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { pluginRegistries } from '../../plugins'
import { usePluginRegistry } from '../../plugins'

export const Footer: React.FC = () => {
  const showOutline = useEditorStore(s => s.showOutline)
  const showPreview = useEditorStore(s => s.showPreview)
  const appMode = useEditorStore(s => s.appMode)
  const setShowOutline = useEditorStore(s => s.setShowOutline)
  const setShowPreview = useEditorStore(s => s.setShowPreview)
  const setAppMode = useEditorStore(s => s.setAppMode)
  const updateSetting = useSettingsStore(s => s.updateSetting)

  // ── 状态信息（原 StatusBar 迁入页脚右侧，挨着显示）──
  const wordCount      = useEditorStore(s => s.wordCount)
  const charCount      = useEditorStore(s => s.charCount)
  const cursorPosition = useEditorStore(s => s.cursorPosition)
  const syncStatus     = useEditorStore(s => s.syncStatus)
  const showSearch     = useEditorStore(s => s.showSearch)
  const setShowSearch  = useEditorStore(s => s.setShowSearch)
  const activeDocId    = useEditorStore(s => s.activeDocId)
  const lastEditTime   = useEditorStore(s => s.lastEditTime)

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

  const syncLabel = syncStatus === 'synced' ? '已保存' : syncStatus === 'saving' ? '保存中…' : '保存失败'
  const syncIcon = syncStatus === 'synced' ? 'ri-check-line' : syncStatus === 'saving' ? 'ri-loader-4-line spinning' : 'ri-error-warning-line'
  const readTime = Math.max(1, Math.ceil(wordCount / 200))
  const toggleSearch = () => setShowSearch(!showSearch)

  // ── 插件状态项（纯增量：追加到状态信息之后，版权之前）──
  const pluginStatusItems = usePluginRegistry(pluginRegistries.statusItems)

  return (
    <footer className="app-footer">
      <div className="app-footer-left">
        <img className="app-footer-logo" src="/logo.svg" alt="懒猫编辑器" />
        <span>懒猫编辑器</span>
      </div>

      {/* 大纲 / 即时预览 / 样式预览 —— 居中显示 */}
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

      {/* 右侧：状态信息（statusbar-left + statusbar-right）挨着版权 */}
      <div className="app-footer-right">
        {activeDocId != null && (
          <>
            <div className="statusbar-left">
              <span className={`statusbar-sync ${syncStatus === 'synced' ? 'synced' : syncStatus === 'saving' ? 'saving' : 'failed'}`}>
                <span className={`remix ${syncIcon}`}></span>
                <span>{syncLabel}</span>
              </span>
              <span className="statusbar-divider" />
              <span className="statusbar-item">
                <span className="remix ri-time-fill"></span>
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
                <span className="remix ri-hashtag"></span>
                <span>{charCount.toLocaleString()} 字符</span>
              </span>
              <span className="statusbar-divider" />
              <span className="statusbar-item">
                <span className="remix ri-time-line"></span>
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

            <span className="statusbar-divider" />
          </>
        )}
        {/* 插件状态项插槽：挨着现有状态信息显示 */}
        {pluginStatusItems.map(item => (
          <span key={item.id} className="statusbar-item">
            {item.render()}
          </span>
        ))}
        <span>© 2026 Powered by <a href="https://lazycat.cloud/" target="_blank" rel="noopener noreferrer" className="app-footer-link">LightOS</a></span>
      </div>
    </footer>
  )
}
