import React from 'react'

export const AboutSettingsTab: React.FC = () => {
  const year = new Date().getFullYear()
  return (
    <div className="settings-section" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div className="about-logo">
        <div className="about-logo-icon"><img src="/logo.svg" alt="logo" style={{ width: 48, height: 48 }} /></div>
      </div>
      <div className="about-title">懒猫编辑器</div>
      <div className="about-desc">AI Markdown 编辑器 · v{import.meta.env.VITE_APP_VERSION ?? '1.0.0'}</div>
      <div className="about-links">
        <a href="https://github.com/sikenali/lzeditor" className="about-link" target="_blank" rel="noopener noreferrer">GitHub</a>
        <span className="about-sep">·</span>
        <a href="#" className="about-link">文档</a>
        <span className="about-sep">·</span>
        <a href="#" className="about-link">反馈</a>
      </div>
      <div className="about-copy">© {year} 懒猫编辑器 Powered by <a href="https://lazycat.cloud/" target="_blank" rel="noopener noreferrer">LightOS</a></div>
    </div>
  )
}
