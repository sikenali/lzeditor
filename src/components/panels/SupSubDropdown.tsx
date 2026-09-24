import React, { useEffect, useRef } from 'react'
import { useSettingsStore } from '../../store/settingsStore'

interface SupSubDropdownProps {
  open: boolean
  onToggle: (v: boolean) => void
  onSup: () => void
  onSub: () => void
}

export const SupSubDropdown: React.FC<SupSubDropdownProps> = ({ open, onToggle, onSup, onSub }) => {
  const navMode = useSettingsStore((s) => s.navMode)
  const btnRef = useRef<HTMLButtonElement>(null)
  const ddRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (navMode !== 'left' || !open || !ddRef.current) {
      if (ddRef.current) { ddRef.current.style.position = ''; ddRef.current.style.left = ''; ddRef.current.style.top = '' }
      return
    }
    const trigger = btnRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        onToggle(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onToggle])

  return (
    <div className="toolbar-dd-wrap">
      <button ref={btnRef} className={`toolbar-btn ${open ? 'active' : ''}`} onClick={() => onToggle(!open)} title="角标">
        <span className="remix toolbar-icon ri-superscript"></span>
        <span className="toolbar-label">角标</span>
      </button>
      {open && (
        <div className="toolbar-dropdown" ref={ddRef}>
          <button className="toolbar-dropdown-item" onClick={() => { onSup(); onToggle(false) }}>
            <span className="remix ri-superscript"></span>
            <span>上角标</span>
          </button>
          <button className="toolbar-dropdown-item" onClick={() => { onSub(); onToggle(false) }}>
            <span className="remix ri-subscript"></span>
            <span>下角标</span>
          </button>
        </div>
      )}
    </div>
  )
}
