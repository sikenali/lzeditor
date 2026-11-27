import React, { useState } from 'react'
import { APP_VERSION } from '../../../shared/version'
import { useEditorStore } from '../../../store/editorStore'
import { UiModal, UiButton } from '../../ui'

const VERSION = APP_VERSION

// 关于卡片 —— 参考 lzmail AboutSettings 实现：居中竖排、无面包屑页头
// logo 徽标 → 品牌名 → slogan → 版本 → 帮助/反馈/隐私入口 → 版权
export const AboutSettingsTab: React.FC = () => {
  const year = new Date().getFullYear()
  const [privacyOpen, setPrivacyOpen] = useState(false)

  const openHelp = () => {
    const st = useEditorStore.getState()
    st.switchDoc('readme')
    st.setShowWelcome(false)
    st.setOpenPanel('none')
  }

  const openFeedback = () => {
    window.open('https://github.com/sikenali/lzeditor/issues', '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div className="about-card">
        {/* Logo 徽标 */}
        <div className="about-badge">
          <img src="/logo.svg" alt="懒猫编辑器" />
        </div>

        {/* 品牌名 */}
        <div className="about-name">懒猫编辑器</div>

        {/* Slogan */}
        <div className="about-slogan">一款专门为懒猫微服打造的AI Markdown 编辑器</div>

        {/* 版本 */}
        <div className="about-version">版本：v{VERSION}</div>

        {/* 帮助 / 反馈 / 隐私 */}
        <div className="about-links">
          <button type="button" className="about-link-btn" onClick={openHelp}>
            <span className="remix ri-book-open-line"></span>
            使用帮助
          </button>
          <button type="button" className="about-link-btn" onClick={openFeedback}>
            <span className="remix ri-feedback-line"></span>
            问题反馈
          </button>
          <button type="button" className="about-link-btn" onClick={() => setPrivacyOpen(true)}>
            <span className="remix ri-shield-check-line"></span>
            隐私说明
          </button>
        </div>

        {/* GitHub 图标链接：hover 不弹文字，直接手型光标、点击跳转 */}
        <a
          href="https://github.com/sikenali/lzeditor"
          className="about-github"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="访问 GitHub 仓库"
        >
          <span className="remix ri-github-line"></span>
        </a>

        {/* 版权 */}
        <div className="about-copy">© {year} 懒猫编辑器 · sikenali</div>
      </div>

      <UiModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        icon="ri-shield-check-line"
        title="隐私说明"
        width={560}
        footer={<UiButton onClick={() => setPrivacyOpen(false)}>知道了</UiButton>}
      >
        <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--color-text-body)' }}>
          <p><b>数据存储</b>：文档、设置与历史版本保存在本机浏览器存储中；桌面端保存文件时写入你选择的磁盘路径。</p>
          <p style={{ marginTop: 8 }}><b>API Key</b>：仅保存在本机，不会上传到任何中转服务；AI 请求由浏览器直连你配置的服务商。</p>
          <p style={{ marginTop: 8 }}><b>图片</b>：本地上传的图片默认以 base64 内嵌，不经过网络；只有你勾选「上传到第三方图床」时才会发送到 imgant.com。</p>
          <p style={{ marginTop: 8 }}><b>备份</b>：导出的备份文件包含文档、设置与 API Key，请自行妥善保管。</p>
        </div>
      </UiModal>
    </>
  )
}
