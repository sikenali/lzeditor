import React from 'react'
import { UiCheck } from './UiCheck'

export interface UiSelectCardProps {
  selected: boolean
  title: string
  desc?: string
  icon?: React.ReactNode
  disabled?: boolean
  onClick: () => void
  className?: string
}

/** Grid card used for theme/accent/layout pickers; shows a ✓ badge when selected. */
export const UiSelectCard: React.FC<UiSelectCardProps> = ({
  selected, title, desc, icon, disabled, onClick, className,
}) => (
  <div
    className={`ui-select-card${selected ? ' active' : ''}${disabled ? ' disabled' : ''}${className ? ` ${className}` : ''}`}
    onClick={() => { if (!disabled) onClick() }}
  >
    <div className="ui-select-card-body">
      {icon && <div className="ui-select-card-icon">{icon}</div>}
      <div className="ui-select-card-text">
        <div className="ui-select-card-title">{title}</div>
        {desc && <div className="ui-select-card-desc">{desc}</div>}
      </div>
    </div>
    <UiCheck checked={selected} />
  </div>
)
