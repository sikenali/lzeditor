import React, { useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import { PROVIDERS, getProvider } from '../../services/aiProvider'
import type { AIModel } from '../../shared/types'

/* Toggle Component */
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    className={`toggle-btn ${checked ? 'active' : ''}`}
    onClick={() => onChange(!checked)}
    style={{ width: 38, height: 21, borderRadius: 11, background: checked ? 'var(--accent-primary)' : 'rgba(38,49,60,1)', border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0 }}
  >
    <span style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.15s' }} />
  </button>
)

/* Helper Components */
const SliderRow: React.FC<{ label: string; desc: string; min: number; max: number; step: number; value: number; displayValue: string }> = ({ label, desc, min, max, step, value, displayValue }) => (
  <div className="setting-row" style={{ marginBottom: 20 }}>
    <div className="setting-label">
      <span style={{ color: 'rgba(199,211,222,1)' }}>{label}</span>
      <span className="setting-hint">{desc}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
      <span style={{ fontSize: 11, color: 'rgba(111,125,138,1)', minWidth: 20 }}>{min}</span>
      <div className="slider-track">
        <div className="slider-fill" style={{ width: `${((value - min) / (max - min)) * 100}%` }} />
        <div className="slider-thumb" style={{ left: `${((value - min) / (max - min)) * 100}%` }} />
      </div>
      <span style={{ fontSize: 11, color: 'rgba(111,125,138,1)', minWidth: 20 }}>{max}</span>
      <div className="slider-current-value">
        <span style={{ fontSize: 11, color: 'var(--amber)' }}>{displayValue}</span>
      </div>
    </div>
  </div>
)

const ToggleRow: React.FC<{ icon: string; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }> = ({ icon, title, desc, checked, onChange }) => (
  <div className="toggle-row">
    <div className="toggle-row-left">
      <span className="remix toggle-icon" style={{ fontSize: 16 }}>{icon}</span>
      <div className="toggle-text">
        <span className="toggle-title">{title}</span>
        <span className="toggle-desc">{desc}</span>
      </div>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
)

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
            {/* 主题模式 */}
            <div className="settings-section">
              <div className="settings-section-title">
                <span>主题模式</span>
                <span className="settings-section-desc">选择界面的明暗风格</span>
              </div>
              <div className="segmented-control">
                {(['light', 'dark', 'system'] as const).map(m => (
                  <button
                    key={m}
                    className={`segmented-btn ${localSettings.theme === m ? 'active' : ''}`}
                    onClick={() => update('theme', m)}
                  >
                    <span className="remix" style={{ fontSize: 15 }}>{m === 'light' ? '\uF10B' : m === 'dark' ? '\uF1D7' : '\uF0CA'}</span>
                    <span>{m === 'light' ? '浅色' : m === 'dark' ? '深色' : '跟随系统'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI 设置 */}
            <div className="settings-section">
              <div className="settings-section-title">
                <span>AI 设置</span>
                <span className="settings-section-desc">配置大语言模型连接</span>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span>AI 提供商</span>
                  <span className="setting-hint">切换默认使用的模型</span>
                </div>
                <select value={localSettings.provider} onChange={e => update('provider', e.target.value)} style={{ minWidth: 160 }}>
                  {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span>模型</span>
                  <span className="setting-hint">{currentProvider?.defaultModel}</span>
                </div>
                <select value={localSettings.model} onChange={e => update('model', e.target.value)} style={{ minWidth: 160 }}>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span>API Key</span>
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
                  <button onClick={() => setApiKeyVisible(v => !v)} style={{ padding: '0 8px', fontSize: 12 }}>
                    {apiKeyVisible ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label"><span>自定义 API 地址</span><span className="setting-hint">OpenAI 兼容格式</span></div>
                <input type="text" value={localSettings.customBaseUrl} onChange={e => update('customBaseUrl', e.target.value)} placeholder="留空使用官方地址" style={{ flex: 1 }} />
              </div>

              <div className="setting-row">
                <div className="setting-label">
                  <span>温度</span>
                  <span className="setting-hint">创造性 0~1</span>
                </div>
                <div style={{ display: 'flex', alignContent: 'center', gap: 12, flex: 1 }}>
                  <input type="range" min="0" max="1" step="0.1" value={localSettings.temperature} onChange={e => update('temperature', parseFloat(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-primary)' }} />
                  <span style={{ color: 'var(--accent-primary)', fontSize: 12, minWidth: 28 }}>{localSettings.temperature}</span>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label"><span>最大 Token</span></div>
                <input type="number" value={localSettings.maxTokens} onChange={e => update('maxTokens', parseInt(e.target.value) || 1024)} style={{ width: 100 }} />
              </div>

              <div className="setting-row">
                <div className="setting-label"><span>全局快捷键</span></div>
                <input type="text" value={localSettings.shortcut} readOnly style={{ width: 120, opacity: 0.6, cursor: 'default' }} />
              </div>
            </div>

            {/* 强调色 */}
            <div className="settings-section">
              <div className="settings-section-title">
                <span>强调色</span>
                <span className="settings-section-desc">用于选中态、主按钮与新增内容高亮</span>
              </div>
              <div className="color-picker-row">
                {[
                  { color: '#39FF9E', label: 'Neon Green', selected: true },
                  { color: '#FFE45C', label: '亮黄', selected: false },
                  { color: '#4FC3F7', label: '青蓝', selected: false },
                  { color: '#FF5FA2', label: '品红', selected: false },
                  { color: '#FF9F45', label: '橙', selected: false },
                  { color: '#B98CFF', label: '紫', selected: false },
                ].map((c, i) => (
                  <button
                    key={i}
                    className={`color-swatch ${localSettings.accentColor === c.color ? 'active' : ''}`}
                    onClick={() => update('accentColor', c.color)}
                    title={c.label}
                  >
                    <span className="color-swatch-bg" style={{ background: c.color }} />
                    {localSettings.accentColor === c.color && <span className="remix color-swatch-check" style={{ fontSize: 14 }}>{'\uEAF7'}</span>}
                  </button>
                ))}
                <button className="color-swatch color-swatch-custom" title="自定义颜色">
                  <span className="remix" style={{ fontSize: 16 }}>{'\uE213'}</span>
                </button>
              </div>
              <div className="color-current-value">
                <span className="color-current-label">当前</span>
                <span className="color-current-hex" style={{ color: localSettings.accentColor }}>{localSettings.accentColor} · {localSettings.accentColor === '#39FF9E' ? 'Neon Green' : '自定义'}</span>
              </div>
            </div>

            {/* 编辑器外观 */}
            <div className="settings-section">
              <div className="settings-section-title">
                <span>编辑器外观</span>
              </div>
              
              <SliderRow 
                label="正文字号" 
                desc="编辑区默认排版字号"
                min={14} max={22} step={1}
                value={17}
                displayValue="17px"
              />
              <SliderRow 
                label="行高" 
                desc="影响长文阅读舒适度"
                min={1.2} max={2.2} step={0.05}
                value={1.85}
                displayValue="1.85"
              />
              <SliderRow 
                label="内容宽度" 
                desc="单行显示的最大字符宽度"
                min={720} max={1200} step={20}
                value={1020}
                displayValue="1020px"
              />
            </div>

            {/* 显示选项 */}
            <div className="settings-section">
              <div className="settings-section-title">
                <span>显示选项</span>
              </div>
              
              <ToggleRow 
                icon="\uEDED"
                title="Markdown 标记常显"
                desc="始终显示 ### 与列表符号"
                checked={true}
                onChange={() => {}}
              />
              <div className="setting-divider" />
              
              <ToggleRow 
                icon="\uE629"
                title="快照差异高亮"
                desc="红底为删除、绿底为新增"
                checked={true}
                onChange={() => {}}
              />
              <div className="setting-divider" />
              
              <ToggleRow 
                icon="\uE0CA"
                title="打字机模式"
                desc="光标始终居中垂直位置"
                checked={false}
                onChange={() => {}}
              />
              <div className="setting-divider" />
              
              <ToggleRow 
                icon="\uE6CC"
                title="专注模式"
                desc="仅高亮当前段落，其余淡化"
                checked={false}
                onChange={() => {}}
              />
            </div>

            {/* 效果预览 */}
            <div className="settings-section">
              <div className="settings-section-title">
                <span>效果预览</span>
              </div>
              <div className="preview-card">
                <div className="preview-code-line">
                  <span className="preview-dollarsign">$</span>
                  <span className="preview-text">cat /proc/cpuinfo</span>
                </div>
                <div className="preview-title-line">
                  <span className="preview-hash">###</span>
                  <span className="preview-text">Praesent varius diam</span>
                </div>
                <div className="preview-text-line">
                  <span className="preview-text">Nam id imperdiet turpis.</span>
                  <span className="preview-deleted">mollis</span>
                  <span className="preview-text">vestibulum eros.</span>
                  <span className="preview-added">sed hendrerit</span>
                </div>
                <div className="preview-text-line">
                  <span className="preview-selected">当前选中段落</span>
                  <span className="preview-text">aliquam pellentesque vehicula sapien.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <div className="settings-footer-left">
            <span className="remix" style={{ fontSize: 15, color: 'rgba(127,191,162,1)' }}>\uE280</span>
            <span style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>设置已自动保存</span>
          </div>
          <div className="settings-footer-right">
            <button className="settings-reset-btn" onClick={() => setLocalSettings({
              provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', apiKey: '',
              customBaseUrl: '', temperature: 0.7, maxTokens: 1024,
              theme: 'dark', accentColor: '#39FF9E', shortcut: 'Ctrl+/',
            })}>
              <span className="remix" style={{ fontSize: 14 }}>\uE8D8</span>
              <span>重置本页</span>
            </button>
            <button className="settings-save-btn" onClick={handleSave}>
              <span className="remix" style={{ fontSize: 12 }}>\uEAF7</span>
              <span>完成</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}