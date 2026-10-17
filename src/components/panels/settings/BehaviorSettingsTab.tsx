import React from 'react'
import { UiSwitch, UDSettingRow } from '../../ui'

function renderAppSettings(s: any, u: any) {

  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>行为设置</span><span className="settings-section-desc">应用启动与窗口管理</span></div>
      <UDSettingRow icon="ri-window-fill" label="启动标签页" desc="应用启动时显示多文档标签栏">
        <UiSwitch size="sm" checked={ s.enableTabs !== false } onChange={ v => u('enableTabs', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-notification-3-line" label="显示托盘图标" desc="在系统托盘显示应用图标">
        <UiSwitch size="sm" checked={ s.showTrayIcon !== false } onChange={ v => u('showTrayIcon', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-file-list-3-fill" label="下次启动时自动打开最后编辑的文档" desc="记住上次编辑的文档，下次启动自动打开">
        <UiSwitch size="sm" checked={ s.reopenLastDoc !== false } onChange={ v => u('reopenLastDoc', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
        <UDSettingRow icon="ri-window-line" label="从文件资源管理器打开文档时总在新窗口中打开" desc="双击文件总是在新窗口中打开">
        <UiSwitch size="sm" checked={ s.openInNewWindow || false } onChange={ v => u('openInNewWindow', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-close-circle-fill" label="当所有窗口关闭时退出应用程序" desc="关闭最后一个窗口后完全退出应用">
        <UiSwitch size="sm" checked={ s.quitWhenAllWindowsClosed !== false } onChange={ v => u('quitWhenAllWindowsClosed', v) } />
      </UDSettingRow>
    </div>
  )

}

export const BehaviorSettingsTab: React.FC<{ s: any; u: any }> = ({ s, u }) =>
  renderAppSettings(s, u)
