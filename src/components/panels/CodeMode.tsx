import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import { DEFAULT_CONTENT } from '../../components/editor/constants'

interface CursorPos {
  line: number
  column: number
}

export const CodeMode: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const mdContent = useEditorStore((s) => s.mdContent || '')
  const docTitle = useEditorStore((s) => s.docTitle)
  const docPath = useEditorStore((s) => s.docPath)
  const editor = useEditorStore((s) => s.editor)
  const setMdContent = useEditorStore((s) => s.setMdContent)
  const setDocHTML = useEditorStore((s) => s.setDocHTML)
  const setDocsMd = useEditorStore((s: any) => s.setDocsMd)
  const activeDocId = useEditorStore((s) => s.activeDocId)
  const docHTML = useEditorStore((s) => s.docHTML || '')

  // Fallback: read initial markdown from localStorage if store is empty
  const initialMd = useMemo(() => {
    const cached = localStorage.getItem(`lzeditor-doc-${activeDocId || 'welcome'}`)
    if (cached) {
      try {
        const d = JSON.parse(cached)
        if (d.md) return d.md
      } catch {}
    }
    // Also check legacy key
    const legacy = localStorage.getItem('lzeditor-doc')
    if (legacy) {
      try {
        const d = JSON.parse(legacy)
        if (d.md) return d.md
      } catch {}
    }
    // Use DEFAULT_CONTENT as last resort
    return DEFAULT_CONTENT
  }, [activeDocId])

  const [text, setText] = useState(() => {
    // Initialize from localStorage directly to avoid blank flash
    const cached = localStorage.getItem(`lzeditor-doc-${activeDocId || 'welcome'}`)
    if (cached) {
      try {
        const d = JSON.parse(cached)
        if (d.md) return d.md
      } catch {}
    }
    const legacy = localStorage.getItem('lzeditor-doc')
    if (legacy) {
      try {
        const d = JSON.parse(legacy)
        if (d.md) return d.md
      } catch {}
    }
    return mdContent || DEFAULT_CONTENT
  })
  const [cursor, setCursor] = useState<CursorPos>({ line: 1, column: 1 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mdContent && mdContent !== text) setText(mdContent)
    else if (!mdContent && !text) setText(initialMd)
  }, [mdContent, initialMd])

  const updateCursor = useCallback((el: HTMLTextAreaElement) => {
    const pos = el.selectionStart
    const textUpToCursor = el.value.substring(0, pos)
    const lines = textUpToCursor.split('\n')
    setCursor({ line: lines.length, column: lines[lines.length - 1].length + 1 })
  }, [])

  const handleChange = useCallback((value: string) => {
    setText(value)
    const docId = useEditorStore.getState().activeDocId
    try {
      const html = remark().use(remarkGfm).use(remarkHtml).processSync(value || '').toString()
      setDocHTML(html)
      if (docId) {
        setDocsMd((prev: Record<string, string> = {}) => ({ ...prev, [docId]: value }))
        localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md: value, html, savedAt: Date.now() }))
      }
      if (editor) {
        editor.commands.setContent(html, { emitUpdate: false })
      }
    } catch {
      if (docId) setDocsMd((prev: Record<string, string> = {}) => ({ ...prev, [docId]: value }))
    }
    setMdContent(value)
  }, [editor, setDocHTML, setDocsMd, setMdContent])

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [onClose])

  const lineCount = text.split('\n').length
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)

  return (
    <div className="code-mode-overlay" onClick={onClose}>
      <div className="code-mode-container" onClick={e => e.stopPropagation()}>

        {/* ── Top bar ── */}
        <div className="code-mode-topbar">
          <div className="code-mode-left">
            <span className="remix code-mode-logo ri-code-s-line"></span>
            <span className="code-mode-label">代码模式</span>
          </div>

          <div className="code-mode-center">
            <span className="code-mode-meta">{docPath || docTitle || 'untitled.md'}</span>
            <span className="code-mode-dot" />
            <span className="code-mode-meta">Ln {cursor.line}, Col {cursor.column}</span>
            <span className="code-mode-dot" />
            <span className="code-mode-meta">{text.length} 字符 · {text.split(/\s+/).filter(Boolean).length} 词</span>
          </div>

          <div className="code-mode-right">
            <button className="code-mode-exit-btn" onClick={onClose} title="退出代码模式 (Esc)">
              <span className="remix ri-close-line"></span>
              <span>退出</span>
            </button>
          </div>
        </div>

        {/* ── Editor area ── */}
        <div className="code-mode-body">
          <div className="code-line-numbers" ref={lineNumbersRef}>
            {lineNumbers.map(n => (
              <div key={n} className={`code-line-num${n === cursor.line ? ' active' : ''}`}>{n}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="code-mode-textarea"
            value={text}
            onChange={e => handleChange(e.target.value)}
            onMouseUp={() => updateCursor(textareaRef.current!)}
            onKeyUp={() => updateCursor(textareaRef.current!)}
            onClick={() => updateCursor(textareaRef.current!)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>

        {/* ── Status bar ── */}
        <div className="code-mode-statusbar">
          <span className="code-mode-status-left">
            <span className="remix ri-markdown-fill"></span>
            <span>Markdown</span>
          </span>
          <span className="code-mode-status-right">
            <span>{lineCount} 行</span>
            <span className="code-mode-dot" />
            <span>UTF-8</span>
          </span>
        </div>

      </div>
    </div>
  )
}
