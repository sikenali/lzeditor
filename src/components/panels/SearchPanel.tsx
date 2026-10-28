import React, { useState, useCallback, useEffect, useRef } from 'react'
import { getYeliFacade } from '../editor/facade/registry'
import type { SearchQueryOptions } from '../editor/facade/YeliEditorFacade'
import { UiSwitch } from '../ui'

interface SearchPanelProps {
  onClose: () => void
}

/** 查询参数序列化键：用于判断搜索词/开关自上次搜索后是否变化。 */
function searchOptionsKey(o: SearchQueryOptions): string {
  return `${o.term}\u0000${o.regex}\u0000${o.caseSensitive}\u0000${o.wholeWord}`
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [patternError, setPatternError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // 最近一次成功 searchMatches 的查询参数键；用于检测「改词未重搜」。
  const lastSearchKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  /** 面板开关 → facade 查询参数。 */
  const buildOptions = useCallback((): SearchQueryOptions => ({
    term: searchTerm,
    regex: useRegex,
    caseSensitive,
    wholeWord,
  }), [searchTerm, useRegex, caseSensitive, wholeWord])

  /** 执行查找并更新计数；无效正则写入错误态。 */
  const runSearch = useCallback((): number => {
    const facade = getYeliFacade()
    if (!facade || !searchTerm.trim()) return 0
    try {
      const count = facade.searchMatches(buildOptions())
      lastSearchKeyRef.current = searchOptionsKey(buildOptions())
      setPatternError(null)
      return count
    } catch {
      setPatternError('正则表达式无效')
      return 0
    }
  }, [searchTerm, buildOptions])

  const handleSearch = useCallback(() => {
    setMatchCount(runSearch())
  }, [runSearch])

  const handleReplace = useCallback(() => {
    if (!searchTerm.trim() || !replaceTerm) return
    const facade = getYeliFacade()
    if (!facade) return
    try {
      // 先为当前查询词建立命中集（相同参数时 facade 保留导航下标，已导航到
      // 第 N 处后替换仍是第 N 处），避免替换到上一次搜索的过期位置。
      facade.searchMatches(buildOptions())
      lastSearchKeyRef.current = searchOptionsKey(buildOptions())
      setMatchCount(facade.replaceCurrent(replaceTerm))
      setPatternError(null)
    } catch {
      setPatternError('正则表达式无效')
    }
  }, [searchTerm, replaceTerm, buildOptions])

  const handleReplaceAll = useCallback(() => {
    if (!searchTerm.trim() || !replaceTerm) return
    const facade = getYeliFacade()
    if (!facade) return
    try {
      // 先建立命中集，再自后向前全部替换，最后重算剩余命中数。
      facade.searchMatches(buildOptions())
      facade.replaceAll(replaceTerm)
      setMatchCount(facade.searchMatches(buildOptions()))
      lastSearchKeyRef.current = searchOptionsKey(buildOptions())
      setPatternError(null)
    } catch {
      setPatternError('正则表达式无效')
    }
  }, [searchTerm, replaceTerm, buildOptions])

  const handleNext = useCallback(() => {
    const facade = getYeliFacade()
    if (!facade || !searchTerm.trim()) return
    try {
      if (lastSearchKeyRef.current !== searchOptionsKey(buildOptions())) {
        // 改词未重搜：先为当前词重置命中集/高亮（跳到第一处）。
        setMatchCount(facade.searchMatches(buildOptions()))
        lastSearchKeyRef.current = searchOptionsKey(buildOptions())
      } else {
        facade.findNext()
      }
      setPatternError(null)
    } catch {
      setPatternError('正则表达式无效')
    }
  }, [searchTerm, buildOptions])

  const handlePrev = useCallback(() => {
    const facade = getYeliFacade()
    if (!facade || !searchTerm.trim()) return
    try {
      if (lastSearchKeyRef.current !== searchOptionsKey(buildOptions())) {
        // 改词未重搜：先为当前词重置命中集/高亮（跳到第一处）。
        setMatchCount(facade.searchMatches(buildOptions()))
        lastSearchKeyRef.current = searchOptionsKey(buildOptions())
      } else {
        facade.findPrev()
      }
      setPatternError(null)
    } catch {
      setPatternError('正则表达式无效')
    }
  }, [searchTerm, buildOptions])

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
            {matchCount > 0 ? `找到 ${matchCount} 个结果` : '未找到匹配项'}
          </div>
        )}
        <button className="search-panel-close" onClick={onClose} title="关闭">
          <span className="remix ri-close-line"></span>
        </button>
      </div>
    </div>
  )
}
