import React from 'react'
import { useEditorStore } from '../../store/editorStore'

const SAMPLE_FILES = [
  { id: '1', title: 'Technical Notes', date: '2024-05-20', size: '12 KB' },
  { id: '2', title: 'Meeting Minutes', date: '2024-05-19', size: '8 KB' },
  { id: '3', title: 'Project Roadmap', date: '2024-05-18', size: '24 KB' },
  { id: '4', title: 'API Documentation', date: '2024-05-17', size: '45 KB' },
  { id: '5', title: 'Design Spec', date: '2024-05-16', size: '18 KB' },
]

export const LibraryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const setDocPath = useEditorStore((s: any) => s.setDocPath)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)

  const handleNewFile = () => {
    setTitle('untitled.md')
    setDocPath('')
    setOpenPanel('none')
  }

  const handleOpenFile = (title: string) => {
    setTitle(title)
    setOpenPanel('none')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <div className="settings-icon">
              <span className="remix ri-archive-2-line"></span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>文档库</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Library • {SAMPLE_FILES.length} 个文件</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="settings-body" style={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
            <button className="settings-save-btn" onClick={handleNewFile} style={{ flex: 1 }}>
              <span className="remix ri-file-add-line"></span>新建文档
            </button>
            <button className="settings-cancel-btn" style={{ flex: 1 }}>
              <span className="remix ri-download-2-line"></span>导入文件
            </button>
          </div>

          <div style={{ padding: 8 }}>
            {SAMPLE_FILES.map(file => (
              <div
                key={file.id}
                className="settings-nav-item"
                style={{ padding: '10px 12px', cursor: 'pointer', borderRadius: 6, marginBottom: 4 }}
                onClick={() => handleOpenFile(file.title)}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="remix ri-file-text-fill"></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--text-heading)', fontWeight: 500 }}>{file.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{file.date} · {file.size}</div>
                  </div>
                  <span className="remix ri-arrow-right-s-line"></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
