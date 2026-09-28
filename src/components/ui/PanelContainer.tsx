import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface PanelContainerProps {
  onClose: () => void
  icon?: string
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const PanelContainer: React.FC<PanelContainerProps> = ({
  onClose, icon, title, subtitle, children, footer, size = 'lg', className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    console.log('[PanelContainer] mount:', title)
    document.body.style.overflow = 'hidden'
    previousFocus.current = document.activeElement as HTMLElement
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
      if (previousFocus.current) previousFocus.current.focus()
    }
  }, [])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      console.log('[PanelContainer] backdrop clicked')
      onClose()
    }
  }

  const panelEl = (
    <div
      className={`lz-panel-overlay ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
      }}
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        className="lz-panel-container"
        style={{
          background: 'var(--background-card, #1c1c1e)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          borderRadius: 16,
          width: '90vw',
          maxWidth: 900,
          maxHeight: '85vh',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="lz-panel-header" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '18px 20px 12px',
          borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          flexShrink: 0,
        }}>
          {icon && (
            <span className={`remix lz-panel-icon ${icon}`} style={{ fontSize: 20, color: 'var(--accent-primary, #3ba873)', flexShrink: 0 }}></span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lz-panel-title" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading, #f5f5f7)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
            {subtitle && <div className="lz-panel-subtitle" style={{ fontSize: 12, color: 'var(--text-muted, #6e6e73)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button
            className="lz-panel-close"
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--text-muted, #6e6e73)', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <span className="remix ri-close-line"></span>
          </button>
        </div>
        <div className="lz-panel-body" style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          background: 'transparent',
        }}>
          {children}
        </div>
        {footer && (
          <div className="lz-panel-footer" style={{
            padding: '12px 20px 18px',
            borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            background: 'transparent',
            display: 'flex', gap: 8, justifyContent: 'flex-end',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(panelEl, document.body)
}

/* ── Chip item for left nav ── */
export interface NavChip {
  id: string
  label: string
  icon: string
  desc?: string
}

export const NavChipItem: React.FC<{ chip: NavChip; active: boolean; onClick: () => void }> = ({ chip, active, onClick }) => (
  <button className={`ud-chip${active ? ' active' : ''}`} onClick={onClick}>
    <span className={`remix ud-chip-icon ${chip.icon}`}></span>
    <span className="ud-chip-label">{chip.label}</span>
    {chip.desc && <span className="ud-chip-desc">{chip.desc}</span>}
  </button>
)

/* ── Section inside right panel ── */
export const UDSection: React.FC<{ label: string; desc?: string; children: React.ReactNode; className?: string }> = ({ label, desc, children, className }) => (
  <div className={`ud-section${className ? ' ' + className : ''}`}>
    <div className="ud-section-head">
      <span className="ud-section-label">{label}</span>
      {desc && <span className="ud-section-desc">{desc}</span>}
    </div>
    <div className="ud-section-body">{children}</div>
  </div>
)

/* ── Setting row ── */
export const UDSettingRow: React.FC<{ icon: string; label: string; desc?: string; children: React.ReactNode }> = ({ icon, label, desc, children }) => (
  <div className="ud-setting-row">
    <div className="ud-setting-label">
      <span className={`remix ud-setting-icon ${icon}`}></span>
      <div>
        <span className="ud-setting-name">{label}</span>
        {desc && <span className="ud-setting-desc">{desc}</span>}
      </div>
    </div>
    <div className="ud-setting-control">{children}</div>
  </div>
)

/* ── Text input (HeroUI) ── */
export { Input as UDInput } from '@heroui/input'

/* ── Preview card ── */
export const UDPreviewCard: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => (
  <div className="ud-preview-card">
    {label && <div className="ud-preview-label">{label}</div>}
    <div className="ud-preview-body">{children}</div>
  </div>
)
