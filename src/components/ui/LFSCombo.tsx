import React, { useRef, useState, useEffect } from 'react'

export interface LFSComboOption {
  value: string
  label: string
  icon?: string
}

export interface LFSComboProps {
  value: string
  onChange: (value: string) => void
  options: LFSComboOption[]
  style?: React.CSSProperties
  className?: string
  disabled?: boolean
  placeholder?: string
  minWidth?: number
}

let uniqueId = 0

export const LFSCombo: React.FC<LFSComboProps> = ({
  value, onChange, options, style, className, disabled, placeholder, minWidth,
}) => {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const id = useRef(`lfs-combo-${++uniqueId}`)

  // 点击外部关闭（document level，捕获阶段最先执行）
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      const inWrapper = wrapperRef.current?.contains(target)
      if (!inWrapper) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick, true)
    return () => document.removeEventListener('mousedown', handleClick, true)
  }, [open])

  const selected = options.find(o => o.value === value)
  const displayLabel = selected ? selected.label : (placeholder || '')

  return (
    <div ref={wrapperRef} className={`lfs-combo${className ? ` ${className}` : ''}`} style={{ minWidth, ...style, position: 'relative', display: 'inline-block' }}>
      <button
        className={`lfs-combo-trigger${disabled ? ' disabled' : ''}${open ? ' open' : ''}`}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v) }}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id.current}
      >
        <span className="lfs-combo-label">{displayLabel || placeholder}</span>
        {selected && <span className="remix ri-checkbox-circle-fill lfs-combo-check"></span>}
        <span className="lfs-combo-arrow"><span className="remix ri-arrow-down-s-line"></span></span>
      </button>

      {/* Dropdown 绝对定位在 wrapper 内，不破坏 DOM 层级 */}
      {open && (
        <div
          ref={dropdownRef}
          id={id.current}
          role="listbox"
          className="lfs-combo-dropdown"
          style={{ position: 'absolute', top: '100%', left: 0, width: '100%', zIndex: 3000 }}
        >
          {options.length === 0 && placeholder ? (
            <div className="lfs-combo-empty">{placeholder}</div>
          ) : (
            options.map(opt => (
              <button
                key={opt.value}
                className={`lfs-combo-option${opt.value === value ? ' active' : ''}`}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                type="button"
                tabIndex={-1}
              >
                {opt.icon && <span className={`remix lfs-combo-opt-icon ${opt.icon}`}></span>}
                <span className="lfs-combo-opt-label">{opt.label}</span>
                {opt.value === value && <span className="remix ri-checkbox-circle-fill lfs-combo-check"></span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
