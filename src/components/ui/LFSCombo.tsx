import React, { useRef, useEffect, useState } from 'react'

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

export const LFSCombo: React.FC<LFSComboProps> = ({
  value, onChange, options, style, className, disabled, placeholder, minWidth,
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const selected = options.find(o => o.value === value)
  const displayLabel = selected ? selected.label : (placeholder || '')

  return (
    <div ref={ref} className={`lfs-combo${className ? ` ${className}` : ''}`} style={{ minWidth, ...style }}>
      <button
        className={`lfs-combo-trigger${disabled ? ' disabled' : ''}${open ? ' open' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        type="button"
      >
        <span className="lfs-combo-label">{displayLabel || placeholder}</span>
        <span className="lfs-combo-arrow"><span className="remix ri-arrow-down-s-line"></span></span>
      </button>
      {open && (
        <div className="lfs-combo-dropdown">
          {options.length === 0 && placeholder ? (
            <div className="lfs-combo-empty">{placeholder}</div>
          ) : (
            options.map(opt => (
              <button
                key={opt.value}
                className={`lfs-combo-option${opt.value === value ? ' active' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                type="button"
              >
                {opt.icon && <span className={`remix lfs-combo-opt-icon ${opt.icon}`}></span>}
                <span className="lfs-combo-opt-label">{opt.label}</span>
                {opt.value === value && <span className="remix ri-checkbox-fill lfs-combo-check"></span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
