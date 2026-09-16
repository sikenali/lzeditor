import React from 'react'

interface SupSubDropdownProps {
  open: boolean
  onToggle: (v: boolean) => void
  onSup: () => void
  onSub: () => void
}

export const SupSubDropdown: React.FC<SupSubDropdownProps> = ({ open, onToggle, onSup, onSub }) => (
  <div className="toolbar-dd-wrap">
    <button className="toolbar-btn" onClick={() => onToggle(!open)} title="角标">
      <span className="remix toolbar-icon ri-superscript"></span>
      <span className="toolbar-label">角标</span>
    </button>
    <span
      className={`remix toolbar-dd-arrow ${open ? 'open' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle(!open) }}
      style={{ cursor: 'pointer' }}
    >▶</span>
    {open && (
      <div className="toolbar-dropdown">
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
