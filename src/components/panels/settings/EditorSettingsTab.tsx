import React from 'react'
import { useEditorStore } from '../../../store/editorStore'
import { UiSwitch, UDSettingRow } from '../../ui'

function renderKernelSection(s: any, u: any) {
  const TAB_SIZES = [2, 4, 8]

  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>编辑器内核</span></div>
      <UDSettingRow icon="ri-focus-2-line" label="高亮当前行" desc="在光标所在的行显示底色">
        <UiSwitch size="sm" checked={ s.currentLine !== false } onChange={ v => u('currentLine', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-text-wrap" label="自动换行" desc="长行自动折行，而不是横向滚动">
        <UiSwitch size="sm" checked={ s.softWrap !== false } onChange={ v => u('softWrap', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-braces-fill" label="输入括号时自动配对" desc="输入 ( 「 ` 等符号时自动补全另一半">
        <UiSwitch size="sm" checked={ s.autoPair !== false } onChange={ v => u('autoPair', v) } />
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

function renderEditModeSection(s: any, u: any) {

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>编辑模式</span></div>
        <UDSettingRow icon="ri-cursor-fill"
 label="打字机模式" desc="光标始终居中垂直位置">
        <UiSwitch size="sm" checked={ s.typewriterMode || false } onChange={ v => u('typewriterMode', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
         <UDSettingRow icon="ri-focus-2-line" label="专注模式" desc="仅高亮当前段落，其余淡化">
        <UiSwitch size="sm" checked={ s.focusMode || false } onChange={ v => u('focusMode', v) } />
      </UDSettingRow>
         <div className="setting-divider" />
          <UDSettingRow icon="ri-eye-line" label="预览模式" desc="编辑模式与代码模式下默认显示右侧预览">
            <UiSwitch size="sm" checked={s.previewModeEnabled === true} onChange={v => {
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
    {renderEditModeSection(s, u)}
  </>
)
