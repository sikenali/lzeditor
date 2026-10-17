import React, { useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useAIStore } from '../../store/aiStore'

interface NavItem {
  id: string
  icon: string
  label: string
  active?: boolean
  action: () => void
}

export const LeftNav: React.FC = () => {
  const showLibrary = useEditorStore(s => s.showLibrary)
  const showOutline = useEditorStore(s => s.showOutline)
  const showPreview = useEditorStore(s => s.showPreview)
  const appMode = useEditorStore(s => s.appMode)
  const setShowLibrary = useEditorStore(s => s.setShowLibrary)
  const setShowOutline = useEditorStore(s => s.setShowOutline)
  const setShowPreview = useEditorStore(s => s.setShowPreview)
  const setAppMode = useEditorStore(s => s.setAppMode)
  const setShowRightPanel = useEditorStore(s => s.setShowRightPanel)

  const toggleLibrary = useCallback(() => {
    const next = !showLibrary
    setShowLibrary(next)
    if (next) setShowRightPanel(true)
  }, [showLibrary, setShowLibrary, setShowRightPanel])
  const toggleOutline = useCallback(() => {
    setShowOutline(!showOutline)
  }, [showOutline, setShowOutline])
  const togglePreview = useCallback(() => {
    const next = !showPreview
    setShowPreview(next)
    if (next) setShowRightPanel(true)
  }, [showPreview, setShowPreview, setShowRightPanel])
  const switchMode = useCallback((mode: 'edit' | 'code' | 'read' | 'history' | 'style') => {
    const next = appMode === mode ? 'edit' : mode
    setAppMode(next)
    if (next === 'history' || next === 'style') setShowRightPanel(true)
    else setShowRightPanel(false)
  }, [appMode, setAppMode, setShowRightPanel])

  const openAI = useCallback(() => {
    useAIStore.getState().showPanel('question', '', { x: window.innerWidth / 2, y: 200 })
  }, [])

  const items: NavItem[] = [
    { id: 'library',  icon: 'ri-archive-2-line',   label: '文档库',  active: showLibrary,  action: toggleLibrary },
    { id: 'outline',  icon: 'ri-list-unordered',   label: '大纲',    active: showOutline,  action: toggleOutline },
    { id: 'preview',  icon: 'ri-eye-line',         label: '预览',    active: showPreview,  action: togglePreview },
    { id: 'divider1', icon: '',                    label: '',       action: () => {} },
    { id: 'edit',     icon: 'ri-edit-2-line',      label: '编辑',    active: appMode === 'edit', action: () => switchMode('edit') },
    { id: 'code',     icon: 'ri-code-s-line',      label: '代码',    active: appMode === 'code', action: () => switchMode('code') },
    { id: 'read',     icon: 'ri-book-open-line',   label: '阅读',    active: appMode === 'read', action: () => switchMode('read') },
    { id: 'divider2', icon: '',                    label: '',       action: () => {} },
    { id: 'history',  icon: 'ri-history-fill',     label: '历史',    active: appMode === 'history', action: () => switchMode('history') },
    { id: 'style',    icon: 'ri-palette-fill',     label: '样式',    active: appMode === 'style', action: () => switchMode('style') },
    { id: 'divider3', icon: '',                    label: '',       action: () => {} },
    { id: 'ai',       icon: 'ri-openai-fill',      label: 'AI',     action: openAI },
  ]

  return (
    <nav className="left-nav">
      {items.map(item =>
        item.id.startsWith('divider')
          ? <div key={item.id} className="left-nav-sep" />
          : <button
              key={item.id}
              className={`left-nav-btn${item.active ? ' active' : ''}`}
              onClick={item.action}
              title={item.label}
            >
              <span className={`remix left-nav-icon ${item.icon}`}></span>
              <span className="left-nav-label">{item.label}</span>
            </button>
      )}
    </nav>
  )
}
