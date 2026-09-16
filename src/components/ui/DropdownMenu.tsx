import React, { useRef, useEffect } from 'react'

interface DropdownMenuProps {
  trigger: React.ReactNode
  items: { label: string; icon?: string; action: () => void; separator?: boolean }[]
  style?: React.CSSProperties
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items, style }) => {
  const [open, setOpen] = React.useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="toolbar-dropdown" style={style}>
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
