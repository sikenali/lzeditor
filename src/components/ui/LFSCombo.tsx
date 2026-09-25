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
  const id = `lfs-combo-${++uniqueId}`

  // 点击外部关闭（document capture，最先执行，只检查 wrapperRef，dropdown 已移除）
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

  // 打开时计算 fixed 位置（不受父容器 overflow:hidden 影响）
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
    <div ref={wrapperRef} className={`lfs-combo${className ? ` ${className}` : ''}`} style={{ minWidth, ...style, position: 'relative', display: 'inline-block' }}>
      <button
        className={`lfs-combo-trigger${disabled ? ' disabled' : ''}${open ? ' open' : ''}`}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v) }}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
      >
        <span className="lfs-combo-label">{displayLabel || placeholder}</span>
        {selected && <span className="remix ri-checkbox-circle-fill lfs-combo-check"></span>}
        <span className="lfs-combo-arrow"><span className="remix ri-arrow-down-s-line"></span></span>
      </button>

      {/* 固定定位 dropdown，渲染在 body 层级，不受任何父容器 overflow:hidden 裁剪 */}
      {open && (
        <div
          ref={dropdownRef}
          id={id}
          role="listbox"
          className="lfs-combo-dropdown"
          style={{ position: 'fixed', zIndex: 3000 }}
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
                onClick={(e) => {
                  e.stopPropagation()
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
