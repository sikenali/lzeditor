import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { mdToHtml } from '../../utils/mdToHtml'
import { parseMdOutline } from '../../utils/mdOutline'
import { registerOutlineJumper, clearOutlineJumper } from '../../utils/outlineJump'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { TYPOGRAPHY_THEMES } from '../../styles/typography-themes'
import { getAcksTheme, ACKS_THEME_IDS, renderAcksArticle } from '../../styles/acks-themes'
import { acksThemeCardMeta, DEFAULT_TYPOGRAPHY_THEME } from '../../styles/acks-mapping'
import { useScrollSpy } from '../../hooks/useScrollSpy'
import { getDocMd } from '../../utils/docSource'
import { copyRichText } from '../../clipboard'
import { ExportDialog } from './ExportDialog'

export const StyleMainPanel: React.FC = () => {
  const mdContent = useEditorStore((s: any) => s.mdContent || '')
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const activeDocId = useEditorStore((s) => s.activeDocId)
  const typographyTheme = useSettingsStore((s) => s.typographyTheme)
  const setAppMode = useEditorStore((s) => s.setAppMode)
  const updateSetting = useSettingsStore(s => s.updateSetting)
  const activeTocId = useEditorStore((s) => s.activeTocId)
  const setActiveTocId = useEditorStore((s) => s.setActiveTocId)

  const bodyRef = useRef<HTMLDivElement>(null)
  const articleBodyRef = useRef<HTMLDivElement>(null)
  const [activeStyle, setActiveStyle] = useState(typographyTheme || DEFAULT_TYPOGRAPHY_THEME)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10
  const totalPages = Math.ceil(ACKS_THEME_IDS.length / PAGE_SIZE)
  const pageItems = ACKS_THEME_IDS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const [previewVisible, setPreviewVisible] = useState(true)
  // 浮导航（上一章/下一章/回到顶部/全屏）默认隐藏，点内容区才显示
  const [navVisible, setNavVisible] = useState(false)
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

  // 正文由 ACKS 渲染器接管：依赖 effectiveMd/activeStyle。renderedHtml 与旧 `.read-article-body` 用同一份
  // mdToHtml 输出，其 heading id（parseMdOutline 依赖）经 doc.innerHTML 包裹后保留，大纲/章节跳转不受影响。
  useEffect(() => {
    const el = articleBodyRef.current
    if (!el) return
    renderAcksArticle(el, renderedHtml, activeStyle)
  }, [activeStyle, renderedHtml])

  const activeStyleData = TYPOGRAPHY_THEMES.find(t => t.id === activeStyle) ?? TYPOGRAPHY_THEMES[0]

  const pickStyle = (id: string) => { setActiveStyle(id); updateSetting('typographyTheme', id) }

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
        <div ref={bodyRef} className="style-read-scroll" onClick={() => setNavVisible(true)}>
          <div className="style-read-article">
            <div className="main-read-header">
              <div className="main-read-tags">
                <span className="read-tag read-tag-tech">Markdown</span>
                <button className="sidebar-wechat-btn" onClick={handleCopyWechat} title="一键复制为公众号可用富文本">
                  <span className={`remix ${copied ? 'ri-check-line' : 'ri-wechat-fill'}`}></span>
                  {copied ? '已复制' : '公众号'}
                </button>
              </div>
            </div>
            <div ref={articleBodyRef} className="style-read-acks" />
          </div>
        </div>
        </div>
        <div className={`main-nav-float${navVisible ? '' : ' nav-hidden'}`}>
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
                            onClick={() => { pickStyle(t.id); setStyleMenuOpen(false) }}
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
                  {pageItems.map(id => {
                    const t = getAcksTheme(id)!
                    const meta = acksThemeCardMeta(t)
                    const active = id === activeStyle
                    return (
                      <button
                        key={id}
                        className={`style-card${active ? ' active' : ''}`}
                        onClick={() => pickStyle(id)}
                      >
                        <div
                          className="style-card-thumb"
                          style={{
                            borderColor: active ? meta.color : 'rgba(204,204,204,1)',
                            background: meta.bg,
                          }}
                        >
                          <div
                            className="style-card-preview"
                            data-typography-theme={id}
                            style={{ fontSize: 5, lineHeight: 1.4, color: meta.text, padding: '2px 3px' }}
                          >
                            <div style={{ fontSize: 6, fontWeight: 600, color: meta.color, marginBottom: 1 }}>{meta.name}</div>
                            <div style={{ fontSize: 4.5, color: 'rgba(128,128,128,0.7)', borderBottom: `1px solid ${meta.color}33`, paddingBottom: 1, marginBottom: 1 }}>二级标题装饰</div>
                            <div style={{ fontSize: 4.5, color: 'rgba(80,80,80,0.8)' }}>正文文字样例·<code style={{ background: `${meta.color}18`, color: meta.color, padding: '0 2px', borderRadius: 1, fontSize: 4 }}>代码</code></div>
                            <div style={{ fontSize: 4.5, color: 'rgba(80,80,80,0.6)', marginTop: 1 }}>引用文字样例</div>
                          </div>
                        </div>
                        <div className="style-card-name" style={active ? { color: meta.color } : undefined}>
                          {meta.name}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="style-cards-pager">
                  <button className="pager-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)} title="上一页">
                    <span className="remix ri-arrow-left-s-line" />
                  </button>
                  <span className="pager-info">{page + 1}/{totalPages}</span>
                  <button className="pager-btn" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)} title="下一页">
                    <span className="remix ri-arrow-right-s-line" />
                  </button>
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
