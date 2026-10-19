import React from 'react'
import { TYPOGRAPHY_THEMES, applyTypographyTheme } from '../../../styles/typography-themes'

export const ContentStyleTab: React.FC<{ s: any; u: any }> = ({ s, u }) => {
  const activeId = s.typographyTheme || 'classic'
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>内容样式</span></div>
      <div className="theme-grid">
        {TYPOGRAPHY_THEMES.map(t => (
          <button
            key={t.id}
            className={`theme-card ${activeId === t.id ? 'active' : ''}`}
            onClick={() => { applyTypographyTheme(t.id); u('typographyTheme', t.id) }}
          >
            <div
              className="theme-preview typography-preview"
              style={{ background: t.id === 'night' ? '#1a1b26' : t.id === 'magazine' || t.id === 'ink' ? '#fff' : '#fafafa', minHeight: 80 }}
            >
              <div style={{ padding: '6px 8px', fontSize: 9, lineHeight: 1.5, color: t.id === 'night' ? '#c6cade' : '#333' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: t.color, marginBottom: 2 }}>标题示例</div>
                <div style={{ fontSize: 8, color: 'rgba(128,128,128,0.7)', borderBottom: `1px solid ${t.color}33`, paddingBottom: 2, marginBottom: 2 }}>二级标题装饰线</div>
                <div style={{ fontSize: 8, color: 'rgba(128,128,128,0.6)' }}>正文文字 · <code style={{ background: `${t.color}18`, color: t.color, padding: '0 3px', borderRadius: 2, fontSize: 7 }}>行内代码</code></div>
                <div style={{ fontSize: 8, color: 'rgba(128,128,128,0.5)', marginTop: 2 }}>引用文字样例</div>
              </div>
            </div>
            <span className="theme-name">{t.name}</span>
            <span className="theme-tag" style={{ color: t.color, fontSize: 10 }}>{t.tag}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
