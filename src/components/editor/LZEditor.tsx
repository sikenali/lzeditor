import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import { SearchAndReplace } from '@memfoldai/tiptap-search-and-replace'
import { Emoji } from '@tiptap/extension-emoji'
import { useAIStore } from '../../store/aiStore'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { FloatingToolbar } from './FloatingToolbar'
import { SlashCommand } from './SlashCommand'
import { useDocumentSelection } from '../../hooks/useDocumentSelection'
import type { AIAction } from '../../shared/types'
import { DEFAULT_CONTENT } from './constants'
import { CodeHighlight } from './extensions/CodeHighlight'
import { Superscript, Subscript } from './extensions/SupSub'
import { Mathematics } from './extensions/Mathematics'
import { ImageExt } from './extensions/ImageExt'
import { StyledInsertAttributes } from './extensions/StyledInsertAttributes'
import { mdToHtml } from '../../utils/mdToHtml'
import { htmlToMarkdown } from '../../utils/htmlToMd'
import { cleanContentHtml } from '../../utils/cleanContent'
import { getDocMd } from '../../utils/docSource'
import { renderMdWithMath } from '../../utils/mdWithMath'
import { useTheme } from '../../hooks/useTheme'
import { applyTypographyOverrides } from '../../styles/themes'
import { ServerAiToolkit } from '@tiptap/ai-toolkit'

const CONTENT_WIDTH_MAP: Record<string, string> = {
  '960': '960px',
  '1024': '1024px',
  '1200': '1200px',
  '1280': '1280px',
  'full': '100%',
}

export const LZEditor = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const editorInitialized = useRef(false)
  const readTocRef = useRef<HTMLDivElement>(null)
  const codeAreaRef = useRef<HTMLTextAreaElement>(null)
  const { toolbar } = useDocumentSelection(editorRef)
  const setWordCount = useEditorStore((s: any) => s.setWordCount)
  const setCharCount = useEditorStore((s: any) => s.setCharCount)
  const setCursorPosition = useEditorStore((s: any) => s.setCursorPosition)
  const setEditorRef = useEditorStore((s: any) => s.setEditorRef)
  const setEditorContentRef = useEditorStore((s: any) => s.setEditorContentRef)
  const setDocHTML = useEditorStore((s: any) => s.setDocHTML)
  const setMdContent = useEditorStore((s: any) => s.setMdContent)
  const updateDoc = useEditorStore((s: any) => s.updateDoc)
  const setDocsMd = useEditorStore((s: any) => s.setDocsMd)
  const setEditor = useEditorStore((s: any) => s.setEditor)
  const addVersion = useEditorStore((s: any) => s.addVersion)
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const docs = useEditorStore((s: any) => s.docs)
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const codeMode = useEditorStore((s: any) => s.codeMode)
  const appMode = useEditorStore((s: any) => s.appMode)
  const setAppMode = useEditorStore((s: any) => s.setAppMode)
  const docHTML = useEditorStore((s: any) => s.docHTML || '')
  const wordCount = useEditorStore((s: any) => s.wordCount)
  const typographyTheme = useSettingsStore((s) => s.typographyTheme)
  const mdContent = useEditorStore((s: any) => s.docsMd?.[activeDocId] || s.mdContent || '')
  const readFontSize = useEditorStore((s) => s.readFontSize)
  const setReadFontSize = useEditorStore((s) => s.setReadFontSize)
  const readLayout = useEditorStore((s) => s.readLayout)
  const setReadLayout = useEditorStore((s) => s.setReadLayout)
  const readTocOpen = useEditorStore((s) => s.readTocOpen)
  const setReadTocOpen = useEditorStore((s) => s.setReadTocOpen)
  const docTitle = useEditorStore((s) => s.docTitle)
  const setTocItems = useEditorStore((s) => s.setTocItems)
  const tocItems = useEditorStore((s) => s.tocItems)

  // 确保 mdContent 有默认值
  const defaultMd = useMemo(() => {
    const docId = activeDocId || 'welcome'
    if (docsMd?.[docId]) return docsMd[docId]
    return getDocMd(docId) || (docId === 'welcome' ? DEFAULT_CONTENT : '')
  }, [activeDocId, docsMd])

  const renderedHtml = useMemo(() => {
    if (!mdContent) return ''
    try { return renderMdWithMath(mdContent) } catch { return mdContent }
  }, [mdContent])

  const codeEditMdRef = useRef(mdContent)
  const [codeEditMd, setCodeEditMd] = useState(mdContent)
  useEffect(() => {
    codeEditMdRef.current = mdContent
    if (codeMode) setCodeEditMd(mdContent)
  }, [mdContent, codeMode])

  // 同步 mdContent 到 store：优先使用 docsMd，其次用 getDocMd 兜底
  useEffect(() => {
    const docId = activeDocId || 'welcome'
    const mdFromDocsMd = docsMd?.[docId] || ''
    const mdFromSource = getDocMd(docId)
    // docsMd 有内容时优先用 docsMd（避免对 welcome 做 htmlToMarkdown 往返）
    const targetMd = mdFromDocsMd || mdFromSource || ''
    if (targetMd && mdContent !== targetMd) {
      setMdContent(targetMd)
    }
  }, [defaultMd, docsMd, activeDocId])

  // 确保阅读模式有内容：如果 docHTML 为空，从 docsMd 生成
  const readContent = useMemo(() => {
    if (docHTML) return docHTML
    const docId = activeDocId || 'welcome'
    const md = docsMd?.[docId] || getDocMd(docId)
    if (md && md.trim()) {
      try {
        const html = mdToHtml(md)
        return html || md
      } catch {
        return md
      }
    }
    return docId === 'welcome' ? DEFAULT_CONTENT : ''
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
    lines.forEach((line: string, i: number) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/m)
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

  // Editor instance - must be declared before effects that use it
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } },
        codeBlock: false,
      }),
      CodeHighlight,
      Superscript,
      Subscript,
      StyledInsertAttributes,
      Mathematics,
      ImageExt,
      TaskList,
      TaskItem,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Emoji,
      SearchAndReplace.configure({
        searchResultClass: 'search-result',
        disableRegex: false,
      }),
      ServerAiToolkit,
    ],
    content: (() => {
      const docId = activeDocId || 'welcome'
      const md = docsMd?.[docId] || getDocMd(docId) || (docId === 'welcome' ? DEFAULT_CONTENT : '')
      if (!md) return ''
      return mdToHtml(md)
    })(),
    onCreate: ({ editor }: any) => {
      editorInitialized.current = true
      setEditor(editor)
      const docId = useEditorStore.getState().activeDocId
      if (docId) {
        useEditorStore.getState().setLastEditTime(Date.now())
        let html = editor.getHTML()
        html = cleanContentHtml(html)
        const text = editor.getText()
        setDocHTML(html)
        // welcome 文档不往返转换：直接用原始 Markdown，避免 htmlToMarkdown 破坏代码块格式
        if (docId === 'welcome') {
          const rawMd = getDocMd(docId)
          setMdContent(rawMd)
        } else {
          setMdContent(htmlToMarkdown(html))
        }
        setWordCount(text.split(/\s+/).filter(Boolean).length)
        setCharCount(text.length)
        takeSnapshot(editor)
        if (docId !== 'welcome') {
          const key = `lzeditor-doc-${docId}`
          localStorage.setItem(key, JSON.stringify({ md: htmlToMarkdown(html), html, savedAt: Date.now() }))
        }
      }
    },
    onUpdate: ({ editor }: any) => {
      useEditorStore.getState().setLastEditTime(Date.now())
      const text = editor.getText()
      const html = cleanContentHtml(editor.getHTML())
      const md = htmlToMarkdown(html)
      setWordCount(text.split(/\s+/).filter(Boolean).length)
      setCharCount(text.length)
      const docId = useEditorStore.getState().activeDocId
      updateDoc({ html, md, docsMd: docId ? { [docId]: md } : undefined })
      if (docId && docId !== 'welcome') {
        localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md, html, savedAt: Date.now() }))
      }
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
      snapshotTimerRef.current = setTimeout(() => takeSnapshot(editor), 1500)
    },
    onSelectionUpdate: ({ editor }: any) => {
      const pos = editor.state.selection
      const line = editor.state.doc.nodeSize > 0
        ? editor.view.coordsAtPos(pos.from).top
        : 0
      setCursorPosition({ line: Math.max(1, Math.floor(line / 22) + 1), column: pos.from })
    },
    editable: true,
  })

  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDocIdRef = useRef<string | null>(null)
  const pmDomRef = useRef<HTMLElement | null>(null)
  const remarkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    setEditorRef(editorRef.current)
    setEditorContentRef(editorRef.current?.querySelector('.lz-editor-content') ?? null)
  }, [])

  // 每次挂载清除 welcome 的 localStorage 旧 HTML，确保始终从 welcome.md 文件读取干净内容
  React.useEffect(() => {
    if (activeDocId === 'welcome') {
      localStorage.removeItem('lzeditor-doc-welcome')
    }
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

  // ── Typewriter mode: keep cursor vertically centered ──
  const typewriterMode = useSettingsStore((s) => s.typewriterMode)
  useEffect(() => {
    if (!typewriterMode || !editor) return
    const onCursor = () => {
      try {
        const view = editor.view
        if (!view || !view.dom) return
        const { from } = view.state.selection
        const coords = view.coordsAtPos(from)
        const dom = view.dom as HTMLElement
        const rect = dom.getBoundingClientRect()
        if (coords.top !== undefined) {
          const offset = coords.top - rect.top - rect.height / 2
          dom.scrollTop += offset
        }
      } catch {}
    }
    editor.on('selectionUpdate', onCursor)
    return () => { editor.off('selectionUpdate', onCursor) }
  }, [editor, typewriterMode])

  // ── Focus mode: dim non-active paragraphs ──
  const focusMode = useSettingsStore((s) => s.focusMode)
  const focusModeRef = useRef(focusMode)
  focusModeRef.current = focusMode

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const pm = el.querySelector('.ProseMirror') as HTMLElement | null
    if (!pm) return
    const applyFocus = () => {
      if (!pm || !focusModeRef.current) return
      const children = pm.children
      for (let i = 0; i < children.length; i++) {
        const node = children[i]
        if (!(node instanceof HTMLElement)) continue
        const rect = node.getBoundingClientRect()
        const pmRect = pm.getBoundingClientRect()
        const isVisible = rect.bottom > pmRect.top + 20 && rect.top < pmRect.bottom - 20
        node.style.opacity = isVisible ? '' : '0.25'
      }
    }
    editor!.on('update', applyFocus)
    applyFocus()
    return () => { editor!.off('update', applyFocus) }
  }, [editor])

  // ── Strip read-frog extension injected nodes from ProseMirror DOM ──
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const pm = el.querySelector('.ProseMirror') as HTMLElement | null
    if (!pm) return
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          if (node.dataset.readFrogWalked || node.className?.includes('read-frog') || node.className?.includes('notranslate')) {
            node.remove()
          }
          node.querySelectorAll('[data-read-frog-], .read-frog-translated-content-wrapper, .read-frog-translated-inline-content, span.notranslate[data-translate-ignore]').forEach((n: any) => n.remove())
        }
      }
    })
    observer.observe(pm, { childList: true, subtree: true })
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

  // ── Spell check ──
  const enableSpellCheck = useSettingsStore((s) => s.enableSpellCheck)
  useEffect(() => {
    const pm = editorRef.current?.querySelector('.ProseMirror') as HTMLElement | null
    if (pm) pm.setAttribute('spellcheck', enableSpellCheck ? 'true' : 'false')
  }, [enableSpellCheck])

  // Initialize docsMd: merge missing docs from localStorage (never overwrite existing)
  React.useEffect(() => {
    const init: Record<string, string> = {}
    docs.forEach((d: { id: string }) => {
      if (!docsMd[d.id]) init[d.id] = getDocMd(d.id)
    })
    if (Object.keys(init).length > 0) setDocsMd(init)
  }, [docs])

  const takeSnapshot = React.useCallback((editor: any) => {
    const html = editor.getHTML()
    const text = editor.getText()
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    const date = `${pad(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    addVersion({
      id: String(Date.now()),
      time,
      date,
      desc: text.trim().slice(0, 24) || '空文档',
      changes: text.length,
      html,
      md: htmlToMarkdown(html),
    })
  }, [addVersion])

  // Switch editor content when active doc changes
  useEffect(() => {
    if (!editor || !activeDocId) return
    if (activeDocId === lastDocIdRef.current) return
    lastDocIdRef.current = activeDocId
    const md = docsMd[activeDocId] || getDocMd(activeDocId) || (activeDocId === 'welcome' ? DEFAULT_CONTENT : '')
    const html = md ? mdToHtml(md) : ''
    editor.commands.setContent(html)
  }, [activeDocId, editor, docsMd])

  // Sync mdContent when entering code mode
  useEffect(() => {
    if (!codeMode || !activeDocId) return
    const docId = activeDocId
    const mdFromDocsMd = docsMd?.[docId] || ''
    const mdFromSource = getDocMd(docId)
    const targetMd = mdFromDocsMd || mdFromSource || (docId === 'welcome' ? DEFAULT_CONTENT : '')
    if (targetMd && mdContent !== targetMd) setMdContent(targetMd)
  }, [codeMode, activeDocId, docsMd])

  useEffect(() => {
    return () => {
      if (!editorInitialized.current) return
      editorInitialized.current = false
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
      if (remarkTimerRef.current) clearTimeout(remarkTimerRef.current)
      setEditor(null)
      editor?.destroy()
    }
  }, [editor])

  // ── Slash command palette ──
  const [slashVisible, setSlashVisible] = useState(false)
  const [slashPosition, setSlashPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [slashFilter, setSlashFilter] = useState('')
  const slashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hideSlash = useCallback(() => {
    if (slashTimerRef.current) clearTimeout(slashTimerRef.current)
    slashTimerRef.current = setTimeout(() => setSlashVisible(false), 120)
  }, [])

  const showSlashPalette = useCallback(() => {
    if (!editor) return
    const sel = editor.state.selection
    const textBefore = editor.state.doc.textBetween(Math.max(0, sel.from - 4), sel.from, '')
    if (textBefore.slice(-1) !== '/') return
    const view = editor.view
    const coords = view.coordsAtPos(sel.from)
    setSlashPosition({ x: coords.right + 4, y: coords.top - 4 })
    setSlashFilter('')
    setSlashVisible(true)
  }, [editor])

  useEffect(() => {
    try {
      if (editor?.view?.dom) pmDomRef.current = editor.view.dom as HTMLElement
    } catch {}
  }, [editor])

  const slashFilterRef = useRef('')
  useEffect(() => { slashFilterRef.current = '' }, [slashVisible])

  useEffect(() => {
    const pm = pmDomRef.current
    if (!pm) return
    let slashPending = false
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') slashPending = true
    }
    const onInput = (e: Event) => {
      const raw = (e as InputEvent)
      if (raw.inputType === 'insertText' && raw.data === '/') {
        e.preventDefault()
        slashPending = false
        const sel = editor?.state?.selection
        if (!sel) return
        const coords = editor.view.coordsAtPos(sel.from)
        setSlashPosition({ x: coords.right + 4, y: coords.top - 4 })
        slashFilterRef.current = ''
        setSlashFilter('')
        setSlashVisible(true)
        return
      }
      if (!slashVisible) {
        slashPending = false
        return
      }
      const sel = editor?.state?.selection
      if (!sel) return
      const textBefore = editor.state.doc.textBetween(Math.max(0, sel.from - 20), sel.from, '')
      const match = textBefore.match(/\/([^\s]*)$/)
      slashFilterRef.current = match ? match[1] : ''
      if (match) setSlashFilter(match[1])
      else hideSlash()
    }
    pm.addEventListener('keydown', onKeyDown)
    pm.addEventListener('input', onInput)
    return () => {
      pm.removeEventListener('keydown', onKeyDown)
      pm.removeEventListener('input', onInput)
    }
  }, [editor])

  const panelOpen = useEditorStore((s) => s.panelOpen)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.slash-command')) return
      hideSlash()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [hideSlash])

  // Block ProseMirror from re-acquiring focus while a panel is open
  useEffect(() => {
    const pm = editorRef.current?.querySelector('.ProseMirror') as HTMLElement | null
    if (!pm) return
    const onFocus = (e: FocusEvent) => {
      if (panelOpen) e.preventDefault()
    }
    const onMouseDown = (e: MouseEvent) => {
      if (panelOpen) {
        const target = e.target as HTMLElement
        if (target.closest('.unified-dialog') || target.closest('.ai-panel')) return
        e.preventDefault()
      }
    }
    pm.addEventListener('focus', onFocus, true)
    pm.addEventListener('mousedown', onMouseDown)
    return () => {
      pm.removeEventListener('focus', onFocus, true)
      pm.removeEventListener('mousedown', onMouseDown)
    }
  }, [panelOpen])

  const autoCompleteEnabled = useSettingsStore((s) => s.autoCompleteMarkdownPairs)
  const smartQuotesEnabled = useSettingsStore((s) => s.smartQuotes)
  const autoSpaceCJKEnabled = useSettingsStore((s) => s.autoSpaceCJK)
  const cornerQuotesEnabled = useSettingsStore((s) => s.cornerQuotes)
  const fullwidthSymbolsEnabled = useSettingsStore((s) => s.fullwidthSymbols)

  useEffect(() => {
    const el = editorRef.current
    if (!el || !editor) return
    const handleInput = (e: Event) => {
      if (!autoCompleteEnabled && !smartQuotesEnabled && !autoSpaceCJKEnabled && !cornerQuotesEnabled && !fullwidthSymbolsEnabled) return
      const sel = editor.state.selection
      if (!sel) return
      const textBefore = editor.state.doc.textBetween(Math.max(0, sel.from - 4), sel.from, '')
      const ch = textBefore.slice(-1)
      if (autoCompleteEnabled) {
        const pairMap: Record<string, string> = {
          '(': ')', '[': ']', '{': '}', '〈': '〉', '《': '》', '「': '」',
          '<': '>', '\u201c': '\u201d', '\u2018': '\u2019',
        }
        if (pairMap[ch]) {
          e.preventDefault()
          editor.commands.insertContent(pairMap[ch])
          const newPos = sel.from + 1
          editor.commands.setTextSelection({ from: newPos, to: newPos })
          return
        }
      }
      if (smartQuotesEnabled) {
        const lastTwo = textBefore.slice(-2)
        if (lastTwo === '""' || lastTwo === "''") {
          e.preventDefault()
          editor.commands.insertContent('\u201d')
          editor.commands.setTextSelection({ from: sel.from + 1, to: sel.from + 1 })
          return
        }
      }
      if (cornerQuotesEnabled) {
        const afterSel = editor.state.doc.textBetween(sel.to, sel.to + 4, '')
        if (ch === '"' && afterSel.startsWith('"')) {
          e.preventDefault()
          editor.commands.insertContent('「」')
          editor.commands.setTextSelection({ from: sel.from + 1, to: sel.from + 1 })
          return
        }
        if (ch === "'" && afterSel.startsWith("'")) {
          e.preventDefault()
          editor.commands.insertContent('『』')
          editor.commands.setTextSelection({ from: sel.from + 1, to: sel.from + 1 })
          return
        }
      }
      if (fullwidthSymbolsEnabled) {
        const fullwidthMap: Record<string, string> = { ',': '，', ';': '；' }
        if (fullwidthMap[ch]) {
          e.preventDefault()
          editor.commands.insertContent(fullwidthMap[ch])
          editor.commands.setTextSelection({ from: sel.from + 1, to: sel.from + 1 })
          return
        }
      }
    }
    el.addEventListener('input', handleInput as EventListener)
    return () => el.removeEventListener('input', handleInput as EventListener)
  }, [editor, autoCompleteEnabled, smartQuotesEnabled, autoSpaceCJKEnabled, cornerQuotesEnabled, fullwidthSymbolsEnabled])

  // Line numbers
  const showLineNumbers = useSettingsStore((s) => s.showLineNumbers)
  const [lineCount, setLineCount] = React.useState(1)

  React.useEffect(() => {
    if (!editor) return
    let alive = true
    const updateLines = () => {
      try {
        if (!alive || !editor || !editor.state || !editor.state.doc) return
        const text = editor.getText()
        setLineCount(text.split('\n').length)
      } catch {}
    }
    updateLines()
    editor.on('update', updateLines)
    return () => { alive = false; editor.off('update', updateLines) }
  }, [editor])

  const handleToolbarAction = useCallback((action: AIAction) => {
    const selectedText = editor ? editor.state.doc.textContent.slice(editor.state.selection.from, editor.state.selection.to) : ''
    const pos = toolbar.position
    useAIStore.getState().showPanel(action, selectedText, pos)
  }, [editor, toolbar])

  const handleCodeModeChange = useCallback((value: string) => {
    if (remarkTimerRef.current) clearTimeout(remarkTimerRef.current)
    remarkTimerRef.current = setTimeout(() => {
      setMdContent(value)
      const docId = useEditorStore.getState().activeDocId
      try {
        const html = mdToHtml(value || '')
        updateDoc({ md: value, html, docsMd: docId ? { [docId]: value } : undefined })
        if (docId && docId !== 'welcome') {
          localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md: value, html, savedAt: Date.now() }))
        }
        editor?.commands.setContent(html, { emitUpdate: false })
      } catch {
        if (docId) setDocsMd((prev: Record<string, string> = {}) => ({ ...prev, [docId]: value }))
      }
    }, 150)
  }, [editor, updateDoc, setMdContent, setDocsMd])

  // Attach paste/drop listeners to the container div (editorRef) instead of editor.view.dom
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault()
          const file = items[i].getAsFile()
          if (file && editor) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              editor.commands.insertContent({
                type: 'image',
                attrs: { src: ev.target?.result as string, alt: file.name },
              })
            }
            reader.readAsDataURL(file)
          }
        }
      }
    }
    const onDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files
      if (!files) return
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/') && editor) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            editor.commands.insertContent({
              type: 'image',
              attrs: { src: ev.target?.result as string, alt: file.name },
            })
          }
          reader.readAsDataURL(file)
        }
      })
    }
    el.addEventListener('paste', onPaste)
    el.addEventListener('drop', onDrop)
    return () => {
      el.removeEventListener('paste', onPaste)
      el.removeEventListener('drop', onDrop)
    }
  }, [editor, editorRef])

  return (
    <div className={`lz-editor${showLineNumbers ? ' has-line-numbers' : ''}`} ref={editorRef}>
      {showLineNumbers && (
        <div className="lz-line-numbers">
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i + 1} className="lz-line-number">{i + 1}</span>
          ))}
        </div>
      )}
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
          {appMode !== 'read' && !codeMode && (
            <>
              <EditorContent editor={editor} />
              {editor && (
                <BubbleMenu editor={editor}>
                  <button className="format-chip" onClick={() => editor.chain().focus().toggleBold().run()} title="粗体"><span className="remix ri-bold"></span></button>
                  <button className="format-chip" onClick={() => editor.chain().focus().toggleItalic().run()} title="斜体"><span className="remix ri-italic"></span></button>
                  <button className="format-chip" onClick={() => editor.chain().focus().toggleStrike().run()} title="删除线"><span className="remix ri-strikethrough"></span></button>
                  <button className="format-chip" onClick={() => editor.chain().focus().toggleUnderline().run()} title="下划线"><span className="remix ri-underline"></span></button>
                  <button className="format-chip" onClick={() => editor.chain().focus().toggleHighlight().run()} title="高亮"><span className="remix ri-highlight"></span></button>
                </BubbleMenu>
              )}
            </>
          )}
        </div>
      </div>
      <SlashCommand
        position={slashPosition}
        visible={slashVisible}
        filter={slashFilter}
        onClose={hideSlash}
        editor={editor}
      />
      <FloatingToolbar
        position={toolbar.position}
        visible={toolbar.visible}
        onAction={handleToolbarAction}
      />
    </div>
  )
}
