import React, { useState, useEffect, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { exportDocument } from '../../services/exportService'
import { useSettingsStore } from '../../store/settingsStore'
import { getTypographyTheme } from '../../styles/typography-themes'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import { UnifiedDialog, UDSection, UDSettingRow, UDToggle, UDPreviewCard } from '../ui/UnifiedDialog'
import { getDocMd } from '../../utils/docSource'

function getEffectiveMd(activeDocId: string | null, storeMd: string, docsMd: Record<string, string>): string {
  if (storeMd) return storeMd
  if (docsMd[activeDocId || 'welcome']) return docsMd[activeDocId || 'welcome']
  return getDocMd(activeDocId || 'welcome')
}

const EXPORT_FORMATS = [
  { id: 'pdf',   name: 'PDF',   icon: 'ri-file-pdf-fill',    desc: '可打印',   color: '#e74c3c' },
  { id: 'docx',  name: 'DOCX',  icon: 'ri-file-word-fill',   desc: 'Word',     color: '#2980b9' },
  { id: 'html',  name: 'HTML',  icon: 'ri-html5-fill',       desc: '网页',     color: '#e67e22' },
  { id: 'epub',  name: 'EPUB',  icon: 'ri-book-open-fill',   desc: '电子书',   color: '#8e44ad' },
  { id: 'md',    name: 'MD',    icon: 'ri-markdown-fill',    desc: '源码',     color: '#27ae60' },
  { id: 'png',   name: 'PNG',   icon: 'ri-image-2-fill',     desc: '图片',     color: '#16a085' },
  { id: 'svg',   name: 'SVG',   icon: 'ri-shape-fill',       desc: '矢量',     color: '#2c3e50' },
  { id: 'xlsx',  name: 'XLSX',  icon: 'ri-file-excel-fill',  desc: '表格',     color: '#27ae60' },
]

const PAPER_SIZES = [
  { value: 'a4', label: 'A4' }, { value: 'a3', label: 'A3' },
  { value: 'a5', label: 'A5' }, { value: 'letter', label: 'Letter' },
]
const ORIENTATIONS = [
  { value: 'portrait', label: '纵向' }, { value: 'landscape', label: '横向' },
]

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

  const previewHtml = useMemo(() => {
    const md = getEffectiveMd(activeDocId, mdContent, docsMd)
    if (!md) return ''
    try { return remark().use(remarkGfm).use(remarkHtml).processSync(md).toString() } catch { return md }
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
        title: safeTitle, content: format === 'md' ? mdContent || html : html, format,
        options: isPrintFormat ? {
          typographyTheme: state.typographyTheme || 'classic', codeTheme: state.codeTheme || 'atom-one-dark',
          macCodeBlock: state.macCodeBlock || false, includeTOC: state.includeTOC !== false,
          includeLineNumbers: state.includeLineNumbers || false, includePageNumbers: state.includePageNumbers || false,
          paperSize, orientation, fontSize: state.defaultFontSize, lineHeight: state.lineHeight,
          fontFamily: state.editorFont, textIndent: state.textIndent, textJustify: state.textJustify,
          headingStyles: state.headingStyles,
        } : {},
      })
    } catch (err) { console.error('export failed', err) }
    setExporting(false)
    onClose()
  }

  const leftNav = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {EXPORT_FORMATS.map((fmt, i) => (
        <React.Fragment key={fmt.id}>
          {i > 0 && i === 5 && <div className="ud-chip-sep" />}
          <button className={`ud-chip${format === fmt.id ? ' active' : ''}`}
            onClick={() => setFormat(fmt.id)} style={format === fmt.id ? { borderColor: fmt.color } : undefined}>
            <span className={`remix ud-chip-icon ${fmt.icon}`} style={{ color: fmt.color }}></span>
            <div>
              <div className="ud-chip-label">{fmt.name}</div>
              <div className="ud-chip-desc">{fmt.desc}</div>
            </div>
          </button>
        </React.Fragment>
      ))}
    </div>
  )

  const rightTop = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isPrintFormat && (
        <>
          <UDSection label="样式选项">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <UDSettingRow icon="ri-menu-fill" label="包含目录" desc="在文档开头插入目录">
                <UDToggle checked={state.includeTOC !== false} onChange={v => updateSetting('includeTOC', v)} />
              </UDSettingRow>
              <UDSettingRow icon="ri-number-1" label="代码行号" desc="导出代码块时显示行号">
                <UDToggle checked={state.includeLineNumbers || false} onChange={v => updateSetting('includeLineNumbers', v)} />
              </UDSettingRow>
              <UDSettingRow icon="ri-numbers-fill" label="页码" desc="为每页添加页码">
                <UDToggle checked={state.includePageNumbers || false} onChange={v => updateSetting('includePageNumbers', v)} />
              </UDSettingRow>
            </div>
          </UDSection>
          <UDSection label="页面设置">
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="ud-section-label" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>纸张</div>
                <select className="export-select" value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                  {PAPER_SIZES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div className="ud-section-label" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>方向</div>
                <select className="export-select" value={orientation} onChange={e => setOrientation(e.target.value)}>
                  {ORIENTATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </UDSection>
        </>
      )}
    </div>
  )

  const rightContent = (
    <UDPreviewCard label={isPrintFormat ? `${paperSize.toUpperCase()} · ${orientation === 'portrait' ? '纵向' : '横向'}` : selected.name}>
      <div dangerouslySetInnerHTML={{ __html: previewHtml || '<p style="color:var(--text-muted);text-align:center;padding:32px 16px;">暂无内容，请先编辑文档</p>' }}
        style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)' }} />
    </UDPreviewCard>
  )

  return (
    <UnifiedDialog
      onClose={onClose} icon="ri-download-2-line"
      title="导出文档" subtitle={docTitle}
      leftNav={leftNav} rightTop={rightTop} rightContent={rightContent}
      hint="导出不会修改原文档" submitText={`导出 ${selected.name}`}
      onSubmit={handleExport} submitDisabled={exporting} size="lg"
    />
  )
}
