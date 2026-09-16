import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

const FILE_TEMPLATES = [
  { id: 'blank', name: '空白文档', desc: '从头开始' },
  { id: 'markdown', name: 'Markdown 模板', desc: '标准 Markdown 结构' },
  { id: 'report', name: '技术报告', desc: '带章节的长文档' },
  { id: 'notes', name: '会议记录', desc: '日程与待办' },
]

export const FilePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const setDocPath = useEditorStore((s: any) => s.setDocPath)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const [searchText, setSearchText] = useState('')

  const handleCreate = (templateId: string) => {
    const names: Record<string, string> = {
      blank: 'untitled.md',
      markdown: 'markdown-template.md',
      report: 'technical-report.md',
      notes: 'meeting-notes.md',
    }
    setTitle(names[templateId] || 'untitled.md')
    setDocPath('')
    setOpenPanel('none')
    onClose()
  }

  const handleOpen = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.txt,.markdown'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (file) {
        setTitle(file.name)
        setDocPath(file.name)
        setOpenPanel('none')
      }
    }
    input.click()
  }

  const filtered = FILE_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.desc.toLowerCase().includes(searchText.toLowerCase())
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <div className="settings-icon">
              <span className="remix ri-file-list-2-line"></span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>文件</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>File • 新建或打开文档</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="settings-body">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="搜索模板..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                padding: '6px 12px',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button className="settings-save-btn" onClick={handleOpen} style={{ whiteSpace: 'nowrap' }}>
              <span className="remix ri-open-arm-line"></span>打开
            </button>
          </div>

          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {filtered.map(t => (
              <div
                key={t.id}
                className="settings-nav-item"
                style={{ padding: 16, cursor: 'pointer', borderRadius: 8, border: '1px solid var(--border-color)' }}
                onClick={() => handleCreate(t.id)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)'
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-color)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <span className="remix ri-file-text-fill"></span>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-heading)', marginTop: 8 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
