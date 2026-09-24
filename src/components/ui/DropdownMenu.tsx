import React, { useRef, useEffect } from 'react'
import { useSettingsStore } from '../../store/settingsStore'

interface DropdownMenuProps {
  trigger: React.ReactNode
  items: { label: string; icon?: string; action: () => void; separator?: boolean }[]
  style?: React.CSSProperties
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items, style }) => {
  const [open, setOpen] = React.useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ddRef = useRef<HTMLDivElement>(null)
  const navMode = useSettingsStore((s) => s.navMode)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (navMode !== 'left' || !open || !ddRef.current) {
      if (ddRef.current) { ddRef.current.style.position = ''; ddRef.current.style.left = ''; ddRef.current.style.top = '' }
      return
    }
    const triggerEl = ref.current?.querySelector<HTMLButtonElement>('button, [role="button"]') || (ref.current?.firstChild as HTMLElement | undefined)
    if (!triggerEl) return
    const rect = triggerEl.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const el = ddRef.current
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    el.style.top = '-9999px'
    requestAnimationFrame(() => {
      const mw = el.offsetWidth || 180
      const mh = el.offsetHeight || 240
      el.style.left = `${Math.min(rect.right + 4, vw - mw - 8)}px`
      el.style.top = `${Math.min(rect.top, vh - mh - 8)}px`
    })
  }, [open, navMode])

  useEffect(() => {
    if (!open && ddRef.current) { ddRef.current.style.position = ''; ddRef.current.style.left = ''; ddRef.current.style.top = '' }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="toolbar-dropdown" ref={ddRef} style={style}>
          {items.map((item, i) =>
            item.separator
              ? <div key={i} className="toolbar-dropdown-sep" />
              : <button key={i} className="toolbar-dropdown-item" onClick={() => { item.action(); setOpen(false) }}>
                  {item.icon && <span className={`remix ${item.icon}`}></span>}
                  <span>{item.label}</span>
                </button>
          )}
        </div>
      )}
    </div>
  )
}
