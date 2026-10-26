import React from 'react'
import { useEditorStore } from '../../../store/editorStore'

const MANUAL_DOC_ID = 'a01-特色功能'
import { APP_VERSION } from '../../../shared/version'

const VERSION = APP_VERSION

export const AboutSettingsTab: React.FC = () => {
  const year = new Date().getFullYear()

  // 「文档」在编辑器内打开内置使用手册的第一篇
  const handleOpenManual = () => {
    const s = useEditorStore.getState()
    if (s.docs.some((d: any) => d.id === MANUAL_DOC_ID)) s.switchDoc(MANUAL_DOC_ID)
    s.setAppMode('edit')
    s.setOpenPanel('none')
  }

  return (
    <>
      {/* 页面头部卡片（bid-maker .page-header-card） */}
      <div className="page-header-card">
        <div className="page-header-content">
          <div className="page-header-info">
            <div className="page-breadcrumb">
              <span>首页</span>
              <span className="sep">/</span>
              <span>设置中心</span>
              <span className="sep">/</span>
              <span className="current">关于</span>
            </div>
            <div className="page-header-title">
              <h1>关于</h1>
              <p>版本信息、开源仓库与版权声明</p>
            </div>
          </div>
        </div>
      </div>

      {/* 品牌信息卡片（bid-maker .about-card） */}
      <div className="about-card">
        <div className="about-badge">
          <img src="/logo.svg" alt="懒猫编辑器" style={{ width: 58, height: 58, borderRadius: 14 }} />
        </div>
        <div className="about-name">懒猫编辑器</div>
        <div className="about-slogan">AI Markdown 编辑器 · 轻文档写作与导出</div>
        <div className="about-version">版本：v{VERSION}</div>

        <div className="about-links">
          <a href="https://github.com/sikenali/lzeditor" className="about-link" target="_blank" rel="noopener noreferrer">
            <span className="remix ri-github-fill"></span> GitHub
          </a>
          <span className="about-sep">·</span>
          <button type="button" className="about-link" onClick={handleOpenManual}>
            <span className="remix ri-book-open-line"></span> 文档
          </button>
          <span className="about-sep">·</span>
          <a href="https://github.com/sikenali/lzeditor/issues" className="about-link" target="_blank" rel="noopener noreferrer">
            <span className="remix ri-feedback-line"></span> 反馈
          </a>
          <span className="about-sep">·</span>
          <a href="/licenses/THIRD_PARTY_NOTICES.md" className="about-link" target="_blank" rel="noopener noreferrer">
            <span className="remix ri-file-text-line"></span> 开源许可
          </a>
        </div>

        <div className="about-copy">
          © {year} 懒猫编辑器 Powered by <a href="https://lazycat.cloud/" target="_blank" rel="noopener noreferrer">LightOS</a>
        </div>
      </div>
    </>
  )
}
