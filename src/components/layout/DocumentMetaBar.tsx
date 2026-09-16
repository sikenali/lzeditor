import React from 'react'
import { useEditorStore } from '../../store/editorStore'

export const DocumentMetaBar: React.FC = () => {
  const docPath = useEditorStore((s: any) => s.docPath)
  const syncStatus = useEditorStore((s: any) => s.syncStatus)

  return (
    <div className="document-meta-bar">
      <div className="meta-item path">
        <span className="remix" style={{ fontSize: 14, color: 'var(--accent)' }}>\uED0E</span>
        <span style={{ fontSize: 12, color: 'var(--foreground-secondary)' }}>{docPath || '~/Documents/technical-notes.md'}</span>
      </div>
      <div className="meta-divider" />
      <div className="meta-item badge badge-markdown">
        <span className="remix" style={{ fontSize: 12, color: 'var(--amber)' }}>\uF023</span>
        <span style={{ fontSize: 11, color: 'var(--amber)' }}>Markdown</span>
      </div>
      <div className="meta-divider" />
      <div className={`meta-item badge badge-${syncStatus}`}>
        <span className="remix" style={{ fontSize: 12, color: 'var(--accent)' }}>\uEB82</span>
        <span style={{ fontSize: 11, color: 'var(--accent)' }}>{syncStatus === 'synced' ? '已同步' : syncStatus === 'saving' ? '保存中' : '错误'}</span>
      </div>
    </div>
  )
}
