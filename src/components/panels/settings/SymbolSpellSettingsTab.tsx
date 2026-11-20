import React from 'react'
import { UiSelect, UiSwitch, UDSettingRow } from '../../ui'

const SPELL_CHECK_LANGS = [
  { value: 'zh-CN', label: '中文 (简体)' }, { value: 'en-US', label: '英语 (美国)' },
  { value: 'en-GB', label: '英语 (英国)' }, { value: 'ja-JP', label: '日语' }, { value: 'ko-KR', label: '韩语' },
]

function renderSpellCheckSection(s: any, u: any) {

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>拼写检查</span></div>
        <UDSettingRow icon="ri-english-input" label="启动拼写检查" desc="拼写错误时显示波浪线提示">
        <UiSwitch size="sm" checked={ s.enableSpellCheck !== false } onChange={ v => u('enableSpellCheck', v) } />
      </UDSettingRow>
        <div style={{ padding: '8px 0 0 0', marginBottom: 8 }}>
          <UDSettingRow icon="ri-global-line" label="检查语言" desc="拼写检查使用的语言">
            <UiSelect value={s.spellCheckLang || 'zh-CN'} onChange={v => u('spellCheckLang', v)} options={SPELL_CHECK_LANGS.map(l => ({ value: l.value, label: l.label }))} style={{ maxWidth: 200 }} />
          </UDSettingRow>
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
        <UDSettingRow icon="ri-double-quotes-l" label="自动替换引号为智能引号" desc="英文弯引号，提升可读性；与直角引号互斥">
          <UiSwitch size="sm" checked={s.smartQuotes !== false}
            onChange={v => { u('smartQuotes', v); if (v) u('cornerQuotes', false) }} />
        </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-text-spacing" label="自动在中日韩文字及英文数字间插入空格" desc="在汉字与英文/数字之间自动插入一个空格">
          <UiSwitch size="sm" checked={ s.autoSpaceCJK !== false } onChange={ v => u('autoSpaceCJK', v) } />
        </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-double-quotes-r" label={'自动替换引号为直角引号（「」/『』）'} desc={'将 "" 替换为 「」，将 \'\' 替换为 『』；与智能引号互斥'}>
          <UiSwitch size="sm" checked={s.cornerQuotes || false}
            onChange={v => { u('cornerQuotes', v); if (v) u('smartQuotes', false) }} />
        </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-translate-2" label="自动替换半角符号为全角符号（逗号与分号）" desc="将半角 , 和 ; 替换为全角 ，和 ；">
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

export const SymbolSpellSettingsTab: React.FC<{ s: any; u: any }> = ({ s, u }) => (
  <>
    {renderSpellCheckSection(s, u)}
  </>
)
