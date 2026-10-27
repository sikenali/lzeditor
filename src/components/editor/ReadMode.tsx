import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { mdToHtml } from '../../utils/mdToHtml'
import { getDocMd } from '../../utils/docSource'
import { parseMdOutline } from '../../utils/mdOutline'
import { tagToKind, type BlockKind } from '../../utils/blockKind'
import { paginate, pageOfLine, spreadCount, type Page } from '../../utils/pagination'
import { OWN_ACTION } from '../../utils/markdown/lines'
import { renderMermaidBlocks } from '../../utils/markdown/mermaid'
import { useSettingsStore } from '../../store/settingsStore'
import { resolveTheme } from '../../hooks/useTheme'

/** 双联页阅读模式：左右两页并排，整块不可切，点屏幕翻页。 */

const PAGE_W: Record<string, number> = { narrow: 300, normal: 400, wide: 520 }
const LAYOUT_LABELS: Record<string, string> = { narrow: '窄栏', normal: '标准', wide: '宽屏' }
const LAYOUTS = ['narrow', 'normal', 'wide'] as const
const PAGE_PAD = 28
/** .read-book 的左右内边距，量可用宽度时要扣掉 */
const BOOK_PAD_H = 20
const SPINE = 24
const FLIP_MS = 240
const MIN_FONT = 12
const MAX_FONT = 24
/** 超过这么多页对时，进度点改成进度条 */
const DOT_LIMIT = 12

interface MeasuredBlock {
  html: string
  /** 槽位高：块自身的 offsetHeight 加它占用的外边距 */
  h: number
  kind: BlockKind
  /** 0-based 起始源码行 */
  line: number
  key: string
}

export const ReadMode: React.FC = () => {
  const activeDocId = useEditorStore((s) => s.activeDocId)
  const docsMd = useEditorStore((s) => s.docsMd)
  const docTitle = useEditorStore((s) => s.docTitle)
  const readFontSize = useEditorStore((s) => s.readFontSize)
  const setReadFontSize = useEditorStore((s) => s.setReadFontSize)
  const readLayout = useEditorStore((s) => s.readLayout)
  const appTheme = useSettingsStore((s) => s.theme)
  const setReadLayout = useEditorStore((s) => s.setReadLayout)
  const readTocOpen = useEditorStore((s) => s.readTocOpen)
  const setReadTocOpen = useEditorStore((s) => s.setReadTocOpen)
  const setAppMode = useEditorStore((s) => s.setAppMode)

  const md = useMemo(() => {
    const docId = activeDocId || 'readme'
    return docsMd?.[docId] || getDocMd(docId) || ''
  }, [activeDocId, docsMd])

  // lines 必须开：分页按 data-line 反查目录项落在哪一页
  const html = useMemo(() => {
    if (!md.trim()) return ''
    try {
      return mdToHtml(md, undefined, { lines: true }) || ''
    } catch {
      return ''
    }
  }, [md])

  const toc = useMemo(() => parseMdOutline(md), [md])

  const probeRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<HTMLDivElement>(null)
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [pages, setPages] = useState<Page<MeasuredBlock>[]>([])
  const [spread, setSpread] = useState(0)
  const [leaving, setLeaving] = useState<{ i: number; dir: 1 | -1 } | null>(null)
  const [flipping, setFlipping] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [pageW, setPageW] = useState(PAGE_W.normal)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // 窗窄时页宽要收缩，否则两页放不下；测到的宽度和渲染用的宽度必须是同一个数
  const syncPageW = useCallback((): void => {
    const book = bookRef.current
    if (!book) return
    const avail = book.clientWidth - BOOK_PAD_H * 2 - SPINE
    setPageW(Math.max(140, Math.min(PAGE_W[readLayout] ?? 400, Math.floor(avail / 2))))
  }, [readLayout])

  /** 量一次页高并把块装箱。测量容器与页容器吃同一套排版类、同一个宽度 */
  const measure = useCallback(() => {
    const probe = probeRef.current
    const scene = sceneRef.current
    if (!probe || !scene || !html) {
      setPages([])
      return
    }
    probe.style.width = `${pageW - PAGE_PAD * 2}px`
    probe.innerHTML = html
    // 图片是懒加载的，量完高度之后图片才撑开会把分页顶偏。
    // 量的是同一批 URL，所以盯住探针里的 img 就够了（visibility:hidden 不影响加载）
    probe.querySelectorAll('img').forEach(img => {
      if (img.complete) return
      img.addEventListener('load', measure, { once: true })
      img.addEventListener('error', measure, { once: true })
    })
    const kids = Array.from(probe.children)
    if (!kids.length) {
      setPages([])
      return
    }
    const origin = probe.getBoundingClientRect().top
    const probeBottom = probe.getBoundingClientRect().bottom
    const blocks = kids.map((el, i) => {
      const top = el.getBoundingClientRect().top - origin
      const nextTop = i < kids.length - 1
        ? (kids[i + 1] as HTMLElement).getBoundingClientRect().top - origin
        : probeBottom - origin
      return {
        html: el.outerHTML,
        h: Math.max(1, Math.round(nextTop - top)),
        kind: tagToKind(el.tagName),
        line: Number(el.getAttribute('data-line')) || 0,
        key: String(i),
      }
    })
    // 页会拉伸到场景高度，减掉页内边距就是块能用的净高
    const pageHeight = scene.clientHeight - PAGE_PAD * 2
    setPages(paginate(blocks, pageHeight > 0 ? pageHeight : 0))
  }, [html, pageW])

  useLayoutEffect(() => {
    syncPageW()
    measure()
  }, [syncPageW, measure])

  // 窗口缩放同时影响页宽和页高，两条都要重跑
  useEffect(() => {
    const book = bookRef.current
    if (!book) return
    const ro = new ResizeObserver(() => {
      syncPageW()
      measure()
    })
    ro.observe(book)
    return () => ro.disconnect()
  }, [syncPageW, measure])

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current)
    }
  }, [])

  const totalSpreads = spreadCount(pages.length)
  const maxSpread = Math.max(0, totalSpreads - 1)

  // 字号或窗口变化会让页码变少，别停在已经不存在的页对上
  useEffect(() => {
    setSpread(s => Math.min(s, maxSpread))
  }, [maxSpread])

  // 换文档时回到第一页，而不是被上面的 clamp 停在末页
  const mdRef = useRef(md)
  useEffect(() => {
    if (mdRef.current !== md) {
      mdRef.current = md
      setLeaving(null)
      setSpread(0)
    }
  }, [md])

  const go = useCallback((dir: 1 | -1) => {
    if (flipping) return
    const next = spread + dir
    if (next < 0 || next > maxSpread) return
    if (!reducedMotion) {
      setLeaving({ i: spread, dir })
      setFlipping(true)
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current)
      flipTimerRef.current = setTimeout(() => {
        setLeaving(null)
        setFlipping(false)
      }, FLIP_MS)
    }
    setSpread(next)
  }, [flipping, reducedMotion, spread, maxSpread])

  const jumpTo = useCallback((i: number) => {
    setLeaving(null)
    setSpread(Math.max(0, Math.min(i, maxSpread)))
  }, [maxSpread])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable
        || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      else if (e.key === 'Home') { e.preventDefault(); jumpTo(0) }
      else if (e.key === 'End') { e.preventDefault(); jumpTo(maxSpread) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, jumpTo, maxSpread])

  /** 点屏幕翻页：点在链接、按钮、输入框上不算翻页 */
  const onBookClick = (e: React.MouseEvent): void => {
    const target = e.target
    if (!(target instanceof Element)) return
    if (e.button !== 0 || e.detail > 1) return
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
    if (target.closest(OWN_ACTION)) return
    const rect = bookRef.current?.getBoundingClientRect()
    if (!rect) return
    if (e.clientX > rect.left + rect.width / 2) go(1)
    else go(-1)
  }

  const onTocClick = useCallback((line: number, id: string) => {
    const p = pageOfLine(pages, line - 1)
    if (p === null) {
      jumpTo(0)
    } else {
      jumpTo(Math.floor(p / 2))
    }
    useEditorStore.getState().setActiveTocId(id)
  }, [pages, jumpTo])

  const spreadHtml = useCallback((i: number): { left: string; right: string } => {
    const of = (p: Page<MeasuredBlock> | undefined): string =>
      (p?.blocks ?? []).map(b => b.html).join('')
    return { left: of(pages[i * 2]), right: of(pages[i * 2 + 1]) }
  }, [pages])

  // 阅读模式的分页 DOM 是翻页才挂载的，pages / spread 都要进依赖；换主题同样要重渲。
  // 整批重渲可接受：一页最多两栏，图块很少。
  // 注意 read-article-body 是 dangerouslySetInnerHTML 托管的，React 不追踪我们改的子节点；
  // __html 一变 React 会整段重写、我们的替换随之消失，所以要靠这个 effect 再补一次。
  useEffect(() => {
    const dark = resolveTheme(appTheme) === 'dark'
    document.querySelectorAll('.read-article-body').forEach((el) => {
      void renderMermaidBlocks(el as HTMLElement, dark)
    })
  }, [pages, spread, appTheme])

  const renderSpread = (i: number, cls: string): React.ReactNode => {
    const { left, right } = spreadHtml(i)
    return (
      <div className={`read-spread ${cls}`}>
        <div className="read-page read-page--left">
          <div className="read-article-body" dangerouslySetInnerHTML={{ __html: left }} />
        </div>
        <div className="read-spine" aria-hidden="true" />
        <div className="read-page read-page--right">
          <div className="read-article-body" dangerouslySetInnerHTML={{ __html: right }} />
        </div>
      </div>
    )
  }

  const activeTocId = useEditorStore((s) => s.activeTocId)

  return (
    <div className="read-mode-inline read-mode-book">
      <div className="read-mode-toolbar">
        <span className="read-mode-label">
          <span className="remix ri-book-open-line" style={{ marginRight: 6, fontSize: 15 }}></span>
          <span>{docTitle || '文档'}</span>
        </span>
        <div className="read-mode-controls">
          <button className="read-tool-btn" title="布局宽度"
            onClick={() => setReadLayout(LAYOUTS[(LAYOUTS.indexOf(readLayout) + 1) % LAYOUTS.length])}>
            <span className="remix ri-layout-2-line"></span>
            <span>{LAYOUT_LABELS[readLayout]}</span>
          </button>
          <button className="read-tool-btn" title="缩小字体"
            onClick={() => setReadFontSize(Math.max(MIN_FONT, readFontSize - 1))}>
            <span className="remix ri-subtract-line"></span>
          </button>
          <span className="read-font-size-value">{readFontSize}</span>
          <button className="read-tool-btn" title="放大字体"
            onClick={() => setReadFontSize(Math.min(MAX_FONT, readFontSize + 1))}>
            <span className="remix ri-add-line"></span>
          </button>
          <button className={`read-tool-btn ${readTocOpen ? 'active' : ''}`} title="目录"
            onClick={() => setReadTocOpen(!readTocOpen)}>
            <span className="remix ri-menu-fill"></span>
            <span>目录</span>
          </button>
        </div>
        <button className="read-mode-exit-btn" onClick={() => setAppMode('edit')}>
          <span className="remix ri-edit-line"></span>
          <span>编辑模式</span>
        </button>
      </div>

      <div className="read-mode-body" style={{ flexDirection: readTocOpen ? 'row' : 'column' }}>
        {readTocOpen && toc.length > 0 && (
          <div className="read-toc-sidebar">
            <div className="read-toc-header">
              <span className="remix ri-menu-fill"></span>
              <span>目录</span>
              <button className="read-toc-close" onClick={() => setReadTocOpen(false)} aria-label="关闭目录">
                <span className="remix ri-close-line"></span>
              </button>
            </div>
            <div className="read-toc-list">
              {toc.map(item => (
                <button key={item.id} className={`read-toc-item${item.id === activeTocId ? ' active' : ''}`}
                  style={{ paddingLeft: `${(item.level - 1) * 12 + 14}px` }}
                  onClick={() => onTocClick(item.line, item.id)}>
                  <span className="read-toc-dot" />
                  <span className="read-toc-text">{item.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="read-book" ref={bookRef} onClick={onBookClick}
          /* 写 --read-font-size 而不是 fontSize：正文和测量探针都用 var() 取值，
             两个地方才不会各走各的字号；页宽另有一个独立滑块控制。 */
          style={{ '--read-font-size': `${readFontSize}px`, '--read-page-w': `${pageW}px` } as React.CSSProperties}>
          {/* 测量容器：与页内容吃同一套排版类、同一个净宽，量出的槽位高就是渲染出来的高 */}
          <div ref={probeRef} className="read-article-body read-measure-probe" aria-hidden="true" />

          <div className="read-book-scene" ref={sceneRef}>
            {leaving && renderSpread(leaving.i,
              `read-spread--leaving ${leaving.dir === 1 ? 'r-dir-1' : 'r-dir-neg1'}`)}
            {renderSpread(spread, `read-spread--enter ${spread > 0 ? 'r-from-right' : 'r-from-left'}`)}
          </div>

          <div className="read-book-footer">
            <button className="read-tool-btn" disabled={spread <= 0} onClick={() => go(-1)} aria-label="上一页">
              <span className="remix ri-arrow-left-line"></span>
              <span>上一页</span>
            </button>
            <span className="read-page-indicator">第 {spread + 1} / {totalSpreads} 页</span>
            {totalSpreads <= DOT_LIMIT ? (
              <div className="read-progress-dots">
                {Array.from({ length: totalSpreads }, (_, i) => (
                  <span key={i} className={`read-progress-dot${i === spread ? ' active' : ''}`} />
                ))}
              </div>
            ) : (
              <div className="read-progress-bar">
                <span className="read-progress-fill"
                  style={{ width: `${totalSpreads > 1 ? (spread / (totalSpreads - 1)) * 100 : 100}%` }} />
              </div>
            )}
            <button className="read-tool-btn" disabled={spread >= maxSpread} onClick={() => go(1)} aria-label="下一页">
              <span>下一页</span>
              <span className="remix ri-arrow-right-line"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
