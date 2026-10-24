import React from 'react'
import { useEditorStore } from '../../../store/editorStore'
import { UiSelect, UiSwitch, UDSettingRow } from '../../ui'

const FONT_OPTIONS = [
  { value: 'sans-serif', label: '无衬线 (默认)' },
  { value: 'serif',      label: '衬线体' },
  { value: 'monospace',  label: '等宽体' },
  { value: '"PingFang SC", sans-serif', label: '苹方' },
  { value: '"Noto Serif SC", serif',    label: '思源宋体' },
  { value: '"Source Han Sans SC", sans-serif', label: '思源黑体' },
]
const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 22]
const LINE_HEIGHT_OPTIONS: { value: '1.0' | '1.5' | '2.0'; label: string }[] = [
  { value: '1.0', label: '紧凑' }, { value: '1.5', label: '适中' }, { value: '2.0', label: '宽松' },
]
const CONTENT_WIDTH_OPTIONS = ['960', '1024', '1200', '1280']
const SPELL_CHECK_LANGS = [
  { value: 'zh-CN', label: '中文 (简体)' }, { value: 'en-US', label: '英语 (美国)' },
  { value: 'en-GB', label: '英语 (英国)' }, { value: 'ja-JP', label: '日语' }, { value: 'ko-KR', label: '韩语' },
]

function renderKernelSection(s: any, u: any) {
  const TAB_SIZES = [2, 4, 8]

  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>编辑器内核</span></div>
      <UDSettingRow icon="ri-code-s-slash-fill" label="使用新内核 (CodeMirror 6)" desc="开启后编辑区由 CodeMirror 6 渲染，支持实时预览与行号；关闭则回退到旧的富文本编辑器">
        <UiSwitch size="sm" checked={ s.useCM6Editor !== false } onChange={ v => u('useCM6Editor', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-focus-2" label="高亮当前行" desc="在光标所在的行显示底色">
        <UiSwitch size="sm" checked={ s.currentLine !== false } onChange={ v => u('currentLine', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-text-wrap" label="自动换行" desc="长行自动折行，而不是横向滚动">
        <UiSwitch size="sm" checked={ s.softWrap !== false } onChange={ v => u('softWrap', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-list-check-2" label="回车自动续写列表" desc="在列表项后回车自动添加 - 或 1. 等序号">
        <UiSwitch size="sm" checked={ s.continueLists !== false } onChange={ v => u('continueLists', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-braces-fill" label="输入括号时自动配对" desc="输入 ( 「 ` 等符号时自动补全另一半">
        <UiSwitch size="sm" checked={ s.autoPair !== false } onChange={ v => u('autoPair', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-flashlight-line" label="实时预览" desc="边输入边渲染标题、列表、图片等样式">
        <UiSwitch size="sm" checked={ s.livePreview || false } onChange={ v => u('livePreview', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <div className="setting-row">
        <div className="setting-label"><span>缩进大小</span><span className="setting-hint">Tab 键与空格的宽度</span></div>
        <div className="segmented-control">
          {TAB_SIZES.map(n => (
            <button key={n} className={`segmented-btn ${(s.tabSize || 2) === n ? 'active' : ''}`} onClick={() => u('tabSize', n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function renderGeneralSection(s: any, u: any) {

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>排版</span></div>
        <div className="setting-row" style={{ marginBottom: 16 }}>
          <div className="setting-label"><span>默认字体</span><span className="setting-hint">编辑区默认字体族</span></div>
          <UiSelect value={s.editorFont || 'sans-serif'} onChange={v => u('editorFont', v)} options={FONT_OPTIONS.map(o => ({ value: o.value, label: o.label }))} style={{ flex: 1, maxWidth: 280 }} />
        </div>
        <div className="setting-row" style={{ marginBottom: 16 }}>
          <div className="setting-label"><span>默认字号</span><span className="setting-hint">编辑区默认字体大小</span></div>
          <div className="font-size-segmented">
            {FONT_SIZE_OPTIONS.map(sz => (
              <button key={sz} className={`font-size-btn ${(s.defaultFontSize || 17) === sz ? 'active' : ''}`} onClick={() => u('defaultFontSize', sz)}>{sz}</button>
            ))}
          </div>
        </div>
        <div className="setting-row" style={{ marginBottom: 16 }}>
          <div className="setting-label"><span>行高</span><span className="setting-hint">段落行间距</span></div>
          <div className="segmented-control">
            {LINE_HEIGHT_OPTIONS.map(o => (
              <button key={o.value} className={`segmented-btn ${(s.lineHeight || '1.5') === o.value ? 'active' : ''}`} onClick={() => u('lineHeight', o.value)}>
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
        <UDSettingRow icon="ri-apps-2-fill" label="显示常用格式按钮" desc="在工具栏直接显示粗体、斜体、下划线、删除线、高亮五个按钮，关闭后仅保留格式菜单">
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

function renderLocalizationSection(s: any, u: any) {

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>拼写检查</span></div>
        <UDSettingRow icon="ri-spell-check-line" label="启动拼写检查" desc="拼写错误时显示波浪线提示">
        <UiSwitch size="sm" checked={ s.enableSpellCheck !== false } onChange={ v => u('enableSpellCheck', v) } />
      </UDSettingRow>
        <div style={{ padding: '8px 0 0 44px', marginBottom: 8 }}>
          <div className="setting-row" style={{ marginBottom: 0 }}>
            <div className="setting-label" style={{ minWidth: 80 }}><span>检查语言</span></div>
            <UiSelect value={s.spellCheckLang || 'zh-CN'} onChange={v => u('spellCheckLang', v)} options={SPELL_CHECK_LANGS.map(l => ({ value: l.value, label: l.label }))} style={{ maxWidth: 200 }} />
          </div>
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>Markdown 快捷符号</span></div>
        <UDSettingRow icon="ri-asterisk" label="允许使用符号键 (* _ + ~ = 和 `) 设置选中的文本的格式" desc="选中文字后按 * 加粗、_ 斜体等">
        <UiSwitch size="sm" checked={ s.allowMarkdownSymbols !== false } onChange={ v => u('allowMarkdownSymbols', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-braces-fill" label="自动补完 Markdown 符号对" desc="输入 ( 时自动补全 )，输入 「 时自动补全 」 等">
        <UiSwitch size="sm" checked={ s.autoCompleteMarkdownPairs !== false } onChange={ v => u('autoCompleteMarkdownPairs', v) } />
      </UDSettingRow>
         <div className="setting-divider" />
         <UDSettingRow icon="ri-double-quotes-l" label="自动替换引号为智能引号（即双引号和单引号）" desc="英文弯引号，提升可读性">
           <UiSwitch size="sm" checked={s.smartQuotes !== false} onChange={v => u('smartQuotes', v)} />
         </UDSettingRow>
         <div className="setting-divider" />
         <UDSettingRow icon="ri-language-fill" label="自动在中日韩文字及英文数字间插入空格" desc="在汉字与英文/数字之间自动插入一个空格">
        <UiSwitch size="sm" checked={ s.autoSpaceCJK !== false } onChange={ v => u('autoSpaceCJK', v) } />
      </UDSettingRow>
         <div className="setting-divider" />
         <UDSettingRow icon="ri-double-quotes-r" label={'自动替换引号为直角引号（即「」和『』）'} desc={'将 "" 替换为 「」，将 \'\' 替换为 『』'}>
           <UiSwitch size="sm" checked={s.cornerQuotes || false} onChange={v => u('cornerQuotes', v)} />
         </UDSettingRow>
         <div className="setting-divider" />
        <UDSettingRow icon="ri-translate-2" label="自动替换半角符号为全角符号（仅限，、;符号）" desc="将半角 , 和 ; 替换为全角 ，和 ；">
        <UiSwitch size="sm" checked={ s.fullwidthSymbols || false } onChange={ v => u('fullwidthSymbols', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-list-ordered" label="显示行号" desc="在编辑器左侧显示行号">
        <UiSwitch size="sm" checked={ s.showLineNumbers || false } onChange={ v => u('showLineNumbers', v) } />
      </UDSettingRow>
       </div>
    </>
  )

}

function renderEditModeSection(s: any, u: any) {

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>编辑模式</span></div>
        <UDSettingRow icon="ri-markdown-fill" label="Markdown 标记常显" desc="始终显示 ### 与列表符号">
        <UiSwitch size="sm" checked={ s.showMarkdownMarkers !== false } onChange={ v => u('showMarkdownMarkers', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
                 <UDSettingRow icon="ri-cursor-fill"
 label="打字机模式" desc="光标始终居中垂直位置">
        <UiSwitch size="sm" checked={ s.typewriterMode || false } onChange={ v => u('typewriterMode', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
         <UDSettingRow icon="ri-focus-2" label="专注模式" desc="仅高亮当前段落，其余淡化">
        <UiSwitch size="sm" checked={ s.focusMode || false } onChange={ v => u('focusMode', v) } />
      </UDSettingRow>
         <div className="setting-divider" />
          <UDSettingRow icon="ri-eye-line" label="预览模式" desc="编辑模式与代码模式下默认显示右侧预览">
            <UiSwitch size="sm" checked={s.previewModeEnabled !== false} onChange={v => {
              u('previewModeEnabled', v)
              useEditorStore.getState().setShowPreview(v)
            }} />
           </UDSettingRow>
        </div>
    </>
  )

}

export const EditorSettingsTab: React.FC<{ s: any; u: any }> = ({ s, u }) => (
  <>
    {renderKernelSection(s, u)}
    {renderGeneralSection(s, u)}
    {renderLocalizationSection(s, u)}
    {renderEditModeSection(s, u)}
  </>
)
