import React, { useRef } from 'react'
import { UiSwitch, UDSettingRow } from '../../ui'
import { toast } from '../../../utils/toast'
import { downloadBackup, restoreBackup } from '../../../utils/backup'

function renderAppSettings(s: any, u: any) {

  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>应用行为</span></div>
      <UDSettingRow icon="ri-window-fill" label="启动标签页" desc="应用启动时显示多文档标签栏">
        <UiSwitch size="sm" checked={ s.enableTabs !== false } onChange={ v => u('enableTabs', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      {/* 托盘图标仅客户端生效（主进程有托盘）；lpk/网页端无托盘，不显示该设置（优化 #29） */}
      {!!window.electronAPI && (
        <UDSettingRow icon="ri-notification-3-line" label="显示托盘图标" desc="在系统托盘显示应用图标">
          <UiSwitch size="sm" checked={ s.showTrayIcon === true } onChange={ v => u('showTrayIcon', v) } />
        </UDSettingRow>
      )}
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

export const BehaviorSettingsTab: React.FC<{ s: any; u: any }> = ({ s, u }) => {
  const backupInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    try {
      const name = downloadBackup()
      toast(`已导出 ${name}`, { type: 'success' })
    } catch (e: any) {
      toast(`备份失败：${e?.message || '未知错误'}`, { type: 'error' })
    }
  }

  const handleRestoreFile = async (file: File) => {
    try {
      const text = await file.text()
      const count = restoreBackup(text)
      toast(`已恢复 ${count} 篇文档`, { type: 'success' })
    } catch (e: any) {
      toast(`恢复失败：${e?.message || '未知错误'}`, { type: 'error' })
    }
  }

  return (
    <>
      {renderAppSettings(s, u)}
      <div className="settings-section">
        <div className="settings-section-title"><span>数据备份</span></div>
        <UDSettingRow icon="ri-download-2-line" label="导出全部文档备份" desc="目录、正文与设置打包成 JSON 文件">
          <button className="settings-save-btn" onClick={handleExport}>导出备份</button>
        </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-upload-2-line" label="从备份恢复" desc="覆盖当前文档库与设置（含 API Key）">
          <button className="settings-save-btn" onClick={() => backupInputRef.current?.click()}>选择备份文件</button>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void handleRestoreFile(f)
            }}
          />
        </UDSettingRow>
      </div>
    </>
  )
}
