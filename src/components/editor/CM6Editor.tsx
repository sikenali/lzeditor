import React, { useRef, useEffect } from 'react'
import { EditorView } from '@codemirror/view'
import { createCM6Editor, destroyCM6Editor } from './codemirror/editor'
import { setSnippetImpl, snippetCompletionSource } from './codemirror/complete'
import { DEFAULT_SNIPPETS } from './codemirror/snippets'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'

interface CM6EditorProps {
  docId: string
  initialContent: string
}

const CM6EditorInner: React.FC<CM6EditorProps> = ({ docId, initialContent }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<ReturnType<typeof createCM6Editor> | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setCharCountStore = useEditorStore((s: any) => s.setCharCount)
  const setCursorPosition = useEditorStore((s: any) => s.setCursorPosition)
  const setMdContent = useEditorStore((s: any) => s.setMdContent)
  const updateDoc = useEditorStore((s: any) => s.updateDoc)
  const addVersion = useEditorStore((s: any) => s.addVersion)

  const typewriterMode = useSettingsStore((s) => s.typewriterMode)
  const livePreview = useSettingsStore((s) => s.livePreview)
  const autoPairEnabled = useSettingsStore((s) => s.autoPair)
  const continueLists = useSettingsStore((s) => s.continueLists)
  const showLineNumbers = useSettingsStore((s) => s.showLineNumbers)
  const enableSpellCheck = useSettingsStore((s) => s.enableSpellCheck)
  const currentLine = useSettingsStore((s) => s.currentLine)
  const softWrap = useSettingsStore((s) => s.softWrap)
  const tabSize = useSettingsStore((s) => s.tabSize)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const editor = createCM6Editor({
      parent: container,
      doc: initialContent,
      onChange: () => {
        const text = editor.getText()
        setMdContent(text)
        updateDoc({ md: text })

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
          addVersion({
            id: String(Date.now()),
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString('zh-CN'),
            desc: text.trim().slice(0, 24) || '空文档',
            changes: text.length,
            html: '',
            md: text,
          })
          useEditorStore.getState().setSyncStatus('synced')
          try {
            localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md: text, savedAt: Date.now() }))
          } catch {}
        }, 800)
        useEditorStore.getState().setSyncStatus('saving')
      },
      onCursor: (line, col) => {
        setCursorPosition({ line, column: col })
      },
      onCounts: (_words, chars) => {
        setCharCountStore(chars)
      },
    })

    editorRef.current = editor
    viewRef.current = editor.view as any
    container._cm6Editor = editor
    container._cm6View = editor.view as any

    setSnippetImpl(snippetCompletionSource())

    editor.setAutoPair(autoPairEnabled ?? false)
    editor.setContinueLists(continueLists ?? true)
    editor.setLineNumbers(showLineNumbers ?? true)
    editor.setSpellcheck(enableSpellCheck ?? true)
    editor.setCurrentLine(currentLine ?? true)
    editor.setSoftWrap(softWrap ?? true)
    editor.setTypewriter(typewriterMode ?? false)
    editor.setLivePreview(livePreview ?? false)
    editor.setTabSize(tabSize ?? 2)
    editor.setSnippets(DEFAULT_SNIPPETS)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const view = viewRef.current
      if (view) {
        container._cm6Editor = undefined
        container._cm6View = undefined
        destroyCM6Editor(view)
      }
      editorRef.current = null
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const currentText = editor.getText()
    if (currentText !== initialContent) {
      editor.setText(initialContent)
    }
  }, [docId, initialContent])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.setAutoPair(autoPairEnabled ?? false)
    editor.setContinueLists(continueLists ?? true)
    editor.setLineNumbers(showLineNumbers ?? true)
    editor.setSpellcheck(enableSpellCheck ?? true)
    editor.setCurrentLine(currentLine ?? true)
    editor.setSoftWrap(softWrap ?? true)
    editor.setTypewriter(typewriterMode ?? false)
    editor.setLivePreview(livePreview ?? false)
    editor.setTabSize(tabSize ?? 2)
  }, [autoPairEnabled, continueLists, showLineNumbers, enableSpellCheck, currentLine, softWrap, typewriterMode, livePreview, tabSize])

  return (
    <div className="cm6-editor-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div ref={containerRef} className="cm6-editor-container" style={{ flex: 1, minHeight: 0 }} />
    </div>
  )
}

export const CM6Editor = CM6EditorInner
