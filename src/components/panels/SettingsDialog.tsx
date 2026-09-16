import React, { useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import { PROVIDERS, getProvider } from '../../services/aiProvider'
import type { AIModel } from '../../shared/types'

export const SettingsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const settings = useSettingsStore()
  const setSettings = useSettingsStore.setState

  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [localSettings, setLocalSettings] = useState({ ...settings })

  const update = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    useSettingsStore.setState(localSettings)
    try {
      localStorage.setItem('lzeditor-settings', JSON.stringify(localSettings))
    } catch {}
    onClose()
  }

  const currentProvider = getProvider(localSettings.provider)
  const models: AIModel[] = currentProvider?.models || []
  const selectedModel = models.find(m => m.id === localSettings.model) || models[0]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <span className="remix" style={{ fontSize: 18, color: 'var(--accent-primary)' }}>\uF068</span>
            <span>设置</span>
          </div>
          <div className="settings-header-actions">
            <button className="settings-reset-btn" style={{
              background: 'rgba(20, 28, 36, 1)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: 12,
              color: 'rgba(139, 152, 165, 1)',
              border: '1px solid rgba(51, 64, 76, 1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }} onClick={() => setLocalSettings({
              provider: 'anthropic',
              model: 'claude-3-5-sonnet-20241022',
              apiKey: '',
              customBaseUrl: '',
              temperature: 0.7,
              maxTokens: 1024,
              theme: 'dark',
              accentColor: '#39FF9E',
              shortcut: 'Ctrl+/',
            })}>恢复默认</button>
            <button className="settings-close-btn" onClick={onClose} style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, color: 'rgba(92,106,120,1)', transition: 'all 0.12s'
            }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(57,255,158,0.08)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
              <span className="remix">\uE61C</span>
            </button>
          </div>
        </div>

        <div className="settings-body">
          <div className="settings-sidebar">
            <div className="settings-nav-group">
              <div className="settings-nav-label">基础</div>
              <div className="settings-nav-item active">通用</div>
              <div className="settings-nav-item">编辑器</div>
              <div className="settings-nav-item">外观</div>
              <div className="settings-nav-item">AI</div>
            </div>
            <div className="settings-nav-group">
              <div className="settings-nav-label">进阶</div>
              <div className="settings-nav-item">快捷键</div>
              <div className="settings-nav-item">导出</div>
              <div className="settings-nav-item">同步</div>
            </div>
            <div className="settings-nav-group">
              <div className="settings-nav-label">其他</div>
              <div className="settings-nav-item">高级</div>
              <div className="settings-nav-item">关于</div>
            </div>
            <div className="settings-nav-bottom">
              <div className="settings-version">
                <div className="settings-version-dot" />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>lzeditor v0.1.0</span>
              </div>
            </div>
          </div>

          <div className="settings-content">
            <div className="settings-section">
              <div className="settings-section-title">主题模式</div>
              <div className="segmented-control">
                {(['light', 'dark', 'system'] as const).map(m => (
                  <button
                    key={m}
                    className={`segmented-btn ${localSettings.theme === m ? 'active' : ''}`}
                    onClick={() => update('theme', m)}
                  >
                    {m === 'light' ? '浅色' : m === 'dark' ? '深色' : '跟随系统'}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">AI 设置</div>

              <div className="setting-row">
                <div className="setting-label">AI 提供商</div>
                <select
                  value={localSettings.provider}
                  onChange={e => update('provider', e.target.value)}
                  style={{ minWidth: 160 }}
                >
                  {PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="setting-row">
                <div className="setting-label">模型</div>
                <select
                  value={localSettings.model}
                  onChange={e => update('model', e.target.value)}
                  style={{ minWidth: 160 }}
                >
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  API Key
                  <span className="setting-hint">本地加密存储，不上传服务器</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                  <input
                    type={apiKeyVisible ? 'text' : 'password'}
                    value={localSettings.apiKey}
                    onChange={e => update('apiKey', e.target.value)}
                    placeholder="sk-..."
                    style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
                  />
                  <button
                    onClick={() => setApiKeyVisible(v => !v)}
                    style={{ padding: '0 8px', fontSize: 12, color: 'var(--text-secondary)' }}
                  >
                    {apiKeyVisible ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label">自定义 API 地址</div>
                <input
                  type="text"
                  value={localSettings.customBaseUrl}
                  onChange={e => update('customBaseUrl', e.target.value)}
                  placeholder="留空使用官方地址"
                  style={{ flex: 1 }}
                />
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  温度（创造性）
                  <span style={{ marginLeft: 8, color: 'var(--accent-primary)', fontSize: 12 }}>{localSettings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localSettings.temperature}
                  onChange={e => update('temperature', parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                />
              </div>

              <div className="setting-row">
                <div className="setting-label">最大 Token</div>
                <input
                  type="number"
                  value={localSettings.maxTokens}
                  onChange={e => update('maxTokens', parseInt(e.target.value) || 1024)}
                  style={{ width: 100 }}
                />
              </div>

              <div className="setting-row">
                <div className="setting-label">全局快捷键</div>
                <input
                  type="text"
                  value={localSettings.shortcut}
                  readOnly
                  style={{ width: 120, opacity: 0.6, cursor: 'default' }}
                />
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">强调色</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={localSettings.accentColor}
                  onChange={e => update('accentColor', e.target.value)}
                  style={{ width: 36, height: 28, border: 'none', background: 'none', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={localSettings.accentColor}
                  onChange={e => update('accentColor', e.target.value)}
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-cancel-btn" onClick={onClose}>取消</button>
          <button className="settings-save-btn" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}