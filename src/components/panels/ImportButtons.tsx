import React, { useState } from 'react'
import { UDSection } from '../ui'
import { toast } from '../../utils/toast'

// 文档库的来源分类。Git仓库 / 博客 / GitBook 三个来源页面优化为 2 个标签：
// 「在线导入」（仅 .md 直链）与「本地导入」（本地 Markdown 文件）。
// 远程 Git 仓库/博客/GitBook 的在线导入能力未接入，故不再单独列来源页面。
export const CATEGORIES = [
  { id: 'docs', label: '文档库', icon: 'ri-folder-fill', desc: '本地 MD 文件目录' },
  { id: 'url', label: '在线导入', icon: 'ri-link', desc: '粘贴 .md 直链导入' },
  { id: 'local', label: '本地导入', icon: 'ri-upload-2-line', desc: '从本地 Markdown 文件导入' },
] as const

interface ImportButtonsProps {
  category: string
  /** 在线导入：传入 .md 直链，异步导入（错误由组件 catch 提示）。 */
  onImportUrl: (url: string) => Promise<void>
  /** 本地导入：打开本地 Markdown 文件选择器。 */
  onImportLocal: () => void
}

export const ImportButtons: React.FC<ImportButtonsProps> = ({ category, onImportUrl, onImportLocal }) => {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUrlImport = async () => {
    if (!url.trim() || loading) return
    setLoading(true)
    try {
      await onImportUrl(url.trim())
      setUrl('')
    } catch (e: any) {
      toast(e?.message || '导入失败', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (category === 'url') {
    return (
      <UDSection label="在线导入">
        <div className="library-empty-state">
          <span className="remix ri-link library-empty-icon"></span>
          <div className="library-empty-title">在线导入</div>
          <div className="library-empty-desc">粘贴 .md 文件直链（raw.githubusercontent.com / gist 等）导入文档库</div>
          <input
            className="library-url-input"
            placeholder="https://raw.githubusercontent.com/.../README.md"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleUrlImport() }}
            disabled={loading}
          />
          <button className="settings-save-btn" style={{ marginTop: 12 }} onClick={handleUrlImport} disabled={!url.trim() || loading}>
            <span className="remix ri-download-2-line"></span>
            <span>{loading ? '导入中…' : '导入'}</span>
          </button>
        </div>
      </UDSection>
    )
  }

  if (category === 'local') {
    return (
      <UDSection label="本地导入">
        <div className="library-empty-state">
          <span className="remix ri-upload-2-line library-empty-icon"></span>
          <div className="library-empty-title">本地导入</div>
          <div className="library-empty-desc">从本地选择 Markdown 文件导入文档库（支持多选）</div>
          <button className="settings-save-btn" style={{ marginTop: 16 }} onClick={onImportLocal}>
            <span className="remix ri-folder-open-line"></span>
            <span>从本地导入 Markdown</span>
          </button>
        </div>
      </UDSection>
    )
  }

  return null
}
