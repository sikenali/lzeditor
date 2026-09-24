import React from 'react'
import { UnifiedDialog, UDSection } from '../ui/UnifiedDialog'

export const CATEGORIES = [
  { id: 'docs', label: '文档库', icon: 'ri-folder-fill', desc: '本地 MD 文件目录' },
  { id: 'git', label: 'Git 仓库', icon: 'ri-git-repository-line', desc: '导入 Git 仓库中的 MD 文件' },
  { id: 'blog', label: '博客', icon: 'ri-article-fill', desc: '在线博客同步' },
  { id: 'gitbook', label: 'GitBook', icon: 'ri-book-mark-fill', desc: '导入 GitBook 文档' },
] as const

interface ImportButtonsProps {
  category: string
  onImportGit: () => void
  onImportBlog: () => void
  onImportGitbook: () => void
}

export const ImportButtons: React.FC<ImportButtonsProps> = ({ category, onImportGit, onImportBlog, onImportGitbook }) => {
  const categoryMeta = CATEGORIES.find(c => c.id === category) || CATEGORIES[0]

  if (category === 'git') {
    return (
      <UDSection label="导入 Git 仓库">
        <div className="library-empty-state">
          <span className="remix ri-git-repository-line library-empty-icon"></span>
          <div className="library-empty-title">导入 Git 仓库</div>
          <div className="library-empty-desc">支持 GitHub、GitLab、Gitee 等 Git 仓库中的 Markdown 文件</div>
          <button className="settings-save-btn" style={{ marginTop: 16 }} onClick={onImportGit}>
            <span className="remix ri-git-repository-line"></span>
            <span>连接 Git 仓库</span>
          </button>
        </div>
      </UDSection>
    )
  }

  if (category === 'blog') {
    return (
      <UDSection label="导入博客">
        <div className="library-empty-state">
          <span className="remix ri-article-fill library-empty-icon"></span>
          <div className="library-empty-title">导入博客</div>
          <div className="library-empty-desc">从 WordPress、Hexo、Hugo 等博客平台导入文章</div>
          <button className="settings-save-btn" style={{ marginTop: 16 }} onClick={onImportBlog}>
            <span className="remix ri-global-line"></span>
            <span>连接博客</span>
          </button>
        </div>
      </UDSection>
    )
  }

  if (category === 'gitbook') {
    return (
      <UDSection label="导入 GitBook">
        <div className="library-empty-state">
          <span className="remix ri-book-mark-fill library-empty-icon"></span>
          <div className="library-empty-title">导入 GitBook</div>
          <div className="library-empty-desc">从 GitBook 文档站点导入文章和目录结构</div>
          <button className="settings-save-btn" style={{ marginTop: 16 }} onClick={onImportGitbook}>
            <span className="remix ri-book-line"></span>
            <span>连接 GitBook</span>
          </button>
        </div>
      </UDSection>
    )
  }

  return null
}

export const leftNav = (category: string, setCategory: (c: string) => void) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    {CATEGORIES.map(c => (
      <button key={c.id} className={`ud-chip${category === c.id ? ' active' : ''}`} onClick={() => setCategory(c.id)}>
        <span className={`remix ud-chip-icon ${c.icon}`}></span>
        <div><div className="ud-chip-label">{c.label}</div><div className="ud-chip-desc">{c.desc}</div></div>
      </button>
    ))}
  </div>
)
