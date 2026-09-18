import React, { useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const DocumentMetaBar: React.FC = () => {
  const docTitle = useEditorStore((s: any) => s.docTitle)
  const docPath = useEditorStore((s: any) => s.docPath)
  const wordCount = useEditorStore((s: any) => s.wordCount)
  const charCount = useEditorStore((s: any) => s.charCount)
  const syncStatus = useEditorStore((s: any) => s.syncStatus)
  const lastEditTime = useEditorStore((s: any) => s.lastEditTime)

  const displayName = useMemo(() => {
    if (docPath) return docPath
    const title = docTitle || 'untitled'
    return title.endsWith('.md') ? title : `${title}.md`
  }, [docPath, docTitle])

  const lastEdited = useMemo(() => {
    if (!lastEditTime) return null
    const now = Date.now()
    const diff = now - lastEditTime
    if (diff < 60_000) return '刚刚'
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
    return new Date(lastEditTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }, [lastEditTime])

  const statusLabel = syncStatus === 'synced' ? '已同步' : syncStatus === 'saving' ? '保存中' : '错误'
  const statusIcon = syncStatus === 'synced' ? 'ri-check-line' : syncStatus === 'saving' ? 'ri-loader-4-line' : 'ri-error-warning-line'

  return (
    <div className="document-meta-bar">
      {/* 文件名 */}
      <div className="meta-item path">
        <span className="remix ri-file-text-line" style={{ fontSize: 13 }}></span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{displayName}</span>
      </div>
      <div className="meta-divider" />
      {/* 语言 */}
      <div className="meta-item badge badge-markdown">
        <span className="remix ri-markdown-fill"></span>
        <span style={{ fontSize: 11, color: 'var(--amber)' }}>Markdown</span>
      </div>
      <div className="meta-divider" />
      {/* 字数 */}
      <div className="meta-item badge">
        <span className="remix ri-text-spacing" style={{ fontSize: 12 }}></span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wordCount} 字</span>
      </div>
      <div className="meta-divider" />
      {/* 字符 */}
      <div className="meta-item badge">
        <span className="remix ri-character-recognition-line" style={{ fontSize: 12 }}></span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{charCount} 字符</span>
      </div>
      {lastEdited && (
        <>
          <div className="meta-divider" />
          <div className="meta-item badge">
            <span className="remix ri-clock-line" style={{ fontSize: 12 }}></span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lastEdited}</span>
          </div>
        </>
      )}
      <div className="meta-divider" />
      {/* 同步状态 */}
      <div className={`meta-item badge badge-${syncStatus}`}>
        <span className={`remix ${statusIcon}`} style={{ fontSize: 12 }}></span>
        <span style={{ fontSize: 11, color: 'var(--accent-primary)' }}>{statusLabel}</span>
      </div>
    </div>
  )
}
