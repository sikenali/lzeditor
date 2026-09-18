import React, { useMemo, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const DocumentMetaBar: React.FC = () => {
  const docs = useEditorStore((s: any) => s.docs)
  const activeDocId = useEditorStore((s: any) => s.activeDocId)
  const switchDoc = useEditorStore((s: any) => s.switchDoc)
  const closeDoc = useEditorStore((s: any) => s.closeDoc)
  const wordCount = useEditorStore((s: any) => s.wordCount)
  const charCount = useEditorStore((s: any) => s.charCount)
  const syncStatus = useEditorStore((s: any) => s.syncStatus)
  const lastEditTime = useEditorStore((s: any) => s.lastEditTime)

  const activeDoc = docs.find((d: any) => d.id === activeDocId) || docs[0]

  const displayName = useMemo(() => {
    if (!activeDoc) return 'untitled.md'
    if (activeDoc.path) return activeDoc.path
    const title = activeDoc.title || 'untitled'
    return title.endsWith('.md') ? title : `${title}.md`
  }, [activeDoc])

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

  const [hoveredTab, setHoveredTab] = useState<string | null>(null)

  return (
    <div className="document-meta-bar">
      {/* Tab bar */}
      <div className="meta-tabs">
        {docs.map((doc: { id: string; title: string }) => {
          const isActive = doc.id === activeDocId
          const isHovered = hoveredTab === doc.id
          return (
            <div
              key={doc.id}
              className={`meta-tab ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
              onClick={() => switchDoc(doc.id)}
              onMouseEnter={() => setHoveredTab(doc.id)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <span className="remix ri-file-text-line meta-tab-icon"></span>
              <span className="meta-tab-title">{doc.title}</span>
              {docs.length > 1 && (
                <button
                  className="meta-tab-close"
                  onClick={(e) => { e.stopPropagation(); closeDoc(doc.id) }}
                  title="关闭"
                >
                  <span className="remix ri-close-line"></span>
                </button>
              )}
            </div>
          )
        })}
        {/* New tab button */}
        <button className="meta-tab-new" title="新建文档" onClick={() => {
          const { createDoc } = useEditorStore.getState()
          const id = createDoc(`untitled-${Date.now().toString(36)}.md`)
          const editor = useEditorStore.getState().editor
          if (editor) editor.chain().focus().clearContent().run()
        }}>
          <span className="remix ri-add-line"></span>
        </button>
      </div>

      {/* Meta info */}
      <div className="meta-info">
        <div className="meta-item badge badge-markdown">
          <span className="remix ri-markdown-fill"></span>
          <span style={{ fontSize: 11, color: 'var(--amber)' }}>Markdown</span>
        </div>
        <div className="meta-divider" />
        <div className="meta-item badge">
          <span className="remix ri-text-spacing" style={{ fontSize: 12 }}></span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wordCount} 字</span>
        </div>
        <div className="meta-divider" />
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
        <div className={`meta-item badge badge-${syncStatus}`}>
          <span className={`remix ${statusIcon}`} style={{ fontSize: 12 }}></span>
          <span style={{ fontSize: 11, color: 'var(--accent-primary)' }}>{statusLabel}</span>
        </div>
      </div>
    </div>
  )
}
