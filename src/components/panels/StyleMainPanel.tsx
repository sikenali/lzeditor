import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getTypographyTheme, TYPOGRAPHY_THEMES } from '../../styles/typography-themes'
import { useScrollSpy } from '../../hooks/useScrollSpy'
import { DEFAULT_CONTENT } from '../../components/editor/constants'
import { getDocMd, getDocHtml } from '../../utils/docSource'
import { copyRichText } from '../../clipboard'
import { ExportDialog } from './ExportDialog'
import { renderMdWithMath } from '../../utils/mdWithMath'

export const StyleMainPanel: React.FC = () => {
  const docTitle = useEditorStore((s) => s.docTitle)
  const docHTML = useEditorStore((s) => s.docHTML)
  const mdContent = useEditorStore((s: any) => s.mdContent || '')
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const activeDocId = useEditorStore((s) => s.activeDocId)
  const typographyTheme = useSettingsStore((s) => s.typographyTheme)
  const fontSize = useEditorStore((s) => s.fontSize)
  const setAppMode = useEditorStore((s) => s.setAppMode)
  const updateSetting = useSettingsStore.getState().updateSetting
  const readFontSize = useEditorStore((s) => s.readFontSize)
  const setReadFontSize = useEditorStore((s) => s.setReadFontSize)
  const readLayout = useEditorStore((s) => s.readLayout)
  const setReadLayout = useEditorStore((s) => s.setReadLayout)
  const readTocOpen = useEditorStore((s) => s.readTocOpen)
  const setReadTocOpen = useEditorStore((s) => s.setReadTocOpen)
  const storeTocItems = useEditorStore((s) => s.tocItems)
  const activeTocId = useEditorStore((s) => s.activeTocId)
  const setActiveTocId = useEditorStore((s) => s.setActiveTocId)

  const bodyRef = useRef<HTMLDivElement>(null)
  const [activeStyle, setActiveStyle] = useState(typographyTheme || 'classic')
  const [previewVisible, setPreviewVisible] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const [copied, setCopied] = useState(false)
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
  const [activeChapterId, setActiveChapterId] = useState<string>('')
  const chapterItems = useMemo(
    () => chapters.map(c => ({ id: c.id, text: c.text, el: document.getElementById(c.id) })),
    [chapters]
  )
  const { scrollTo: scrollToChapter } = useScrollSpy({
    items: chapterItems,
    activeId: activeChapterId,
    setActiveId: setActiveChapterId,
    container: bodyRef.current,
  })

  const handlePrevChapter = useCallback(() => {
    const items = chaptersRef.current
    const active = items.find(c => c.id === activeChapterId)
    const idx = active ? items.indexOf(active) : -1
    if (idx > 0) scrollToChapter(items[idx - 1].id)
  }, [activeChapterId, scrollToChapter])

  const handleNextChapter = useCallback(() => {
    const items = chaptersRef.current
    const active = items.find(c => c.id === activeChapterId)
    const idx = active ? items.indexOf(active) : -1
    if (idx >= 0 && idx < items.length - 1) scrollToChapter(items[idx + 1].id)
  }, [activeChapterId, scrollToChapter])

  const effectiveMd = useMemo(() => {
    if (mdContent) return mdContent
    if (docsMd[activeDocId || 'welcome']) return docsMd[activeDocId || 'welcome']
    return getDocMd(activeDocId || 'welcome')
  }, [activeDocId, mdContent, docsMd])

  const renderedHtml = useMemo(() => {
    if (!effectiveMd) return ''
    try { return renderMdWithMath(effectiveMd) } catch { return effectiveMd }
  }, [effectiveMd])

  const initialHtml = useMemo(() => {
    if (docHTML) return docHTML
    return getDocHtml(activeDocId || 'welcome')
  }, [docHTML, activeDocId])

  const defaultHtml = useMemo(() => {
    try {
      return remark().use(remarkGfm).use(remarkHtml).processSync(DEFAULT_CONTENT).toString()
    } catch {
      return DEFAULT_CONTENT
    }
  }, [])

  const [effectiveHtml, setEffectiveHtml] = useState(initialHtml || defaultHtml)
  useEffect(() => {
    setEffectiveHtml(docHTML || initialHtml || defaultHtml)
  }, [docHTML, initialHtml, defaultHtml])

  // ── Extract chapters from rendered headings ──
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const headings = el.querySelectorAll('h1,h2,h3,h4,h5,h6')
    const items: Chapter[] = []
    headings.forEach((h, i) => {
      const id = `style-h-${i}`
      h.setAttribute('id', id)
      items.push({ id, text: h.textContent?.trim() || '', level: parseInt(h.tagName[1]) })
    })
    setChapters(items)
  }, [renderedHtml, effectiveHtml])

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
        <div className="read-mode-body" style={{ flexDirection: readTocOpen ? 'row' : 'column', flex: 1, minHeight: 0, display: 'flex' }}>
          {readTocOpen && storeTocItems.length > 0 && (
            <div className="read-toc-sidebar">
              <div className="read-toc-header">
                <span className="remix ri-menu-fill"></span>
                <span>目录</span>
                <button className="read-toc-close" onClick={() => setReadTocOpen(false)}>
                  <span className="remix ri-close-line"></span>
                </button>
              </div>
              <div className="read-toc-list">
                {storeTocItems.map(item => (
                  <button
                    key={item.id}
                    className={`read-toc-item${item.id === activeTocId ? ' active' : ''}`}
                    style={{ paddingLeft: `${(item.level - 1) * 14 + 12}px` }}
                    onClick={() => {
                      setActiveTocId(item.id)
                      const el = document.getElementById(item.id)
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                  >
                    <span className="read-toc-dot" />
                    <span className="read-toc-text">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
              <h1 className="read-article-title">{docTitle}</h1>
              <div className="read-meta">
                <div className="read-avatar" style={{ backgroundImage: 'url(https://i.pravatar.cc/70?img=12)' }} />
                <div className="read-author-info">
                  <div className="read-author-name">LZEditor</div>
                  <div className="read-author-date">{new Date().toLocaleDateString('zh-CN')}</div>
                </div>
                <div className="read-divider-v" />
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
        <div className="main-nav-float">
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
                <button className="style-select-btn">
                  <span>{activeStyleData.name}</span>
                  <span className="remix ri-arrow-down-s-line"></span>
                </button>
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
