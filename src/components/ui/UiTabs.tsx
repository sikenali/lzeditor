import React from 'react'
import { resolveIcon } from '../../utils/icon'

export interface UiTabItem {
  key: string
  label: string
  icon?: string
}

export interface UiTabsProps {
  value: string
  onChange: (key: string) => void
  tabs: UiTabItem[]
  className?: string
}

export const UiTabs: React.FC<UiTabsProps> = ({ value, onChange, tabs, className }) => (
  <div className={`ui-tabs${className ? ` ${className}` : ''}`}>
    {tabs.map(tab => {
      const Icon = resolveIcon(tab.icon)
      return (
        <button
          key={tab.key}
          type="button"
          className={`ui-tab${value === tab.key ? ' active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {Icon && <Icon size={15} />}
          <span>{tab.label}</span>
        </button>
      )
    })}
  </div>
)
