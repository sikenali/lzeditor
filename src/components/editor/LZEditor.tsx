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

  React.useEffect(() => {
    setEditorRef(editorRef.current)
    setEditorContentRef(editorRef.current?.querySelector('.lz-editor-content') ?? null)
  }, [])

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
      try {
        const s = localStorage.getItem('lzeditor-doc')
        if (s) {
          const d = JSON.parse(s)
          return remark().use(remarkGfm).use(remarkHtml).processSync(d.md || DEFAULT_CONTENT).toString()
        }
      } catch {}
      return remark().use(remarkGfm).use(remarkHtml).processSync(DEFAULT_CONTENT).toString()
    })(),
    onCreate: ({ editor }: any) => {
      setEditor(editor)
      if (activeDocId) {
        useEditorStore.getState().setLastEditTime(Date.now())
        const html = editor.getHTML()
        const text = editor.getText()
        setDocHTML(html)
        setMdContent(htmlToMarkdown(html))
        setWordCount(text.split(/\s+/).filter(Boolean).length)
        setCharCount(text.length)
        takeSnapshot(editor)
        // persist
        if (activeDocId) {
          const key = `lzeditor-doc-${activeDocId}`
          localStorage.setItem(key, JSON.stringify({ md: htmlToMarkdown(html), html, savedAt: Date.now() }))
        }
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
      // persist to docsMd and localStorage
      if (activeDocId) {
        const md = htmlToMarkdown(html)
        setDocsMd((prev: Record<string, string> = {}) => ({ ...prev, [activeDocId]: md }))
        localStorage.setItem(`lzeditor-doc-${activeDocId}`, JSON.stringify({ md, html, savedAt: Date.now() }))
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

  // Switch editor content when active doc changes
  useEffect(() => {
    if (!editor || !activeDocId || activeDocId === lastDocIdRef.current) return
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
      <div className="lz-editor-content">
        <EditorContent editor={editor} />
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
