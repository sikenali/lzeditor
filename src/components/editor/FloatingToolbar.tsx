import React, { useState } from 'react'
import { useAIStore } from '../../store/aiStore'
import { LanguageSelector } from '../ai/LanguageSelector'
import { LANGUAGES } from '../../shared/languages'
import type { AIAction } from '../../shared/types'

const BUTTONS: { action: AIAction; icon: string; label: string }[] = [
  { action: 'rewrite', icon: 'ri-ball-pen-fill', label: '改写' },
  { action: 'polish', icon: 'ri-edit-2-fill', label: '润色' },
  { action: 'continue', icon: 'ri-arrow-go-forward-fill', label: '续写' },
  { action: 'summarize', icon: 'ri-article-fill', label: '摘要' },
  { action: 'translate', icon: 'ri-translate-2', label: '翻译' },
  { action: 'question', icon: 'ri-question-fill', label: '提问' },
]

interface FloatingToolbarProps {
  position: { x: number; y: number }
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
              <span className={`remix ${btn.icon}`} style={{ fontSize: 16 }}></span>
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
