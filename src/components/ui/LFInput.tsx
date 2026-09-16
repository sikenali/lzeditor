import React from 'react'

export interface LFSSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  style?: React.CSSProperties
  className?: string
  disabled?: boolean
  placeholder?: string
}

export const LFSSelect: React.FC<LFSSelectProps> = ({
  value, onChange, options, style, className, disabled, placeholder,
}) => (
  <select
    className={`lfs-select${className ? ` ${className}` : ''}`}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    style={style}
  >
    {placeholder && (
      <option value="" disabled>{placeholder}</option>
    )}
    {options.map(o => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
)

export interface LFSInputProps {
  type?: string
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
  className?: string
  disabled?: boolean
  readOnly?: boolean
  autoFocus?: boolean
  min?: number
  max?: number
  step?: number
}

export const LFSInput: React.FC<LFSInputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  style,
  className,
  disabled,
  readOnly,
  autoFocus,
  ...rest
}) => (
  <input
    className={`lfs-input${className ? ` ${className}` : ''}`}
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    readOnly={readOnly}
    autoFocus={autoFocus}
    style={style}
    {...rest}
  />
)
