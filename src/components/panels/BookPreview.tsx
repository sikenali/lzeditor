import React, { useEffect, useRef, useCallback, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getTypographyTheme } from '../../styles/typography-themes'

const PAPER_HEIGHTS: Record<string, number> = {
  a4: 1123, a3: 1587, a5: 842, letter: 1100, legal: 1400,
}

/** Split raw HTML into page-sized chunks by measuring DOM height. */
function splitHtmlIntoPages(rawHtml: string, pageHeight: number, contentWidth: number): string[] {
  if (!rawHtml) return ['']
  const container = document.createElement('div')
  container.innerHTML = rawHtml
  container.style.width = `${contentWidth - 48}px`
  void container.offsetHeight // force layout

  const blockTags = new Set(['P','H1','H2','H3','H4','H5','H6','PRE','BLOCKQUOTE','UL','OL','TABLE','HR','DIV','FIGURE','SECTION','LI'])
  const pages: string[] = []
  let cur = ''
  let curH = 0

  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (blockTags.has(el.tagName)) {
        const h = el.offsetHeight || 22
        const mg = ['H1','H2','H3','H4','H5','H6','HR'].includes(el.tagName) ? 14 : 0
        const need = h + mg
        if (curH + need > pageHeight && cur.length > 0) {
          pages.push(cur)
          cur = el.outerHTML
          curH = need
          return
        }
        cur += el.outerHTML
        curH += need
      }
    }
    for (const child of Array.from(node.childNodes)) walk(child)
  }
  walk(container)
  if (cur.length > 0) pages.push(cur)
  if (pages.length === 0) pages.push('')
  return pages.slice(0, 200)
}

export const BookPreview: React.FC<{
  html: string
  paperSize: string
  orientation: string
  onClose?: () => void
}> = ({ html, paperSize, onClose }) => {
  const contentWidth = useSettingsStore(s => s.contentWidth || '1024')
  const typographyTheme = useSettingsStore(s => s.typographyTheme)
  const bookRef = useRef<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  // Store page content as ref to avoid re-creating on every render
  const pageRefs = useRef<HTMLDivElement[]>([])
  const pageContentRef = useRef<string[]>([])

  const contentWidthNum = parseInt(contentWidth)
  const pageHeight = PAPER_HEIGHTS[paperSize] || 1123
  const pageWidth = Math.min(340, contentWidthNum - 48)

  // Build page content whenever html changes
  useEffect(() => {
    const pages = splitHtmlIntoPages(html, pageHeight, contentWidthNum)
    pageContentRef.current = pages
    pageRefs.current = []
  }, [html, pageHeight, contentWidthNum])

  // Inject typography theme CSS
  useEffect(() => {
    const styleEl = document.getElementById('lz-bk-css') as HTMLStyleElement | null
    if (styleEl) styleEl.remove()
    const theme = getTypographyTheme(typographyTheme || 'classic')
    if (theme) {
      const s = document.createElement('style')
      s.id = 'lz-bk-css'
      s.textContent = theme.css
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.export-preview-body/g, '.bk-page-inner')
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.read-article-body/g, '.bk-page-inner')
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.preview-doc/g, '.bk-page-inner')
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.lz-editor-content/g, '.bk-page-inner')
      document.head.appendChild(s)
    }
    return () => {
      ;(document.getElementById('lz-bk-css') as HTMLStyleElement | null)?.remove()
    }
  }, [typographyTheme, html])

  const handleFlip = useCallback((e: any) => {
    setCurrentPage(e?.data ?? 0)
  }, [])

  const handleStateChange = useCallback((e: any) => {
    const state = e?.data as string
    setIsFlipping(state !== 'read')
  }, [])

  const nextPage = useCallback(() => {
    if (isFlipping || !bookRef.current) return
    bookRef.current.flipNext('bottom')
  }, [isFlipping])

  const prevPage = useCallback(() => {
    if (isFlipping || !bookRef.current) return
    bookRef.current.flipPrev('bottom')
  }, [isFlipping])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  { e.preventDefault(); nextPage() }
      else if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')  { e.preventDefault(); prevPage() }
      else if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [nextPage, prevPage, onClose])

  useEffect(() => {
    if (bookRef.current) {
      try { bookRef.current.turnToPage(0) } catch {}
      setCurrentPage(0)
    }
  }, [html, paperSize])

  const pages = pageContentRef.current
  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2))

  return (
    <div className="bk-wrapper">
      <div className="bk-container">
        <HTMLFlipBook
          ref={bookRef}
          className="bk-flip-book"
          style={{ width: '100%', height: '100%' }}
          startPage={0}
          width={pageWidth}
          height={pageHeight}
          size="stretch"
          minWidth={140}
          maxWidth={420}
          minHeight={200}
          maxHeight={900}
          drawShadow
          flippingTime={760}
          usePortrait
          startZIndex={10}
          autoSize
          maxShadowOpacity={0.42}
          showCover={false}
          mobileScrollSupport={false}
          clickEventForward
          useMouseEvents
          swipeDistance={24}
          showPageCorners
          disableFlipByClick={false}
          onFlip={handleFlip}
          onChangeState={handleStateChange}
        >
          {pages.map((pageHtml, i) => (
            <div
              key={i}
              ref={el => { pageRefs.current[i] = el as HTMLDivElement }}
              className={`bk-page-inner${i === 0 ? ' bk-page-cover' : ''}`}
            >
              <div dangerouslySetInnerHTML={{ __html: pageHtml || '<p style="color:var(--text-muted);text-align:center;padding:60px 20px;">暂无内容</p>' }} />
            </div>
          ))}
          {pages.length === 0 && (
            <div className="bk-page-inner">
              <div dangerouslySetInnerHTML={{ __html: '<p style="color:var(--text-muted);text-align:center;padding:60px 20px;">暂无内容</p>' }} />
            </div>
          )}
        </HTMLFlipBook>

        <div className="bk-nav">
          <button
            className={`bk-btn${currentPage === 0 || isFlipping ? ' bk-disabled' : ''}`}
            onClick={prevPage}
            disabled={currentPage === 0 || isFlipping}
            title="上一页"
          >
            <span className="remix ri-arrow-left-s-line" />
          </button>
          <button
            className={`bk-btn${currentPage >= totalSpreads - 1 || isFlipping ? ' bk-disabled' : ''}`}
            onClick={nextPage}
            disabled={currentPage >= totalSpreads - 1 || isFlipping}
            title="下一页"
          >
            <span className="remix ri-arrow-right-s-line" />
          </button>
        </div>
      </div>
    </div>
  )
}
