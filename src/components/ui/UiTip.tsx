import React from 'react'

export interface UiTipProps {
  text: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
  className?: string
}

/** Lightweight CSS-only tooltip. `children` must render a single element. */
export const UiTip: React.FC<UiTipProps> = ({ text, placement = 'top', children, className }) => (
  <span
    className={`ui-tip ui-tip--${placement}${className ? ` ${className}` : ''}`}
    data-tip={text}
  >
    {children}
  </span>
)
