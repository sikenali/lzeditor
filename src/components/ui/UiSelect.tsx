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
  style?: React.CSSProperties
}

export const UiSelect: React.FC<UiSelectProps> = ({
  value, onChange, options, placeholder = '请选择', size = 'md', disabled, className, style,
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const Caret = resolveIcon('ri-arrow-down-s-line')
  const Check = resolveIcon('ri-check-line')

  const selected = options.find(o => o.value === value)
  const enabledOptions = options.filter(o => !o.disabled)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const selectFirst = () => {
    const first = enabledOptions[0]
    if (!first) return
    onChange(first.value)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (!open && (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault()
      setOpen(true)
      // focus first option in next tick so the element exists
      requestAnimationFrame(() => {
        const firstItem = ref.current?.querySelector<HTMLElement>('.ui-select-item:not(.disabled)')
        firstItem?.focus()
      })
    } else if (open && e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  let lastGroup: string | undefined

  return (
    <div className={`ui-select${size === 'sm' ? ' ui-select--sm' : ''}${className ? ` ${className}` : ''}`}
      ref={ref} style={style}>
      <button
        type="button"
        ref={triggerRef}
        className="ui-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? 'ui-select-label' : 'ui-select-label ui-select-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        {Caret && <Caret size={14} />}
      </button>
      {open && (
        <div className="ui-select-menu" role="listbox">
          {options.map(opt => {
            const showGroup = opt.group && opt.group !== lastGroup
            lastGroup = opt.group
            const active = opt.value === value
            return (
              <React.Fragment key={opt.value}>
                {showGroup && <div className="ui-select-group">{opt.group}</div>}
                <div
                  role="option"
                  aria-selected={active}
                  aria-disabled={opt.disabled || undefined}
                  tabIndex={opt.disabled ? -1 : 0}
                  className={`ui-select-item${active ? ' active' : ''}${opt.disabled ? ' disabled' : ''}`}
                  onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); triggerRef.current?.focus() } }}
                  onKeyDown={(e) => {
                    if (opt.disabled) return
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      onChange(opt.value)
                      setOpen(false)
                      triggerRef.current?.focus()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      setOpen(false)
                      triggerRef.current?.focus()
                    } else if (e.key === 'Home') {
                      e.preventDefault()
                      selectFirst()
                    }
                  }}
                >
                  <span className="ui-select-item-text">
                    <span className="ui-select-item-label">{opt.label}</span>
                    {opt.desc && <span className="ui-select-item-desc">{opt.desc}</span>}
                  </span>
                  {active && Check && <Check size={14} />}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
