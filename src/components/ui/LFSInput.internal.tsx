import React from 'react'

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
