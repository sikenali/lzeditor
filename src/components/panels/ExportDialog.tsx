import React, { useState } from 'react'

const EXPORT_FORMATS = [
  { id: 'pdf', name: 'PDF', icon: '\uECFC', desc: '适合打印和分享' },
  { id: 'html', name: 'HTML', icon: '\uEE40', desc: '网页格式' },
  { id: 'docx', name: 'Word', icon: '\uED1A', desc: 'Office 文档' },
  { id: 'md', name: 'Markdown', icon: '\uEF1D', desc: '纯文本源码' },
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
            <div className="export-icon" style={{ background: 'rgba(16,40,31,1)', borderRadius: 8 }}>
              <span className="remix" style={{ fontSize: 17, color: 'var(--accent-primary)' }}>{'\uEC54'}</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(242,248,251,1)' }}>导出文档</div>
              <div style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>选择格式和选项</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix" style={{ fontSize: 19, color: 'rgba(92,106,120,1)' }}>{'\uEB99'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="export-body">
          {/* Format selection */}
          <div className="export-section">
            <div className="export-section-header">
              <span style={{ fontSize: 13, color: 'rgba(199,211,222,1)' }}>导出格式</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(42,36,16,1)', borderRadius: 4, padding: '2px 8px' }}>
                <span className="remix" style={{ fontSize: 11, color: 'rgba(255,228,92,1)' }}>{'\uEE59'}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,228,92,1)' }}>推荐 PDF</span>
              </div>
            </div>
            <div className="format-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              {EXPORT_FORMATS.map(fmt => (
                <button
                  key={fmt.id}
                  className={`format-card ${selectedFormat === fmt.id ? 'active' : ''}`}
                  onClick={() => setSelectedFormat(fmt.id)}
                >
                  <span className="remix format-icon" style={{ fontSize: 24, color: selectedFormat === fmt.id ? 'var(--accent-primary)' : 'rgba(127,191,162,1)' }}>{fmt.icon}</span>
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
              <span style={{ fontSize: 13, color: 'rgba(199,211,222,1)' }}>导出选项</span>
            </div>
            <ToggleOption
              icon="\uEE58"
              label="包含目录"
              desc="在开头自动插入文档目录"
              checked={includeTOC}
              onChange={setIncludeTOC}
            />
            <div className="export-divider" />
            <ToggleOption
              icon="\uEE58"
              label="显示行号"
              desc="代码块中显示行号"
              checked={includeLineNumbers}
              onChange={setIncludeLineNumbers}
            />
            <div className="export-divider" />
            <ToggleOption
              icon="\uEE58"
              label="页码"
              desc="在每页底部添加页码"
              checked={includePageNumbers}
              onChange={setIncludePageNumbers}
            />
          </div>

          {/* Save location */}
          <div className="export-section">
            <div className="export-section-header">
              <span style={{ fontSize: 13, color: 'rgba(199,211,222,1)' }}>保存位置</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span className="remix" style={{ fontSize: 14, color: 'rgba(127,191,162,1)' }}>\uECE0</span>
              <span style={{ fontSize: 12, color: 'rgba(155,169,182,1)', flex: 1 }}>~/Documents/technical-notes.md</span>
              <button style={{ fontSize: 11, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>浏览...</button>
            </div>
          </div>

          {/* Preview */}
          <div className="export-section" style={{ background: 'rgba(13,20,28,1)', borderRadius: 8, padding: 12 }}>
            <div className="export-section-header">
              <span style={{ fontSize: 13, color: 'rgba(199,211,222,1)' }}>预览 · 第 1 页 / 共 4 页</span>
              <span style={{ fontSize: 11, color: 'rgba(111,125,138,1)' }}>A4 · 纵向 · 页边距 24mm · 样式集 Ocean</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 63, height: 80, background: 'rgba(22,29,38,1)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="remix" style={{ fontSize: 20, color: 'rgba(127,191,162,1)' }}>{selected.icon}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(242,248,251,1)' }}>{selected.name} 格式</div>
                <div style={{ fontSize: 11, color: 'rgba(111,125,138,1)', marginTop: 4 }}>
                  technical-notes.md · 1399 词
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="export-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="remix" style={{ fontSize: 14, color: 'rgba(127,191,162,1)' }}>{'\uEE59'}</span>
            <span style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>导出不会修改原文档</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="settings-cancel-btn" onClick={onClose}>取消</button>
            <button className="settings-save-btn" style={{ background: 'rgba(57,255,158,1)', color: 'rgba(6,36,23,1)' }}>
              <span className="remix" style={{ fontSize: 15, marginRight: 4 }}>{'\uEC54'}</span>
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
      <span className="remix" style={{ fontSize: 16, color: 'rgba(127,191,162,1)' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, color: 'rgba(199,211,222,1)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'rgba(111,125,138,1)' }}>{desc}</div>
      </div>
    </div>
    <button
      className={`toggle-btn ${checked ? 'active' : ''}`}
      onClick={() => onChange(!checked)}
      style={{ width: 36, height: 20, borderRadius: 10, background: checked ? 'var(--accent-primary)' : 'rgba(38,49,60,1)', display: 'flex', alignItems: 'center', padding: 2, cursor: 'pointer', border: 'none' }}
    >
      <span style={{ width: 16, height: 16, borderRadius: 8, background: 'white', transform: checked ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.15s' }} />
    </button>
  </div>
)
