import React from 'react'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  style?: React.CSSProperties
  className?: string
}

let uniqueId = 0

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, disabled, style, className }) => {
  const id = `lf-cb-${++uniqueId}`
  return (
    <div
      className={`lf-checkbox${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      onClick={() => { if (!disabled) onChange(!checked) }}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        className="lf-checkbox-input"
        aria-checked={checked}
      />
      <label htmlFor={id} className="lf-checkbox-box"><span className="remix ri-check-line"></span></label>
    </div>
  )
}
