import React from 'react'
import { resolveIcon } from '../../utils/icon'

export interface UiCheckProps {
  checked: boolean
  size?: number
  className?: string
}

/** Checkbox badge used as the "selected" indicator on select cards. */
export const UiCheck: React.FC<UiCheckProps> = ({ checked, size = 18, className }) => {
  const Check = resolveIcon('ri-check-line')
  return (
    <span
      className={`ui-check${checked ? ' on' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    >
      {checked && Check && <Check size={Math.round(size * 0.9)} />}
    </span>
  )
}
