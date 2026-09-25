import React from 'react'

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

export const LFSCombo: React.FC<LFSComboProps> = ({
  value, onChange, options, style, className, disabled, placeholder, minWidth,
}) => {
  return (
    <select
      className={`lfs-combo${className ? ` ${className}` : ''}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{ minWidth, ...style, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
