import React, { useState } from 'react'

const EXPORT_FORMATS = [
  { id: 'pdf', name: 'PDF', icon: 'ri-file-pdf-fill', desc: '适合打印和分享' },
  { id: 'html', name: 'HTML', icon: 'ri-html5-fill', desc: '网页格式' },
  { id: 'docx', name: 'Word', icon: 'ri-file-word-2-fill', desc: 'Office 文档' },
  { id: 'md', name: 'Markdown', icon: 'ri-markdown-fill', desc: '纯文本源码' },
]

const STYLE_SETS = ['Ocean', 'Dark', 'Minimal', 'Candy']

interface ExportDialogProps {
  onClose: () => void
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf')
  const [includeTOC, setIncludeTOC] = useState(true)
  const [showMarkdownMarkers, setShowMarkdownMarkers] = useState(false)
  const [includePageNumbers, setIncludePageNumbers] = useState(true)
  const [styleSet, setStyleSet] = useState('Ocean')

  const selected = EXPORT_FORMATS.find(f => f.id === selectedFormat)!

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="export-header">
          <div className="export-title">
            <div className="export-icon">
              <span className="remix ri-download-2-line"></span>
            </div>
            <div>
              <div className="export-title-text">导出文档</div>
              <div className="export-title-desc">选择格式和选项</div>
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
              <span className="export-section-label">导出格式</span>
              <span className="export-recommend-badge">
                <span className="remix ri-bookmark-fill"></span>
                <span>推荐 PDF</span>
              </span>
            </div>
            <div className="format-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              {EXPORT_FORMATS.map(fmt => (
                <button
                  key={fmt.id}
                  className={`format-card ${selectedFormat === fmt.id ? 'active' : ''}`}
                  onClick={() => setSelectedFormat(fmt.id)}
                >
                  <span className={`remix format-icon ${fmt.icon}`}></span>
                  <div>
                    <div className="format-name">{fmt.name}</div>
                    <div className="format-desc">{fmt.desc}</div>
                  </div>
                  <div className={`format-radio ${selectedFormat === fmt.id ? 'checked' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Style set selector */}
          <div className="export-section">
            <div className="export-section-header">
              <span className="export-section-label">样式集</span>
            </div>
            <div className="style-set-row">
              {STYLE_SETS.map(s => (
                <button
                  key={s}
                  className={`style-set-btn ${styleSet === s ? 'active' : ''}`}
                  onClick={() => setStyleSet(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Export options */}
          <div className="export-section">
            <div className="export-section-header">
              <span className="export-section-label">导出选项</span>
            </div>
            <ToggleOption
              icon="ri-archive-fill"
              title="套用样式集"
              desc="使用当前 Ocean 主题排版"
              checked={true}
              onChange={() => {}}
              disabled
            />
            <div className="export-divider" />
            <ToggleOption
              icon="ri-bookmark-fill"
              title="生成目录"
              desc="根据标题层级自动抽取"
              checked={includeTOC}
              onChange={setIncludeTOC}
            />
            <div className="export-divider" />
            <ToggleOption
              icon="ri-list-ordered-2"
              title="显示 Markdown 标记"
              desc="保留 ### 与列表符号"
              checked={showMarkdownMarkers}
              onChange={setShowMarkdownMarkers}
            />
            <div className="export-divider" />
            <ToggleOption
              icon="ri-file-text-fill"
              title="插入页码"
              desc="右下角显示 当前页 / 总页数"
              checked={includePageNumbers}
              onChange={setIncludePageNumbers}
            />
          </div>

          {/* Save location */}
          <div className="export-section">
            <div className="export-section-header">
              <span className="export-section-label">保存位置</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span className="remix ri-file-text-line"></span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>~/Documents/technical-notes.md</span>
              <button style={{ fontSize: 11, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>浏览...</button>
            </div>
          </div>

          {/* Preview */}
          <div className="export-preview">
            <div className="export-section-header">
              <span className="export-section-label">预览 · 第 1 页 / 共 4 页</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>A4 · 纵向 · 页边距 24mm · 样式集 {styleSet}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'flex-start' }}>
              <div className="export-preview-thumb">
                <span className={`remix ${selected.icon}`}></span>
              </div>
              <div>
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
          <div className="export-footer-hint">
            <span className="remix ri-information-line"></span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>导出不会修改原文档</span>
          </div>
          <div className="export-footer-actions">
            <button className="settings-cancel-btn" onClick={onClose}>取消</button>
            <button className="settings-save-btn">
              <span className="remix ri-download-2-line"></span>
              导出 {selected.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ToggleOption: React.FC<{
  icon: string; title: string; desc: string;
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}> = ({ icon, title, desc, checked, onChange, disabled }) => (
  <div className="toggle-option-row">
    <div className="toggle-option-left">
      <span className={`remix toggle-option-icon ${icon}`}></span>
      <div>
        <div className="toggle-option-title">{title}</div>
        <div className="toggle-option-desc">{desc}</div>
      </div>
    </div>
    {disabled ? (
      <span className="toggle-disabled-label">已启用</span>
    ) : (
      <button className={`toggle-btn ${checked ? 'active' : ''}`} onClick={() => onChange(!checked)}>
        <span className="toggle-knob" />
      </button>
    )}
  </div>
)
