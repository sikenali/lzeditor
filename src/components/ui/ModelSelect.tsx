import React, { useRef, useEffect } from 'react'

export interface ModelItem {
  id: string
  name: string
  maxTokens?: number
  supportsStreaming?: boolean
}

interface ModelSelectProps {
  value: string
  onChange: (id: string) => void
  items: ModelItem[]
  placeholder?: string
  className?: string
}

export const ModelSelect: React.FC<ModelSelectProps> = ({
  value,
  onChange,
  items,
  placeholder = '选择模型',
  className = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedLabel = items.find(i => i.id === value)?.name || placeholder

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`model-select ${className}`} ref={containerRef}>
      <button
        className="model-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={items.length === 0}
        type="button"
      >
        <span className="model-select-label">{selectedLabel}</span>
        <span className={`model-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <div className="model-select-dropdown">
          {items.length === 0 ? (
            <div className="model-select-empty">请先配置 API Key</div>
          ) : (
            items.map(item => (
              <button
                key={item.id}
                className={`model-select-item ${item.id === value ? 'active' : ''}`}
                onClick={() => { onChange(item.id); setIsOpen(false) }}
                type="button"
              >
                <span className="model-select-name">{item.name}</span>
                {item.id === value && <span className="model-select-check">✓</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
