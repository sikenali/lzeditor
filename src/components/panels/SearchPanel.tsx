import React, { useState, useCallback, useEffect, useRef } from 'react'
import { getCM6Editor } from '../editor/codemirror/registry'
import { getSearchQuery } from '@codemirror/search'
import type { EditorState } from '@codemirror/state'
import { UiSwitch } from '../ui'

interface SearchPanelProps {
  onClose: () => void
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 统计当前 SearchQuery 在整篇文档里的命中数，供面板显示结果数。 */
function countMatches(state: EditorState): number {
  const q = getSearchQuery(state)
  if (!q || !q.valid) return 0
  let re: RegExp
  try { re = new RegExp(q.search, q.caseSensitive ? 'g' : 'gi') } catch { return 0 }
  return state.doc.toString().match(re)?.length ?? 0
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
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

  const handleSearch = useCallback(() => {
    if (cm6Dispatch('search')) return
    if (!searchTerm.trim()) return
    setPatternError(null)
  }, [cm6Dispatch, searchTerm])

  const handleReplace = useCallback(() => {
    if (cm6Dispatch('replace')) return
    if (!searchTerm.trim()) return
  }, [cm6Dispatch, searchTerm])

  const handleReplaceAll = useCallback(() => {
    cm6Dispatch('replaceAll')
  }, [cm6Dispatch])

  const handleNext = useCallback(() => {
    if (cm6Dispatch('next')) return
    if (!searchTerm.trim()) return
  }, [cm6Dispatch, searchTerm])

  const handlePrev = useCallback(() => {
    if (cm6Dispatch('prev')) return
    if (!searchTerm.trim()) return
  }, [cm6Dispatch, searchTerm])

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
            <button className="search-btn search-btn--primary" onClick={handleSearch} disabled={!searchTerm.trim()}>
              <span className="remix ri-search-line"></span> 查找
            </button>
            <button className="search-btn" onClick={handlePrev} disabled={!searchTerm.trim()}>上一处</button>
            <button className="search-btn" onClick={handleNext} disabled={!searchTerm.trim()}>下一处</button>
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
            <button className="search-btn" onClick={handleReplace} disabled={!searchTerm.trim() || !replaceTerm}>替换</button>
            <button className="search-btn" onClick={handleReplaceAll} disabled={!searchTerm.trim() || !replaceTerm}>全部替换</button>
          </div>
        </div>
        {searchTerm && (
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
