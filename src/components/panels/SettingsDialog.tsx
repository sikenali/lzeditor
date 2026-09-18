import React, { useState } from 'react'
import { useSettingsStore, saveSettingsToStorage, ACCENT_PRESETS, getAccentColor, DEFAULT_SETTINGS } from '../../store/settingsStore'
import { PROVIDERS, getProvider } from '../../services/aiProvider'
import type { AIModel, SettingsGroup } from '../../shared/types'
import { STYLE_SETS, applyStyleSet } from '../../styles/themes'
import { LFSInput } from '../../components/ui/LFInput'
import { LFSCombo } from '../../components/ui/LFSCombo'

const NAV_ITEMS: { id: SettingsGroup; label: string; icon: string }[] = [
  { id: 'theme', label: '主题设置', icon: 'ri-palette-fill' },
  { id: 'editor', label: '编辑设置', icon: 'ri-edit-2-fill' },
  { id: 'ai', label: 'AI 设置', icon: 'ri-openai-fill' },
  { id: 'shortcut', label: '快捷键设置', icon: 'ri-keyboard-fill' },
  { id: 'sync', label: '同步备份', icon: 'ri-refresh-line' },
  { id: 'about', label: '关于', icon: 'ri-information-fill' },
]

export const SettingsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const activeGroup = useSettingsStore((s) => s.activeGroup)
  const setActiveGroup = useSettingsStore((s) => s.setActiveGroup)
  const updateSetting = useSettingsStore((s) => s.updateSetting)

  const [apiKeyVisible, setApiKeyVisible] = useState(false)

  const handleSave = () => {
    saveSettingsToStorage(useSettingsStore.getState())
    onClose()
  }

  const handleReset = () => {
    useSettingsStore.setState({ ...DEFAULT_SETTINGS })
    setActiveGroup('theme')
  }

  const currentProvider = getProvider(useSettingsStore.getState().provider)
  const models: AIModel[] = currentProvider?.models || []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <div className="settings-title">
            <div className="settings-icon">
              <span className="remix ri-settings-3-fill"></span>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>设置</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{NAV_ITEMS.find(g => g.id === activeGroup)?.label || ''}</div>
            </div>
          </div>
          <div className="settings-header-actions">
            <button className="settings-action-btn" onClick={handleReset} title="恢复默认">
              <span className="remix ri-refresh-line"></span>
              <span>重置</span>
            </button>
            <button className="settings-action-btn settings-close-btn" onClick={onClose} title="关闭">
              <span className="remix ri-close-line"></span>
            </button>
          </div>
        </div>

        <div className="settings-body">
          {/* Sidebar */}
          <div className="settings-sidebar">
            {NAV_ITEMS.map(item => (
              <div
                key={item.id}
                className={`settings-nav-item ${activeGroup === item.id ? 'active' : ''}`}
                onClick={() => setActiveGroup(item.id)}
              >
                <span className={`remix nav-item-icon ${item.icon}`}></span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="settings-content">
            {activeGroup === 'theme' && renderThemeSection()}
            {activeGroup === 'editor' && renderEditorSection()}
            {activeGroup === 'ai' && renderAISection(models, apiKeyVisible, setApiKeyVisible)}
            {activeGroup === 'shortcut' && renderShortcutSection()}
            {activeGroup === 'sync' && renderSyncSection()}
            {activeGroup === 'about' && renderAboutSection()}
          </div>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <div className="settings-footer-left">
            <span className="remix ri-information-line"></span>
            <span>修改将立即生效</span>
          </div>
          <div className="settings-footer-right">
            <button className="settings-action-btn" onClick={onClose}>取消</button>
            <button className="settings-save-btn" onClick={handleSave}>
              <span className="remix ri-check-line"></span>
              <span>完成</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Theme Section ── */
function renderThemeSection() {
  const theme = useSettingsStore.getState().theme
  const accentColor = useSettingsStore.getState().accentColor
  const updateSetting = useSettingsStore.getState().updateSetting

  return (
    <>
      {/* Dark / Light mode — card style */}
      <div className="settings-section">
        <div className="settings-section-title"><span>主题模式</span></div>
        <div className="theme-mode-grid">
          {([
            { id: 'light', label: '浅色', icon: 'ri-sun-fill' },
            { id: 'dark', label: '深色', icon: 'ri-moon-fill' },
            { id: 'system', label: '跟随系统', icon: 'ri-laptop-fill' },
          ] as const).map(m => (
            <button
              key={m.id}
              className={`theme-mode-card ${theme === m.id ? 'active' : ''}`}
              onClick={() => updateSetting('theme', m.id)}
            >
              <span className={`remix theme-mode-icon ${m.icon}`}></span>
              <span className="theme-mode-label">{m.label}</span>
              {theme === m.id && <span className="remix theme-mode-check ri-check-line"></span>}
            </button>
          ))}
        </div>
      </div>

      {/* Style sets — card grid */}
      <div className="settings-section">
        <div className="settings-section-title"><span>样式集</span><span className="settings-section-desc">界面风格</span></div>
        <div className="theme-grid">
          {STYLE_SETS.map(s => (
            <button key={s.id} className="theme-card" onClick={() => applyStyleSet(s.id)}>
              <div className="theme-preview" style={{ background: s.preview.bg }}>
                <div style={{ width: '100%', height: 8, background: s.preview.accent, borderRadius: 2, marginBottom: 4 }} />
                <div style={{ width: '60%', height: 4, background: 'rgba(128,128,128,0.3)', borderRadius: 2 }} />
              </div>
              <span className="theme-name">{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div className="settings-section">
        <div className="settings-section-title"><span>强调色</span><span className="settings-section-desc">选中态、主按钮与高亮</span></div>
        <div className="color-picker-row">
          {ACCENT_PRESETS.map(p => (
            <button
              key={p.id}
              className={`color-swatch ${accentColor === p.id ? 'active' : ''}`}
              onClick={() => updateSetting('accentColor', p.id)}
              title={p.name}
            >
              <span className="color-swatch-bg" style={{ background: p.color }} />
              {accentColor === p.id && <span className="remix color-swatch-check ri-check-line"></span>}
            </button>
          ))}
          <button
            className="color-swatch color-swatch-custom"
            title="自定义颜色"
            onClick={() => {
              const c = prompt('输入颜色值 (如 #FF0000):')
              if (c) {
                const hex = c.startsWith('#') ? c : '#' + c
                updateSetting('accentColor', hex)
              }
            }}
          >
            <span className="remix ri-add-line"></span>
          </button>
        </div>
        <div className="color-current-value" style={{ marginTop: 8 }}>
          <span className="color-current-label">当前</span>
          <span className="color-current-hex" style={{ color: getAccentColor(accentColor) || accentColor }}>
            {ACCENT_PRESETS.find(p => p.id === accentColor)?.name || accentColor}
          </span>
        </div>
      </div>
    </>
  )
}

/* ── Editor Section ── */
function renderEditorSection() {
  const state = useSettingsStore.getState()
  const updateSetting = useSettingsStore.getState().updateSetting

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>排版</span><span className="settings-section-desc">编辑区布局与字号</span></div>
        <SliderRow label="正文字号" desc="编辑区默认字号" min={14} max={22} step={1} value={state.fontSize || 17} displayValue={`${state.fontSize || 17}px`} onChange={(v) => updateSetting('fontSize', v)} />
        <SliderRow label="行高" desc="长文阅读舒适度" min={1.2} max={2.2} step={0.05} value={state.lineHeight || 1.85} displayValue={`${state.lineHeight || 1.85}`} onChange={(v) => updateSetting('lineHeight', v)} />
        <SliderRow label="内容宽度" desc="单行最大字符宽度" min={720} max={1200} step={20} value={state.contentWidth || 1020} displayValue={`${state.contentWidth || 1020}px`} onChange={(v) => updateSetting('contentWidth', v)} />
      </div>

      <div className="settings-section">
        <div className="settings-section-title"><span>编辑器选项</span></div>
        <ToggleRow icon="ri-markdown-fill" title="Markdown 标记常显" desc="始终显示 ### 与列表符号" checked={state.showMarkdownMarkers !== false} onChange={(v) => updateSetting('showMarkdownMarkers', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-diff-fill" title="快照差异高亮" desc="红底为删除、绿底为新增" checked={state.showDiffHighlight !== false} onChange={(v) => updateSetting('showDiffHighlight', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-cursor-fill" title="打字机模式" desc="光标始终居中垂直位置" checked={state.typewriterMode || false} onChange={(v) => updateSetting('typewriterMode', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-focus-3" title="专注模式" desc="仅高亮当前段落，其余淡化" checked={state.focusMode || false} onChange={(v) => updateSetting('focusMode', v)} />
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

/* ── AI Section ── */
function renderAISection(models: AIModel[], apiKeyVisible: boolean, setApiKeyVisible: (v: boolean) => void) {
  const state = useSettingsStore.getState()
  const currentProvider = getProvider(state.provider)
  const updateSetting = useSettingsStore.getState().updateSetting

  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>AI 设置</span><span className="settings-section-desc">配置大语言模型连接</span></div>

      <div className="setting-row">
        <div className="setting-label"><span>AI 提供商</span><span className="setting-hint">切换默认使用的模型</span></div>
        <LFSCombo value={state.provider} onChange={(v) => updateSetting('provider', v)} options={PROVIDERS.map(p => ({ value: p.id, label: p.name }))} />
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>模型</span><span className="setting-hint">{currentProvider?.defaultModel}</span></div>
        <LFSCombo value={state.model} onChange={(v) => updateSetting('model', v)} options={models.map(m => ({ value: m.id, label: m.name }))} />
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>API Key</span><span className="setting-hint">本地加密存储，不上传服务器</span></div>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          <LFSInput type={apiKeyVisible ? 'text' : 'password'} value={state.apiKey} onChange={(v) => updateSetting('apiKey', v)} placeholder="sk-..." style={{ flex: 1, fontFamily: 'var(--font-mono)' }} />
          <button onClick={() => setApiKeyVisible(!apiKeyVisible)} style={{ padding: '0 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-code)', color: 'var(--text-secondary)', cursor: 'pointer' }}>{apiKeyVisible ? '隐藏' : '显示'}</button>
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>自定义 API 地址</span><span className="setting-hint">OpenAI 兼容格式</span></div>
        <LFSInput type="text" value={state.customBaseUrl} onChange={(v) => updateSetting('customBaseUrl', v)} placeholder="留空使用官方地址" style={{ flex: 1 }} />
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>温度</span><span className="setting-hint">创造性 0~1</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <input type="range" min="0" max="1" step="0.1" value={state.temperature} onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-primary)' }} />
          <span style={{ color: 'var(--accent-primary)', fontSize: 12, minWidth: 28 }}>{state.temperature}</span>
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>最大 Token</span></div>
        <LFSInput type="number" value={state.maxTokens} onChange={(v) => updateSetting('maxTokens', parseInt(v) || 1024)} style={{ width: 100 }} />
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>全局快捷键</span></div>
        <LFSInput type="text" value={state.shortcut} onChange={() => {}} readOnly style={{ width: 120, opacity: 0.6, cursor: 'default' }} />
      </div>
    </div>
  )
}

/* ── Shortcut Section ── */
function renderShortcutSection() {
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>快捷键设置</span><span className="settings-section-desc">常用操作的键盘快捷方式</span></div>
      <div className="shortcut-list">
        {[
          { key: 'Ctrl+N', desc: '新建文件' },
          { key: 'Ctrl+P', desc: '预览模式' },
          { key: 'Ctrl+Shift+Y', desc: '代码模式' },
          { key: 'Ctrl+Shift+O', desc: '大纲模式' },
          { key: 'Ctrl+/', desc: 'AI 面板' },
          { key: 'Ctrl+Shift+E', desc: '导出文件' },
        ].map((item, i) => (
          <div key={i} className="shortcut-row">
            <span className="shortcut-action">{item.desc}</span>
            <kbd className="shortcut-key">{item.key}</kbd>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-code)', border: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <span className="remix ri-information-fill" style={{ color: 'var(--accent-primary)', marginRight: 6 }}></span>
        Markdown 编辑器本身的快捷键（粗体、斜体等）由 TipTap 默认提供，无需额外配置。
      </div>
    </div>
  )
}

/* ── Sync Section ── */
function renderSyncSection() {
  const state = useSettingsStore.getState()
  const updateSetting = useSettingsStore.getState().updateSetting

  const SYNC_PROVIDERS = [
    { id: 'git', name: 'Git', desc: '本地 Git 版本控制', icon: 'ri-git-branch-fill' },
    { id: 'dropbox', name: 'Dropbox', desc: '云同步到 Dropbox', icon: 'ri-dropbox-fill' },
    { id: 'google', name: 'Google Drive', desc: '云同步到 Google Drive', icon: 'ri-google-fill' },
    { id: 'webdav', name: 'WebDAV', desc: '自定义 WebDAV 服务器', icon: 'ri-webcam-fill' },
  ]

  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>同步备份</span><span className="settings-section-desc">文档云同步与本地备份</span></div>

      <div className="sync-provider-grid">
        {SYNC_PROVIDERS.map(p => (
          <div key={p.id} className={`sync-provider-card ${state.syncProvider === p.id ? 'selected' : ''}`} onClick={() => updateSetting('syncProvider', p.id)}>
            <div className="sync-provider-icon"><span className={`remix ${p.icon}`}></span></div>
            <div className="sync-provider-info"><div className="sync-provider-name">{p.name}</div><div className="sync-provider-desc">{p.desc}</div></div>
            <div className={`sync-status-dot ${state.syncProvider === p.id ? 'connected' : ''}`} />
          </div>
        ))}
      </div>

      <div className="setting-divider" style={{ margin: '16px 0' }} />

      <div className="setting-row">
        <div className="setting-label"><span>自动备份间隔</span><span className="setting-hint">每隔多久自动保存快照</span></div>
        <LFSCombo value={state.backupInterval || '30s'} onChange={(v) => updateSetting('backupInterval', v)} options={[{ value: '30s', label: '30 秒' }, { value: '1m', label: '1 分钟' }, { value: '5m', label: '5 分钟' }, { value: '10m', label: '10 分钟' }]} />
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>备份保留数量</span><span className="setting-hint">最多保留的历史快照数</span></div>
        <LFSInput type="number" value={state.backupKeep || 50} onChange={(v) => updateSetting('backupKeep', parseInt(v) || 50)} style={{ width: 100 }} />
      </div>
    </div>
  )
}

/* ── About Section ── */
function renderAboutSection() {
  return (
    <div className="settings-section" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div className="about-logo">
        <div className="about-logo-icon">
          <span className="remix ri-pen-nib-fill"></span>
        </div>
      </div>
      <div className="about-title">lzeditor</div>
      <div className="about-desc">AI 集成 Markdown 编辑器</div>
      <div className="about-desc2">基于 React + TipTap + Electron 构建</div>
      <div className="about-links">
        <a href="#" className="about-link">GitHub</a>
        <span className="about-sep">·</span>
        <a href="#" className="about-link">文档</a>
        <span className="about-sep">·</span>
        <a href="#" className="about-link">反馈</a>
      </div>
      <div className="about-copy">© 2026 lzeditor</div>
    </div>
  )
}

/* ── Shared helper components ── */
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button className={`toggle-btn ${checked ? 'active' : ''}`} onClick={() => onChange(!checked)}>
    <span className="toggle-knob" />
  </button>
)

const ToggleRow: React.FC<{ icon: string; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }> = ({ icon, title, desc, checked, onChange }) => (
  <div className="toggle-row">
    <div className="toggle-row-left">
      <span className={`remix toggle-icon ${icon}`} style={{ fontSize: 16 }}></span>
      <div className="toggle-text"><span className="toggle-title">{title}</span><span className="toggle-desc">{desc}</span></div>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
)

const SliderRow: React.FC<{ label: string; desc: string; min: number; max: number; step: number; value: number; displayValue: string; onChange?: (v: number) => void }> = ({ label, desc, min, max, step, value, displayValue, onChange }) => (
  <div className="setting-row" style={{ marginBottom: 20 }}>
    <div className="setting-label">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="setting-hint">{desc}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 20 }}>{min}</span>
      <div className="slider-track">
        <div className="slider-fill" style={{ width: `${((value - min) / (max - min)) * 100}%` }} />
        <div className="slider-thumb" style={{ left: `${((value - min) / (max - min)) * 100}%` }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 20 }}>{max}</span>
      <div className="slider-current-value"><span style={{ fontSize: 11, color: 'var(--amber)' }}>{displayValue}</span></div>
      {onChange && <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ display: 'none' }} />}
    </div>
  </div>
)
