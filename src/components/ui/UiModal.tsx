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
  closeOnOverlay?: boolean
  children: React.ReactNode
  footer?: React.ReactNode
  radius?: number
}

export const UiModal: React.FC<UiModalProps> = ({
  open, onClose, icon, title, subtitle, width = 600,
  closeOnOverlay = true, children, footer, radius = 18,
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

  const overlay = (
    <div className="ui-modal-overlay" onClick={() => { if (closeOnOverlay) onClose() }}>
      <div className="ui-modal" style={{ width: `min(${width}, 94vw)`, borderRadius: radius }}
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
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
