import React, { useState, useEffect, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getTypographyTheme } from '../../styles/typography-themes'
import { DEFAULT_TYPOGRAPHY_THEME } from '../../styles/acks-mapping'
import { mdToHtml } from '../../utils/mdToHtml'
import { UDSection, UDSettingRow, UiModal, UiSelect, UiSwitch, UiInput } from '../ui'
import { getDocMd } from '../../utils/docSource'
import { toast } from '../../utils/toast'

function getEffectiveMd(activeDocId: string | null, storeMd: string, docsMd: Record<string, string>): string {
  if (storeMd) return storeMd
  if (docsMd[activeDocId || 'readme']) return docsMd[activeDocId || 'readme']
  return getDocMd(activeDocId || 'readme')
}

// 导出产物是独立 HTML 文档，吃不到应用里的 --font-* 变量，必须展开成真实字体栈。
// 与应用内栈保持一致（color-tokens.css 的 --font-sans / --font-serif / --font-mono）。
// 设置里存的是 'sans-serif' / 'serif' / 'monospace' 这类键，直接透传会让导出件退化成泛型家族。
const EXPORT_FONT_STACKS: Record<string, string> = {
  'sans-serif': '"Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  serif: '"Songti SC", "Source Han Serif SC", "Noto Serif SC", "STSong", serif',
  monospace: '"JetBrains Mono", ui-monospace, "SFMono-Regular", monospace',
}
const exportFontStack = (editorFont?: string): string =>
  EXPORT_FONT_STACKS[editorFont || ''] || editorFont || EXPORT_FONT_STACKS['sans-serif']


const EXPORT_FORMATS = [
   { id: 'pdf',   name: 'PDF',   icon: 'ri-file-pdf-fill',    desc: '可打印',   color: 'var(--color-error)' },
   { id: 'docx',  name: 'DOCX',  icon: 'ri-file-word-fill',   desc: 'Word（HTML 编码，Word 可打开）', color: 'var(--color-info)' },
   { id: 'html',  name: 'HTML',  icon: 'ri-html5-fill',       desc: '网页',     color: 'var(--color-warning)' },
   { id: 'epub',  name: 'EPUB',  icon: 'ri-book-open-fill',   desc: '电子书',   color: 'var(--color-primary-deep)' },
   { id: 'md',    name: 'MD',    icon: 'ri-markdown-fill',    desc: '源码',     color: 'var(--color-success)' },
   { id: 'png',   name: 'PNG',   icon: 'ri-image-2-fill',     desc: '图片',     color: 'var(--color-primary)' },
   { id: 'svg',   name: 'SVG',   icon: 'ri-shape-fill',       desc: '矢量',     color: 'var(--color-text-primary)' },
   { id: 'xlsx',  name: 'XLSX',  icon: 'ri-file-excel-fill',  desc: '表格',     color: 'var(--color-success-strong)' },
 ]

const PAPER_SIZES = [
  { value: 'a4', label: 'A4' }, { value: 'a3', label: 'A3' },
  { value: 'a5', label: 'A5' }, { value: 'letter', label: 'Letter' },
]
const ORIENTATIONS = [
  { value: 'portrait', label: '纵向' }, { value: 'landscape', label: '横向' },
]

export const ExportDialog: React.FC<{ onClose: () => void; styleId?: string }> = ({ onClose, styleId }) => {
  const docTitle = useEditorStore(s => s.docTitle)
  const docHTML = useEditorStore(s => s.docHTML)
  const mdContent = useEditorStore(s => s.mdContent)
  const docsMd = useEditorStore(s => s.docsMd || {})
  const activeDocId = useEditorStore(s => s.activeDocId)
  const showWelcome = useEditorStore(s => s.showWelcome)
  const noDoc = showWelcome || activeDocId == null
  const typographyTheme = useSettingsStore(s => s.typographyTheme)
  const includeTOC = useSettingsStore(s => s.includeTOC)
  const includeLineNumbers = useSettingsStore(s => s.includeLineNumbers)
  const includePageNumbers = useSettingsStore(s => s.includePageNumbers)
  const codeTheme = useSettingsStore(s => s.codeTheme)
  const macCodeBlock = useSettingsStore(s => s.macCodeBlock)
  const defaultFontSize = useSettingsStore(s => s.defaultFontSize)
  const lineHeight = useSettingsStore(s => s.lineHeight)
  const editorFont = useSettingsStore(s => s.editorFont)
  const textIndent = useSettingsStore(s => s.textIndent)
  const textJustify = useSettingsStore(s => s.textJustify)
  const exportFormat = useSettingsStore(s => s.exportFormat)
  const exportPaperSize = useSettingsStore(s => s.paperSize)
  const exportOrientation = useSettingsStore(s => s.orientation)
  const updateSetting = useSettingsStore(s => s.updateSetting)

  // 记住上次导出的格式/纸张/方向，别每次都回到 pdf + a4 + 纵向
  const [format, setFormat] = useState<any>(exportFormat || 'pdf')
  const [paperSize, setPaperSize] = useState(exportPaperSize || 'a4')
  const [orientation, setOrientation] = useState(exportOrientation || 'portrait')
  const [exporting, setExporting] = useState(false)
  const [fileName, setFileName] = useState(() => (docTitle || 'document').replace(/\.[^.]+$/, ''))

  const selected = EXPORT_FORMATS.find(f => f.id === format)!
  const isPrintFormat = ['pdf', 'docx', 'html', 'epub'].includes(format)

  const effectiveMd = useMemo(
    () => getEffectiveMd(activeDocId, mdContent, docsMd),
    [activeDocId, mdContent, docsMd],
  )
  const previewHtml = useMemo(() => {
    if (!effectiveMd) return ''
    try { return mdToHtml(effectiveMd) } catch { return effectiveMd }
  }, [effectiveMd])

  useEffect(() => {
    const el = document.getElementById('lz-export-typography-css')
    if (el) el.remove()
    const themeId = styleId || typographyTheme || DEFAULT_TYPOGRAPHY_THEME
    const theme = getTypographyTheme(themeId)
    if (theme) {
      const styleEl = document.createElement('style')
      styleEl.id = 'lz-export-typography-css'
      // theme.css 由 buildTypographyTheme 以裸宿主选择器（含 .export-preview-body）生成，无需再重映射。
      styleEl.textContent = theme.css
      document.head.appendChild(styleEl)
    }
  }, [typographyTheme, previewHtml])

  const handleExport = async () => {
    if (noDoc) { toast('请先打开或新建一个文档再导出'); return }
    setExporting(true)
    updateSetting('exportFormat', format)
    updateSetting('paperSize', paperSize)
    updateSetting('orientation', orientation)
    // 未编辑过的文档 docHTML 为空：回落到当前有效 md 的渲染结果，
    // 否则内置手册/新开未编辑文档会导出成 <h1>Empty</h1>。
    const html = docHTML || previewHtml || '<h1>Empty</h1>'
    const mdSource = effectiveMd || mdContent || ''
    const safeTitle = (fileName.trim() || docTitle || 'document').replace(/\.[^.]+$/, '')
    // 失败不关弹窗：保留用户已选的格式和排版项，能直接重试。
    // 之前是无条件 onClose()，失败和成功一个样，用户以为文件已经导出了。
    let failed = false
    try {
      // 导出链路牵动 jszip / xlsx 等，改动态 import：不点导出就不加载 vendor-export 那个 500+ KB 的块
      const { exportDocument } = await import('../../services/exportService')
      await exportDocument({
        title: safeTitle, content: format === 'md' ? mdSource : html, format,
          options: isPrintFormat ? {
            typographyTheme: styleId || typographyTheme || DEFAULT_TYPOGRAPHY_THEME, codeTheme: codeTheme || 'atom-one-dark',
            macCodeBlock: macCodeBlock || false, includeTOC: includeTOC !== false,
            includeLineNumbers: includeLineNumbers || false, includePageNumbers: includePageNumbers || false,
            paperSize, orientation, fontSize: defaultFontSize, lineHeight: lineHeight,
            fontFamily: exportFontStack(editorFont), textIndent: textIndent, textJustify: textJustify,
          } : {},
      })
    } catch (err) {
      failed = true
      console.error('export failed', err)
      toast('导出失败，文件没有生成，可以换个格式重试', { type: 'error', duration: 4000 })
    }
    setExporting(false)
    if (failed) return
    toast(`已导出 ${safeTitle}.${format}`)
    onClose()
  }

  const leftNav = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {EXPORT_FORMATS.map((fmt, i) => (
        <React.Fragment key={fmt.id}>
          {i === 5 && <div className="ud-chip-sep" />}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <UDSection label="文件名">
        <UiInput value={fileName} onChange={setFileName} placeholder="导出文件名（不含扩展名）" clearable />
      </UDSection>
      {isPrintFormat && (
        <>
          <UDSection label="样式选项">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <UDSettingRow icon="ri-menu-fill" label="包含目录" desc="在文档开头插入目录">
                <UiSwitch size="sm" checked={includeTOC !== false} onChange={v => updateSetting('includeTOC', v)} />
              </UDSettingRow>
              <UDSettingRow icon="ri-number-1" label="代码行号" desc="导出代码块时显示行号">
                <UiSwitch size="sm" checked={includeLineNumbers || false} onChange={v => updateSetting('includeLineNumbers', v)} />
              </UDSettingRow>
              <UDSettingRow icon="ri-numbers-fill" label="页码" desc="为每页添加页码">
                <UiSwitch size="sm" checked={includePageNumbers || false} onChange={v => updateSetting('includePageNumbers', v)} />
              </UDSettingRow>
            </div>
          </UDSection>
          <UDSection label="页面设置">
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="ud-section-label" style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>纸张</div>
                <div style={{ minWidth: 0 }}>
                  <UiSelect value={paperSize} onChange={setPaperSize} options={PAPER_SIZES.map(p => ({ value: p.value, label: p.label }))} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="ud-section-label" style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>方向</div>
                <div style={{ minWidth: 0 }}>
                  <UiSelect value={orientation} onChange={setOrientation} options={ORIENTATIONS.map(o => ({ value: o.value, label: o.label }))} />
                </div>
              </div>
            </div>
          </UDSection>
        </>
      )}
    </div>
  )

  return (
    <UiModal
      open
      onClose={onClose}
      icon="ri-download-2-line"
      title="导出文档"
      subtitle="选择左侧的文件类型导出文件"
      width={780}
      height={600}
      footer={
        <div className="ud-actions">
          <button className="ud-btn ud-btn--ghost" onClick={onClose}>取消</button>
          <button className={`ud-btn ud-btn--primary${noDoc ? ' ud-btn--unavailable' : ''}`} onClick={handleExport} disabled={exporting || noDoc}>
            导出 {selected.name}
          </button>
        </div>
      }
    >
      <div className="ud-body ud-body-split">
        <div className="ud-left">{leftNav}</div>
        <div className="ud-right">
          {rightTop && <div className="ud-right-top">{rightTop}</div>}
        </div>
      </div>
    </UiModal>
  )
}
