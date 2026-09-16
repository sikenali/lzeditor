import React, { useState } from 'react'
import { generateEPUB } from '../../services/epubGenerator'
import { useEditorStore } from '../../store/editorStore'

const EXPORT_FORMATS = [
  { id: 'pdf', name: 'PDF', icon: 'ri-file-pdf-fill', desc: '适合打印和分享' },
  { id: 'html', name: 'HTML', icon: 'ri-html5-fill', desc: '网页格式' },
  { id: 'docx', name: 'Word', icon: 'ri-file-word-2-fill', desc: 'Office 文档' },
  { id: 'md', name: 'Markdown', icon: 'ri-markdown-fill', desc: '纯文本源码' },
]

const PAPER_SIZES = [
  { id: 'a4', label: 'A4' },
  { id: 'a3', label: 'A3' },
  { id: 'a5', label: 'A5' },
  { id: 'letter', label: 'Letter' },
  { id: 'legal', label: 'Legal' },
]

const ORIENTATIONS = [
  { id: 'portrait', label: '纵向' },
  { id: 'landscape', label: '横向' },
]

export const ExportDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const docTitle = useEditorStore((s: any) => s.docTitle)
  const docHTML = useEditorStore((s: any) => s.docHTML)
  const [format, setFormat] = useState('pdf')
  const [paperSize, setPaperSize] = useState('a4')
  const [orientation, setOrientation] = useState('portrait')

  const selected = EXPORT_FORMATS.find(f => f.id === format)!

  const handleExport = () => {
    // TODO: implement actual export
    const blob = new Blob([docHTML || '<h1>Empty</h1>'], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${docTitle || 'document'}.${format === 'md' ? 'md' : 'html'}`
    a.click()
    URL.revokeObjectURL(url)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="export-header">
          <div className="export-title">
            <span className="remix export-icon ri-download-2-line"></span>
            <div>
              <div className="export-title-text">导出文档</div>
              <div className="export-title-desc">{docTitle}</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="export-body">
          {/* Format selector */}
          <div className="export-section">
            <div className="export-section-label">导出格式</div>
            <div className="format-grid">
              {EXPORT_FORMATS.map(fmt => (
                <button
                  key={fmt.id}
                  className={`format-card ${format === fmt.id ? 'active' : ''}`}
                  onClick={() => setFormat(fmt.id)}
                >
                  <span className={`remix format-icon ${fmt.icon}`}></span>
                  <div className="format-info">
                    <div className="format-name">{fmt.name}</div>
                    <div className="format-desc">{fmt.desc}</div>
                  </div>
                  <div className={`format-radio ${format === fmt.id ? 'checked' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Paper size & orientation */}
          <div className="export-section">
            <div className="export-row">
              <div className="export-field">
                <label className="export-label">纸张大小</label>
                <select className="lfs-select" value={paperSize} onChange={e => setPaperSize(e.target.value)} style={{ minWidth: 120 }}>
                  {PAPER_SIZES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div className="export-field">
                <label className="export-label">方向</label>
                <select className="lfs-select" value={orientation} onChange={e => setOrientation(e.target.value)} style={{ minWidth: 120 }}>
                  {ORIENTATIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="export-section">
            <div className="export-section-header">
              <span className="export-section-label">预览</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{paperSize.toUpperCase()} · {orientation === 'portrait' ? '纵向' : '横向'}</span>
            </div>
            <div className="export-preview-area">
              <div className="export-preview-page" style={{ aspectRatio: orientation === 'portrait' ? '210/297' : '297/210' }}>
                <div className="export-preview-content">
                  <div className="remix ri-file-text-line export-preview-icon"></div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{selected.name} 格式</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{docTitle}.md</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="export-footer">
          <div className="export-hint">
            <span className="remix ri-information-line"></span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>导出不会修改原文档</span>
          </div>
          <div className="export-actions">
            <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
            <button className="settings-save-btn" onClick={handleExport}>
              <span className="remix ri-download-2-line"></span>
              导出 {selected.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
