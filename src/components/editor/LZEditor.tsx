import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { README_CONTENT } from './constants'
import { mdToHtml } from '../../utils/mdToHtml'
import { getDocMd } from '../../utils/docSource'
import { useTheme, resolveTheme } from '../../hooks/useTheme'
import { applyTypographyOverrides } from '../../styles/themes'
import { CM6Editor } from './CM6Editor'
import { getCM6Editor } from './codemirror/registry'
import { setSlashHost, type SlashRange } from './codemirror/slash'
import { setInputFormatSettings } from './codemirror/input-format'
import { SlashCommand } from './SlashCommand'
import { Splitter } from '../splitter/Splitter'
import { gridColumns } from '../../utils/split'
import { useScrollSync, lineBridgeOf } from '../../hooks/scrollSync'
import { getTypographyTheme } from '../../styles/typography-themes'
import { renderMermaidBlocks } from '../../utils/markdown/mermaid'

const CONTENT_WIDTH_MAP: Record<string, string> = {
  '960': '960px',
  '1024': '1024px',
  '1200': '1200px',
  '1280': '1280px',
  'full': '100%',
}

/** 源栏栏头显示用的字体中文名。 */
const FONT_LABELS: Record<string, string> = {
  'sans-serif': '无衬线',
  serif: '衬线',
  monospace: '等宽',
}

export const LZEditor = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const slashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setEditorRef = useEditorStore((s: any) => s.setEditorRef)
  const setEditorContentRef = useEditorStore((s: any) => s.setEditorContentRef)
  const setMdContent = useEditorStore((s: any) => s.setMdContent)
  const setDocsMd = useEditorStore((s: any) => s.setDocsMd)
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const docs = useEditorStore((s: any) => s.docs)
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const codeMode = useEditorStore((s: any) => s.codeMode)
  const panelOpen = useEditorStore((s: any) => s.panelOpen)
  const mdContent = useEditorStore((s: any) => s.docsMd?.[activeDocId] || s.mdContent || '')

  // 确保 mdContent 有默认值
  const defaultMd = useMemo(() => {
    const docId = activeDocId || 'readme'
    if (docsMd?.[docId]) return docsMd[docId]
    return getDocMd(docId) || (docId === 'readme' ? README_CONTENT : '')
  }, [activeDocId, docsMd])

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

  useTheme()

  React.useEffect(() => {
    setEditorRef(editorRef.current)
    // 编辑模式滚容器是 .lz-editor-content；代码模式它变成 grid 壳，
    // 滚动权下放到左栏的 .lz-editor-page。editorContentRef 必须指向真正
    // 能滚的那一个 —— 滚动同步是听它的 scroll 事件的，指向不滚的祖先等于失效。
    const scroll = codeMode
      ? editorRef.current?.querySelector('.lz-editor-page')
      : editorRef.current?.querySelector('.lz-editor-content')
    setEditorContentRef(scroll ?? null)
  }, [codeMode, setEditorContentRef, setEditorRef])

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
    // 代码模式左栏比整宽窄得多，1024px 会直接溢出，源码栏必须 100%
    const fw = codeMode
      ? '100%'
      : contentWidth && CONTENT_WIDTH_MAP[contentWidth]
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
      else if (editorFont === 'serif') page.style.fontFamily = 'var(--font-serif)'
      else if (editorFont === 'monospace') page.style.fontFamily = 'var(--font-mono)'
      else page.style.fontFamily = editorFont
    }
  }, [editorFont, defaultFontSize, lineHeight, contentWidth, showPreview, codeMode])

  // Apply typography overrides to :root for read-mode / preview areas
  const textIndent = useSettingsStore((s) => s.textIndent)
  const textJustify = useSettingsStore((s) => s.textJustify)
  useEffect(() => {
    applyTypographyOverrides({
      fontSize: defaultFontSize,
      lineHeight: lineHeight,
      fontFamily: editorFont === 'serif' ? '"Noto Serif SC", serif' : (editorFont === 'monospace' ? 'monospace' : editorFont),
      textIndent,
      textJustify,
    })
  }, [defaultFontSize, lineHeight, editorFont, contentWidth, textIndent, textJustify])

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

  // 「Markdown 标记常显」在 CM6 的 live-preview 里生效（keepMarkdownMarkers facet），
  // 不靠 data-md-markers 属性 —— 编辑区没有 h1/ul DOM，那个属性一直是空开关

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

  // ── 代码模式：左右分栏 ──
  const updateSetting = useSettingsStore((s) => s.updateSetting)
  const codeSplitRatio = useSettingsStore((s) => s.codeSplitRatio ?? 0.5)
  const typographyTheme = useSettingsStore((s) => s.typographyTheme)
  const appTheme = useSettingsStore((s) => s.theme)
  const tabSize = useSettingsStore((s) => s.tabSize ?? 2)
  const editorContentRef = useEditorStore((s) => s.editorContentRef)
  const docHTML = useEditorStore((s) => s.docHTML || '')

  const splitHostRef = useRef<HTMLDivElement>(null)
  const [splitWidth, setSplitWidth] = useState(0)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const previewArticleRef = useRef<HTMLDivElement>(null)

  // 量容器宽：clampRatio 需要像素宽才能夹出最小栏宽。
  // 只在代码模式挂观察器，编辑模式的窗口 resize 不必多渲染一次。
  useEffect(() => {
    if (!codeMode) return
    const el = splitHostRef.current
    if (!el) return
    const measure = () => setSplitWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [codeMode])

  // Markdown → 预览 HTML。开 lines：每个顶层块带源码行号，滚动同步按行对位
  const previewHtml = useMemo(() => {
    if (docHTML) return docHTML
    if (!mdContent) return ''
    try {
      return mdToHtml(mdContent, undefined, { lines: true })
    } catch {
      return mdContent
    }
  }, [mdContent, docHTML])

  // 灌预览 HTML + 套排版主题 + 渲 mermaid，三步必须同一批做完。
  // codeMode 进依赖：预览容器每次进代码模式都新建，innerHTML 要重灌一次。
  // 退出代码模式时容器已 unmount，ref 为 null 直接返回，编辑模式无额外开销。
  useEffect(() => {
    const previewEl = previewArticleRef.current
    if (!previewEl) return
    const theme = getTypographyTheme(typographyTheme || 'classic')
    previewEl.innerHTML = previewHtml
      || '<p style="color:var(--text-muted);text-align:center;padding:40px 16px;">暂无内容，请先编辑文档</p>'
    previewEl.style.cssText = ''
    if (theme) {
      const css = theme.css
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.\lz-editor-content/g, '.preview-doc')
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.read-article-body/g, '.preview-doc')
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.export-preview-body/g, '.preview-doc')
      // 独立 style 节点：SidebarPreview 用的是 lz-sidebar-typography-css，
      // 两者选择器相同，共用 id 会互相摘掉对方的样式
      const styleEl = document.getElementById('lz-code-preview-typography-css') as HTMLStyleElement | null
      if (styleEl) styleEl.remove()
      const el = document.createElement('style')
      el.id = 'lz-code-preview-typography-css'
      el.textContent = css
      document.head.appendChild(el)
    }
    // mermaid 是异步增强：占位符先显示，渲完再换成图
    void renderMermaidBlocks(previewEl, resolveTheme(appTheme) === 'dark')
  }, [previewHtml, typographyTheme, appTheme, codeMode])

  // 换主题不会重新生成 html，也就不会重建 .mermaid-diagram，已渲染的图要自己重渲。
  // 单独成一个 effect：并进上面那个会在换主题时和 innerHTML 赋值打架。
  useEffect(() => {
    if (!previewArticleRef.current) return
    void renderMermaidBlocks(previewArticleRef.current, resolveTheme(appTheme) === 'dark')
  }, [appTheme])

  useScrollSync({
    editorEl: editorContentRef,
    scroller: previewScrollRef,
    article: previewArticleRef,
    enabled: codeMode,
    onSourceLine: (line) => {
      lineBridgeOf(editorContentRef)?.goToLine(line)
    },
  })

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

  return (
    <div className="lz-editor" ref={editorRef}>
      <div
        ref={splitHostRef}
        className={`lz-editor-content${codeMode ? ' lz-editor-content--code' : ''}`}
        style={codeMode ? { gridTemplateColumns: gridColumns(codeSplitRatio, splitWidth) } : undefined}
      >
        {/* CM6 永远是第一个子节点：代码模式只是在它后面追加兄弟节点，
            不让它 unmount —— 切模式重建实例会丢光标和 undo 历史。 */}
        <div className="code-source-pane">
          {codeMode && (
            <header className="code-pane-header">
              <span className="code-pane-title">MARKDOWN SOURCE</span>
              <span className="code-pane-sep">·</span>
              <span className="code-pane-meta">UTF-8</span>
              <span className="code-pane-sep">|</span>
              <span className="code-pane-meta">
                {(editorFont && FONT_LABELS[editorFont]) || editorFont} {defaultFontSize}px · Tab {tabSize} 空格
              </span>
            </header>
          )}
          <div className="lz-editor-page">
            <CM6Editor
              docId={activeDocId || 'readme'}
              initialContent={mdContent}
            />
          </div>
        </div>
        {codeMode && (
          <Splitter
            ratio={codeSplitRatio}
            containerWidth={splitWidth}
            onChange={(next) => updateSetting('codeSplitRatio', next)}
          />
        )}
        {codeMode && (
          <section className="code-pane preview-pane code-preview-pane" aria-label="预览">
            <header className="code-pane-header">
              <span className="code-pane-title">LIVE PREVIEW</span>
              <span className="code-pane-sep">·</span>
              <span className="code-pane-meta">滚动同步</span>
            </header>
            <div className="code-preview-scroll" ref={previewScrollRef}>
              <div className="preview-doc" ref={previewArticleRef} />
            </div>
          </section>
        )}
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
