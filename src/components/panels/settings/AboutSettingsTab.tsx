import React from 'react'
import { UiTip } from '../../ui'
import { APP_VERSION } from '../../../shared/version'

const VERSION = APP_VERSION

// 关于卡片 —— 参考 lzmail AboutSettings 实现：居中竖排、无面包屑页头
// logo 徽标 → 品牌名 → slogan → Unofficial 标签 → 版本 → 单个居中 GitHub 图标 → 版权
export const AboutSettingsTab: React.FC = () => {
  const year = new Date().getFullYear()

  return (
    <>
      <div className="about-card">
        {/* Logo 徽标 */}
        <div className="about-badge">
          <img src="/logo.svg" alt="懒猫编辑器" width={52} height={52} />
        </div>

        {/* 品牌名 */}
        <div className="about-name">懒猫编辑器</div>

        {/* Slogan */}
        <div className="about-slogan">AI Markdown 编辑器 · 轻文档写作与导出</div>

        {/* Unofficial 标签 */}
        <div className="about-unofficial">Unofficial Web Client</div>

        {/* 版本 */}
        <div className="about-version">版本：v{VERSION}</div>

        {/* GitHub 图标链接 */}
        <UiTip text="访问 GitHub 仓库" placement="bottom">
          <a
            href="https://github.com/sikenali/lzeditor"
            className="about-github"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="访问 GitHub 仓库"
          >
            <span className="remix ri-github-line"></span>
          </a>
        </UiTip>

        {/* 版权 */}
        <div className="about-copy">© {year} 懒猫编辑器 · sikenali</div>
      </div>
    </>
  )
}
