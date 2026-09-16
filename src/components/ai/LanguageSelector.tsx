import React, { useState } from 'react'

const LANGUAGES = [
  { code: 'zh', name: '简体中文', native: '中文' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ja', name: '日本語', native: '日本語' },
  { code: 'ko', name: '한국어', native: '한국어' },
  { code: 'fr', name: 'Français', native: 'Français' },
  { code: 'de', name: 'Deutsch', native: 'Deutsch' },
  { code: 'es', name: 'Español', native: 'Español' },
  { code: 'ru', name: 'Русский', native: 'Русский' },
  { code: 'ar', name: 'العربية', native: 'العربية' },
  { code: 'pt', name: 'Português', native: 'Português' },
  { code: 'it', name: 'Italiano', native: 'Italiano' },
  { code: 'hi', name: 'हिन्दी', native: 'हिन्दी' },
]

interface LanguageSelectorProps {
  targetLang: string
  onSelect: (lang: string) => void
  onClose: () => void
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ targetLang, onSelect, onClose }) => {
  const [search, setSearch] = useState('')

  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.native.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="language-selector" onClick={e => e.stopPropagation()}>
        <div className="lang-header">
          <span className="remix lang-icon" style={{ fontSize: 18, color: 'var(--accent-primary)' }}>\uE9B2</span>
          <div>
            <div className="lang-title">选择目标语言</div>
            <div className="lang-subtitle">翻译为以下语言</div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix">\uE61C</span>
          </button>
        </div>

        <div className="lang-search">
          <span className="remix lang-search-icon">\uE71C</span>
          <input
            type="text"
            placeholder="搜索语言..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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
              {targetLang === lang.code && <span className="remix lang-check" style={{ fontSize: 14 }}>{'\uEAF7'}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="lang-empty">
              <span className="remix" style={{ fontSize: 24, color: 'var(--text-muted)' }}>\uE71C</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>未找到匹配的语言</span>
            </div>
          )}
        </div>

        <div className="lang-footer">
          <span style={{ fontSize: 11, color: 'rgba(111,125,138,1)' }}>共 {LANGUAGES.length} 种语言</span>
        </div>
      </div>
    </div>
  )
}
