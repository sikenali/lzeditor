import React, { useEffect, useRef, useState } from 'react'
import { resolveIcon } from '../../utils/icon'

export interface UiSelectOption {
  value: string
  label: string
  desc?: string
  disabled?: boolean
  group?: string
}

export interface UiSelectProps {
  value: string
  onChange: (value: string) => void
  options: UiSelectOption[]
  placeholder?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}

export const UiSelect: React.FC<UiSelectProps> = ({
  value, onChange, options, placeholder = '请选择', size = 'md', disabled, className,
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const Caret = resolveIcon('ri-arrow-down-s-line')
  const Check = resolveIcon('ri-check-line')

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  let lastGroup: string | undefined

  return (
    <div className={`ui-select${size === 'sm' ? ' ui-select--sm' : ''}${className ? ` ${className}` : ''}`}
      ref={ref}>
      <button type="button" className="ui-select-trigger" disabled={disabled}
        onClick={() => setOpen(o => !o)}>
        <span className={selected ? 'ui-select-label' : 'ui-select-label ui-select-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        {Caret && <Caret size={14} />}
      </button>
      {open && (
        <div className="ui-select-menu">
          {options.map(opt => {
            const showGroup = opt.group && opt.group !== lastGroup
            lastGroup = opt.group
            return (
              <React.Fragment key={opt.value}>
                {showGroup && <div className="ui-select-group">{opt.group}</div>}
                <div
                  className={`ui-select-item${opt.value === value ? ' active' : ''}${opt.disabled ? ' disabled' : ''}`}
                  onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false) } }}
                >
                  <span className="ui-select-item-text">
                    <span className="ui-select-item-label">{opt.label}</span>
                    {opt.desc && <span className="ui-select-item-desc">{opt.desc}</span>}
                  </span>
                  {opt.value === value && Check && <Check size={14} />}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
