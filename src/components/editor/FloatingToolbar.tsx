import React, { useState } from 'react'
import { useAIStore } from '../../store/aiStore'
import { LanguageSelector } from '../ai/LanguageSelector'
import type { AIAction } from '../../shared/types'

const BUTTONS: { action: AIAction; icon: string; label: string }[] = [
  { action: 'rewrite', icon: '\uEB41', label: '改写' },
  { action: 'polish', icon: '\uE8D9', label: '润色' },
  { action: 'continue', icon: '\uF44A', label: '续写' },
  { action: 'summarize', icon: '\uE83A', label: '摘要' },
  { action: 'translate', icon: '\uE9B2', label: '翻译' },
  { action: 'question', icon: '\uF371', label: '提问' },
]

const LANGUAGES = [
  { code: 'zh', name: '简体中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'pt', name: 'Português' },
  { code: 'it', name: 'Italiano' },
  { code: 'hi', name: 'हिन्दी' },
]

interface FloatingToolbarProps {
  position: { x: number; y: number }
  selectedText: string
  visible: boolean
  onAction: (action: AIAction) => void
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ position, visible, onAction }) => {
  const [showLangSelector, setShowLangSelector] = useState(false)
  const [targetLang, setTargetLang] = useState('zh')

  const handleTranslate = () => {
    setShowLangSelector(true)
  }

  const handleLangSelect = (lang: string) => {
    setTargetLang(lang)
    setShowLangSelector(false)
    const langName = LANGUAGES.find(l => l.code === lang)?.name || lang
    onAction('translate')
    useAIStore.getState().setPanelInput('翻译为' + langName)
  }

  if (!visible && !showLangSelector) return null

  return (
    <>
      {visible && (
        <div
          className="ai-floating-toolbar"
          style={{ left: position.x, top: position.y }}
        >
          {BUTTONS.map((btn) => (
            <button
              key={btn.action}
              className={'ai-toolbar-btn' + (btn.action === 'translate' && showLangSelector ? ' active' : '')}
              onClick={() => btn.action === 'translate' ? handleTranslate() : onAction(btn.action)}
              title={btn.label}
            >
              <span className="remix" style={{ fontSize: 16 }}>{btn.icon}</span>
              <span className="tooltip">{btn.label}</span>
            </button>
          ))}
        </div>
      )}
      {showLangSelector && (
        <LanguageSelector
          targetLang={targetLang}
          onSelect={handleLangSelect}
          onClose={() => setShowLangSelector(false)}
        />
      )}
    </>
  )
}
