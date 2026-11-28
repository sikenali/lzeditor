import React from 'react'
import { APP_VERSION } from '../../../shared/version'

const VERSION = APP_VERSION

// 关于卡片 —— 参考 lzmail AboutSettings 实现：居中竖排、无面包屑页头
// logo 徽标 → 品牌名 → slogan → 版本 → 帮助/反馈/隐私入口 → 版权
export const AboutSettingsTab: React.FC = () => {
  const year = new Date().getFullYear()

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

    </>
  )
}
