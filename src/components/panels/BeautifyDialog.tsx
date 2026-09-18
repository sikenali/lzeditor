import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { STYLE_SETS, applyStyleSet } from '../../styles/themes'

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
  const [styleSet, setStyleSet] = useState(state.styleSet || 'ocean')
  const [showLineNumbers, setShowLineNumbers] = useState(state.showLineNumbers || false)
  const [useIndent, setUseIndent] = useState(false)
  const [useJustify, setUseJustify] = useState(false)
  const [macCodeBlock, setMacCodeBlock] = useState(false)
  const [applying, setApplying] = useState(false)

  const handleApply = async () => {
    setApplying(true)
    updateSetting('editorFont', fontFamily)
    updateSetting('defaultFontSize', fontSize)
    updateSetting('lineHeight', lineHeight)
    updateSetting('contentWidth', contentWidth)
    updateSetting('styleSet', styleSet)
    applyStyleSet(styleSet)
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

  const currentTheme = STYLE_SETS.find(s => s.id === styleSet) || STYLE_SETS[0]
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
          {/* 主题风格 */}
          <div className="beautify-section">
            <div className="beautify-section-title">主题风格</div>
            <div className="beautify-theme-grid">
              {STYLE_SETS.map(s => (
                <button
                  key={s.id}
                  className={`beautify-theme-card ${styleSet === s.id ? 'active' : ''}`}
                  onClick={() => setStyleSet(s.id)}
                >
                  <div className="beautify-theme-preview" style={{ background: s.preview.bg }}>
                    <div className="beautify-theme-bar" style={{ background: s.preview.accent }} />
                    <div className="beautify-theme-lines">
                      <div className="beautify-theme-line" style={{ width: '70%' }} />
                      <div className="beautify-theme-line" style={{ width: '50%' }} />
                    </div>
                  </div>
                  <span className="beautify-theme-name">{s.name}</span>
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

        <div className="beautify-footer">
          <button className="settings-cancel-btn" onClick={onClose} disabled={applying}>取消</button>
          <button className="settings-save-btn" onClick={handleApply} disabled={applying}>
            <span className={`remix ${applying ? 'ri-loader-4-line ri-spin' : 'ri-magic-line'}`}></span>
            <span>{applying ? '排版中…' : '应用排版'}</span>
          </button>
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
