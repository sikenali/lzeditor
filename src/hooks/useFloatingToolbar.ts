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
      const maxX = window.innerWidth - 380
      const maxX2 = rect.right - 190
      const x = Math.min(Math.max(8, maxX2), maxX)
      const y = Math.min(rect.bottom + 8, window.innerHeight - 60)
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
