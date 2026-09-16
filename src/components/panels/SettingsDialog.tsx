import React, { useState } from 'react'
import { useSettingsStore, saveSettings } from '../../store/settingsStore'
import { PROVIDERS, getProvider } from '../../services/aiProvider'
import type { AIModel, SettingsGroup } from '../../shared/types'

const NAV_GROUPS: { id: SettingsGroup; label: string; group: string }[] = [
  { id: 'general', label: '通用', group: '基础' },
  { id: 'editor', label: '编辑器', group: '基础' },
  { id: 'appearance', label: '外观', group: '基础' },
  { id: 'ai', label: 'AI', group: '基础' },
  { id: 'shortcut', label: '快捷键', group: '进阶' },
  { id: 'export', label: '导出', group: '进阶' },
  { id: 'sync', label: '同步与备份', group: '进阶' },
  { id: 'advanced', label: '高级', group: '其他' },
  { id: 'about', label: '关于', group: '其他' },
]

const SYNC_PROVIDERS = [
  { id: 'git', name: 'Git', desc: '本地 Git 版本控制' },
  { id: 'dropbox', name: 'Dropbox', desc: '云同步到 Dropbox' },
  { id: 'google', name: 'Google Drive', desc: '云同步到 Google Drive' },
  { id: 'webdav', name: 'WebDAV', desc: '自定义 WebDAV 服务器' },
]

export const SettingsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const activeGroup = useSettingsStore((s: any) => s.activeGroup)
  const setActiveGroup = useSettingsStore((s: any) => s.setActiveGroup)
  const settings = useSettingsStore()
  
  const [apiKeyVisible, setApiKeyVisible] = useState<boolean>(false)
  const [localSettings, setLocalSettings] = useState({ ...settings })

  const update = (key: string, value: any): void => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    saveSettings(localSettings)
    onClose()
  }

  const currentProvider = getProvider(localSettings.provider)
  const models: AIModel[] = currentProvider?.models || []

  const handleNavClick = (groupId: SettingsGroup) => {
    setActiveGroup(groupId)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <div className="settings-title">
            <div className="settings-icon">
              <span className="remix" style={{ fontSize: 17, color: 'var(--accent-primary)' }}>\uF068</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(242,248,251,1)' }}>设置</div>
              <div style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>Preferences \uB77C • {NAV_GROUPS.find(g => g.id === activeGroup)?.label || ''}</div>
            </div>
          </div>
          <div className="settings-header-actions">
            <button 
              className="settings-reset-btn" 
              onClick={() => {
                setLocalSettings({
                  provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', apiKey: '',
                  customBaseUrl: '', temperature: 0.7, maxTokens: 1024,
                  theme: 'dark', accentColor: '#39FF9E', shortcut: 'Ctrl+/', activeGroup: 'general',
                })
                setActiveGroup('general')
              }}
            >
              <span className="remix" style={{ fontSize: 14 }}>\uE8D8</span>
              <span>恢复默认</span>
            </button>
            <button className="settings-close-btn" onClick={onClose}>
              <span className="remix">\uE61C</span>
            </button>
          </div>
        </div>

        <div className="settings-body">
          {/* Sidebar */}
          <div className="settings-sidebar">
            {['基础', '进阶', '其他'].map((groupName) => {
              const groupItems = NAV_GROUPS.filter(g => g.group === groupName)
              return (
                <div key={groupName} className="settings-nav-group">
                  <div className="settings-nav-label">{groupName}</div>
                  {groupItems.map(item => (
                    <div
                      key={item.id}
                      className={`settings-nav-item ${activeGroup === item.id ? 'active' : ''}`}
                      onClick={() => handleNavClick(item.id)}
                    >
                      <span className="remix nav-item-icon">{getNavIcon(item.id)}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )
            })}
            <div className="settings-nav-bottom">
              <div className="settings-version">
                <div className="settings-version-dot" />
                <span style={{ fontSize: 12, color: 'rgba(111,125,138,1)' }}>Yu Writer</span>
                <span style={{ fontSize: 13, color: 'var(--amber)' }}>v0.9.8 alpha</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="settings-content">
            {activeGroup === 'general' && renderGeneralSection(localSettings, update, handleSave)}
            {activeGroup === 'appearance' && renderAppearanceSection(localSettings, update)}
            {activeGroup === 'ai' && renderAISection(localSettings, update, apiKeyVisible, setApiKeyVisible, models)}
            {activeGroup === 'editor' && renderEditorSection()}
            {activeGroup === 'shortcut' && renderShortcutSection(localSettings, update)}
            {activeGroup === 'export' && renderExportSection()}
            {activeGroup === 'sync' && renderSyncSection()}
            {activeGroup === 'advanced' && renderAdvancedSection()}
            {activeGroup === 'about' && renderAboutSection()}
          </div>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <div className="settings-footer-left">
            <span className="remix" style={{ fontSize: 15, color: 'rgba(127,191,162,1)' }}>\uE280</span>
            <span>设置已自动保存</span>
          </div>
          <div className="settings-footer-right">
            <button className="settings-cancel-btn" onClick={onClose}>取消</button>
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

function getNavIcon(group: SettingsGroup): string {
  const icons: Record<SettingsGroup, string> = {
    general: '\uF0CA',
    editor: '\uE8C1',
    appearance: '\uF068',
    ai: '\uF47B',
    shortcut: '\uE9B5',
    export: '\uE454',
    sync: '\uE61D',
    advanced: '\uE82D',
    about: '\uE61A',
  }
  return icons[group] || '\uF068'
}

function renderGeneralSection(s: any, update: any, save: () => void) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title">
          <span>主题模式</span>
          <span className="settings-section-desc">选择界面的明暗风格</span>
        </div>
        <div className="segmented-control">
          {(['light', 'dark', 'system'] as const).map(m => (
            <button key={m} className={`segmented-btn ${s.theme === m ? 'active' : ''}`} onClick={() => update('theme', m)}>
              <span className="remix" style={{ fontSize: 15 }}>{m === 'light' ? '\uF10B' : m === 'dark' ? '\uF1D7' : '\uF0CA'}</span>
              <span>{m === 'light' ? '浅色' : m === 'dark' ? '深色' : '跟随系统'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title"><span>强调色</span><span className="settings-section-desc">用于选中态、主按钮与新增内容高亮</span></div>
        <div className="color-picker-row">
          {[
            { color: '#39FF9E', label: 'Neon Green' },
            { color: '#FFE45C', label: '亮黄' },
            { color: '#4FC3F7', label: '青蓝' },
            { color: '#FF5FA2', label: '品红' },
            { color: '#FF9F45', label: '橙' },
            { color: '#B98CFF', label: '紫' },
          ].map((c, i) => (
            <button key={i} className={`color-swatch ${s.accentColor === c.color ? 'active' : ''}`} onClick={() => update('accentColor', c.color)} title={c.label}>
              <span className="color-swatch-bg" style={{ background: c.color }} />
              {s.accentColor === c.color && <span className="remix color-swatch-check" style={{ fontSize: 14 }}>{'\uEAF7'}</span>}
            </button>
          ))}
          <button className="color-swatch color-swatch-custom" title="自定义颜色">
            <span className="remix" style={{ fontSize: 16 }}>{'\uE213'}</span>
          </button>
        </div>
        <div className="color-current-value">
          <span className="color-current-label">当前</span>
          <span className="color-current-hex" style={{ color: s.accentColor }}>{s.accentColor} \u00B7 Neon Green</span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title"><span>显示选项</span></div>
        <ToggleRow icon="\uEDED" title="Markdown 标记常显" desc="始终显示 ### 与列表符号" checked={true} onChange={(_v: boolean) => {}} />
        <div className="setting-divider" />
        <ToggleRow icon="\uE629" title="快照差异高亮" desc="红底为删除、绿底为新增" checked={true} onChange={(_v: boolean) => {}} />
        <div className="setting-divider" />
        <ToggleRow icon="\uE0CA" title="打字机模式" desc="光标始终居中垂直位置" checked={false} onChange={(_v: boolean) => {}} />
        <div className="setting-divider" />
        <ToggleRow icon="\uE6CC" title="专注模式" desc="仅高亮当前段落，其余淡化" checked={false} onChange={(_v: boolean) => {}} />
      </div>

      <div className="settings-section">
        <div className="settings-section-title"><span>效果预览</span></div>
        <div className="preview-card">
          <div className="preview-code-line"><span className="preview-dollarsign">$</span><span className="preview-text">cat /proc/cpuinfo</span></div>
          <div className="preview-title-line"><span className="preview-hash">###</span><span className="preview-text">Praesent varius diam</span></div>
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
    </>
  )
}

function renderAppearanceSection(s: any, update: any) {
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>外观</span><span className="settings-section-desc">界面视觉风格配置</span></div>
      <div className="setting-row">
        <div className="setting-label"><span>语言</span><span className="setting-hint">界面显示语言</span></div>
        <select style={{ minWidth: 160 }}>
          <option>简体中文</option>
          <option>English</option>
          <option>日本語</option>
        </select>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>字体</span><span className="setting-hint">编辑器默认字体</span></div>
        <select style={{ minWidth: 160 }}>
          <option>Source Han Sans</option>
          <option>JetBrains Mono</option>
          <option>Fira Code</option>
        </select>
      </div>
    </div>
  )
}

function renderAISection(s: any, update: any, apiKeyVisible: boolean, setApiKeyVisible: any, models: AIModel[]) {
  const currentProvider = getProvider(s.provider)
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>AI 设置</span><span className="settings-section-desc">配置大语言模型连接</span></div>

      <div className="setting-row">
        <div className="setting-label"><span>AI 提供商</span><span className="setting-hint">切换默认使用的模型</span></div>
        <select value={s.provider} onChange={e => update('provider', e.target.value)} style={{ minWidth: 160 }}>
          {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>模型</span><span className="setting-hint">{currentProvider?.defaultModel}</span></div>
        <select value={s.model} onChange={e => update('model', e.target.value)} style={{ minWidth: 160 }}>
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>API Key</span><span className="setting-hint">本地加密存储，不上传服务器</span></div>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          <input type={apiKeyVisible ? 'text' : 'password'} value={s.apiKey} onChange={e => update('apiKey', e.target.value)} placeholder="sk-..." style={{ flex: 1, fontFamily: 'var(--font-mono)' }} />
          <button onClick={() => setApiKeyVisible((v: boolean) => !v)} style={{ padding: '0 8px', fontSize: 12 }}>{apiKeyVisible ? '隐藏' : '显示'}</button>
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>自定义 API 地址</span><span className="setting-hint">OpenAI 兼容格式</span></div>
        <input type="text" value={s.customBaseUrl} onChange={e => update('customBaseUrl', e.target.value)} placeholder="留空使用官方地址" style={{ flex: 1 }} />
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>温度</span><span className="setting-hint">创造性 0~1</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <input type="range" min="0" max="1" step="0.1" value={s.temperature} onChange={e => update('temperature', parseFloat(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-primary)' }} />
          <span style={{ color: 'var(--accent-primary)', fontSize: 12, minWidth: 28 }}>{s.temperature}</span>
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>最大 Token</span></div>
        <input type="number" value={s.maxTokens} onChange={e => update('maxTokens', parseInt(e.target.value) || 1024)} style={{ width: 100 }} />
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>全局快捷键</span></div>
        <input type="text" value={s.shortcut} readOnly style={{ width: 120, opacity: 0.6, cursor: 'default' }} />
      </div>
    </div>
  )
}

function renderEditorSection() {
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>编辑器外观</span></div>
      <SliderRow label="正文字号" desc="编辑区默认排版字号" min={14} max={22} step={1} value={17} displayValue="17px" />
      <SliderRow label="行高" desc="影响长文阅读舒适度" min={1.2} max={2.2} step={0.05} value={1.85} displayValue="1.85" />
      <SliderRow label="内容宽度" desc="单行显示的最大字符宽度" min={720} max={1200} step={20} value={1020} displayValue="1020px" />
    </div>
  )
}

function renderShortcutSection(s: any, update: any) {
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>快捷键</span><span className="settings-section-desc">自定义键盘快捷操作</span></div>
      <div className="shortcut-list">
        {[
          { key: 'Ctrl+/', desc: '唤起 AI 面板', action: 'ai_panel' },
          { key: 'Ctrl+S', desc: '保存文档', action: 'save' },
          { key: 'Ctrl+Z', desc: '撤销', action: 'undo' },
          { key: 'Ctrl+B', desc: '加粗', action: 'bold' },
          { key: 'Ctrl+I', desc: '斜体', action: 'italic' },
          { key: 'Ctrl+K', desc: '插入链接', action: 'link' },
        ].map((item, i) => (
          <div key={i} className="shortcut-row">
            <span className="shortcut-action">{item.desc}</span>
            <kbd className="shortcut-key">{item.key}</kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

function renderExportSection() {
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>导出</span><span className="settings-section-desc">默认导出格式与选项</span></div>
      <div className="setting-row">
        <div className="setting-label"><span>默认格式</span></div>
        <select style={{ minWidth: 160 }}>
          <option>Markdown</option>
          <option>PDF</option>
          <option>HTML</option>
          <option>Word</option>
        </select>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>样式集</span></div>
        <select style={{ minWidth: 160 }}>
          <option>Ocean</option>
          <option>Dark</option>
          <option>Minimal</option>
          <option>Candy</option>
        </select>
      </div>
      <ToggleRow icon="\uE617" title="导出时包含目录" desc="在开头自动插入文档目录" checked={true} onChange={(_v: boolean) => {}} />
      <div className="setting-divider" />
      <ToggleRow icon="\uE8CF" title="导出时包含行号" desc="代码块显示行号" checked={false} onChange={(_v: boolean) => {}} />
    </div>
  )
}

function renderSyncSection() {
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>同步与备份</span><span className="settings-section-desc">文档云同步与本地备份</span></div>
      
      <div className="sync-provider-grid">
        {SYNC_PROVIDERS.map(p => (
          <div key={p.id} className="sync-provider-card">
            <div className="sync-provider-icon">{p.id === 'git' ? '\uE8A6' : p.id === 'dropbox' ? '\uF103' : p.id === 'google' ? '\uF157' : '\uF305'}</div>
            <div className="sync-provider-info">
              <div className="sync-provider-name">{p.name}</div>
              <div className="sync-provider-desc">{p.desc}</div>
            </div>
            <div className="sync-status-dot" />
          </div>
        ))}
      </div>

      <div className="setting-divider" style={{ margin: '16px 0' }} />

      <div className="setting-row">
        <div className="setting-label"><span>自动备份间隔</span><span className="setting-hint">每隔多久自动保存快照</span></div>
        <select style={{ minWidth: 120 }}>
          <option>30 秒</option>
          <option>1 分钟</option>
          <option>5 分钟</option>
          <option>10 分钟</option>
        </select>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>备份保留数量</span><span className="setting-hint">最多保留的历史快照数</span></div>
        <input type="number" defaultValue={50} style={{ width: 80 }} />
      </div>
    </div>
  )
}

function renderAdvancedSection() {
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>高级</span><span className="settings-section-desc">开发者选项与调试</span></div>
      <ToggleRow icon="\uE90D" title="启用开发工具" desc="打开开发者调试面板" checked={false} onChange={(_v: boolean) => {}} />
      <div className="setting-divider" />
      <ToggleRow icon="\uE62C" title="禁用硬件加速" desc="解决渲染兼容性问题" checked={false} onChange={(_v: boolean) => {}} />
      <div className="setting-divider" />
      <div className="setting-row">
        <div className="setting-label"><span>日志级别</span></div>
        <select style={{ minWidth: 120 }}>
          <option>INFO</option>
          <option>DEBUG</option>
          <option>WARN</option>
          <option>ERROR</option>
        </select>
      </div>
    </div>
  )
}

function renderAboutSection() {
  return (
    <div className="settings-section" style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div className="about-logo">
        <div className="about-logo-icon">
          <span className="remix" style={{ fontSize: 40, color: 'var(--accent-primary)' }}>\uEACA</span>
        </div>
      </div>
      <div className="about-title">lzeditor</div>
      <div className="about-version">Version 0.1.0</div>
      <div className="about-desc">AI 集成 Markdown 编辑器 \u00B7 暗夜霓虹主题</div>
      <div className="about-desc2">基于 React + TipTap + Electron 构建</div>
      <div className="about-links">
        <a href="#" className="about-link">GitHub</a>
        <span className="about-sep">\u00B7</span>
        <a href="#" className="about-link">文档</a>
        <span className="about-sep">\u00B7</span>
        <a href="#" className="about-link">反馈</a>
      </div>
      <div className="about-copy">\u00A9 2026 lzeditor. All rights reserved.</div>
    </div>
  )
}

/* Helper Components */
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button className={`toggle-btn ${checked ? 'active' : ''}`} onClick={() => onChange(!checked)}>
    <span className="toggle-knob" />
  </button>
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
      <div className="slider-current-value"><span style={{ fontSize: 11, color: 'var(--amber)' }}>{displayValue}</span></div>
    </div>
  </div>
)
