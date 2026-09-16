import React, { useState } from 'react'

const EXPORT_FORMATS = [
  { id: 'pdf', name: 'PDF', icon: 'ri-file-pdf-fill', desc: '适合打印和分享' },
  { id: 'html', name: 'HTML', icon: 'ri-html5-fill', desc: '网页格式' },
  { id: 'docx', name: 'Word', icon: 'ri-file-word-2-fill', desc: 'Office 文档' },
  { id: 'md', name: 'Markdown', icon: 'ri-markdown-fill', desc: '纯文本源码' },
]

interface ExportDialogProps {
  onClose: () => void
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf')
  const [includeTOC, setIncludeTOC] = useState(true)
  const [includeLineNumbers, setIncludeLineNumbers] = useState(false)
  const [includePageNumbers, setIncludePageNumbers] = useState(true)
  const [styleSet, setStyleSet] = useState('ocean')

  const selected = EXPORT_FORMATS.find(f => f.id === selectedFormat)!

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="export-header">
          <div className="export-title">
            <div className="export-icon" style={{ background: 'var(--success-bg)', borderRadius: 8 }}>
              <span className="remix ri-download-2-line"></span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>导出文档</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>选择格式和选项</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        {/* Body */}
        <div className="export-body">
          {/* Format selection */}
          <div className="export-section">
            <div className="export-section-header">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>导出格式</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--note-bg)', borderRadius: 4, padding: '2px 8px' }}>
                <span className="remix ri-bookmark-fill"></span>
                <span style={{ fontSize: 11, color: 'var(--amber)' }}>推荐 PDF</span>
              </div>
            </div>
            <div className="format-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              {EXPORT_FORMATS.map(fmt => (
                <button
                  key={fmt.id}
                  className={`format-card ${selectedFormat === fmt.id ? 'active' : ''}`}
                  onClick={() => setSelectedFormat(fmt.id)}
                >
                  <span className={`remix format-icon ${fmt.icon}`} style={{ fontSize: 24, color: selectedFormat === fmt.id ? 'var(--accent-primary)' : 'var(--green-accent-soft)' }}></span>
                  <div>
                    <div className="format-name">{fmt.name}</div>
                    <div className="format-desc">{fmt.desc}</div>
                  </div>
                  <div className={`format-radio ${selectedFormat === fmt.id ? 'checked' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Export options */}
          <div className="export-section">
            <div className="export-section-header">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>导出选项</span>
            </div>
            <ToggleOption
              icon="ri-information-fill"
              label="包含目录"
              desc="在开头自动插入文档目录"
              checked={includeTOC}
              onChange={setIncludeTOC}
            />
            <div className="export-divider" />
            <ToggleOption
              icon="ri-information-fill"
              label="显示行号"
              desc="代码块中显示行号"
              checked={includeLineNumbers}
              onChange={setIncludeLineNumbers}
            />
            <div className="export-divider" />
            <ToggleOption
              icon="ri-information-fill"
              label="页码"
              desc="在每页底部添加页码"
              checked={includePageNumbers}
              onChange={setIncludePageNumbers}
            />
          </div>

          {/* Save location */}
          <div className="export-section">
            <div className="export-section-header">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>保存位置</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span className="remix ri-file-text-fill"></span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>~/Documents/technical-notes.md</span>
              <button style={{ fontSize: 11, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>浏览...</button>
            </div>
          </div>

          {/* Preview */}
          <div className="export-section" style={{ background: 'var(--bg-code)', borderRadius: 8, padding: 12 }}>
            <div className="export-section-header">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>预览 · 第 1 页 / 共 4 页</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>A4 · 纵向 · 页边距 24mm · 样式集 Ocean</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 63, height: 80, background: 'var(--bg-elevated)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className={`remix ${selected.icon}`} style={{ fontSize: 20, color: 'var(--green-accent-soft)' }}></span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-heading)' }}>{selected.name} 格式</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  technical-notes.md · 1399 词
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="export-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="remix ri-bookmark-fill"></span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>导出不会修改原文档</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="settings-cancel-btn" onClick={onClose}>取消</button>
            <button className="settings-save-btn" style={{ background: 'var(--accent-primary)', color: 'var(--text-on-accent)' }}>
              <span className="remix ri-download-2-line"></span>
              导出 {selected.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ToggleOption: React.FC<{ icon: string; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }> = ({ icon, label, desc, checked, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="remix" style={{ fontSize: 16, color: 'var(--green-accent-soft)' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
      </div>
    </div>
    <button
      className={`toggle-btn ${checked ? 'active' : ''}`}
      onClick={() => onChange(!checked)}
      style={{ width: 36, height: 20, borderRadius: 10, background: checked ? 'var(--accent-primary)' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', padding: 2, cursor: 'pointer', border: 'none' }}
    >
      <span style={{ width: 16, height: 16, borderRadius: 8, background: 'white', transform: checked ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.15s' }} />
    </button>
  </div>
)
