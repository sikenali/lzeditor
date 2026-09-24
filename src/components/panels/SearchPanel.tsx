import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'

interface SearchPanelProps {
  onClose: () => void
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onClose }) => {
  const editor = useEditorStore((s) => s.editor)
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [resultCount, setResultCount] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const scrollToSelection = useCallback(() => {
    if (!editor?.view?.dom) return
    try {
      const view = editor.view
      const { from } = view.state.selection
      const coords = view.coordsAtPos(from)
      if (coords.top === undefined) return
      const dom = view.dom as HTMLElement
      const rect = dom.getBoundingClientRect()
      const offset = coords.top - rect.top - rect.height / 3
      dom.scrollTop += offset
    } catch {}
  }, [editor])

  const refreshCounts = useCallback(() => {
    if (!editor) return
    const storage = editor.storage?.searchAndReplace
    if (storage) {
      setResultCount(storage.results?.length || 0)
      setCurrentIndex(storage.resultIndex || 0)
    }
  }, [editor])

  const handleSearch = useCallback(() => {
    if (!editor || !searchTerm.trim()) return
    editor.commands.setSearchTerm(searchTerm)
    editor.commands.setCaseSensitive(caseSensitive)
    editor.commands.resetIndex()
    if (editor.view) {
      editor.view.dispatch(editor.view.state.tr)
    }
    refreshCounts()
    // Scroll to first result after a short delay to let decorations render
    setTimeout(scrollToSelection, 50)
  }, [editor, searchTerm, caseSensitive, refreshCounts, scrollToSelection])

  const handleReplace = useCallback(() => {
    if (!editor || !searchTerm.trim()) return
    editor.commands.setReplaceTerm(replaceTerm)
    editor.commands.replace()
  }, [editor, searchTerm, replaceTerm])

  const handleReplaceAll = useCallback(() => {
    if (!editor || !searchTerm.trim()) return
    editor.commands.setReplaceTerm(replaceTerm)
    editor.commands.replaceAll()
  }, [editor, searchTerm, replaceTerm])

  const handleNext = useCallback(() => {
    if (!editor) return
    editor.commands.nextSearchResult()
    refreshCounts()
    setTimeout(scrollToSelection, 50)
  }, [editor, refreshCounts, scrollToSelection])

  const handlePrev = useCallback(() => {
    if (!editor) return
    editor.commands.previousSearchResult()
    refreshCounts()
    setTimeout(scrollToSelection, 50)
  }, [editor, refreshCounts, scrollToSelection])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const panel = document.querySelector('.search-panel')
      if (panel && !panel.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div className="search-panel" role="dialog" aria-label="搜索与替换">
      <div className="search-panel-header">
        <span>搜索与替换</span>
        <button className="search-panel-close" onClick={onClose} title="关闭">
          <span className="remix ri-close-line"></span>
        </button>
      </div>

      <div className="search-panel-body">
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="搜索..."
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); handleSearch() }
          }}
        />
        <input
          className="search-input"
          type="text"
          value={replaceTerm}
          onChange={e => setReplaceTerm(e.target.value)}
          placeholder="替换为..."
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); handleReplace() }
          }}
        />
        <label className="search-option">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={e => setCaseSensitive(e.target.checked)}
          />
          区分大小写
        </label>
      </div>

      {searchTerm && (
        <div className="search-result-count">
          {resultCount > 0 ? `找到 ${resultCount} 个结果（第 ${currentIndex + 1} 个）` : '未找到匹配项'}
        </div>
      )}

      <div className="search-panel-actions">
        <button className="search-btn search-btn--primary" onClick={handleSearch}>
          <span className="remix ri-search-line"></span> 搜索
        </button>
        <button className="search-btn" onClick={handleNext} disabled={!editor}>下一个</button>
        <button className="search-btn" onClick={handlePrev} disabled={!editor}>上一个</button>
      </div>

      <div className="search-panel-actions">
        <button className="search-btn search-btn--accent" onClick={handleReplace} disabled={!editor || !replaceTerm}>
          <span className="remix ri-arrow-right-line"></span> 替换
        </button>
        <button className="search-btn search-btn--accent" onClick={handleReplaceAll} disabled={!editor || !replaceTerm}>
          <span className="remix ri-arrow-right-double-line"></span> 全部替换
        </button>
      </div>
    </div>
  )
}
