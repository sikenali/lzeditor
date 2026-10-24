import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { README_CONTENT } from './constants'
import { mdToHtml } from '../../utils/mdToHtml'
import { getDocMd } from '../../utils/docSource'
import { useTheme } from '../../hooks/useTheme'
import { applyTypographyOverrides } from '../../styles/themes'
import { CM6Editor } from './CM6Editor'
import { getCM6Editor } from './codemirror/registry'
import { setSlashHost, type SlashRange } from './codemirror/slash'
import { setInputFormatSettings } from './codemirror/input-format'
import { SlashCommand } from './SlashCommand'

const CONTENT_WIDTH_MAP: Record<string, string> = {
  '960': '960px',
  '1024': '1024px',
  '1200': '1200px',
  '1280': '1280px',
  'full': '100%',
}

export const LZEditor = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const readTocRef = useRef<HTMLDivElement>(null)
  const codeAreaRef = useRef<HTMLTextAreaElement>(null)
  const remarkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setEditorRef = useEditorStore((s: any) => s.setEditorRef)
  const setEditorContentRef = useEditorStore((s: any) => s.setEditorContentRef)
  const setMdContent = useEditorStore((s: any) => s.setMdContent)
  const updateDoc = useEditorStore((s: any) => s.updateDoc)
  const setDocsMd = useEditorStore((s: any) => s.setDocsMd)
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const docs = useEditorStore((s: any) => s.docs)
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const codeMode = useEditorStore((s: any) => s.codeMode)
  const appMode = useEditorStore((s: any) => s.appMode)
  const setAppMode = useEditorStore((s: any) => s.setAppMode)
  const docHTML = useEditorStore((s: any) => s.docHTML || '')
  const wordCount = useEditorStore((s: any) => s.wordCount)
  const panelOpen = useEditorStore((s: any) => s.panelOpen)
  const mdContent = useEditorStore((s: any) => s.docsMd?.[activeDocId] || s.mdContent || '')
  const readFontSize = useEditorStore((s) => s.readFontSize)
  const setReadFontSize = useEditorStore((s) => s.setReadFontSize)
  const readLayout = useEditorStore((s) => s.readLayout)
  const setReadLayout = useEditorStore((s) => s.setReadLayout)
  const readTocOpen = useEditorStore((s) => s.readTocOpen)
  const setReadTocOpen = useEditorStore((s) => s.setReadTocOpen)
  const docTitle = useEditorStore((s) => s.docTitle)

  // 确保 mdContent 有默认值
  const defaultMd = useMemo(() => {
    const docId = activeDocId || 'readme'
    if (docsMd?.[docId]) return docsMd[docId]
    return getDocMd(docId) || (docId === 'readme' ? README_CONTENT : '')
  }, [activeDocId, docsMd])

  // 编辑区可见性：阅读/代码模式隐藏，但 CM6 实例必须常驻
  const cm6Visible = appMode !== 'read' && !codeMode

  const codeEditMdRef = useRef(mdContent)
  const [codeEditMd, setCodeEditMd] = useState(mdContent)
  useEffect(() => {
    codeEditMdRef.current = mdContent
    if (codeMode) setCodeEditMd(mdContent)
  }, [mdContent, codeMode])

  // 同步 mdContent 到 store：优先使用 docsMd，其次用 getDocMd 兜底
  useEffect(() => {
    const docId = activeDocId || 'readme'
    const mdFromDocsMd = docsMd?.[docId] || ''
    const mdFromSource = getDocMd(docId)
    // docsMd 有内容时优先用 docsMd（避免对 readme 做 HTML 往返）
    const targetMd = mdFromDocsMd || mdFromSource || ''
    if (targetMd && mdContent !== targetMd) {
      setMdContent(targetMd)
    }
  }, [defaultMd, docsMd, activeDocId])

  // 确保阅读模式有内容：如果 docHTML 为空，从 docsMd 生成
  const readContent = useMemo(() => {
    if (docHTML) return docHTML
    const docId = activeDocId || 'readme'
    const md = docsMd?.[docId] || getDocMd(docId)
    if (md && md.trim()) {
      try {
        const html = mdToHtml(md)
        return html || md
      } catch {
        return md
      }
    }
    return docId === 'readme' ? README_CONTENT : ''
  }, [docHTML, docsMd, activeDocId])

  const LAYOUTS = ['narrow', 'normal', 'wide'] as const
  const LAYOUT_LABELS: Record<string, string> = { narrow: '窄栏', normal: '标准', wide: '宽屏' }
  const LAYOUT_MAX_W: Record<string, number> = { narrow: 530, normal: 760, wide: 1000 }
  const storeTocItems = useEditorStore((s) => s.tocItems)
  const setStoreTocItems = useEditorStore((s) => s.setTocItems)
  const activeTocId = useEditorStore((s) => s.activeTocId)
  const setActiveTocId = useEditorStore((s) => s.setActiveTocId)
  useEffect(() => {
    const el = readTocRef.current
    if (!el || !readContent) return
    const headings = el.querySelectorAll('h1,h2,h3,h4,h5,h6')
    const items: { id: string; text: string; level: number }[] = []
    headings.forEach((h, i) => {
      const id = `read-h-${i}`
      h.setAttribute('id', id)
      items.push({ id, text: h.textContent?.trim() || '', level: parseInt(h.tagName[1]) })
    })
    setStoreTocItems(items)
  }, [readContent])
  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveTocId(id)
    }
  }, [])

  // Code mode: build TOC from markdown headings with line numbers
  const codeTocItems = useMemo(() => {
    if (!codeEditMd) return []
    const lines = codeEditMd.split('\n')
    const items: { id: string; text: string; level: number; line: number }[] = []
    let inFence = false
    lines.forEach((line: string, i: number) => {
      if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return }
      if (inFence) return
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        items.push({
          id: `code-h-${i}`,
          text: match[2].trim(),
          level: match[1].length,
          line: i,
        })
      }
    })
    return items
  }, [codeEditMd])

  const scrollToCodeHeading = useCallback((item: { id: string; line: number }) => {
    const ta = codeAreaRef.current
    if (!ta) return
    const lines = codeEditMdRef.current.split('\n')
    let charPos = 0
    for (let i = 0; i < item.line; i++) charPos += lines[i].length + 1
    ta.focus()
    ta.setSelectionRange(charPos, charPos)
    const container = ta.closest('.read-article-wrapper') as HTMLElement | null
    container?.scrollTo({ top: ta.offsetTop - 20, behavior: 'smooth' })
    setActiveTocId(item.id)
  }, [codeEditMd])

  useTheme()

  React.useEffect(() => {
    setEditorRef(editorRef.current)
    setEditorContentRef(editorRef.current?.querySelector('.lz-editor-content') ?? null)
  }, [])

  // Apply editor style settings from store
  const editorFont = useSettingsStore((s) => s.editorFont)
  const defaultFontSize = useSettingsStore((s) => s.defaultFontSize)
  const lineHeight = useSettingsStore((s) => s.lineHeight)
  const contentWidth = useSettingsStore((s) => s.contentWidth)
  const showPreview = useEditorStore((s) => s.showPreview)

  useEffect(() => {
    const container = editorRef.current
    if (!container) return
    const inner = container.querySelector('.lz-editor-content') as HTMLElement | null
    if (!inner) return
    // width/size styles go to the page wrapper, not the scroll container
    const page = inner.querySelector('.lz-editor-page') as HTMLElement ?? inner
    const fw = contentWidth && CONTENT_WIDTH_MAP[contentWidth]
      ? CONTENT_WIDTH_MAP[contentWidth]
      : showPreview
        ? '1024px'
        : '100%'
    page.style.width = fw
    page.style.maxWidth = fw === '100%' ? 'none' : fw
    if (defaultFontSize) page.style.fontSize = `${defaultFontSize}px`
    else page.style.fontSize = ''
    if (lineHeight) page.style.lineHeight = lineHeight
    else page.style.lineHeight = ''
    if (editorFont) {
      if (editorFont === 'sans-serif') page.style.fontFamily = 'var(--font-sans)'
      else if (editorFont === 'serif') page.style.fontFamily = 'var(--font-sans)'
      else if (editorFont === 'monospace') page.style.fontFamily = 'var(--font-mono)'
      else page.style.fontFamily = editorFont
    }
  }, [editorFont, defaultFontSize, lineHeight, contentWidth, showPreview])

  // Apply typography overrides to :root for read-mode / preview areas
  const textIndent = useSettingsStore((s) => s.textIndent)
  const textJustify = useSettingsStore((s) => s.textJustify)
  const headingStyles = useSettingsStore((s) => s.headingStyles)
  useEffect(() => {
    applyTypographyOverrides({
      fontSize: defaultFontSize,
      lineHeight: lineHeight,
      fontFamily: editorFont === 'serif' ? '"Noto Serif SC", serif' : (editorFont === 'monospace' ? 'monospace' : editorFont),
      contentWidth: contentWidth,
      textIndent,
      textJustify,
      headingStyles,
    })
  }, [defaultFontSize, lineHeight, editorFont, contentWidth, textIndent, textJustify, headingStyles])

  // ── Strip read-frog extension injected nodes from the editor DOM ──
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          if (node.dataset.readFrogWalked || /read-frog/.test(node.className) || /notranslate/.test(node.className)) {
            node.remove()
            continue
          }
          node.querySelectorAll('[data-read-frog-], .read-frog-translated-content-wrapper, .read-frog-translated-inline-content, span.notranslate[data-translate-ignore]').forEach((n: any) => n.remove())
        }
      }
    })
    observer.observe(el, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  // ── Markdown markers: show ### etc. in editor ──
  const showMarkdownMarkers = useSettingsStore((s) => s.showMarkdownMarkers)
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const inner = el.querySelector('.lz-editor-content') as HTMLElement | null
    if (!inner) return
    inner.setAttribute('data-md-markers', showMarkdownMarkers ? 'inline' : 'none')
  }, [showMarkdownMarkers])

  // 弹出面板打开时别让编辑器抢走焦点
  useEffect(() => {
    const el = editorRef.current
    if (!el || !panelOpen) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.cm-content')) return
      if (target.closest('.unified-dialog') || target.closest('.ai-panel')) return
      e.preventDefault()
    }
    el.addEventListener('mousedown', onMouseDown)
    return () => el.removeEventListener('mousedown', onMouseDown)
  }, [panelOpen])

  // ── 输入变换：把设置面板的开关真正落到 CM6 的 keydown / update 逻辑上 ──
  const allowMarkdownSymbols = useSettingsStore((s) => s.allowMarkdownSymbols)
  const smartQuotes = useSettingsStore((s) => s.smartQuotes)
  const autoSpaceCJK = useSettingsStore((s) => s.autoSpaceCJK)
  const cornerQuotes = useSettingsStore((s) => s.cornerQuotes)
  const fullwidthSymbols = useSettingsStore((s) => s.fullwidthSymbols)
  const autoPair = useSettingsStore((s) => s.autoPair)
  useEffect(() => {
    setInputFormatSettings({
      allowMarkdownSymbols,
      smartQuotes,
      autoSpaceCJK,
      cornerQuotes,
      fullwidthSymbols,
      autoSpaceQuotes: autoPair,
    })
  }, [allowMarkdownSymbols, smartQuotes, autoSpaceCJK, cornerQuotes, fullwidthSymbols, autoPair])

  // Initialize docsMd: merge missing docs from localStorage (never overwrite existing)
  React.useEffect(() => {
    const init: Record<string, string> = {}
    docs.forEach((d: { id: string }) => {
      if (!docsMd[d.id]) init[d.id] = getDocMd(d.id)
    })
    if (Object.keys(init).length > 0) setDocsMd(init)
  }, [docs])

  // Sync mdContent when entering code mode
  useEffect(() => {
    if (!codeMode || !activeDocId) return
    const docId = activeDocId
    const mdFromDocsMd = docsMd?.[docId] || ''
    const mdFromSource = getDocMd(docId)
    const targetMd = mdFromDocsMd || mdFromSource || (docId === 'readme' ? README_CONTENT : '')
    if (targetMd && mdContent !== targetMd) setMdContent(targetMd)
  }, [codeMode, activeDocId, docsMd])

  // ── Slash command palette ──
  const [slashVisible, setSlashVisible] = useState(false)
  const [slashPosition, setSlashPosition] = useState({ x: 0, y: 0 })
  const [slashFilter, setSlashFilter] = useState('')

  const hideSlash = useCallback(() => {
    if (slashTimerRef.current) clearTimeout(slashTimerRef.current)
    slashTimerRef.current = setTimeout(() => setSlashVisible(false), 120)
  }, [])

  useEffect(() => {
    setSlashHost({
      open: (view, range: SlashRange) => {
        try {
          const coords = view.coordsAtPos(view.state.selection.main.from)
          if (coords && coords.right !== undefined) {
            setSlashPosition({ x: coords.right + 2, y: coords.top - 2 })
          }
        } catch {}
        setSlashFilter(range.filter)
        setSlashVisible(true)
      },
      close: hideSlash,
    })
    return () => setSlashHost(null)
  }, [hideSlash])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.slash-command')) return
      hideSlash()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [hideSlash])

  const handleCodeModeChange = useCallback((value: string) => {
    if (remarkTimerRef.current) clearTimeout(remarkTimerRef.current)
    remarkTimerRef.current = setTimeout(() => {
      const docId = useEditorStore.getState().activeDocId
      let html = ''
      try { html = mdToHtml(value || '') } catch { html = '' }
      setMdContent(value)
      // readme 的 markdown 只作为派生视图，不进 docsMd（避免被当成内容来源）
      updateDoc({ md: value, html, docsMd: docId && docId !== 'readme' ? { [docId]: value } : undefined })
      if (docId) {
        localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md: value, html, savedAt: Date.now() }))
      }
      // 代码模式写的是同一个文档，同步进 CM6 让编辑模式的下次打开是最新内容
      getCM6Editor()?.setText(value)
      if (!html && docId) {
        setDocsMd((prev: Record<string, string> = {}) => ({ ...prev, [docId]: value }))
      }
    }, 150)
  }, [updateDoc, setMdContent, setDocsMd])

  return (
    <div className="lz-editor" ref={editorRef}>
      <div className={`lz-editor-content${codeMode ? ' lz-editor-content--code' : ''}${appMode === 'read' ? ' lz-editor-content--read' : ''}`}>
        {appMode === 'read' && (
          <div className="read-mode-inline">
            <div className="read-mode-toolbar">
              <span className="read-mode-label">
                <span className="remix ri-book-open-line" style={{ marginRight: 5, fontSize: 15 }}></span>
                阅读模式
              </span>
              <div className="read-mode-controls">
                <button className="read-tool-btn" title={`布局: ${LAYOUT_LABELS[readLayout]}`}
                  onClick={() => setReadLayout(LAYOUTS[(LAYOUTS.indexOf(readLayout) + 1) % LAYOUTS.length])}>
                  <span className="remix ri-layout-2-line"></span>
                  <span>{LAYOUT_LABELS[readLayout]}</span>
                </button>
                <button className="read-tool-btn" title="缩小字体" onClick={() => setReadFontSize(Math.max(12, readFontSize - 1))}>
                  <span className="remix ri-subtract-line"></span>
                </button>
                <span className="read-font-size-value">{readFontSize}</span>
                <button className="read-tool-btn" title="放大字体" onClick={() => setReadFontSize(Math.min(24, readFontSize + 1))}>
                  <span className="remix ri-add-line"></span>
                </button>
              </div>
              <span className="read-mode-meta">约 {Math.max(1, Math.ceil(wordCount / 200))} 分钟阅读</span>
              <button className="read-mode-exit-btn" onClick={() => setAppMode('edit')}>
                <span className="remix ri-edit-line"></span>
                <span>继续编辑</span>
              </button>
            </div>
            <div className="read-mode-body" style={{ flexDirection: readTocOpen ? 'row' : 'column' }}>
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
                      <button key={item.id} className={`read-toc-item${item.id === activeTocId ? ' active' : ''}`}
                        style={{ paddingLeft: `${(item.level - 1) * 14 + 12}px` }}
                        onClick={() => scrollToHeading(item.id)}>
                        <span className="read-toc-dot" />
                        <span className="read-toc-text">{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="read-article-wrapper" ref={readTocRef}>
                <div className="read-article-container" style={{ maxWidth: LAYOUT_MAX_W[readLayout] }}>
                  <div className="read-article-header">
                    <div className="read-tags-row">
                      <span className="read-tag read-tag-tech">Markdown</span>
                      <span className="read-tag read-tag-system">阅读模式</span>
                    </div>
                    <h1 className="read-article-title">{docTitle || '文档'}</h1>
                    <div className="read-meta">
                      <div className="read-avatar"><svg viewBox="0 0 70 70" width="32" height="32"><circle cx="35" cy="26" r="13" fill="currentColor" opacity="0.85"/><path d="M8 60c0-13 11-23 27-23s27 10 27 23" fill="currentColor" opacity="0.6"/></svg></div>
                      <div className="read-author-info">
                        <div className="read-author-name">LZEditor</div>
                        <div className="read-author-date">{new Date().toLocaleDateString('zh-CN')}</div>
                      </div>
                      <div className="read-divider-v" />
                      <div className="read-views">
                        <span className="remix read-views-icon ri-clock-line"></span>
                        <span className="read-views-text">约 {Math.max(1, Math.ceil(wordCount / 200))} 分钟</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="read-article-body"
                    style={{ fontSize: `${readFontSize}px`, lineHeight: '1.9' }}
                    dangerouslySetInnerHTML={{ __html: readContent }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {codeMode && appMode !== 'read' && (
          <div className="read-mode-inline read-mode-code">
            <div className="read-mode-toolbar">
              <span className="read-mode-label">
                <span className="remix ri-code-s-line" style={{ marginRight: 4, fontSize: 15 }}></span>
                代码模式
              </span>
              <div className="read-mode-controls">
                <button className="read-tool-btn" title={`布局: ${LAYOUT_LABELS[readLayout]}`}
                  onClick={() => setReadLayout(LAYOUTS[(LAYOUTS.indexOf(readLayout) + 1) % LAYOUTS.length])}>
                  <span className="remix ri-layout-2-line"></span>
                  <span>{LAYOUT_LABELS[readLayout]}</span>
                </button>
                <button className="read-tool-btn" title="缩小字体" onClick={() => setReadFontSize(Math.max(12, readFontSize - 1))}>
                  <span className="remix ri-subtract-line"></span>
                </button>
                <span className="read-font-size-value">{readFontSize}</span>
                <button className="read-tool-btn" title="放大字体" onClick={() => setReadFontSize(Math.min(24, readFontSize + 1))}>
                  <span className="remix ri-add-line"></span>
                </button>
                <button className={`read-tool-btn ${readTocOpen ? 'active' : ''}`} title="目录" onClick={() => setReadTocOpen(!readTocOpen)}>
                  <span className="remix ri-menu-fill"></span>
                  <span>目录</span>
                </button>
              </div>
              <span className="read-mode-meta">{mdContent.length} 字符 · {wordCount} 字</span>
              <button className="read-mode-exit-btn" onClick={() => setAppMode('edit')}>
                <span className="remix ri-edit-line"></span>
                <span>编辑模式</span>
              </button>
            </div>
            <div className="read-mode-body" style={{ flexDirection: readTocOpen ? 'row' : 'column' }}>
              <div className="read-article-wrapper">
                <div className="read-article-container" style={{ maxWidth: LAYOUT_MAX_W[readLayout] }}>
                  <div className="read-article-header">
                    <div className="read-tags-row">
                      <span className="read-tag read-tag-tech">Markdown</span>
                      <span className="read-tag read-tag-system">代码模式</span>
                    </div>
                    <h1 className="read-article-title">{docTitle || '文档'}</h1>
                    <div className="read-meta">
                      <div className="read-avatar"><svg viewBox="0 0 70 70" width="32" height="32"><circle cx="35" cy="26" r="13" fill="currentColor" opacity="0.85"/><path d="M8 60c0-13 11-23 27-23s27 10 27 23" fill="currentColor" opacity="0.6"/></svg></div>
                      <div className="read-author-info">
                        <div className="read-author-name">LZEditor</div>
                        <div className="read-author-date">{new Date().toLocaleDateString('zh-CN')}</div>
                      </div>
                      <div className="read-divider-v" />
                      <div className="read-views">
                        <span className="remix read-views-icon ri-code-s-line"></span>
                        <span className="read-views-text">{wordCount} 字</span>
                      </div>
                    </div>
                  </div>
                  <textarea
                    ref={codeAreaRef}
                    className="read-article-code"
                    value={codeEditMd}
                    onChange={e => { setCodeEditMd(e.target.value); handleCodeModeChange(e.target.value) }}
                    spellCheck={false}
                  />
                </div>
              </div>
              {readTocOpen && codeTocItems.length > 0 && (
                <div className="read-toc-sidebar">
                  <div className="read-toc-header">
                    <span className="remix ri-menu-fill"></span>
                    <span>目录</span>
                    <button className="read-toc-close" onClick={() => setReadTocOpen(false)}>
                      <span className="remix ri-close-line"></span>
                    </button>
                  </div>
                  <div className="read-toc-list">
                    {codeTocItems.map(item => (
                      <button
                        key={item.id}
                        className={`read-toc-item${item.id === activeTocId ? ' active' : ''}`}
                        style={{ paddingLeft: `${(item.level - 1) * 14 + 12}px` }}
                        onClick={() => scrollToCodeHeading(item)}
                      >
                        <span className="read-toc-dot" />
                        <span className="read-toc-text">{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="lz-editor-page">
          {/* CM6 保持挂载：切到阅读/代码/历史模式时只用 display:none 隐藏。
              卸载后 getCM6Editor() 返回 null，工具栏与搜索命令会全部失效。 */}
          <div style={{ display: cm6Visible ? 'block' : 'none', height: '100%' }}>
            <CM6Editor
              docId={activeDocId || 'readme'}
              initialContent={mdContent}
            />
          </div>
        </div>
      </div>
      <SlashCommand
        position={slashPosition}
        visible={slashVisible}
        filter={slashFilter}
        onClose={hideSlash}
        cm={slashVisible ? getCM6Editor() : null}
      />
    </div>
  )
}
