import React, { ReactNode, useEffect, useRef } from 'react'

export interface PanelContainerProps {
  onClose: () => void
  icon?: string
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const PanelContainer: React.FC<PanelContainerProps> = ({
  onClose, icon, title, subtitle, children, footer, size = 'lg', className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  return (
    <div className="panel-backdrop">
      <div ref={containerRef} className={`panel-container panel-container--${size} ${className}`}>
        <div className="panel-header">
          {icon && <span className={`remix panel-icon ${icon}`}></span>}
          <div className="panel-title-group">
            <div className="panel-title">{title}</div>
            {subtitle && <div className="panel-subtitle">{subtitle}</div>}
          </div>
          <button className="panel-close" onClick={onClose} title="关闭">
            <span className="remix ri-close-line"></span>
          </button>
        </div>
        <div className="panel-body">{children}</div>
        {footer && <div className="panel-footer">{footer}</div>}
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
