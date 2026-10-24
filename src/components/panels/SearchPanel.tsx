import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getCM6Editor } from '../editor/codemirror/registry'
import { getSearchQuery } from '@codemirror/search'
import type { EditorState } from '@codemirror/state'
import { UiSwitch } from '../ui'

interface SearchPanelProps {
  onClose: () => void
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildRegexPattern = (raw: string, opts: { wholeWord: boolean; useRegex: boolean }) => {
  const term = opts.useRegex ? raw : escapeRegex(raw)
  return opts.wholeWord ? `(?<!\\S)${term}(?!\\S)` : term
}

/** 统计当前 SearchQuery 在整篇文档里的命中数，供面板显示结果数。 */
function countMatches(state: EditorState): number {
  const q = getSearchQuery(state)
  if (!q || !q.valid) return 0
  let re: RegExp
  try { re = new RegExp(q.search, q.caseSensitive ? 'g' : 'gi') } catch { return 0 }
  return state.doc.toString().match(re)?.length ?? 0
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onClose }) => {
  const editor = useEditorStore((s) => s.editor)
  const useCM6 = useSettingsStore((s) => s.useCM6Editor)
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [resultCount, setResultCount] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cm6Count, setCm6Count] = useState(0)
  const [patternError, setPatternError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  // CM6 的查询词统一转成 `/pattern/gi` 形式，交给 @codemirror/search 的 SearchQuery
  const buildCM6Query = useCallback((): string | null => {
    const term = useRegex ? searchTerm : escapeRegex(searchTerm)
    const body = wholeWord ? `(?<!\\S)${term}(?!\\S)` : term
    const query = `/${body}/${caseSensitive ? 'g' : 'gi'}`
    try { new RegExp(query.slice(1, query.lastIndexOf('/'))) } catch { return null }
    return query
  }, [searchTerm, useRegex, wholeWord, caseSensitive])

  // 每次调用都重新取实例：doc 切换后 CM6 会重建，render 期抓到的引用会失效
  const cm6Dispatch = useCallback((action: 'search' | 'next' | 'prev' | 'replace' | 'replaceAll'): boolean => {
    const cm = getCM6Editor()
    if (!cm) return false
    if (!searchTerm.trim()) return false
    const query = buildCM6Query()
    if (!query) { setPatternError('正则表达式无效'); return true }
    setPatternError(null)
    cm.search({ query, replace: replaceTerm, caseSensitive, action })
    setCm6Count(countMatches(cm.view.state))
    return true
  }, [searchTerm, replaceTerm, caseSensitive, buildCM6Query])

  const scrollToSelection = useCallback(() => {
    if (useCM6 || !editor?.view?.dom) return
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
  }, [editor, useCM6])

  const refreshCounts = useCallback(() => {
    if (useCM6 || !editor) return
    const storage = editor.storage?.searchAndReplace
    if (storage) {
      setResultCount(storage.results?.length || 0)
      setCurrentIndex(storage.resultIndex || 0)
    }
  }, [editor, useCM6])

  const handleSearch = useCallback(() => {
    if (useCM6 && cm6Dispatch('search')) return
    if (!editor || !searchTerm.trim()) return
    let pattern: string
    try {
      pattern = buildRegexPattern(searchTerm, { wholeWord, useRegex })
      new RegExp(pattern, caseSensitive ? 'gu' : 'gui')
    } catch {
      setPatternError('正则表达式无效')
      return
    }
    setPatternError(null)
    editor.commands.setSearchTerm(pattern)
    editor.commands.setCaseSensitive(caseSensitive)
    editor.commands.resetIndex()
    if (editor.view) editor.view.dispatch(editor.view.state.tr)
    refreshCounts()
    setTimeout(scrollToSelection, 50)
  }, [editor, searchTerm, caseSensitive, wholeWord, useRegex, refreshCounts, scrollToSelection, useCM6, cm6Dispatch])

  const handleReplace = useCallback(() => {
    if (useCM6 && cm6Dispatch('replace')) return
    if (!editor || !searchTerm.trim()) return
    editor.commands.setReplaceTerm(replaceTerm)
    editor.commands.replace()
    editor.commands.resetIndex()
    refreshCounts()
  }, [editor, searchTerm, replaceTerm, refreshCounts, useCM6, cm6Dispatch])

  const handleReplaceAll = useCallback(() => {
    if (useCM6 && cm6Dispatch('replaceAll')) return
    if (!editor || !searchTerm.trim()) return
    editor.commands.setReplaceTerm(replaceTerm)
    editor.commands.replaceAll()
    editor.commands.resetIndex()
    refreshCounts()
  }, [editor, searchTerm, replaceTerm, refreshCounts, useCM6, cm6Dispatch])

  const handleNext = useCallback(() => {
    if (useCM6 && cm6Dispatch('next')) return
    if (!editor) return
    editor.commands.nextSearchResult()
    refreshCounts()
    setTimeout(scrollToSelection, 50)
  }, [editor, refreshCounts, scrollToSelection, useCM6, cm6Dispatch])

  const handlePrev = useCallback(() => {
    if (useCM6 && cm6Dispatch('prev')) return
    if (!editor) return
    editor.commands.previousSearchResult()
    refreshCounts()
    setTimeout(scrollToSelection, 50)
  }, [editor, refreshCounts, scrollToSelection, useCM6, cm6Dispatch])

  return (
    <div className="search-panel-bar">
      <div className="search-panel-inner">
        <div className="search-options-col">
           <label className="search-option">
              <UiSwitch size="sm" checked={caseSensitive} onChange={setCaseSensitive} />
             <span>区分大小写</span>
           </label>
           <label className="search-option">
              <UiSwitch size="sm" checked={wholeWord} onChange={setWholeWord} />
             <span>全字匹配</span>
           </label>
           <label className="search-option">
              <UiSwitch size="sm" checked={useRegex} onChange={setUseRegex} />
             <span>使用正则</span>
           </label>
        </div>
        {patternError && (
          <div className="search-pattern-error">
            <span className="remix ri-error-warning-fill"></span>
            <span>{patternError}</span>
          </div>
        )}
        <div className="search-ops-col">
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
        {!useCM6 && searchTerm && (
          <div className="search-result-count">
            {resultCount > 0 ? `找到 ${resultCount} 个结果（第 ${currentIndex + 1} 个）` : '未找到匹配项'}
          </div>
        )}
        {useCM6 && searchTerm && (
          <div className="search-result-count">
            {cm6Count > 0 ? `找到 ${cm6Count} 个结果` : '未找到匹配项'}
          </div>
        )}
        <button className="search-panel-close" onClick={onClose} title="关闭">
          <span className="remix ri-close-line"></span>
        </button>
      </div>
    </div>
  )
}
