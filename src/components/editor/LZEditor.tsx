import React, { useRef, useEffect, useCallback } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import { useAIStore } from '../../store/aiStore'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { FloatingToolbar } from './FloatingToolbar'
import { AIPanel } from './AIPanel'
import { useDocumentSelection } from '../../hooks/useDocumentSelection'
import type { AIAction } from '../../shared/types'
import { DEFAULT_CONTENT } from './constants'
import { CodeHighlight } from './extensions/CodeHighlight'
import { Superscript, Subscript } from './extensions/SupSub'
import { Mathematics } from './extensions/Mathematics'
import { ImageExt } from './extensions/ImageExt'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import { htmlToMarkdown } from '../../utils/htmlToMd'
import { useTheme } from '../../hooks/useTheme'

const CONTENT_WIDTH_MAP: Record<string, string> = {
  '960': '960px',
  '1024': '1024px',
  '1200': '1200px',
  '1280': '1280px',
}

const getDocMd = (id: string): string => {
  try {
    const key = `lzeditor-doc-${id}`
    const s = localStorage.getItem(key)
    if (s) {
      const d = JSON.parse(s)
      return d.md || DEFAULT_CONTENT
    }
  } catch {}
  return DEFAULT_CONTENT
}

export const LZEditor = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const { toolbar } = useDocumentSelection(editorRef)
  const setWordCount = useEditorStore((s: any) => s.setWordCount)
  const setCharCount = useEditorStore((s: any) => s.setCharCount)
  const setCursorPosition = useEditorStore((s: any) => s.setCursorPosition)
  const setEditorRef = useEditorStore((s: any) => s.setEditorRef)
  const setEditorContentRef = useEditorStore((s: any) => s.setEditorContentRef)
  const setDocHTML = useEditorStore((s: any) => s.setDocHTML)
  const setMdContent = useEditorStore((s: any) => s.setMdContent)
  const setEditor = useEditorStore((s: any) => s.setEditor)
  const addVersion = useEditorStore((s: any) => s.addVersion)
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const docs = useEditorStore((s: any) => s.docs)
  const docsMd = useEditorStore((s: any) => s.docsMd || {})
  const setDocsMd = useEditorStore((s: any) => s.setDocsMd)

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
      Mathematics,
      ImageExt,
      TaskList,
      TaskItem,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: (() => {
      if (activeDocId && docsMd[activeDocId]) {
        return remark().use(remarkGfm).use(remarkHtml).processSync(docsMd[activeDocId]).toString()
      }
      return remark().use(remarkGfm).use(remarkHtml).processSync(getDocMd(activeDocId || 'welcome')).toString()
    })(),
    onCreate: ({ editor }: any) => {
      setEditor(editor)
      const docId = useEditorStore.getState().activeDocId
      if (docId) {
        useEditorStore.getState().setLastEditTime(Date.now())
        const html = editor.getHTML()
        const text = editor.getText()
        setDocHTML(html)
        setMdContent(htmlToMarkdown(html))
        setWordCount(text.split(/\s+/).filter(Boolean).length)
        setCharCount(text.length)
        takeSnapshot(editor)
        const key = `lzeditor-doc-${docId}`
        localStorage.setItem(key, JSON.stringify({ md: htmlToMarkdown(html), html, savedAt: Date.now() }))
      }
    },
    onUpdate: ({ editor }: any) => {
      useEditorStore.getState().setLastEditTime(Date.now())
      const text = editor.getText()
      const html = editor.getHTML()
      setWordCount(text.split(/\s+/).filter(Boolean).length)
      setCharCount(text.length)
      setDocHTML(html)
      setMdContent(htmlToMarkdown(html))
      const docId = useEditorStore.getState().activeDocId
      if (docId) {
        const md = htmlToMarkdown(html)
        setDocsMd((prev: Record<string, string> = {}) => ({ ...prev, [docId]: md }))
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

  React.useEffect(() => {
    setEditorRef(editorRef.current)
    setEditorContentRef(editorRef.current?.querySelector('.lz-editor-content') ?? null)
  }, [])

  // Apply editor style settings from store
  const editorFont = useSettingsStore((s) => s.editorFont)
  const defaultFontSize = useSettingsStore((s) => s.defaultFontSize)
  const lineHeight = useSettingsStore((s) => s.lineHeight)
  const contentWidth = useSettingsStore((s) => s.contentWidth)

  useEffect(() => {
    const container = editorRef.current
    if (!container) return
    const inner = container.querySelector('.lz-editor-content') as HTMLElement | null
    if (!inner) return
    const fw = CONTENT_WIDTH_MAP[contentWidth || '1024'] || '1024px'
    inner.style.width = fw
    inner.style.maxWidth = fw
    if (defaultFontSize) inner.style.fontSize = `${defaultFontSize}px`
    else inner.style.fontSize = ''
    if (lineHeight) inner.style.lineHeight = lineHeight
    else inner.style.lineHeight = ''
    if (editorFont) {
      if (editorFont === 'sans-serif') inner.style.fontFamily = 'var(--font-sans)'
      else if (editorFont === 'serif') inner.style.fontFamily = 'var(--font-sans)'
      else if (editorFont === 'monospace') inner.style.fontFamily = 'var(--font-mono)'
      else inner.style.fontFamily = editorFont
    }
  }, [editorFont, defaultFontSize, lineHeight, contentWidth])

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
    const md = docsMd[activeDocId] || getDocMd(activeDocId)
    const html = remark().use(remarkGfm).use(remarkHtml).processSync(md).toString()
    editor.commands.setContent(html)
  }, [activeDocId, editor, docsMd])

  useEffect(() => {
    return () => {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
      setEditor(null)
      editor?.destroy()
    }
  }, [editor])

  // Auto-complete markdown symbol pairs
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
    <div className="lz-editor" ref={editorRef}>
      <div className={`lz-editor-with-lines${showLineNumbers ? ' has-line-numbers' : ''}`}>
        {showLineNumbers && (
          <div className="lz-line-numbers">
            {Array.from({ length: lineCount }, (_, i) => (
              <span key={i + 1} className="lz-line-number">{i + 1}</span>
            ))}
          </div>
        )}
        <div className="lz-editor-content">
          <EditorContent editor={editor} />
        </div>
      </div>
      <FloatingToolbar
        position={toolbar.position}
        visible={toolbar.visible}
        onAction={handleToolbarAction}
      />
      <AIPanel />
    </div>
  )
}
