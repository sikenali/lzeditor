import React, { useRef, useState, useCallback } from 'react'

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
  const selectRef = useRef<HTMLSelectElement>(null)
  const id = `lfs-combo-${++uniqueId}`

  // 使用原生 select 作为底层，完全不依赖外部事件监听
  const handleNativeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }, [onChange])

  const selected = options.find(o => o.value === value)
  const displayLabel = selected ? selected.label : (placeholder || '')

  return (
    <div ref={wrapperRef} className={`lfs-combo${className ? ` ${className}` : ''}`} style={{ minWidth, ...style, position: 'relative', display: 'inline-block' }}>
      {/* 自定义 trigger button */}
      <button
        className={`lfs-combo-trigger${disabled ? ' disabled' : ''}${open ? ' open' : ''}`}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v) }}
        onBlur={() => setOpen(false)}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
      >
        <span className="lfs-combo-label">{displayLabel || placeholder}</span>
        {selected && <span className="remix ri-checkbox-circle-fill lfs-combo-check"></span>}
        <span className="lfs-combo-arrow"><span className="remix ri-arrow-down-s-line"></span></span>
      </button>

      {/* 隐藏的原生 select，提供真正的点击交互 */}
      <select
        ref={selectRef}
        id={id}
        className="lfs-combo-native"
        value={open ? value : ''}
        onChange={handleNativeChange}
        autoFocus={open}
        onBlur={() => setOpen(false)}
        disabled={disabled}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 1,
          margin: 0,
          padding: 0,
          border: 'none',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      >
        <option value="" disabled>{placeholder || '请选择'}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* 自定义下拉列表（视觉增强，不用于实际交互） */}
      {open && !disabled && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="lfs-combo-dropdown"
          style={{ position: 'absolute', top: '100%', left: 0, width: '100%', zIndex: 3000 }}
        >
          {options.length === 0 && placeholder ? (
            <div className="lfs-combo-empty">{placeholder}</div>
          ) : (
            options.map(opt => (
              <div
                key={opt.value}
                className={`lfs-combo-option${opt.value === value ? ' active' : ''}`}
                role="option"
                aria-selected={opt.value === value}
                style={{ pointerEvents: 'none' }}
              >
                {opt.icon && <span className={`remix lfs-combo-opt-icon ${opt.icon}`}></span>}
                <span className="lfs-combo-opt-label">{opt.label}</span>
                {opt.value === value && <span className="remix ri-checkbox-circle-fill lfs-combo-check"></span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
