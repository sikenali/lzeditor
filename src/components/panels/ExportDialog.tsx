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
            <div className="export-icon" style={{ background: 'var(--success-bg)', borderRadius: 10 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--note-bg)', borderRadius: 6, padding: '2px 8px' }}>
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

          {/* Style set selector */}
          <div className="export-section">
            <div className="export-section-header">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>样式集</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
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
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>导出选项</span>
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
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>保存位置</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span className="remix ri-file-text-line"></span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>~/Documents/technical-notes.md</span>
              <button style={{ fontSize: 11, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>浏览...</button>
            </div>
          </div>

          {/* Preview */}
          <div className="export-section" style={{ background: 'var(--bg-code)', borderRadius: 10, padding: 14 }}>
            <div className="export-section-header">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>预览 · 第 1 页 / 共 4 页</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>A4 · 纵向 · 页边距 24mm · 样式集 {styleSet}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 63, height: 80, background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <span className="remix ri-information-line"></span>
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

const ToggleOption: React.FC<{
  icon: string; title: string; desc: string;
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}> = ({ icon, title, desc, checked, onChange, disabled }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span className={`remix ${icon}`} style={{ fontSize: 16, color: 'var(--green-accent-soft)' }}></span>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
      </div>
    </div>
    {!disabled && (
      <button
        className={`toggle-btn ${checked ? 'active' : ''}`}
        onClick={() => onChange(!checked)}
        style={{ width: 38, height: 21, borderRadius: 9999, background: checked ? 'var(--accent-primary)' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', padding: '0 3px', cursor: 'pointer', border: 'none', transition: 'background 0.15s' }}
      >
        <span style={{ width: 16, height: 16, borderRadius: 9999, background: checked ? 'var(--text-on-accent)' : 'var(--text-muted)', transform: checked ? 'translateX(17px)' : 'translateX(0)', transition: 'transform 0.15s, background 0.15s' }} />
      </button>
    )}
    {disabled && (
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>已启用</span>
    )}
  </div>
)
