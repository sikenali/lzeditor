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

export const LZEditor = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const { toolbar } = useDocumentSelection(editorRef)
  const setWordCount = useEditorStore((s: any) => s.setWordCount)
  const setCharCount = useEditorStore((s: any) => s.setCharCount)
  const setCursorPosition = useEditorStore((s: any) => s.setCursorPosition)
  const setEditorRef = useEditorStore((s: any) => s.setEditorRef)
  const setDocHTML = useEditorStore((s: any) => s.setDocHTML)
  const setMdContent = useEditorStore((s: any) => s.setMdContent)
  const setEditor = useEditorStore((s: any) => s.setEditor)
  const addVersion = useEditorStore((s: any) => s.addVersion)
  const snapshotTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    setEditorRef(editorRef.current)
  }, [])

  const takeSnapshot = React.useCallback((editor: any) => {
    const html = editor.getHTML()
    const text = editor.getText()
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
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
    content: remark().use(remarkGfm).use(remarkHtml).processSync(DEFAULT_CONTENT).toString(),
    onCreate: ({ editor }: any) => {
      setEditor(editor)
      const html = editor.getHTML()
      const text = editor.getText()
      setDocHTML(html)
      setMdContent(htmlToMarkdown(html))
      setWordCount(text.split(/\s+/).filter(Boolean).length)
      setCharCount(text.length)
      takeSnapshot(editor)
    },
    onUpdate: ({ editor }: any) => {
      const text = editor.getText()
      const html = editor.getHTML()
      setWordCount(text.split(/\s+/).filter(Boolean).length)
      setCharCount(text.length)
      setDocHTML(html)
      setMdContent(htmlToMarkdown(html))
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

  const handleToolbarAction = useCallback((action: AIAction) => {
    const selectedText = editor ? editor.state.doc.textContent.slice(editor.state.selection.from, editor.state.selection.to) : ''
    const pos = toolbar.position
    useAIStore.getState().showPanel(action, selectedText, pos)
  }, [editor, toolbar])

  useEffect(() => {
    return () => {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
      setEditor(null)
      editor?.destroy()
    }
  }, [editor])

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
