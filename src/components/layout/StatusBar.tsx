import React, { useState, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { TYPOGRAPHY_THEMES, applyTypographyTheme } from '../../styles/typography-themes'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

export const StatusBar: React.FC = () => {
  const wordCount = useEditorStore(s => s.wordCount)
  const charCount = useEditorStore(s => s.charCount)
  const cursorPosition = useEditorStore(s => s.cursorPosition)
  const syncStatus = useEditorStore(s => s.syncStatus)
  const mdContent = useEditorStore(s => s.mdContent)
  const editor = useEditorStore(s => s.editor)
  const showOutline = useEditorStore(s => s.showOutline)
  const showPreview = useEditorStore(s => s.showPreview)
  const setShowOutline = useEditorStore(s => s.setShowOutline)
  const setShowPreview = useEditorStore(s => s.setShowPreview)
  const setDocHTML = useEditorStore(s => s.setDocHTML)
  const setMdContent = useEditorStore(s => s.setMdContent)
  const lastEditTime = useEditorStore(s => s.lastEditTime)
  const updateSetting = useSettingsStore(s => s.updateSetting)
  const [searchOpen, setSearchOpen] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')

  const typographyTheme = useSettingsStore(s => s.typographyTheme || 'classic')
  const [themeIdx, setThemeIdx] = useState(() => {
    const idx = TYPOGRAPHY_THEMES.findIndex(t => t.id === typographyTheme)
    return idx >= 0 ? idx : 0
  })
  const [elapsed, setElapsed] = useState(0)

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
    setShowOutline(!showOutline)
  }

  const togglePreview = () => {
    const next = !showPreview
    setShowPreview(next)
    updateSetting('previewModeEnabled', next)
  }

  const handleFind = () => {
    if (!findText.trim()) return
    editor?.view?.dom?.focus()
    (window as any).find(findText)
  }

  const replaceInMarkdown = (all: boolean) => {
    if (!findText) return
    const nextMd = all
      ? mdContent.split(findText).join(replaceText)
      : mdContent.replace(findText, replaceText)
    const html = remark().use(remarkGfm).use(remarkHtml).processSync(nextMd).toString()
    setMdContent(nextMd)
    setDocHTML(html)
    editor?.commands.setContent(html)
  }

  const editingText = elapsed < 60 ? '刚刚'
    : elapsed < 3600 ? `${Math.floor(elapsed / 60)} 分钟前`
    : `${Math.floor(elapsed / 3600)}小时${Math.floor((elapsed % 3600) / 60)}分钟前`

  const syncIcon = syncStatus === 'synced' ? 'ri-check-line' : syncStatus === 'saving' ? 'ri-loader-4-line ri-spin' : 'ri-error-warning-line'
  const syncColor = syncStatus === 'synced' ? 'var(--accent-primary)' : syncStatus === 'saving' ? 'var(--text-muted)' : 'var(--accent-red)'

  return (
    <div className="statusbar">
      {/* Left: logo + document state */}
      <div className="statusbar-left">
        <img className="statusbar-logo" src="/logo.svg" alt="LZEditor" />
        <div className="statusbar-sync">
          <span className={`remix ${syncIcon}`} style={{ color: syncColor }}></span>
          <span className="statusbar-sync-text">{syncStatus === 'synced' ? '已保存' : syncStatus === 'saving' ? '实时保存中' : '保存失败'}</span>
        </div>
        <div className="statusbar-divider" />
        <div className="statusbar-item">
          <span className="remix ri-text"></span>
          <span>{wordCount.toLocaleString()} 字</span>
        </div>
        <div className="statusbar-item">
          <span className="remix ri-hashtag"></span>
          <span>{charCount.toLocaleString()} 字符</span>
        </div>
      </div>

      {/* Center: outline toggle */}
      <div className="statusbar-center">
        <div className="statusbar-divider" />
        <button className="statusbar-pill" onClick={cycleTheme} title={`切换排版样式（当前: ${TYPOGRAPHY_THEMES[themeIdx]?.name}）`}>
          <span className="remix ri-font-size"></span>
          <span>{TYPOGRAPHY_THEMES[themeIdx]?.name}</span>
        </button>
        <button className={`statusbar-pill ${showOutline ? 'active' : ''}`} onClick={handleCollapse} title="显示/隐藏大纲">
          <span className="remix ri-list-unordered"></span>
          <span>大纲</span>
        </button>
      </div>

      {/* Right: search + preview + line/col */}
      <div className="statusbar-right">
        <button className="statusbar-action" title="查找与替换" onClick={() => setSearchOpen(true)}>
          <span className="remix ri-search-line"></span>
          <span>查找</span>
        </button>
        <button className="statusbar-action" title="显示/隐藏预览" onClick={togglePreview}>
          <span className={`remix ${showPreview ? 'ri-eye-off-line' : 'ri-eye-line'}`}></span>
          <span>{showPreview ? '隐藏预览' : '预览'}</span>
        </button>
        <div className="statusbar-divider" />
        <div className="statusbar-badge">
          <span className="remix ri-cursor-line" style={{ marginRight: 4, fontSize: 11 }}></span>
          行 {cursorPosition.line}，列 {cursorPosition.column}
        </div>
        <div className="statusbar-divider" />
        <div className="statusbar-item">
          <span className="remix ri-edit-fill"></span>
          <span>{editingText}</span>
        </div>
      </div>
      {searchOpen && (
        <div className="modal-overlay" onClick={() => setSearchOpen(false)}>
          <div className="search-dialog" onClick={e => e.stopPropagation()}>
            <div className="search-dialog-header">
              <div className="export-title">
                <span className="remix export-icon ri-search-line"></span>
                <div>
                  <div className="export-title-text">查找与替换</div>
                  <div className="export-title-desc">在当前 Markdown 文档中搜索文本</div>
                </div>
              </div>
              <button className="settings-close-btn" onClick={() => setSearchOpen(false)}>
                <span className="remix ri-close-line"></span>
              </button>
            </div>
            <div className="search-dialog-body">
              <label className="export-label">查找</label>
              <input className="lfs-input" value={findText} onChange={e => setFindText(e.target.value)} autoFocus />
              <label className="export-label">替换为</label>
              <input className="lfs-input" value={replaceText} onChange={e => setReplaceText(e.target.value)} />
            </div>
            <div className="export-footer">
              <div className="export-hint">
                <span className="remix ri-information-line"></span>
                <span>替换会更新当前文档内容</span>
              </div>
              <div className="export-actions">
                <button className="settings-cancel-btn" onClick={handleFind}>查找下一个</button>
                <button className="settings-cancel-btn" onClick={() => replaceInMarkdown(false)}>替换</button>
                <button className="settings-save-btn" onClick={() => replaceInMarkdown(true)}>全部替换</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
