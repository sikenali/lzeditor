import React, { useState } from 'react'
import { useAIStore } from '../../store/aiStore'
import { LanguageSelector } from '../ai/LanguageSelector'
import { LANGUAGES } from '../../shared/languages'
import type { AIAction } from '../../shared/types'

// RemixIcon unicode values
const ICONS = {
  pen: '\uE8C1',           // ri-pen-line (改写)
  sparkle: '\uE8A7',        // ri-sparkling-line (润色)
  add: '\uF036',            // ri-add-line (续写)
  file_text: '\uE83A',      // ri-file-text-line (摘要)
  translate: '\uE9B2',      // ri-translate-line (翻译)
  question: '\uF371',       // ri-question-line (提问)
  robot: '\uF47B',          // ri-robot-line (AI toolbar button)
} as const

const BUTTONS: { action: AIAction; icon: string; label: string }[] = [
  { action: 'rewrite', icon: '\uEA8D', label: '改写' },
  { action: 'polish', icon: '\uEC7F', label: '润色' },
  { action: 'continue', icon: '\uEA59', label: '续写' },
  { action: 'summarize', icon: '\uEA7D', label: '摘要' },
  { action: 'translate', icon: '\uF226', label: '翻译' },
  { action: 'question', icon: '\uF044', label: '提问' },
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
