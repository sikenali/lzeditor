import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveIcon } from '../../utils/icon'

export interface UiSelectOption {
  value: string
  label: string
  desc?: string
  disabled?: boolean
  group?: string
  /** 可选的层级徽标文本（如 H1/H2/H3），在下拉项与触发器中渲染 */
  badge?: string
}

export interface UiSelectProps {
  value: string
  onChange: (value: string) => void
  options: UiSelectOption[]
  placeholder?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * 下拉选择器。菜单渲染到 document.body（portal + fixed），而不是留在
 * 组件内部：弹框/滚动容器普遍是 overflow:auto/hidden，会把绝对定位菜单
 * 裁掉（导出弹框的「纸张/方向」选完就看不到选项就是这个原因）。
 */
export const UiSelect: React.FC<UiSelectProps> = ({
  value, onChange, options, placeholder = '请选择', size = 'md', disabled, className, style,
}) => {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const Caret = resolveIcon('ri-arrow-down-s-line')
  const Check = resolveIcon('ri-check-line')

  const selected = options.find(o => o.value === value)
  const enabledOptions = options.filter(o => !o.disabled)

  const placeMenu = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const gap = 6
    const margin = 8
    const spaceBelow = window.innerHeight - r.bottom - gap - margin
    const spaceAbove = r.top - gap - margin
    const below = spaceBelow >= 160 || spaceBelow >= spaceAbove
    const maxHeight = Math.min(280, Math.max(120, below ? spaceBelow : spaceAbove))
    const top = below ? r.bottom + gap : Math.max(margin, r.top - gap - maxHeight)
    setMenuPos({ left: r.left, top, width: r.width, maxHeight })
  }

  const openMenu = () => {
    placeMenu()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onReflow = () => placeMenu()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [open])

  const selectFirst = () => {
    const first = enabledOptions[0]
    if (!first) return
    onChange(first.value)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (!open && (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault()
      openMenu()
      // focus first option in next tick so the element exists
      requestAnimationFrame(() => {
        const firstItem = menuRef.current?.querySelector<HTMLElement>('.ui-select-item:not(.disabled)')
        firstItem?.focus()
      })
    } else if (open && e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  let lastGroup: string | undefined

  const menu = open && menuPos ? createPortal(
    <div
      ref={menuRef}
      className="ui-select-menu ui-select-menu--portal"
      role="listbox"
      style={{
        position: 'fixed',
        left: menuPos.left,
        top: menuPos.top,
        width: menuPos.width,
        maxHeight: menuPos.maxHeight,
        zIndex: 5000,
      }}
    >
      {options.map(opt => {
        const showGroup = opt.group && opt.group !== lastGroup
        lastGroup = opt.group
        const active = opt.value === value
        return (
          <React.Fragment key={opt.value}>
            {showGroup && <div className="ui-select-group">{opt.group}</div>}
            <div
              role="option"
              aria-selected={active}
              aria-disabled={opt.disabled || undefined}
              tabIndex={opt.disabled ? -1 : 0}
              className={`ui-select-item${active ? ' active' : ''}${opt.disabled ? ' disabled' : ''}`}
              onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); triggerRef.current?.focus() } }}
              onKeyDown={(e) => {
                if (opt.disabled) return
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  onChange(opt.value)
                  setOpen(false)
                  triggerRef.current?.focus()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  setOpen(false)
                  triggerRef.current?.focus()
                } else if (e.key === 'Home') {
                  e.preventDefault()
                  selectFirst()
                }
              }}
            >
              <span className="ui-select-item-text">
                <span className="ui-select-item-row">
                  {opt.badge && <span className="ui-select-item-badge">{opt.badge}</span>}
                  <span className="ui-select-item-label">{opt.label}</span>
                </span>
                {opt.desc && <span className="ui-select-item-desc">{opt.desc}</span>}
              </span>
              {active && Check && <Check size={14} />}
            </div>
          </React.Fragment>
        )
      })}
    </div>,
    document.body,
  ) : null

  return (
    <div className={`ui-select${size === 'sm' ? ' ui-select--sm' : ''}${className ? ` ${className}` : ''}`}
      ref={ref} style={style}>
      <button
        type="button"
        ref={triggerRef}
        className="ui-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { if (open) setOpen(false); else openMenu() }}
        onKeyDown={onKeyDown}
      >
        {selected?.badge && <span className="ui-select-item-badge">{selected.badge}</span>}
        <span className={selected ? 'ui-select-label' : 'ui-select-label ui-select-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        {Caret && <Caret size={14} />}
      </button>
      {menu}
    </div>
  )
}
