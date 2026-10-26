import React, { useRef, useEffect } from 'react'
import { EditorView } from '@codemirror/view'
import { createCM6Editor, destroyCM6Editor } from './codemirror/editor'
import { setSnippetImpl, snippetCompletionSource } from './codemirror/complete'
import { DEFAULT_SNIPPETS } from './codemirror/snippets'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { mdToHtml } from '../../utils/mdToHtml'
import { flushPendingEdit, persistEdit, setPendingEdit } from '../../utils/pendingSave'

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
  const setWordCountStore = useEditorStore((s: any) => s.setWordCount)
  const setCursorPosition = useEditorStore((s: any) => s.setCursorPosition)

  const typewriterMode = useSettingsStore((s) => s.typewriterMode)
  const livePreview = useSettingsStore((s) => s.livePreview)
  const autoPairEnabled = useSettingsStore((s) => s.autoPair)
  const continueLists = useSettingsStore((s) => s.continueLists)
  const showLineNumbers = useSettingsStore((s) => s.showLineNumbers)
  const enableSpellCheck = useSettingsStore((s) => s.enableSpellCheck)
  const spellCheckLang = useSettingsStore((s) => s.spellCheckLang)
  const autoCompleteMdPairs = useSettingsStore((s) => s.autoCompleteMarkdownPairs)
  const focusMode = useSettingsStore((s) => s.focusMode)
  const currentLine = useSettingsStore((s) => s.currentLine)
  const softWrap = useSettingsStore((s) => s.softWrap)
  const tabSize = useSettingsStore((s) => s.tabSize)
  const keepMdMarkers = useSettingsStore((s) => s.showMarkdownMarkers)

  // 「自动配对」在内核区和「Markdown 快捷符号」区各有一个开关，两个都开才生效
  const autoPairOn = (autoPairEnabled ?? true) && (autoCompleteMdPairs ?? true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const editor = createCM6Editor({
      parent: container,
      doc: initialContent,
      onChange: () => {
        const text = editor.getText()
        const store = useEditorStore.getState()
        // markdown 是单一事实源：docsMd 优先被预览/导出/阅读模式消费，必须同步写入
        const html = (() => { try { return mdToHtml(text) } catch { return '' } })()
        store.updateDoc({ md: text, html, docsMd: { [docId]: text } })
        store.setLastEditTime(Date.now())

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        // 先登记待存内容，防抖没跑完就关窗口时 flushPendingEdit 还能捞到
        setPendingEdit({ md: text, html })
        saveTimerRef.current = setTimeout(() => {
          setPendingEdit(null)
          persistEdit(docId, { md: text, html })
        }, 800)
        useEditorStore.getState().setSyncStatus('saving')
      },
      onCursor: (line, col) => {
        setCursorPosition({ line, column: col })
      },
      onCounts: (words, chars) => {
        setWordCountStore(words)
        setCharCountStore(chars)
      },
    })

    editorRef.current = editor
    viewRef.current = editor.view as any
    container._cm6Editor = editor
    container._cm6View = editor.view as any

    setSnippetImpl(snippetCompletionSource())

    editor.setAutoPair(autoPairOn)
    editor.setContinueLists(continueLists ?? true)
    editor.setLineNumbers(showLineNumbers ?? false)
    editor.setSpellcheck(enableSpellCheck ?? true, spellCheckLang)
    editor.setCurrentLine(currentLine ?? true)
    editor.setSoftWrap(softWrap ?? true)
    editor.setTypewriter(typewriterMode ?? false)
    editor.setLivePreview(livePreview ?? false)
    editor.setKeepMarkdownMarkers(!!keepMdMarkers)
    editor.setFocusMode(focusMode ?? false)
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
    // 800ms 防抖意味着硬关窗口必然丢最后一段输入，这里补一刀
    const onBefore = () => flushPendingEdit()
    // pagehide 比 beforeunload 可靠：移动端和标签页复用都会触发它
    window.addEventListener('pagehide', onBefore)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPendingEdit()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onBefore)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    // 只在切换文档时重载；initialContent 变化不回灌，避免 store 里的旧 HTML 覆盖用户编辑
    const currentText = editor.getText()
    if (currentText !== initialContent) {
      editor.setText(initialContent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.setAutoPair(autoPairOn)
    editor.setContinueLists(continueLists ?? true)
    editor.setLineNumbers(showLineNumbers ?? false)
    editor.setSpellcheck(enableSpellCheck ?? true, spellCheckLang)
    editor.setCurrentLine(currentLine ?? true)
    editor.setSoftWrap(softWrap ?? true)
    editor.setTypewriter(typewriterMode ?? false)
    editor.setLivePreview(livePreview ?? false)
    editor.setKeepMarkdownMarkers(!!keepMdMarkers)
    editor.setFocusMode(focusMode ?? false)
    editor.setTabSize(tabSize ?? 2)
  }, [autoPairOn, continueLists, showLineNumbers, enableSpellCheck, spellCheckLang, currentLine, softWrap, typewriterMode, livePreview, focusMode, tabSize, keepMdMarkers])

  return (
    <div className="cm6-editor-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div ref={containerRef} className="cm6-editor-container" style={{ flex: 1, minHeight: 0 }} />
    </div>
  )
}

export const CM6Editor = CM6EditorInner
