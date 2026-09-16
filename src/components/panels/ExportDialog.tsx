import React, { useState } from 'react'

const EXPORT_FORMATS = [
  { id: 'pdf', name: 'PDF', icon: '\uE883', desc: '适合打印和分享', selected: true },
  { id: 'html', name: 'HTML', icon: '\uE9C5', desc: '网页格式', selected: false },
  { id: 'docx', name: 'Word', icon: '\uF12C', desc: 'Office 文档', selected: false },
  { id: 'md', name: 'Markdown', icon: '\uF033', desc: '纯文本源码', selected: false },
]

export const ExportDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf')
  const [includeTOC, setIncludeTOC] = useState(true)
  const [includeLineNumbers, setIncludeLineNumbers] = useState(false)
  const [includePageNumbers, setIncludePageNumbers] = useState(true)
  const [styleSet, setStyleSet] = useState('ocean')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={e => e.stopPropagation()}>
        <div className="export-header">
          <div className="export-title">
            <div className="export-icon">
              <span className="remix" style={{ fontSize: 17, color: 'var(--accent-primary)' }}>\uE454</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(242,248,251,1)' }}>导出文档</div>
              <div style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>选择格式和选项</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix">\uE61C</span>
          </button>
        </div>

        <div className="export-body">
          <div className="export-section">
            <div className="export-section-header">
              <div className="export-section-dot" />
              <span className="export-section-title">导出格式</span>
            </div>
            <div className="format-grid">
              <div className="format-card-row">
                {EXPORT_FORMATS.slice(0, 2).map(fmt => (
                  <button
                    key={fmt.id}
                    className={`format-card ${selectedFormat === fmt.id ? 'active' : ''}`}
                    onClick={() => setSelectedFormat(fmt.id)}
                  >
                    <span className="remix format-icon">{fmt.icon}</span>
                    <div>
                      <div className="format-name">{fmt.name}</div>
                      <div className="format-desc">{fmt.desc}</div>
                    </div>
                    <div className={`format-radio ${selectedFormat === fmt.id ? 'checked' : ''}`} />
                  </button>
                ))}
              </div>
              <div className="format-card-row">
                {EXPORT_FORMATS.slice(2).map(fmt => (
                  <button
                    key={fmt.id}
                    className={`format-card ${selectedFormat === fmt.id ? 'active' : ''}`}
                    onClick={() => setSelectedFormat(fmt.id)}
                  >
                    <span className="remix format-icon">{fmt.icon}</span>
                    <div>
                      <div className="format-name">{fmt.name}</div>
                      <div className="format-desc">{fmt.desc}</div>
                    </div>
                    <div className={`format-radio ${selectedFormat === fmt.id ? 'checked' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="export-section">
            <div className="option-row">
              <div className="option-label">
                <span className="option-title">样式集</span>
                <span className="option-desc">决定导出文档的外观风格</span>
              </div>
              <select value={styleSet} onChange={e => setStyleSet(e.target.value)} style={{ width: 120 }}>
                <option value="ocean">Ocean</option>
                <option value="dark">Dark</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
            <div className="option-divider" />
            <div className="option-row">
              <div className="option-label">
                <span className="option-title">目录</span>
                <span className="option-desc">在开头插入文档目录</span>
              </div>
              <Toggle checked={includeTOC} onChange={setIncludeTOC} />
            </div>
            <div className="option-divider" />
            <div className="option-row">
              <div className="option-label">
                <span className="option-title">行号</span>
                <span className="option-desc">显示代码行号</span>
              </div>
              <Toggle checked={includeLineNumbers} onChange={setIncludeLineNumbers} />
            </div>
            <div className="option-divider" />
            <div className="option-row">
              <div className="option-label">
                <span className="option-title">页码</span>
                <span className="option-desc">在底部添加页码</span>
              </div>
              <Toggle checked={includePageNumbers} onChange={setIncludePageNumbers} />
            </div>
          </div>
        </div>

        <div className="export-footer">
          <div className="export-footer-hint">
            <span className="remix" style={{ fontSize: 15, color: 'rgba(127,191,162,1)' }}>\uE659</span>
            <span style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>导出不会修改原文档</span>
          </div>
          <div className="export-footer-actions">
            <button className="settings-cancel-btn" onClick={onClose}>取消</button>
            <button className="settings-save-btn">
              <span className="remix" style={{ fontSize: 12, marginRight: 4 }}>\uE613</span>
              导出
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    className={`toggle-btn ${checked ? 'active' : ''}`}
    onClick={() => onChange(!checked)}
  >
    <span className="toggle-knob" />
  </button>
)
