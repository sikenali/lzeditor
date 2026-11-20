import React from 'react'
import { UiSelect, UiSwitch, UDSettingRow } from '../../ui'

// 字体全部自托管在 src/assets/fonts/（见 styles/fonts.css），盒子零系统字体，不能靠系统栈。
// 不再列思源黑体 / 思源宋体：思源黑体已是默认栈本身；宋体变体字体要 21 MB，不值得带。
const FONT_OPTIONS = [
  { value: 'sans-serif', label: 'Inter + Noto Sans SC (默认)' },
  { value: 'serif',      label: '宋体' },
  { value: 'monospace',  label: 'JetBrains Mono' },
  { value: '"PingFang SC", sans-serif', label: '苹方 (macOS)' },
]
const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 22]
const LINE_HEIGHT_OPTIONS: { value: '1.5' | '1.7' | '2.0'; label: string }[] = [
  { value: '1.5', label: '紧凑' }, { value: '1.7', label: '适中' }, { value: '2.0', label: '宽松' },
]
const CONTENT_WIDTH_OPTIONS = ['760', '960', '1024', '1200', '1280']

function renderContentSection(s: any, u: any) {

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>内容排版</span></div>
        <div className="setting-row" style={{ marginBottom: 16 }}>
          <div className="setting-label"><span>默认字体</span><span className="setting-hint">编辑区默认字体族</span></div>
          <UiSelect value={s.editorFont || 'sans-serif'} onChange={v => u('editorFont', v)} options={FONT_OPTIONS.map(o => ({ value: o.value, label: o.label }))} style={{ flex: 1, maxWidth: 280 }} />
        </div>
        <div className="setting-row" style={{ marginBottom: 16 }}>
          <div className="setting-label"><span>默认字号</span><span className="setting-hint">编辑区默认字体大小</span></div>
          <div className="font-size-segmented">
            {FONT_SIZE_OPTIONS.map(sz => (
              <button key={sz} className={`font-size-btn ${(s.defaultFontSize || 16) === sz ? 'active' : ''}`} onClick={() => u('defaultFontSize', sz)}>{sz}</button>
            ))}
          </div>
        </div>
        <div className="setting-row" style={{ marginBottom: 16 }}>
          <div className="setting-label"><span>行高</span><span className="setting-hint">段落行间距</span></div>
          <div className="segmented-control">
            {LINE_HEIGHT_OPTIONS.map(o => (
              <button key={o.value} className={`segmented-btn ${(s.lineHeight || '1.7') === o.value ? 'active' : ''}`} onClick={() => u('lineHeight', o.value)}>
                {o.label}<span style={{ opacity: 0.5, marginLeft: 4 }}>{o.value}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-label"><span>内容宽度</span><span className="setting-hint">编辑区最大宽度</span></div>
          <div className="content-width-segmented">
            {CONTENT_WIDTH_OPTIONS.map(w => (
              <button key={w} className={`content-width-btn ${(s.contentWidth || '1024') === w ? 'active' : ''}`} onClick={() => u('contentWidth', w)}>{w}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>段落排版</span></div>
        <UDSettingRow icon="ri-text-spacing" label="首行缩进" desc="每个段落首行缩进两个字符">
        <UiSwitch size="sm" checked={ s.textIndent || false } onChange={ v => u('textIndent', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-align-justify" label="两端对齐" desc="段落文字左右两端对齐">
        <UiSwitch size="sm" checked={ s.textJustify || false } onChange={ v => u('textJustify', v) } />
      </UDSettingRow>
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>工具栏</span></div>
        <UDSettingRow icon="ri-apps-2-fill" label="显示常用格式按钮" desc="在工具栏上显示常用的样式菜单，开启后全部显示">
        <UiSwitch size="sm" checked={ s.quickFormatButtons !== false } onChange={ v => u('quickFormatButtons', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-text" label="显示工具栏按钮标题" desc="在图标下方显示文字标签">
        <UiSwitch size="sm" checked={ s.showToolbarLabels !== false } onChange={ v => u('showToolbarLabels', v) } />
      </UDSettingRow>
      </div>
    </>
  )

}

export const LayoutSettingsTab: React.FC<{ s: any; u: any }> = ({ s, u }) => (
  <>
    {renderContentSection(s, u)}
  </>
)
