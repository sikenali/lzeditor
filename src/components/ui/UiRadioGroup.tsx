import React from 'react'

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
}) => (
  <div
    role="radiogroup"
    className={`ui-radio-group${direction === 'row' ? ' row' : ''}${className ? ` ${className}` : ''}`}
  >
    {options.map(opt => (
      <div
        key={opt.value}
        role="radio"
        aria-checked={value === opt.value}
        className={`ui-radio-item${value === opt.value ? ' active' : ''}${opt.disabled ? ' disabled' : ''}`}
        onClick={() => { if (!opt.disabled) onChange(opt.value) }}
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
