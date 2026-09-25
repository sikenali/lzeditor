import React, { ReactNode, useEffect, useRef } from 'react'

export interface UnifiedDialogProps {
  onClose: () => void
  icon?: string
  title: string
  subtitle?: string
  leftNav?: ReactNode
  rightTop?: ReactNode
  rightContent?: ReactNode
  rightBottom?: ReactNode
  hint?: string
  cancelText?: string
  submitText?: string
  onSubmit?: () => void
  submitDisabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

/** Collect all focusable elements inside a container */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  return Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
    el => !(el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) || !el.disabled
  )
}

export const UnifiedDialog: React.FC<UnifiedDialogProps> = ({
  onClose, icon, title, subtitle,
  leftNav, rightTop, rightContent, rightBottom,
  hint, cancelText = '取消', submitText, onSubmit, submitDisabled,
  size = 'md', className = ''
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  // ── 弹窗打开/关闭时的副作用 ──
  useEffect(() => {
    const el = dialogRef.current
    if (!el) return

    // 保存当前焦点，关闭时恢复
    previousFocus.current = document.activeElement as HTMLElement

    // 锁定 body 滚动
    document.body.style.overflow = 'hidden'

    // 聚焦到弹窗内第一个可交互元素
    const focusable = getFocusableElements(el)
    if (focusable.length > 0) {
      setTimeout(() => focusable[0].focus(), 0)
    } else {
      el.focus()
    }

    // ESC 关闭 + Tab 焦点陷阱
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const items = getFocusableElements(el)
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    el.addEventListener('keydown', handleKeydown)

    return () => {
      el.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
      if (previousFocus.current) {
        previousFocus.current.focus()
      }
    }
  }, [])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={dialogRef} className={`unified-dialog unified-dialog--${size} ${className}`} tabIndex={-1} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ud-header">
          {icon && <span className={`remix ud-icon ${icon}`}></span>}
          <div className="ud-title-group">
            <div className="ud-title">{title}</div>
            {subtitle && <div className="ud-subtitle">{subtitle}</div>}
          </div>
          <button className="ud-close" onClick={onClose} title="关闭">
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        {/* Body */}
        <div className={`ud-body${leftNav ? ' ud-body-split' : ''}`}>
          {/* Left nav */}
          {leftNav && <div className="ud-left">{leftNav}</div>}
          {/* Right */}
          <div className="ud-right">
            {rightTop && <div className="ud-right-top">{rightTop}</div>}
            {rightContent && <div className="ud-right-content">{rightContent}</div>}
            {rightBottom && <div className="ud-right-bottom">{rightBottom}</div>}
          </div>
        </div>

        {/* Footer */}
        {(hint || submitText || cancelText) && (
          <div className="ud-footer">
            {hint && <div className="ud-hint"><span className="remix ri-information-line"></span><span>{hint}</span></div>}
            {(submitText || cancelText) && (
              <div className="ud-actions">
                <button className="ud-btn ud-btn--ghost" onClick={onClose}>{cancelText}</button>
                {submitText && (
                  <button className="ud-btn ud-btn--primary" onClick={onSubmit} disabled={submitDisabled}>
                    {submitText}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
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
export const UDSection: React.FC<{ label: string; desc?: string; children: ReactNode; className?: string }> = ({ label, desc, children, className }) => (
  <div className={`ud-section${className ? ' ' + className : ''}`}>
    <div className="ud-section-head">
      <span className="ud-section-label">{label}</span>
      {desc && <span className="ud-section-desc">{desc}</span>}
    </div>
    <div className="ud-section-body">{children}</div>
  </div>
)

/* ── Setting row ── */
export const UDSettingRow: React.FC<{ icon: string; label: string; desc?: string; children: ReactNode }> = ({ icon, label, desc, children }) => (
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

/* ── Toggle switch ── */
export const UDToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }> = ({ checked, onChange, size = 'sm' }) => (
  <button
    className={`ud-toggle${checked ? ' on' : ''}${size === 'md' ? ' ud-toggle--md' : ''}`}
    onClick={() => onChange(!checked)}
    onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!checked) } }}
    role="switch"
    aria-checked={checked}
    tabIndex={0}
  >
    <span className="ud-toggle-thumb" />
  </button>
)

/* ── Select input ── */
export const UDSelect: React.FC<{ value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; style?: React.CSSProperties }> = ({ value, onChange, options, style }) => (
  <select className="ud-select" value={value} onChange={e => onChange(e.target.value)} style={style}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
)

/* ── Text input ── */
export const UDInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = props => (
  <input className="ud-input" {...props} />
)

/* ── Preview card ── */
export const UDPreviewCard: React.FC<{ children: ReactNode; label?: string }> = ({ children, label }) => (
  <div className="ud-preview-card">
    {label && <div className="ud-preview-label">{label}</div>}
    <div className="ud-preview-body">{children}</div>
  </div>
)
