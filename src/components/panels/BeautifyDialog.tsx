import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { TYPOGRAPHY_THEMES } from '../../styles/typography-themes'
import { CODE_THEMES } from '../../styles/code-themes'

const FONT_OPTIONS = [
  { value: 'sans-serif', label: '无衬线' },
  { value: 'serif', label: '衬线体' },
  { value: 'monospace', label: '等宽体' },
  { value: '"PingFang SC", "Microsoft YaHei", sans-serif', label: '苹方' },
  { value: '"Noto Serif SC", serif', label: '思源宋体' },
]
const FONT_SIZE_OPTIONS = [13, 14, 15, 16, 17, 18, 19, 20]
const LINE_HEIGHT_OPTIONS = [
  { value: '1.4', label: '紧凑' },
  { value: '1.75', label: '适中' },
  { value: '2.0', label: '宽松' },
]
const WIDTH_OPTIONS = [
  { value: '960', label: '960px' },
  { value: '1024', label: '1024px' },
  { value: '1200', label: '1200px' },
  { value: '1280', label: '1280px' },
]

export const BeautifyDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const state = useSettingsStore.getState()
  const updateSetting = useSettingsStore.getState().updateSetting
  const editor = useEditorStore(s => s.editor)
  const setMdContent = useEditorStore(s => s.setMdContent)

  const [fontFamily, setFontFamily] = useState(state.editorFont || 'sans-serif')
  const [fontSize, setFontSize] = useState<number>(state.defaultFontSize || 17)
  const [lineHeight, setLineHeight] = useState(state.lineHeight || '1.75')
  const [contentWidth, setContentWidth] = useState<'960' | '1024' | '1200' | '1280'>(state.contentWidth || '1024')
  const [typographyTheme, setTypographyTheme] = useState(state.typographyTheme || 'classic')
  const [codeTheme, setCodeTheme] = useState(state.codeTheme || 'atom-one-dark')
  const [showLineNumbers, setShowLineNumbers] = useState(state.showLineNumbers || false)
  const [useIndent, setUseIndent] = useState(false)
  const [useJustify, setUseJustify] = useState(false)
  const [macCodeBlock, setMacCodeBlock] = useState(state.macCodeBlock || false)
  const [applying, setApplying] = useState(false)

  const handleApply = async () => {
    setApplying(true)
    updateSetting('editorFont', fontFamily)
    updateSetting('defaultFontSize', fontSize)
    updateSetting('lineHeight', lineHeight)
    updateSetting('contentWidth', contentWidth)
    updateSetting('typographyTheme', typographyTheme)
    updateSetting('codeTheme', codeTheme)
    updateSetting('macCodeBlock', macCodeBlock)
    try {
      const prettier = await import('prettier')
      const currentMd = useEditorStore.getState().mdContent || ''
      if (currentMd.trim()) {
        const formatted = await prettier.format(currentMd, {
          parser: 'markdown',
          printWidth: 80,
          tabWidth: 2,
          useTabs: false,
          proseWrap: 'preserve',
          endOfLine: 'lf',
        })
        if (editor) {
          editor.commands.setContent(formatted)
          editor.chain().focus().run()
          setMdContent(formatted)
        }
      }
    } catch (e) {
      console.error('beautify failed', e)
    }
    setApplying(false)
    onClose()
  }

  const currentTheme = TYPOGRAPHY_THEMES.find(t => t.id === typographyTheme) || TYPOGRAPHY_THEMES[0]
  const previewFont = fontFamily === 'sans-serif' ? 'var(--font-sans)'
    : fontFamily === 'monospace' ? 'var(--font-mono)'
    : fontFamily

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="beautify-dialog" onClick={e => e.stopPropagation()}>
        <div className="beautify-header">
          <span className="remix ri-magic-line beautify-icon"></span>
          <span className="beautify-title">一键排版</span>
          <button className="settings-close-btn" onClick={onClose}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="beautify-body">
          {/* 排版样式 */}
          <div className="beautify-section">
            <div className="beautify-section-title">排版样式</div>
            <div className="beautify-theme-grid">
              {TYPOGRAPHY_THEMES.map(t => (
                <button
                  key={t.id}
                  className={`beautify-theme-card ${typographyTheme === t.id ? 'active' : ''}`}
                  onClick={() => setTypographyTheme(t.id)}
                >
                  <div
                    className="beautify-theme-preview"
                    style={{
                      background: t.id === 'night' ? '#1a1b26' : t.id === 'magazine' || t.id === 'ink' ? '#fff' : '#f8f8f8',
                      minHeight: 56,
                      padding: '4px 6px',
                    }}
                  >
                    <div style={{ fontSize: 8, lineHeight: 1.4, color: t.id === 'night' ? '#c6cade' : '#333' }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: t.color }}>标题</div>
                      <div style={{ fontSize: 7, color: 'rgba(128,128,128,0.6)' }}>正文文字</div>
                    </div>
                  </div>
                  <span className="beautify-theme-name">{t.name}</span>
                  <span style={{ fontSize: 9, color: t.color }}>{t.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 字体 */}
          <div className="beautify-section">
            <div className="beautify-section-title">字体与排版</div>
            <div className="beautify-row">
              <label className="beautify-label">字体</label>
              <select className="beautify-select" value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="beautify-row">
              <label className="beautify-label">字号</label>
              <div className="beautify-size-chips">
                {FONT_SIZE_OPTIONS.map(s => (
                  <button key={s} className={`beautify-size-chip ${fontSize === s ? 'active' : ''}`} onClick={() => setFontSize(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className="beautify-row">
              <label className="beautify-label">行高</label>
              <div className="beautify-size-chips">
                {LINE_HEIGHT_OPTIONS.map(l => (
                  <button key={l.value} className={`beautify-size-chip ${lineHeight === l.value ? 'active' : ''}`} onClick={() => setLineHeight(l.value)}>{l.label}</button>
                ))}
              </div>
            </div>
            <div className="beautify-row">
              <label className="beautify-label">内容宽度</label>
              <div className="beautify-size-chips">
                {WIDTH_OPTIONS.map(w => (
                  <button key={w.value} className={`beautify-size-chip ${contentWidth === w.value ? 'active' : ''}`} onClick={() => setContentWidth(w.value as any)}>{w.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 代码块 */}
          <div className="beautify-section">
            <div className="beautify-section-title">代码块</div>
            <ToggleOption title="显示行号" checked={showLineNumbers} onChange={setShowLineNumbers} />
            <ToggleOption title="Mac 风格窗口" checked={macCodeBlock} onChange={setMacCodeBlock} />
            <div className="beautify-row" style={{ marginTop: 8 }}>
              <label className="beautify-label">代码样式</label>
              <div className="beautify-size-chips" style={{ flexWrap: 'wrap' }}>
                {CODE_THEMES.map(ct => (
                  <button
                    key={ct.id}
                    className={`beautify-size-chip ${codeTheme === ct.id ? 'active' : ''}`}
                    onClick={() => setCodeTheme(ct.id)}
                    style={{ gap: 4, paddingRight: 8 }}
                  >
                    <span style={{ display: 'inline-flex', gap: 2 }}>
                      {ct.swatch.slice(0, 3).map((c, i) => (
                        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block' }} />
                      ))}
                    </span>
                    {ct.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 文本对齐 */}
          <div className="beautify-section">
            <div className="beautify-section-title">文本对齐</div>
            <ToggleOption title="首行缩进" checked={useIndent} onChange={setUseIndent} />
            <ToggleOption title="两端对齐" checked={useJustify} onChange={setUseJustify} />
          </div>

          {/* 预览 */}
          <div className="beautify-section">
            <div className="beautify-section-title">预览效果</div>
            <div
              className="beautify-preview"
              style={{
                fontFamily: previewFont,
                fontSize: `${fontSize}px`,
                lineHeight,
                maxWidth: `${contentWidth}px`,
              }}
            >
              <p>这是一段正文示例文字，展示排版后的实际效果。</p>
              <h4 style={{ margin: '8px 0 4px', fontSize: '15px' }}>标题样式</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>
                当前主题：<strong>{currentTheme.name}</strong> · 通过调整以上设置，可以实时预览排版效果。
              </p>
            </div>
          </div>
        </div>

        <div className="insert-dialog-actions">
          <div className="export-hint">
            <span className="remix ri-information-line"></span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>应用后将覆盖当前排版主题</span>
          </div>
          <div className="export-actions">
            <button className="settings-cancel-btn" onClick={onClose} disabled={applying}>取消</button>
            <button className="settings-save-btn" onClick={handleApply} disabled={applying}>
              <span className={`remix ${applying ? 'ri-loader-4-line ri-spin' : 'ri-magic-line'}`}></span>
              <span>{applying ? '排版中…' : '应用排版'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ToggleOption: React.FC<{ title: string; checked: boolean; onChange: (v: boolean) => void }> = ({ title, checked, onChange }) => (
  <label className="beautify-toggle-row">
    <span className="beautify-toggle-label">{title}</span>
    <span className={`beautify-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} />
  </label>
)
