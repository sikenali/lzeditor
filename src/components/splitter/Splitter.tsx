import React, { useCallback, useRef, useState } from 'react'
import { DEFAULT_RATIO, KEY_STEP, clampRatio, ratioFromPointer } from '../../utils/split'

interface SplitterProps {
  /** 左栏占比，0..1。 */
  ratio: number
  /** 分割线父容器（grid）的像素宽，用来夹住边界。 */
  containerWidth: number
  onChange: (next: number) => void
}

/**
 * 两栏之间的可拖拽分割线。可见线 6px，命中区 24px（左右各扩 9px）——
 * WCAG 2.5.8 要求可点击目标够宽，只有 6px 的线在触控设备上根本点不中。
 */
export const Splitter: React.FC<SplitterProps> = ({ ratio, containerWidth, onChange }) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const gridRect = useCallback((): DOMRect | null => {
    const parent = hostRef.current?.parentElement
    return parent ? parent.getBoundingClientRect() : null
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    hostRef.current?.setPointerCapture(e.pointerId)
    setDragging(true)
    e.preventDefault() // 拖拽期间禁掉文本选择，否则拖出选中态
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = gridRect()
      if (!rect) return
      onChange(ratioFromPointer(e.clientX, rect.left, rect.width))
    },
    [gridRect, onChange],
  )

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (hostRef.current?.hasPointerCapture(e.pointerId)) {
      hostRef.current.releasePointerCapture(e.pointerId)
    }
    setDragging(false)
  }, [])

  // 指针没按下时 move 不该动位置，但捕获已经建好也懒得拆，直接判 dragging
  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return
      onPointerMove(e)
    },
    [dragging, onPointerMove],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const width = gridRect()?.width ?? 0
      let next: number | null = null
      if (e.key === 'ArrowLeft') next = ratio - KEY_STEP
      else if (e.key === 'ArrowRight') next = ratio + KEY_STEP
      else if (e.key === 'Enter' || e.key === 'Home') next = DEFAULT_RATIO
      if (next === null) return
      onChange(clampRatio(next, width))
      e.preventDefault()
    },
    [gridRect, ratio, onChange],
  )

  return (
    <div
      ref={hostRef}
      className={`code-splitter${dragging ? ' dragging' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="调整源码与预览宽度"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuetext={`${Math.round(ratio * 100)}%`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={handleMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onChange(clampRatio(DEFAULT_RATIO, containerWidth))}
      onKeyDown={onKeyDown}
    >
      <div className="code-splitter-line" aria-hidden="true" />
    </div>
  )
}
