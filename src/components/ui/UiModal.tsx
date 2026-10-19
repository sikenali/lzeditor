import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveIcon } from '../../utils/icon'

export interface UiModalProps {
  open: boolean
  onClose: () => void
  icon?: string
  title?: string
  subtitle?: string
  width?: number | string
  /** 固定高度。面板类弹框（设置中心）用它锁死长宽，内容再多也只滚动内容区 */
  height?: number | string
  closeOnOverlay?: boolean
  /** false → body 不加内边距，交给内部布局自己排（面板类弹框用） */
  bodyPadding?: boolean
  children: React.ReactNode
  footer?: React.ReactNode
  radius?: number
  /** 宽度上限（px）。设置中心用 min(92vw, 1400px) */
  maxWidth?: number
  /** 覆盖默认阴影，例如设置中心用更浅的 0 8px 40px */
  shadow?: string
  className?: string
}

export const UiModal: React.FC<UiModalProps> = ({
  open, onClose, icon, title, subtitle, width = 600, height,
  closeOnOverlay = true, bodyPadding = true, children, footer, radius = 18,
  maxWidth, shadow, className,
}) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const Icon = resolveIcon(icon)
  const Close = resolveIcon('ri-close-line')

  // width 可能是数字（600）或带单位字符串（"1320px"）。
  // 数字必须补上 px：`min(600, 94vw)` 是非法 CSS，整条 width 会被浏览器丢弃，
  // 弹框就会退化成「内容有多宽就多宽」—— 这就是弹框被挤压的直接原因。
  const widthCss = typeof width === 'number' ? `${width}px` : width
  const heightCss = typeof height === 'number' ? `${height}px` : height

  // 有固定高度时把 overflow 收成 hidden：body 内部自己滚动，
  // 否则内容会把整个弹框撑高或溢出圆角边界
  const modalStyle: React.CSSProperties = {
    width: maxWidth
      ? `min(${widthCss}, ${maxWidth}px)`
      : `min(${widthCss}, 94vw)`,
    borderRadius: radius,
    ...(shadow ? { boxShadow: shadow } : {}),
    ...(height
      ? { height: `min(${heightCss}, calc(100vh - 40px))`, maxHeight: 'none', overflow: 'hidden' }
      : {}),
  }

  const overlay = (
    <div className="ui-modal-overlay" onClick={() => { if (closeOnOverlay) onClose() }}>
      <div className={`ui-modal${className ? ` ${className}` : ''}`} style={modalStyle}
        onClick={e => e.stopPropagation()}>
        {(title || icon) && (
          <div className="ui-modal-header">
            {Icon && <span className="ui-modal-icon"><Icon size={22} /></span>}
            <div className="ui-modal-titles">
              {title && <div className="ui-modal-title">{title}</div>}
              {subtitle && <div className="ui-modal-subtitle">{subtitle}</div>}
            </div>
            <button className="ui-modal-close" onClick={onClose} aria-label="关闭">
              {Close && <Close size={18} />}
            </button>
          </div>
        )}
        <div className="ui-modal-body" style={bodyPadding ? undefined : { padding: 0 }}>
          {children}
        </div>
        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
