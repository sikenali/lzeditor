import React from 'react'

/** Settings section (label + optional description + body). */
export const UDSection: React.FC<{ label: string; desc?: string; children: React.ReactNode; className?: string }> = ({ label, desc, children, className }) => (
  <div className={`ud-section${className ? ' ' + className : ''}`}>
    <div className="ud-section-head">
      <span className="ud-section-label">{label}</span>
      {desc && <span className="ud-section-desc">{desc}</span>}
    </div>
    <div className="ud-section-body">{children}</div>
  </div>
)

/** One labelled setting row with a trailing control. */
export const UDSettingRow: React.FC<{ icon: string; label: string; desc?: string; children: React.ReactNode }> = ({ icon, label, desc, children }) => (
  <div className="ud-setting-row">
    <div className="ud-setting-label">
      <span className={`remix ud-setting-icon ${icon}`}></span>
      <div>
        <span className="ud-setting-name">{label}</span>
        {desc && <span className="ud-setting-desc">{desc}</span>}
      </div>
    </div>
    <div className="ud-setting-control">{children}</div>
  </div>
)

/** Framed preview surface. */
export const UDPreviewCard: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => (
  <div className="ud-preview-card">
    {label && <div className="ud-preview-label">{label}</div>}
    <div className="ud-preview-body">{children}</div>
  </div>
)
