import React, { useRef, useEffect, useState, useCallback } from 'react'
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

// 全局标记：当前哪个 combo 是打开的
let activeComboId = 0

export const LFSCombo: React.FC<LFSComboProps> = ({
  value, onChange, options, style, className, disabled, placeholder, minWidth,
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null)
  const [portalPos, setPortalPos] = useState<{ x: number; y: number; w: number } | null>(null)
  const comboId = useRef(++activeComboId)

  // 关闭时安全清理 portal
  useEffect(() => {
    if (!open) {
      setPortalNode(null)
      setPortalPos(null)
      releasePortalRoot()
    }
  }, [open])

  // 打开时设为全局 active
  useEffect(() => {
    if (open) activeComboId = comboId.current
  }, [open])

  // 点击外部关闭：mousedown 捕获阶段，优先于所有其他监听器
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (activeComboId !== comboId.current) return
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      // 检查是否在 dropdown 内（portal 中的元素不在 ref 内）
      const dropdown = (target as HTMLElement).closest('.lfs-combo-dropdown')
      if (dropdown) return
      setOpen(false)
    }
    // capture phase: 最优先执行
    document.addEventListener('mousedown', onClick, true)
    return () => document.removeEventListener('mousedown', onClick, true)
  }, [])

  // 打开时计算位置并创建 portal
  useEffect(() => {
    if (!open || !ref.current) return
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
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) setOpen(v => !v)
        }}
        type="button"
      >
        <span className="lfs-combo-label">{displayLabel || placeholder}</span>
        {selected && <span className="remix ri-checkbox-circle-fill lfs-combo-check"></span>}
        <span className="lfs-combo-arrow"><span className="remix ri-arrow-down-s-line"></span></span>
      </button>
      {open && portalNode && portalPos && ReactDOM.createPortal(
        <div
          className="lfs-combo-dropdown"
          style={{ position: 'fixed', top: portalPos.y, left: portalPos.x, width: portalPos.w, zIndex: 3000 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {options.length === 0 && placeholder ? (
            <div className="lfs-combo-empty">{placeholder}</div>
          ) : (
            options.map(opt => (
              <button
                key={opt.value}
                className={`lfs-combo-option${opt.value === value ? ' active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(opt.value)
                  setOpen(false)
                }}
                type="button"
              >
                {opt.icon && <span className={`remix lfs-combo-opt-icon ${opt.icon}`}></span>}
                <span className="lfs-combo-opt-label">{opt.label}</span>
                {opt.value === value && <span className="remix ri-checkbox-circle-fill lfs-combo-check"></span>}
              </button>
            ))
          )}
        </div>,
        portalNode
      )}
    </div>
  )
}
