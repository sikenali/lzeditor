import React, { useState, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { exportDocument } from '../../services/exportService'
import { LFSCombo } from '../../components/ui/LFSCombo'
import { useSettingsStore } from '../../store/settingsStore'
import { getTypographyTheme } from '../../styles/typography-themes'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

function getEffectiveMd(activeDocId: string | null, storeMd: string, docsMd: Record<string, string>): string {
  if (storeMd) return storeMd
  if (docsMd[activeDocId || 'welcome']) return docsMd[activeDocId || 'welcome']
  try {
    const raw = localStorage.getItem(`lzeditor-doc-${activeDocId || 'welcome'}`)
    if (raw) {
      const d = JSON.parse(raw)
      if (d.md) return d.md
    }
  } catch {}
  return ''
}

const EXPORT_FORMATS = [
  { id: 'pdf',  name: 'PDF',     icon: 'ri-file-pdf-fill',      desc: '可打印',       color: '#e74c3c' },
  { id: 'docx', name: 'DOCX',    icon: 'ri-file-word-fill',     desc: 'Word 文档',    color: '#2980b9' },
  { id: 'html', name: 'HTML',    icon: 'ri-html5-fill',         desc: '自包含网页',   color: '#e67e22' },
  { id: 'epub', name: 'EPUB',    icon: 'ri-book-open-fill',     desc: '电子书',       color: '#8e44ad' },
  { id: 'md',   name: 'MD',      icon: 'ri-markdown-fill',      desc: '源码文本',     color: '#27ae60' },
  { id: 'png',  name: 'PNG',     icon: 'ri-image-2-fill',       desc: '图片截图',     color: '#16a085' },
  { id: 'svg',  name: 'SVG',     icon: 'ri-shape-line',         desc: '矢量图表',     color: '#2c3e50' },
  { id: 'drawio', name: 'DRAWIO', icon: 'ri-flow-chart',        desc: '可编辑图表',   color: '#d35400' },
  { id: 'xlsx', name: 'XLSX',    icon: 'ri-file-excel-fill',    desc: '电子表格',     color: '#27ae60' },
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

const PAPER_MAP: Record<string, string> = { a4: 'A4', a3: 'A3', a5: 'A5', letter: 'Letter', legal: 'Legal' }

export const ExportDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const docTitle = useEditorStore(s => s.docTitle)
  const docHTML = useEditorStore(s => s.docHTML)
  const mdContent = useEditorStore(s => s.mdContent)
  const docsMd = useEditorStore(s => s.docsMd || {})
  const activeDocId = useEditorStore(s => s.activeDocId)
  const typographyTheme = useSettingsStore(s => s.typographyTheme)
  const state = useSettingsStore.getState()
  const updateSetting = useSettingsStore.getState().updateSetting

  const [format, setFormat] = useState<any>((state.exportFormat as any) || 'pdf')
  const [paperSize, setPaperSize] = useState(state.paperSize || 'a4')
  const [orientation, setOrientation] = useState(state.orientation || 'portrait')
  const [exporting, setExporting] = useState(false)

  const selected = EXPORT_FORMATS.find(f => f.id === format)!
  const isPrintFormat = ['pdf', 'docx', 'html', 'epub'].includes(format)

  const previewHtml = React.useMemo(() => {
    const md = getEffectiveMd(activeDocId, mdContent, docsMd)
    if (!md) return ''
    try {
      return remark().use(remarkGfm).use(remarkHtml).processSync(md).toString()
    } catch {
      return md
    }
  }, [activeDocId, mdContent, docsMd])

  useEffect(() => {
    const el = document.getElementById('lz-export-typography-css')
    if (el) el.remove()
    const theme = getTypographyTheme(typographyTheme || 'classic')
    if (theme) {
      const styleEl = document.createElement('style')
      styleEl.id = 'lz-export-typography-css'
      styleEl.textContent = theme.css
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.(lz-editor-content|read-article-body|preview-doc|export-preview-body)/g, '.export-preview-body')
      document.head.appendChild(styleEl)
    }
  }, [typographyTheme, previewHtml])

  const handleExport = async () => {
    setExporting(true)
    updateSetting('exportFormat', format)
    updateSetting('paperSize', paperSize)
    updateSetting('orientation', orientation)
    const html = docHTML || '<h1>Empty</h1>'
    const safeTitle = (docTitle || 'document').replace(/\.[^.]+$/, '')
    try {
      await exportDocument({
        title: safeTitle,
        content: format === 'md' ? mdContent || html : html,
        format,
        options: isPrintFormat ? {
          typographyTheme: state.typographyTheme || 'classic',
          codeTheme: state.codeTheme || 'atom-one-dark',
          macCodeBlock: state.macCodeBlock || false,
          includeTOC: state.includeTOC !== false,
          includeLineNumbers: state.includeLineNumbers || false,
          includePageNumbers: state.includePageNumbers || false,
          paperSize,
          orientation,
          fontSize: state.defaultFontSize,
          lineHeight: state.lineHeight,
          fontFamily: state.editorFont,
          textIndent: state.textIndent,
          textJustify: state.textJustify,
          headingStyles: state.headingStyles,
        } : {},
      })
    } catch (err) {
      console.error('export failed', err)
    }
    setExporting(false)
    onClose()
  }

  const safeFilename = () => (docTitle || 'document').replace(/\.[^.]+$/, '')

  return (
    <div className="modal-overlay" onClick={onClose}>      <div className="export-dialog export-dialog-split" onClick={e => e.stopPropagation()}>
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

        <div className="export-body export-body-split export-body-redesigned">
          <div className="export-left">
            <div className="export-section">
              <div className="export-section-label">导出格式</div>
              <div className="format-chips-compact">
                {EXPORT_FORMATS.map(fmt => (
                  <button
                    key={fmt.id}
                    className={`format-chip-compact ${format === fmt.id ? 'active' : ''}`}
                    style={format === fmt.id ? { borderColor: fmt.color, boxShadow: `0 0 0 1px ${fmt.color}22` } : undefined}
                    onClick={() => setFormat(fmt.id)}
                  >
                    <span className={`remix ${fmt.icon}`} style={{ color: fmt.color }}></span>
                    <span className="chip-name">{fmt.name}</span>
                    <span className="chip-desc">{fmt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="export-right">
            {isPrintFormat && (
              <div className="export-options-band">
                <div className="export-section export-options-card">
                  <div className="export-section-label">样式与选项</div>
                  <div className="options-grid">
                    <OptionToggle title="包含目录" checked={state.includeTOC !== false} onChange={(v) => updateSetting('includeTOC', v)} />
                    <OptionToggle title="代码行号" checked={state.includeLineNumbers || false} onChange={(v) => updateSetting('includeLineNumbers', v)} />
                    <OptionToggle title="页码" checked={state.includePageNumbers || false} onChange={(v) => updateSetting('includePageNumbers', v)} />
                  </div>
                </div>
                <div className="export-section export-options-card">
                  <div className="export-section-label">页面设置</div>
                  <div className="paper-row">
                    <div className="paper-field">
                      <label className="paper-label">纸张</label>
                      <LFSCombo value={paperSize} onChange={setPaperSize} options={PAPER_SIZES.map(p => ({ value: p.id, label: p.label }))} style={{ minWidth: 90 }} />
                    </div>
                    <div className="paper-field">
                      <label className="paper-label">方向</label>
                      <LFSCombo value={orientation} onChange={setOrientation} options={ORIENTATIONS.map(o => ({ value: o.id, label: o.label }))} style={{ minWidth: 90 }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="export-section export-preview-section">
              <div className="export-section-header">
                <span className="export-section-label">预览</span>
                <span className="preview-meta">
                  {isPrintFormat ? `${PAPER_MAP[paperSize] || paperSize} · ${orientation === 'portrait' ? '纵向' : '横向'}` : selected.name}
                </span>
              </div>
              <div className="export-preview-area">
              <div
                className="export-preview-page"
                style={{
                  aspectRatio: isPrintFormat && orientation === 'landscape' ? '297/210' : isPrintFormat ? '210/297' : undefined,
                  width: isPrintFormat ? '100%' : 'auto',
                  minWidth: isPrintFormat ? 100 : undefined,
                }}
              >
                <div className="export-preview-scroll">
                  <div
                    className="export-preview-body"
                    dangerouslySetInnerHTML={{ __html: previewHtml || '<p style="color:var(--text-muted);text-align:center;padding:40px 16px;">暂无内容，请先编辑文档</p>' }}
                  />
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="export-footer">
          <div className="export-hint">
            <span className="remix ri-information-line"></span>
            <span>导出不会修改原文档</span>
          </div>
          <div className="export-actions">
            <button className="settings-cancel-btn" onClick={onClose} disabled={exporting}>关闭</button>
            <button className="settings-save-btn" onClick={handleExport} disabled={exporting}>
              <span className={`remix ${exporting ? 'ri-loader-4-line ri-spin' : 'ri-download-2-line'}`}></span>
              <span>{exporting ? '导出中...' : `导出 ${selected.name}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const OptionToggle: React.FC<{ title: string; checked: boolean; onChange: (v: boolean) => void }> = ({ title, checked, onChange }) => (
  <label className="option-toggle">
    <span className="option-toggle-label">{title}</span>
    <span className={`toggle-dot ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} />
  </label>
)
