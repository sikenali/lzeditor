import React, { useRef } from 'react'
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

export const UiTabs: React.FC<UiTabsProps> = ({ value, onChange, tabs, className }) => {
  const refs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const move = (fromIdx: number, delta: number) => {
    if (tabs.length === 0) return
    const next = (fromIdx + delta + tabs.length) % tabs.length
    refs.current.get(tabs[next].key)?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="标签"
      className={`ui-tabs${className ? ` ${className}` : ''}`}
    >
      {tabs.map((tab, idx) => {
        const Icon = resolveIcon(tab.icon)
        const selected = value === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-current={selected ? 'page' : undefined}
            tabIndex={selected ? 0 : -1}
            ref={el => { if (el) refs.current.set(tab.key, el); else refs.current.delete(tab.key) }}
            className={`ui-tab${selected ? ' active' : ''}`}
            onClick={() => onChange(tab.key)}
            onKeyDown={e => {
              if (e.key === 'ArrowRight') { e.preventDefault(); move(idx, 1) }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); move(idx, -1) }
            }}
          >
            {Icon && <Icon size={15} />}
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
