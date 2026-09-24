import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'
import { useSettingsStore } from '../../store/settingsStore'

const ITEMS = [
  { id: 'library',   icon: 'ri-archive-2-line',    label: '文档库',   action: 'toggleLibrary' },
  { id: 'outline',   icon: 'ri-list-unordered',    label: '大纲',     action: 'toggleOutline' },
  { id: 'preview',   icon: 'ri-eye-line',          label: '预览',     action: 'togglePreview' },
  { id: 'ai',        icon: 'ri-openai-fill',       label: 'AI',       action: 'openAI'    },
] as const

type Action = typeof ITEMS[number]['action']

export const LeftNav: React.FC = () => {
  const showLibrary  = useEditorStore(s => s.showLibrary)
  const showOutline  = useEditorStore(s => s.showOutline)
  const showPreview  = useEditorStore(s => s.showPreview)
  const setShowLibrary  = useEditorStore(s => s.setShowLibrary)
  const setShowOutline  = useEditorStore(s => s.setShowOutline)
  const setShowPreview  = useEditorStore(s => s.setShowPreview)

  const handleAction = (action: Action) => {
    switch (action) {
      case 'toggleLibrary':  setShowLibrary(!showLibrary)  ; break
      case 'toggleOutline':  setShowOutline(!showOutline)  ; break
      case 'togglePreview':  setShowPreview(!showPreview)  ; break
      case 'openAI':
        useAIStore.getState().showPanel('question', '', { x: window.innerWidth / 2, y: 200 })
        break
    }
  }

  return (
    <nav className="left-nav">
      {ITEMS.map(item => (
        <button
          key={item.id}
          className={`left-nav-btn${
            (item.action === 'toggleLibrary'  && showLibrary)  ||
            (item.action === 'toggleOutline'  && showOutline)  ||
            (item.action === 'togglePreview'  && showPreview)
              ? ' active' : ''
          }`}
          onClick={() => handleAction(item.action)}
          title={item.label}
        >
          <span className={`remix left-nav-icon ${item.icon}`}></span>
        </button>
      ))}
    </nav>
  )
}
