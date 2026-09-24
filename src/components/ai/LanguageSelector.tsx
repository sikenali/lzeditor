import React, { useState, useRef, useEffect } from 'react'
import { LANGUAGES } from '../../shared/languages'
import type { LanguageCode } from '../../shared/languages'
import { LFSInput } from '../ui/LFInput'

// Re-export for convenience
export type { LanguageCode }

interface LanguageSelectorProps {
  targetLang: string
  onSelect: (lang: string) => void
  onClose: () => void
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ targetLang, onSelect, onClose }) => {
  const [search, setSearch] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.native.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} className="language-selector" onClick={e => e.stopPropagation()}>
        <div className="lang-header">
          <span className="remix lang-icon ri-translate-2"></span>
          <div>
            <div className="lang-title">选择目标语言</div>
            <div className="lang-subtitle">翻译为以下语言</div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="lang-search">
          <span className="remix lang-search-icon ri-search-line"></span>
          <LFSInput
            placeholder="搜索语言..."
            value={search}
            onChange={setSearch}
            autoFocus
          />
        </div>

        <div className="lang-list">
          {filtered.map(lang => (
            <button
              key={lang.code}
              className={`lang-item ${targetLang === lang.code ? 'active' : ''}`}
              onClick={() => { onSelect(lang.code); onClose() }}
            >
              <span className="lang-item-name">{lang.name}</span>
              <span className="lang-item-native">{lang.native}</span>
              {targetLang === lang.code && <span className="remix lang-check ri-check-line"></span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="lang-empty">
              <span className="remix ri-search-line"></span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>未找到匹配的语言</span>
            </div>
          )}
        </div>

        <div className="lang-footer">
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>共 {LANGUAGES.length} 种语言</span>
        </div>
      </div>
    </div>
  )
}
