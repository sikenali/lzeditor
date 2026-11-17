import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { mdToHtml } from '../../utils/mdToHtml'
import { parseMdOutline } from '../../utils/mdOutline'
import { registerOutlineJumper, clearOutlineJumper } from '../../utils/outlineJump'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getTypographyTheme, TYPOGRAPHY_THEMES } from '../../styles/typography-themes'
import { useScrollSpy } from '../../hooks/useScrollSpy'
import { DEFAULT_CONTENT } from '../../components/editor/constants'
import { getDocMd, getDocHtml } from '../../utils/docSource'
import { copyRichText } from '../../clipboard'
import { ExportDialog } from './ExportDialog'

export const StyleMainPanel: React.FC = () => {
  const docHTML = useEditorStore((s) => s.docHTML)
  const mdContent = useEditorStore((s: any) => s.mdContent || '')
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const activeDocId = useEditorStore((s) => s.activeDocId)
  const typographyTheme = useSettingsStore((s) => s.typographyTheme)
  // 阅读字号跟随阅读模式的 readFontSize（12~24 可调），而不是写死的 17
  const fontSize = useEditorStore((s) => s.readFontSize)
  const setAppMode = useEditorStore((s) => s.setAppMode)
  const updateSetting = useSettingsStore(s => s.updateSetting)
  const activeTocId = useEditorStore((s) => s.activeTocId)
  const setActiveTocId = useEditorStore((s) => s.setActiveTocId)

  const bodyRef = useRef<HTMLDivElement>(null)
  const [activeStyle, setActiveStyle] = useState(typographyTheme || 'classic')
  const [previewVisible, setPreviewVisible] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [styleMenuOpen, setStyleMenuOpen] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current) }
  }, [])

  const handleCopyWechat = async () => {
    if (!renderedHtml) return
    const ok = await copyRichText(renderedHtml)
    if (ok) {
      setCopied(true)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }

  // ── Chapter navigation ──
  interface Chapter { id: string; text: string; level: number }
  const [chapters, setChapters] = useState<Chapter[]>([])
  const chaptersRef = useRef<Chapter[]>([])
  chaptersRef.current = chapters
  const chapterItems = useMemo(
    () => chapters.map(c => ({ id: c.id, text: c.text, el: document.getElementById(c.id) })),
    [chapters]
  )
  const { scrollTo: scrollToChapter } = useScrollSpy({
    items: chapterItems,
    activeId: activeTocId,
    setActiveId: setActiveTocId,
    container: bodyRef.current,
  })

  const handlePrevChapter = useCallback(() => {
    const items = chaptersRef.current
    const active = items.find(c => c.id === activeTocId)
    const idx = active ? items.indexOf(active) : -1
    if (idx > 0) scrollToChapter(items[idx - 1].id)
  }, [activeTocId, scrollToChapter])

  const handleNextChapter = useCallback(() => {
    const items = chaptersRef.current
    const active = items.find(c => c.id === activeTocId)
    const idx = active ? items.indexOf(active) : -1
    if (idx >= 0 && idx < items.length - 1) scrollToChapter(items[idx + 1].id)
  }, [activeTocId, scrollToChapter])

  const effectiveMd = useMemo(() => {
    if (mdContent) return mdContent
    if (docsMd[activeDocId || 'readme']) return docsMd[activeDocId || 'readme']
    return getDocMd(activeDocId || 'readme')
  }, [activeDocId, mdContent, docsMd])

  const renderedHtml = useMemo(() => {
    if (!effectiveMd) return ''
    try { return mdToHtml(effectiveMd) } catch { return effectiveMd }
  }, [effectiveMd])

  const initialHtml = useMemo(() => {
    if (docHTML) return docHTML
    return getDocHtml(activeDocId || 'readme')
  }, [docHTML, activeDocId])

  const defaultHtml = useMemo(() => {
    try {
      return mdToHtml(DEFAULT_CONTENT)
    } catch {
      return DEFAULT_CONTENT
    }
  }, [])

  const [effectiveHtml, setEffectiveHtml] = useState(initialHtml || defaultHtml)
  useEffect(() => {
    setEffectiveHtml(docHTML || initialHtml || defaultHtml)
  }, [docHTML, initialHtml, defaultHtml])

  // ── Extract chapters from markdown outline ──
  // parseMdOutline 的 id 与 mdToHtml 渲染锚点一致（同一 headingId），滚动同步直接可用。
  const outlineItems = useMemo(() => parseMdOutline(effectiveMd), [effectiveMd])
  useEffect(() => {
    setChapters(outlineItems.map(item => ({ id: item.id, text: item.text, level: item.level })))
  }, [outlineItems])

  // 统一大纲面板的跳转回调：ref 持有最新 scrollToChapter，挂载注册一次、卸载清理。
  // scrollToChapter 内部按 id 直取 DOM、直接置 activeTocId 并抑制滚动期间覆盖，落点不再影响高亮。
  const jumperRef = useRef<(id: string) => void>(() => {})
  jumperRef.current = (id) => {
    scrollToChapter(id)
  }
  useEffect(() => {
    registerOutlineJumper((id) => jumperRef.current(id))
    return () => clearOutlineJumper()
  }, [])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const theme = getTypographyTheme(typographyTheme || 'classic')
    if (theme && el) {
      el.style.cssText = ''
      const css = theme.css
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.(lz-editor-content|read-article-body|preview-doc|export-preview-body)/g, '.read-article-body')
      const styleEl = document.getElementById('lz-styleread-typography-css') as HTMLStyleElement | null
      if (styleEl) styleEl.remove()
      const styleTag = document.createElement('style')
      styleTag.id = 'lz-styleread-typography-css'
      styleTag.textContent = css
      document.head.appendChild(styleTag)
    }
  }, [typographyTheme, effectiveHtml])

  const activeStyleData = TYPOGRAPHY_THEMES.find(t => t.id === activeStyle) ?? TYPOGRAPHY_THEMES[0]

  const handleFullscreen = () => {
    const el = document.documentElement
    if (!el.requestFullscreen) return
    if (!document.fullscreenElement) el.requestFullscreen()
    else document.exitFullscreen()
  }

  const handleScrollTop = () => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <div className="style-main-panel">
        <div className="read-mode-body" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* ── Read content area ── */}
        <div ref={bodyRef} className="style-read-scroll">
          <div className="style-read-article" style={{ maxWidth: 760 }}>
            <div className="main-read-header">
              <div className="main-read-tags">
                <span className="read-tag read-tag-tech">Markdown</span>
                <button className="sidebar-wechat-btn" onClick={handleCopyWechat} title="一键复制为公众号可用富文本">
                  <span className={`remix ${copied ? 'ri-check-line' : 'ri-wechat-fill'}`}></span>
                  {copied ? '已复制' : '公众号'}
                </button>
              </div>
            </div>
            <div
              className="read-article-body"
              style={{ fontSize: `${fontSize}px`, lineHeight: '1.9', '--style-accent': activeStyleData.color } as React.CSSProperties}
              dangerouslySetInnerHTML={{ __html: renderedHtml || '<p style="color:var(--text-muted);text-align:center;padding:60px;">暂无内容</p>' }}
            />
          </div>
        </div>
        </div>
        <div className={`main-nav-float${previewVisible ? '' : ' nav-hidden'}`}>
          <button className="nav-float-btn" title="上一章" onClick={handlePrevChapter}>
            <span className="remix ri-arrow-left-s-line"></span>
          </button>
          <button className="nav-float-btn" title="下一章" onClick={handleNextChapter}>
            <span className="remix ri-arrow-right-s-line"></span>
          </button>
          <button className="nav-float-btn" title="回到顶部" onClick={handleScrollTop}>
            <span className="remix ri-arrow-up-s-line"></span>
          </button>
          <button className="nav-float-btn" title="全屏" onClick={handleFullscreen}>
            <span className="remix ri-fullscreen-line"></span>
          </button>
        </div>
        <div className="style-panel">
          <div className="style-panel-inner">
            {/* Toolbar */}
            <div className="style-toolbar">
              <div className="style-label-group">
                <span className="style-label-text">文档样式:</span>
                <div className="style-select-wrap">
                  <button className="style-select-btn" onClick={() => setStyleMenuOpen(v => !v)}>
                    <span>{activeStyleData.name}</span>
                    <span className="remix ri-arrow-down-s-line"></span>
                  </button>
                  {styleMenuOpen && (
                    <>
                      <div className="style-select-backdrop" onClick={() => setStyleMenuOpen(false)} />
                      <div className="style-select-menu">
                        {TYPOGRAPHY_THEMES.map(t => (
                          <button
                            key={t.id}
                            className={`style-select-item${t.id === activeStyle ? ' active' : ''}`}
                            onClick={() => { setActiveStyle(t.id); updateSetting('typographyTheme', t.id); setStyleMenuOpen(false) }}
                          >
                            <span className="style-select-dot" style={{ background: t.color }} />
                            <span>{t.name}</span>
                            {t.id === activeStyle && <span className="remix ri-check-line style-select-check"></span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button className="style-action-btn" title={previewVisible ? '隐藏预览' : '显示预览'} onClick={() => setPreviewVisible(v => !v)}>
                <span className={`remix ${previewVisible ? 'ri-eye-off-line' : 'ri-eye-line'}`}></span>
                <span>{previewVisible ? '隐藏' : '显示'}</span>
              </button>
              <button className="style-action-btn" title="导出样式" onClick={() => setExportOpen(true)}>
                <span className="remix ri-download-2-line"></span>
                <span>导出</span>
              </button>
              <button className="style-action-btn" onClick={() => setAppMode('edit')} title="关闭">
                <span className="remix ri-close-line"></span>
                <span>关闭</span>
              </button>
            </div>

            {/* Style cards */}
            <div className={`style-cards-wrapper${previewVisible ? '' : ' preview-collapsed'}`}>
              <div className="style-cards-inner">
                <div className="style-cards">
                  {TYPOGRAPHY_THEMES.map(t => (
                    <button
                      key={t.id}
                      className={`style-card${t.id === activeStyle ? ' active' : ''}`}
                      onClick={() => { setActiveStyle(t.id); updateSetting('typographyTheme', t.id) }}
                    >
                      <div
                        className="style-card-thumb"
                        style={{
                          borderColor: t.id === activeStyle ? t.color : 'rgba(204,204,204,1)',
                          background: t.id === 'night' ? '#1a1b26' : '#fff',
                        }}
                      >
                        <div
                          className="style-card-preview"
                          data-typography-theme={t.id}
                          style={{ fontSize: 5, lineHeight: 1.4, color: t.id === 'night' ? '#c6cade' : '#333', padding: '2px 3px' }}
                        >
                          <div style={{ fontSize: 6, fontWeight: 600, color: t.color, marginBottom: 1 }}>{t.name}</div>
                          <div style={{ fontSize: 4.5, color: 'rgba(128,128,128,0.7)', borderBottom: `1px solid ${t.color}33`, paddingBottom: 1, marginBottom: 1 }}>二级标题装饰</div>
                          <div style={{ fontSize: 4.5, color: 'rgba(80,80,80,0.8)' }}>正文文字样例·<code style={{ background: `${t.color}18`, color: t.color, padding: '0 2px', borderRadius: 1, fontSize: 4 }}>代码</code></div>
                          <div style={{ fontSize: 4.5, color: 'rgba(80,80,80,0.6)', marginTop: 1 }}>引用文字样例</div>
                        </div>
                      </div>
                      <div className="style-card-name" style={t.id === activeStyle ? { color: t.color } : undefined}>
                        {t.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} styleId={activeStyle} />}
    </>
  )
}
