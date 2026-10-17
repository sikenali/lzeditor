import React from 'react'
import { resolveIcon } from '../../utils/icon'

export interface UiButtonProps {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: string
  onClick?: () => void
  children: React.ReactNode
  className?: string
  type?: 'button' | 'submit'
  title?: string
}

export const UiButton: React.FC<UiButtonProps> = ({
  variant = 'primary', size = 'md', disabled, loading, icon, onClick,
  children, className, type = 'button', title,
}) => {
  const Icon = resolveIcon(icon)
  const Spinner = resolveIcon('ri-loader-4-line')
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`ui-btn ui-btn--${variant} ui-btn--${size}${disabled || loading ? ' disabled' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      title={title}
    >
      {loading && Spinner
        ? <Spinner size={15} />
        : Icon
          ? <Icon size={15} />
          : null}
      {children}
    </button>
  )
}
