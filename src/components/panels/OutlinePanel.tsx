import React from 'react'
import { useEditorStore } from '../../store/editorStore'

interface OutlineItem {
  level: number
  text: string
  id: string
}

const SAMPLE_OUTLINE: OutlineItem[] = [
  { level: 1, text: 'Technical Notes', id: 'h1-1' },
  { level: 2, text: 'Project Planning', id: 'h2-1' },
  { level: 3, text: '核心功能', id: 'h3-1' },
  { level: 3, text: '技术栈', id: 'h3-2' },
  { level: 2, text: 'Next Steps', id: 'h2-2' },
  { level: 3, text: 'AI 代理服务器', id: 'h3-3' },
  { level: 3, text: 'LLM API 接入', id: 'h3-4' },
  { level: 3, text: '桌面应用打包', id: 'h3-5' },
]

export const OutlinePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)

  const handleJump = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <div className="settings-icon">
              <span className="remix ri-list-unordered"></span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>大纲</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Outline • {SAMPLE_OUTLINE.length} 章节</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="settings-body" style={{ padding: 8 }}>
          {SAMPLE_OUTLINE.map(item => (
            <div
              key={item.id}
              className="settings-nav-item"
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: 6,
                marginLeft: `${(item.level - 1) * 16}px`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onClick={() => handleJump(item.id)}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="remix ri-checkbox-fill"></span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
