import React from 'react'

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    className={`toggle-checkbox ${checked ? 'active' : ''}`}
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
  >
    <span className="toggle-checkbox-box">
      <span className="remix ri-check-line"></span>
    </span>
  </button>
)

export const ToggleRow: React.FC<{ icon: string; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }> = ({ icon, title, desc, checked, onChange }) => (
  <div className="toggle-row">
    <div className="toggle-row-left">
      <span className={`remix toggle-icon ${icon}`} style={{ fontSize: 16 }}></span>
      <div className="toggle-text"><span className="toggle-title">{title}</span><span className="toggle-desc">{desc}</span></div>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
)
