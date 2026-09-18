import React, { useRef, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

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

let portalCount = 0
let portalRoot: HTMLDivElement | null = null

function getPortalRoot(): HTMLDivElement {
  if (!portalRoot) {
    portalRoot = document.createElement('div')
    portalRoot.setAttribute('data-lfs-portal', 'true')
    portalRoot.style.cssText = 'position:fixed;inset:0;z-index:3000;'
    document.body.appendChild(portalRoot)
  }
  portalCount++
  return portalRoot
}

function releasePortalRoot(): void {
  portalCount--
  if (portalCount <= 0 && portalRoot) {
    portalRoot.remove()
    portalRoot = null
    portalCount = 0
  }
}

export const LFSCombo: React.FC<LFSComboProps> = ({
  value, onChange, options, style, className, disabled, placeholder, minWidth,
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null)
  const [portalPos, setPortalPos] = useState<{ x: number; y: number; w: number } | null>(null)
  const isOpenRef = useRef(false)

  useEffect(() => {
    isOpenRef.current = open
  }, [open])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('mousedown', onClick)
      if (!isOpenRef.current) releasePortalRoot()
    }
  }, [])

  // Open → compute position → create portal
  useEffect(() => {
    if (!open || !ref.current) {
      if (!open) setPortalNode(null)
      return
    }
    const rect = ref.current.getBoundingClientRect()
    setPortalPos({ x: rect.left, y: rect.bottom + 4, w: rect.width })
    setPortalNode(getPortalRoot())
  }, [open])

  const selected = options.find(o => o.value === value)
  const displayLabel = selected ? selected.label : (placeholder || '')

  return (
    <div ref={ref} className={`lfs-combo${className ? ` ${className}` : ''}`} style={{ minWidth, ...style, position: 'relative', display: 'inline-block' }}>
      <button
        className={`lfs-combo-trigger${disabled ? ' disabled' : ''}${open ? ' open' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        type="button"
      >
        <span className="lfs-combo-label">{displayLabel || placeholder}</span>
        {selected && <span className="remix ri-checkbox-fill lfs-combo-check"></span>}
        <span className="lfs-combo-arrow"><span className="remix ri-arrow-down-s-line"></span></span>
      </button>
      {open && portalNode && portalPos && ReactDOM.createPortal(
        <div
          className="lfs-combo-dropdown"
          style={{ position: 'fixed', top: portalPos.y, left: portalPos.x, width: portalPos.w, zIndex: 3000 }}
        >
          {options.length === 0 && placeholder ? (
            <div className="lfs-combo-empty">{placeholder}</div>
          ) : (
            options.map(opt => (
              <button
                key={opt.value}
                className={`lfs-combo-option${opt.value === value ? ' active' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                type="button"
              >
                {opt.icon && <span className={`remix lfs-combo-opt-icon ${opt.icon}`}></span>}
                <span className="lfs-combo-opt-label">{opt.label}</span>
                {opt.value === value && <span className="remix ri-checkbox-fill lfs-combo-check"></span>}
              </button>
            ))
          )}
        </div>,
        portalNode
      )}
    </div>
  )
}
