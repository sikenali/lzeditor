import React from 'react'
import { useEditorStore } from '../../store/editorStore'

export const DocumentMetaBar: React.FC = () => {
  const docPath = useEditorStore((s: any) => s.docPath)
  const syncStatus = useEditorStore((s: any) => s.syncStatus)

  return (
    <div className="document-meta-bar">
      <div className="meta-item path">
        <span className="remix ri-map-pin-fill"></span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{docPath || '~/Documents/technical-notes.md'}</span>
      </div>
      <div className="meta-divider" />
      <div className="meta-item badge badge-markdown">
        <span className="remix ri-markdown-fill"></span>
        <span style={{ fontSize: 11, color: 'var(--amber)' }}>Markdown</span>
      </div>
      <div className="meta-divider" />
      <div className={`meta-item badge badge-${syncStatus}`}>
        <span className="remix ri-file-text-fill"></span>
        <span style={{ fontSize: 11, color: 'var(--accent-primary)' }}>{syncStatus === 'synced' ? '已同步' : syncStatus === 'saving' ? '保存中' : '错误'}</span>
      </div>
    </div>
  )
}
