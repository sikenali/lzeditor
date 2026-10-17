import { useEffect, useCallback, useRef } from 'react'
import { useAIStore } from '../store/aiStore'
import { useFloatingToolbar } from './useFloatingToolbar'
import type { AIAction } from '../shared/types'

export function useDocumentSelection(editorRef: React.RefObject<HTMLDivElement | null>) {
  const toolbar = useFloatingToolbar()
  const lastSelectedRef = useRef('')
  const ignoreNextRef = useRef(false)

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.ai-floating-toolbar') || target.closest('.ai-panel')) {
      toolbar.hide()
    }
  }, [toolbar])

  const handleSelectionChange = useCallback(() => {
    if (ignoreNextRef.current) {
      ignoreNextRef.current = false
      return
    }
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      toolbar.hide()
      return
    }
    const text = selection.toString().trim()
    if (!text || text === lastSelectedRef.current) return
    if (text.length < 2) return
    lastSelectedRef.current = text
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (rect.height === 0 && rect.width === 0) return
    toolbar.show(text, rect)
  }, [toolbar])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [handleSelectionChange, handleMouseDown])

  const handleGlobalShortcut = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault()
      const selection = window.getSelection()
      const text = selection?.toString().trim() || ''
      const rect = selection?.getRangeAt(0)?.getBoundingClientRect() || null
      useAIStore.getState().showPanel('question', text, rect ? { x: rect.left, y: rect.bottom + 8 } : { x: window.innerWidth / 2 - 200, y: 200 })
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalShortcut)
    return () => document.removeEventListener('keydown', handleGlobalShortcut)
  }, [handleGlobalShortcut])

  return { toolbar }
}
