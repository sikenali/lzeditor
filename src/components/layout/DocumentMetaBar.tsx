import React from 'react'
import { useEditorStore } from '../../store/editorStore'

export const DocumentMetaBar: React.FC = () => {
  const docPath = useEditorStore((s: any) => s.docPath)
  const syncStatus = useEditorStore((s: any) => s.syncStatus)

  return (
    <div className="document-meta-bar">
      <div className="meta-item path">
        <span className="remix" style={{ fontSize: 14, color: 'rgba(57, 255, 158, 1)' }}></span>
        <span style={{ fontSize: 12, color: 'rgba(155, 169, 182, 1)' }}>{docPath || '~/Documents/technical-notes.md'}</span>
      </div>
      <div className="meta-divider" />
      <div className="meta-item badge badge-markdown">
        <span className="remix" style={{ fontSize: 12, color: 'rgba(255, 228, 92, 1)' }}></span>
        <span style={{ fontSize: 11, color: 'rgba(255, 228, 92, 1)' }}>Markdown</span>
      </div>
      <div className="meta-divider" />
      <div className={`meta-item badge badge-${syncStatus}`}>
        <span className="remix" style={{ fontSize: 12, color: 'rgba(57, 255, 158, 1)' }}></span>
        <span style={{ fontSize: 11, color: 'rgba(57, 255, 158, 1)' }}>{syncStatus === 'synced' ? '已同步' : syncStatus === 'saving' ? '保存中' : '错误'}</span>
      </div>
    </div>
  )
}
