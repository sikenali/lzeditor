import React, { useRef } from 'react'

export interface UiRadioOption {
  value: string
  label: string
  desc?: string
  disabled?: boolean
}

export interface UiRadioGroupProps {
  value: string
  onChange: (value: string) => void
  options: UiRadioOption[]
  direction?: 'row' | 'column'
  className?: string
}

export const UiRadioGroup: React.FC<UiRadioGroupProps> = ({
  value, onChange, options, direction = 'column', className,
}) => {
  const refs = useRef<Map<string, HTMLDivElement>>(new Map())

  const move = (fromIdx: number, delta: number) => {
    const enabled = options.filter(o => !o.disabled)
    if (enabled.length === 0) return
    const cur = enabled.findIndex(o => o.value === value)
    const next = (cur + delta + enabled.length) % enabled.length
    const target = enabled[next]
    refs.current.get(target.value)?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-orientation={direction === 'row' ? 'horizontal' : 'vertical'}
      className={`ui-radio-group${direction === 'row' ? ' row' : ''}${className ? ` ${className}` : ''}`}
    >
      {options.map((opt, idx) => (
        <div
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          aria-disabled={opt.disabled || undefined}
          tabIndex={value === opt.value ? 0 : -1}
          ref={el => { if (el) refs.current.set(opt.value, el); else refs.current.delete(opt.value) }}
          className={`ui-radio-item${value === opt.value ? ' active' : ''}${opt.disabled ? ' disabled' : ''}`}
          onClick={() => { if (!opt.disabled) onChange(opt.value) }}
          onKeyDown={e => {
            if (opt.disabled) return
            const isDown = e.key === 'ArrowDown' || (direction === 'row' && e.key === 'ArrowRight')
            const isUp = e.key === 'ArrowUp' || (direction === 'row' && e.key === 'ArrowLeft')
            if (isDown) { e.preventDefault(); move(idx, 1) }
            else if (isUp) { e.preventDefault(); move(idx, -1) }
            else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(opt.value) }
          }}
        >
          <span className="ui-radio-dot" />
          <span className="ui-radio-text">
            <span className="ui-radio-label">{opt.label}</span>
            {opt.desc && <span className="ui-radio-desc">{opt.desc}</span>}
          </span>
        </div>
      ))}
    </div>
  )
}
