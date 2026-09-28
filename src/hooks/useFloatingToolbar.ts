import { useState, useCallback, useRef } from 'react'
import type { AIAction } from '../shared/types'

interface Position {
  x: number
  y: number
}

export function useFloatingToolbar() {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')
  const timeoutRef = useRef<number | null>(null)

  const show = useCallback((text: string, rect: DOMRect | null) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSelectedText(text)

    if (rect) {
      const toolbarW = 60
      const toolbarH = 44
      const x = Math.min(Math.max(8, rect.left + rect.width / 2 - toolbarW / 2), window.innerWidth - toolbarW - 8)
      const y = Math.min(rect.bottom + 8, window.innerHeight - toolbarH - 8)
      setPosition({ x, y })
    }

    setVisible(true)
  }, [])

  const hide = useCallback(() => {
    timeoutRef.current = window.setTimeout(() => {
      setVisible(false)
    }, 120)
  }, [])

  const handleAction = useCallback((action: AIAction) => {
    hide()
    return { action, selectedText, position }
  }, [selectedText, position, hide])

  return { visible, position, selectedText, show, hide, handleAction }
}
