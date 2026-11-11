import React from 'react'
import { UDSection } from '../ui'

// 文档库的来源分类。Git 仓库 / 博客 / GitBook 的在线导入能力尚未接入
// （远程导入服务已删），当前实际支持的是从本地选择 Markdown 文件导入，
// 故 desc 与按钮文案都如实描述本地导入，避免「连接 X」名不副实。
export const CATEGORIES = [
  { id: 'docs', label: '文档库', icon: 'ri-folder-fill', desc: '本地 MD 文件目录' },
  { id: 'git', label: 'Git 仓库', icon: 'ri-git-repository-line', desc: '从本地 Markdown 文件导入' },
  { id: 'blog', label: '博客', icon: 'ri-article-fill', desc: '从本地 Markdown 文件导入' },
  { id: 'gitbook', label: 'GitBook', icon: 'ri-book-mark-fill', desc: '从本地 Markdown 文件导入' },
] as const

interface ImportButtonsProps {
  category: string
  onImportGit: () => void
  onImportBlog: () => void
  onImportGitbook: () => void
}

// 三个来源类别当前都走同一个本地 Markdown 导入（远程在线导入未接入）。
// 按钮文案统一为「从本地导入 Markdown」，与真实行为一致。
const LOCAL_IMPORT_LABEL = '从本地导入 Markdown'

export const ImportButtons: React.FC<ImportButtonsProps> = ({ category, onImportGit, onImportBlog, onImportGitbook }) => {
  if (category === 'git') {
    return (
      <UDSection label="导入 Git 仓库">
        <div className="library-empty-state">
          <span className="remix ri-git-repository-line library-empty-icon"></span>
          <div className="library-empty-title">导入 Git 仓库</div>
          <div className="library-empty-desc">选择本地 Markdown 文件导入文档库（在线 Git 仓库导入暂未接入）</div>
          <button className="settings-save-btn" style={{ marginTop: 16 }} onClick={onImportGit}>
            <span className="remix ri-git-repository-line"></span>
            <span>{LOCAL_IMPORT_LABEL}</span>
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
          <div className="library-empty-desc">选择本地 Markdown 文件导入文档库（WordPress / Hexo / Hugo 在线同步暂未接入）</div>
          <button className="settings-save-btn" style={{ marginTop: 16 }} onClick={onImportBlog}>
            <span className="remix ri-global-line"></span>
            <span>{LOCAL_IMPORT_LABEL}</span>
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
          <div className="library-empty-desc">选择本地 Markdown 文件导入文档库（GitBook 站点导入暂未接入）</div>
          <button className="settings-save-btn" style={{ marginTop: 16 }} onClick={onImportGitbook}>
            <span className="remix ri-book-line"></span>
            <span>{LOCAL_IMPORT_LABEL}</span>
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
