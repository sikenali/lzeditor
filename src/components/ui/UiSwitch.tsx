import React from 'react'

export interface UiSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export const UiSwitch: React.FC<UiSwitchProps> = ({ checked, onChange, disabled, size = 'md', className }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    className={`ui-switch${checked ? ' on' : ''}${size === 'sm' ? ' ui-switch--sm' : ''}${className ? ` ${className}` : ''}`}
    onClick={() => onChange(!checked)}
  >
    <span className="ui-switch-thumb" />
  </button>
)
