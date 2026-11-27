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

  // ── 状态信息（原 StatusBar 迁入页脚右侧，挨着显示）──
  const wordCount      = useEditorStore(s => s.wordCount)
  const charCount      = useEditorStore(s => s.charCount)
  const cursorPosition = useEditorStore(s => s.cursorPosition)
  const showSearch     = useEditorStore(s => s.showSearch)
  const setShowSearch  = useEditorStore(s => s.setShowSearch)
  const activeDocId    = useEditorStore(s => s.activeDocId)
  const showWelcome    = useEditorStore(s => s.showWelcome)
  const noDoc = showWelcome || activeDocId == null

  const readTime = wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / 200))
  const toggleSearch = () => setShowSearch(!showSearch)

  return (
    <footer className="app-footer">
      <div className="app-footer-left">
        <button
          type="button"
          className="app-footer-brand"
          onClick={() => useEditorStore.getState().setShowWelcome(true)}
          title="返回初始化界面"
          aria-label="返回初始化界面"
        >
          <img className="app-footer-logo" src="/logo.svg" alt="懒猫编辑器" />
          <span>懒猫编辑器</span>
        </button>
        <span className="app-footer-copy">© 2026 Powered by <a href="https://lazycat.cloud/" target="_blank" rel="noopener noreferrer" className="app-footer-link">LightOS</a></span>
      </div>

      {/* 大纲 / 即时预览 / 样式预览 —— 居中显示 */}
      <div className="app-footer-center">
        <button className="app-footer-btn" data-title="大纲" disabled={noDoc} onClick={() => setShowOutline(!showOutline)}>
          <span className="remix ri-list-unordered"></span>
        </button>
        <button className="app-footer-btn" data-title="即时预览" disabled={noDoc}
          onClick={() => { const n = !showPreview; setShowPreview(n); updateSetting('previewModeEnabled', n) }}>
          <span className="remix ri-eye-line"></span>
        </button>
        <button className="app-footer-btn" data-title="样式预览" disabled={noDoc}
          onClick={() => setAppMode(appMode === 'style' ? 'edit' : 'style')}>
          <span className="remix ri-palette-fill"></span>
        </button>
      </div>

      {/* 右侧：状态信息常显（即使关闭最后一个文档、没有 activeDocId 也要显示） */}
      <div className="app-footer-right">
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
      </div>
    </footer>
  )
}
