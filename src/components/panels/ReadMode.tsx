import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { TYPOGRAPHY_THEMES, getTypographyTheme } from '../../styles/typography-themes'
import { useScrollSpy } from '../../hooks/useScrollSpy'
import { DEFAULT_CONTENT } from '../../components/editor/constants'

type Layout = 'narrow' | 'normal' | 'wide'
const LAYOUTS: Layout[] = ['narrow', 'normal', 'wide']
const LAYOUT_LABELS: Record<Layout, string> = { narrow: '窄栏', normal: '标准', wide: '宽屏' }
const LAYOUT_MAX_W: Record<Layout, number> = { narrow: 530, normal: 760, wide: 1000 }

interface TocItem {
  id: string
  text: string
  level: number
}

export const ReadMode: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const docTitle = useEditorStore((s) => s.docTitle)
  const docPath = useEditorStore((s) => s.docPath)
  const docHTML = useEditorStore((s) => s.docHTML)
  const wordCount = useEditorStore((s) => s.wordCount)
  const typographyTheme = useSettingsStore((s) => s.typographyTheme)
  const readProgress = useEditorStore((s) => s.readProgress)
  const fontSize = useEditorStore((s) => s.fontSize)
  const readLayout = useEditorStore((s) => s.readLayout)
  const readZoom = useEditorStore((s) => s.readZoom)
  const readTocOpen = useEditorStore((s) => s.readTocOpen)
  const setFontSize = useEditorStore((s) => s.setFontSize)
  const setReadProgress = useEditorStore((s) => s.setReadProgress)
  const setReadLayout = useEditorStore((s) => s.setReadLayout)
  const setReadZoom = useEditorStore((s) => s.setReadZoom)
  const setReadTocOpen = useEditorStore((s) => s.setReadTocOpen)
  const activeDocId = useEditorStore((s) => s.activeDocId)

  const bodyRef = useRef<HTMLDivElement>(null)
  const tocRef = useRef<HTMLDivElement>(null)
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [activeTocId, setActiveTocId] = useState<string>('')
  const [savedScroll, setSavedScroll] = useState<number>(0)

  // ── Content fallback: store → localStorage → DEFAULT_CONTENT ──
  const initialHtml = useMemo(() => {
    if (docHTML) return docHTML
    try {
      const raw = localStorage.getItem(`lzeditor-doc-${activeDocId || 'welcome'}`)
      if (raw) {
        const d = JSON.parse(raw)
        if (d.html) return d.html
      }
      const old = localStorage.getItem('lzeditor-doc')
      if (old) {
        const d = JSON.parse(old)
        if (d.html) return d.html
      }
    } catch {}
    return ''
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

  // ── Generate TOC from HTML headings ──
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const headings = el.querySelectorAll('h1,h2,h3,h4,h5,h6')
    const items: TocItem[] = []
    headings.forEach((h, i) => {
      const id = `read-h-${i}`
      h.setAttribute('id', id)
      items.push({ id, text: h.textContent?.trim() || '', level: parseInt(h.tagName[1]) })
    })
    setTocItems(items)

    // Apply typography theme CSS to read mode body
    const theme = getTypographyTheme(typographyTheme || 'classic')
    if (theme && el) {
      el.style.cssText = ''
      const css = theme.css
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.(lz-editor-content|read-article-body|preview-doc|export-preview-body)/g, '.read-article-body')
      const styleEl = document.getElementById('lz-readmode-typography-css') as HTMLStyleElement | null
      if (styleEl) styleEl.remove()
      const el2 = document.createElement('style')
      el2.id = 'lz-readmode-typography-css'
      el2.textContent = css
      document.head.appendChild(el2)
    }
  }, [docHTML, typographyTheme, effectiveHtml])

  // ── Scroll spy for active heading ──
  const tocItemsForSpy = useMemo(() =>
    tocItems.map(item => ({ id: item.id, text: item.text, el: document.getElementById(item.id) })),
    [tocItems]
  )
  const { scrollTo: scrollSpyTo } = useScrollSpy({
    items: tocItemsForSpy,
    activeId: activeTocId,
    setActiveId: setActiveTocId,
    container: bodyRef.current,
  })
  useEffect(() => {
    if (bodyRef.current) scrollSpyTo(activeTocId)
  }, [tocItemsForSpy])

  // ── Position memory: save on close, restore on open ──
  useEffect(() => {
    if (!activeDocId) return
    const key = `lzeditor-read-scroll-${activeDocId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      const pos = parseInt(saved)
      if (!isNaN(pos) && pos > 0) {
        setTimeout(() => { bodyRef.current?.scrollTo({ top: pos }) }, 100)
      }
    }
    const el = bodyRef.current
    if (!el) return
    const onSave = () => {
      if (activeDocId) localStorage.setItem(key, String(el.scrollTop))
    }
    el.addEventListener('scroll', onSave, { passive: true })
    window.addEventListener('beforeunload', onSave)
    return () => {
      el.removeEventListener('scroll', onSave)
      window.removeEventListener('beforeunload', onSave)
    }
  }, [activeDocId])

  const handleKey = useCallback((e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); setReadZoom(Math.min(200, readZoom + 10)) }
      else if (mod && e.key === '-') { e.preventDefault(); setReadZoom(Math.max(50, readZoom - 10)) }
      else if (mod && e.key === '0') { e.preventDefault(); setReadZoom(100) }
      else if (mod && e.key === 'b') { e.preventDefault(); setReadTocOpen(!readTocOpen) }
      else if (mod && e.key === 'l') { e.preventDefault(); setReadLayout(LAYOUTS[(LAYOUTS.indexOf(readLayout) + 1) % LAYOUTS.length]) }
    }, [readZoom, readTocOpen, readLayout])

    useEffect(() => {
      window.addEventListener('keydown', handleKey)
      return () => window.removeEventListener('keydown', handleKey)
    }, [handleKey])

  const handleFontSizeChange = (delta: number) => {
    setFontSize(Math.min(24, Math.max(13, fontSize + delta)))
  }

  const scrollToTop = () => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setReadProgress(0)
    setActiveTocId(tocItems[0]?.id || '')
  }

  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveTocId(id)
    }
  }, [setActiveTocId])

  const handleCopyCode = useCallback((e: React.MouseEvent) => {
    const btn = e.currentTarget as HTMLElement
    const pre = btn.closest('.read-code-block')?.querySelector('pre')
    if (pre) {
      navigator.clipboard.writeText(pre.textContent || '')
      const orig = btn.textContent
      btn.textContent = '已复制!'
      setTimeout(() => { btn.textContent = orig }, 1500)
    }
  }, [])

  // Inject copy buttons and TOC markers into code blocks
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.read-copy-btn')) return
      const lang = pre.querySelector('code')?.className?.match(/language-(\w+)/)?.[1] || 'code'
      const header = document.createElement('div')
      header.className = 'read-code-lang-label'
      header.innerHTML = `<span>${lang}</span><button class="read-copy-btn" type="button" data-action="copy">复制</button>`
      const btn = header.querySelector('.read-copy-btn') as HTMLButtonElement
      if (btn) btn.addEventListener('click', (e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(pre.textContent || '')
        const orig = btn.textContent
        btn.textContent = '已复制!'
        setTimeout(() => { btn.textContent = orig }, 1500)
      })
      pre.insertBefore(header, pre.firstChild)
    })
   }, [effectiveHtml])

  const zoomScale = readZoom / 100
  const maxW = LAYOUT_MAX_W[readLayout]

  return (
    <div className="read-mode-overlay" onClick={onClose}>
      <div className="read-mode-container" onClick={e => e.stopPropagation()}>

        {/* ── Top bar ── */}
        <div className="read-mode-topbar">
          <div className="read-mode-left">
            <span className="remix read-mode-logo ri-book-open-fill"></span>
            <span className="read-mode-label">阅读模式</span>
          </div>

          <div className="read-mode-center">
            <span className="read-meta-text">{docPath || docTitle || 'untitled.md'}</span>
            <span className="read-divider-dot" />
            <span className="read-meta-text">预计阅读 {readingTime} 分钟</span>
            <span className="read-divider-dot" />
            <span className="read-meta-text read-progress-text">已读 {readProgress}%</span>
          </div>

          <div className="read-mode-right">
            {/* Layout toggle */}
            <button className="read-tool-btn" title={`布局: ${LAYOUT_LABELS[readLayout]} (${modKey()}+L 切换)`}
              onClick={() => setReadLayout(LAYOUTS[(LAYOUTS.indexOf(readLayout) + 1) % LAYOUTS.length])}>
              <span className="remix ri-layout-2-line"></span>
              <span className="read-tool-label">{LAYOUT_LABELS[readLayout]}</span>
            </button>

            {/* TOC toggle */}
            <button className={`read-tool-btn ${readTocOpen ? 'active' : ''}`}
              title={`目录 (${modKey()}+B)`}
              onClick={() => setReadTocOpen(!readTocOpen)}>
              <span className="remix ri-menu-fill"></span>
              <span className="read-tool-label">目录</span>
            </button>

            {/* Zoom controls */}
            <div className="read-zoom-group">
              <button className="read-zoom-btn" onClick={() => setReadZoom(Math.max(50, readZoom - 10))} title="缩小">
                <span className="remix ri-subtract-line"></span>
              </button>
              <span className="read-zoom-value">{readZoom}%</span>
              <button className="read-zoom-btn" onClick={() => setReadZoom(Math.min(200, readZoom + 10))} title="放大">
                <span className="remix ri-add-line"></span>
              </button>
              <button className="read-zoom-btn read-zoom-reset" onClick={() => setReadZoom(100)} title="重置">
                <span className="remix ri-refresh-line"></span>
              </button>
            </div>

            {/* Font size */}
            <div className="font-size-group">
              <button className="read-tool-btn" onClick={() => handleFontSizeChange(-1)} title="缩小字体">
                <span className="remix ri-subtract-line"></span>
              </button>
              <span className="font-size-value">{fontSize}</span>
              <button className="read-tool-btn" onClick={() => handleFontSizeChange(1)} title="放大字体">
                <span className="remix ri-add-line"></span>
              </button>
            </div>

            {/* Edit & Exit */}
            <button className="read-edit-now-btn" onClick={onClose} title="退出阅读">
              <span className="remix ri-close-line"></span>
              <span>退出阅读</span>
            </button>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="read-progress-bar">
          <div className="read-progress-fill" style={{ width: `${readProgress}%` }} />
        </div>

        {/* ── Body ── */}
        <div className="read-mode-body" style={{ flexDirection: readTocOpen ? 'row' : 'column' }}>

          {/* TOC sidebar */}
          {readTocOpen && tocItems.length > 0 && (
            <div className="read-toc" ref={tocRef}>
              <div className="read-toc-header">
                <span className="remix ri-menu-fill"></span>
                <span>目录</span>
                <button className="read-toc-close" onClick={() => setReadTocOpen(false)} title="收起目录 (⌘+B)">
                  <span className="remix ri-close-line"></span>
                </button>
              </div>
              <div className="read-toc-list">
                {tocItems.map(item => (
                  <button
                    key={item.id}
                    className={`read-toc-item${item.id === activeTocId ? ' active' : ''}`}
                    style={{ paddingLeft: `${(item.level - 1) * 14 + 12}px` }}
                    onClick={() => scrollToHeading(item.id)}
                  >
                    <span className="read-toc-dot" />
                    <span className="read-toc-text">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Article */}
          <div
            ref={bodyRef}
            className="read-scroll-area"
            onScroll={() => {
              const el = bodyRef.current
              if (!el) return
              const scrollTop = el.scrollTop
              const scrollHeight = el.scrollHeight - el.clientHeight
              const progress = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0
              setReadProgress(Math.min(100, Math.max(0, progress)))
            }}
          >
            <div className="read-article" style={{ maxWidth: maxW }}>
              <div className="read-article-header">
                <div className="read-tags-row">
                  <span className="read-tag read-tag-tech">Markdown</span>
                  <span className="read-tag read-tag-system">阅读模式</span>
                </div>
                <h1 className="read-article-title">{docTitle}</h1>
                <div className="read-meta">
                  <div className="read-avatar" style={{ backgroundImage: 'url(https://i.pravatar.cc/70?img=12)' }} />
                  <div className="read-author-info">
                    <div className="read-author-name">LZEditor</div>
                    <div className="read-author-date">{new Date().toLocaleDateString('zh-CN')}</div>
                  </div>
                  <div className="read-divider-v" />
                  <div className="read-views">
                    <span className="remix read-views-icon ri-clock-line"></span>
                    <span className="read-views-text">约 {readingTime} 分钟</span>
                  </div>
                </div>
              </div>

              <div
                className="read-article-body"
                style={{ fontSize: `${fontSize * zoomScale}px`, lineHeight: '1.9' }}
                dangerouslySetInnerHTML={{ __html: effectiveHtml }}
              />

              {/* Footer */}
              <div className="read-footer">
                <div className="read-footer-tags">
                  <span className="remix ri-price-tag-3-line read-footer-tag-icon"></span>
                  <span className="read-tag-chip">markdown</span>
                  <span className="read-tag-chip">writing</span>
                  <span className="read-tag-chip">editor</span>
                </div>
                <div className="read-footer-actions">
                  <button className="read-back-top-btn" onClick={scrollToTop}>
                    <span className="remix ri-arrow-up-line"></span>
                    <span>回到顶部</span>
                  </button>
                  <button className="read-edit-btn" onClick={onClose}>
                    <span className="remix ri-edit-line"></span>
                    <span>继续编辑</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function modKey(): string {
  return navigator.userAgent.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'
}
