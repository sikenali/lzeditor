import React, { useRef, useState, useEffect } from 'react'

export interface SelectBoxOption {
  value: string
  label: string
  icon?: string
}

export interface SelectBoxProps {
  value: string
  onChange: (value: string) => void
  options: SelectBoxOption[]
  style?: React.CSSProperties
  className?: string
  disabled?: boolean
  placeholder?: string
  minWidth?: number
}

let uniqueId = 0

export const SelectBox: React.FC<SelectBoxProps> = ({
  value, onChange, options, style, className, disabled, placeholder, minWidth,
}) => {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const id = `lf-select-${++uniqueId}`

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick, true)
    return () => document.removeEventListener('mousedown', handleClick, true)
  }, [open])

  useEffect(() => {
    if (!open || !wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const dd = dropdownRef.current
    if (!dd) return
    dd.style.top = (rect.bottom + 4) + 'px'
    dd.style.left = rect.left + 'px'
    dd.style.width = rect.width + 'px'
  }, [open])

  const selected = options.find(o => o.value === value)
  const displayLabel = selected ? selected.label : (placeholder || '')

  return (
    <div ref={wrapperRef} className={`lf-select${className ? ` ${className}` : ''}`} style={{ minWidth, ...style, position: 'relative', display: 'inline-block' }}>
      <button
        className={`lf-select-trigger${disabled ? ' disabled' : ''}${open ? ' open' : ''}`}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v) }}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
      >
        <span className="lf-select-label">{displayLabel || placeholder}</span>
        {selected && <span className="remix ri-checkbox-circle-fill lf-select-check"></span>}
        <span className="lf-select-arrow"><span className="remix ri-arrow-down-s-line"></span></span>
      </button>

      {open && (
        <div
          ref={dropdownRef}
          id={id}
          role="listbox"
          className="lf-select-dropdown"
          style={{ position: 'fixed', zIndex: 3000 }}
        >
          {options.length === 0 && placeholder ? (
            <div className="lf-select-empty">{placeholder}</div>
          ) : (
            options.map(opt => (
              <button
                key={opt.value}
                className={`lf-select-option${opt.value === value ? ' active' : ''}`}
                role="option"
                aria-selected={opt.value === value}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(opt.value)
                  setOpen(false)
                }}
                type="button"
                tabIndex={-1}
              >
                {opt.icon && <span className={`remix lf-select-opt-icon ${opt.icon}`}></span>}
                <span className="lf-select-opt-label">{opt.label}</span>
                {opt.value === value && <span className="remix ri-checkbox-circle-fill lf-select-check"></span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
