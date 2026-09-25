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
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
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
    editor.commands.setWholeWord(wholeWord)
    editor.commands.setRegex(useRegex)
    editor.commands.resetIndex()
    if (editor.view) {
      editor.view.dispatch(editor.view.state.tr)
    }
    refreshCounts()
    setTimeout(scrollToSelection, 50)
  }, [editor, searchTerm, caseSensitive, wholeWord, useRegex, refreshCounts, scrollToSelection])

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

  return (
    <div className="search-panel-bar">
      <div className="search-panel-inner">
        {/* Options column */}
        <div className="search-options-col">
          <label className="search-option">
            <span className={`search-checkbox ${caseSensitive ? 'checked' : ''}`}>
              {caseSensitive && <span className="checkmark">✓</span>}
            </span>
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={e => setCaseSensitive(e.target.checked)}
              className="search-option-input"
            />
            <span>区分大小写</span>
          </label>
          <label className="search-option">
            <span className={`search-checkbox ${wholeWord ? 'checked' : ''}`}>
              {wholeWord && <span className="checkmark">✓</span>}
            </span>
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={e => setWholeWord(e.target.checked)}
              className="search-option-input"
            />
            <span>全字匹配</span>
          </label>
          <label className="search-option">
            <span className={`search-checkbox ${useRegex ? 'checked' : ''}`}>
              {useRegex && <span className="checkmark">✓</span>}
            </span>
            <input
              type="checkbox"
              checked={useRegex}
              onChange={e => setUseRegex(e.target.checked)}
              className="search-option-input"
            />
            <span>使用正则</span>
          </label>
        </div>

        {/* Operations column */}
        <div className="search-ops-col">
          {/* Find row */}
          <div className="search-row">
            <div className="search-input-group">
              <span className="search-input-label">查找</span>
              <input
                ref={inputRef}
                className="search-input"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch() } }}
              />
            </div>
            <button className="search-btn search-btn--primary" onClick={handleSearch} disabled={!editor}>
              <span className="remix ri-search-line"></span> 查找
            </button>
            <button className="search-btn" onClick={handlePrev} disabled={!editor}>上一处</button>
            <button className="search-btn" onClick={handleNext} disabled={!editor}>下一处</button>
          </div>

          {/* Replace row */}
          <div className="search-row">
            <div className="search-input-group">
              <span className="search-input-label">替换</span>
              <input
                className="search-input"
                type="text"
                value={replaceTerm}
                onChange={e => setReplaceTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleReplace() } }}
              />
            </div>
            <button className="search-btn" onClick={handleReplace} disabled={!editor || !replaceTerm}>替换</button>
            <button className="search-btn" onClick={handleReplaceAll} disabled={!editor || !replaceTerm}>全部替换</button>
          </div>
        </div>

        {/* Result count */}
        {searchTerm && (
          <div className="search-result-count">
            {resultCount > 0 ? `找到 ${resultCount} 个结果（第 ${currentIndex + 1} 个）` : '未找到匹配项'}
          </div>
        )}

        {/* Close button */}
        <button className="search-panel-close" onClick={onClose} title="关闭">
          <span className="remix ri-close-line"></span>
        </button>
      </div>
    </div>
  )
}
