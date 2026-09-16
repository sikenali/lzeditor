import React, { useState } from 'react'
import { useSettingsStore, saveSettingsToStorage, ACCENT_PRESETS, getAccentColor, DEFAULT_SETTINGS } from '../../store/settingsStore'
import { PROVIDERS, getProvider } from '../../services/aiProvider'
import type { AIModel, SettingsGroup } from '../../shared/types'
import { LANGUAGES } from '../../shared/languages'

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
  const activeGroup = useSettingsStore((s) => s.activeGroup)
  const setActiveGroup = useSettingsStore((s) => s.setActiveGroup)
  const updateSetting = useSettingsStore((s) => s.updateSetting)

  const [apiKeyVisible, setApiKeyVisible] = useState(false)

  const handleSave = () => {
    saveSettingsToStorage(useSettingsStore.getState())
    onClose()
  }

  const currentProvider = getProvider(useSettingsStore.getState().provider)
  const models: AIModel[] = currentProvider?.models || []

  const handleNavClick = (groupId: SettingsGroup) => {
    setActiveGroup(groupId)
  }

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
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>设置</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Preferences • {NAV_GROUPS.find(g => g.id === activeGroup)?.label || ''}</div>
            </div>
          </div>
          <div className="settings-header-actions">
            <button
              className="settings-reset-btn"
              onClick={() => {
                useSettingsStore.setState({ ...DEFAULT_SETTINGS })
                setActiveGroup('general')
              }}
            >
              <span className="remix ri-refresh-fill"></span>
              <span>恢复默认</span>
            </button>
            <button className="settings-close-btn" onClick={onClose}>
              <span className="remix ri-close-line"></span>
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
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Yu Writer</span>
                <span style={{ fontSize: 13, color: 'var(--amber)' }}>v0.9.8 alpha</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="settings-content">
            {activeGroup === 'general' && renderGeneralSection()}
            {activeGroup === 'appearance' && renderAppearanceSection()}
            {activeGroup === 'ai' && renderAISection(models, apiKeyVisible, setApiKeyVisible)}
            {activeGroup === 'editor' && renderEditorSection()}
            {activeGroup === 'shortcut' && renderShortcutSection()}
            {activeGroup === 'export' && renderExportSection()}
            {activeGroup === 'sync' && renderSyncSection()}
            {activeGroup === 'advanced' && renderAdvancedSection()}
            {activeGroup === 'about' && renderAboutSection()}
          </div>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <div className="settings-footer-left">
            <span className="remix ri-openai-fill"></span>
            <span>修改将在点击"完成"后生效</span>
          </div>
          <div className="settings-footer-right">
            <button className="settings-cancel-btn" onClick={onClose}>取消</button>
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

function getNavIcon(group: SettingsGroup): string {
  const icons: Record<SettingsGroup, string> = {
    general: 'ri-information-fill',
    editor: 'ri-edit-2-fill',
    appearance: 'ri-palette-fill',
    ai: 'ri-openai-fill',
    shortcut: 'ri-keyboard-fill',
    export: 'ri-download-2-line',
    sync: 'ri-refresh-fill',
    advanced: 'ri-rocket-fill',
    about: 'ri-information-fill',
  }
  return icons[group] || '\uF0E5'
}

function renderGeneralSection() {
  const theme = useSettingsStore.getState().theme
  const accentColor = useSettingsStore.getState().accentColor
  const showMarkdownMarkers = useSettingsStore.getState().showMarkdownMarkers
  const showDiffHighlight = useSettingsStore.getState().showDiffHighlight
  const typewriterMode = useSettingsStore.getState().typewriterMode
  const focusMode = useSettingsStore.getState().focusMode
  const updateSetting = useSettingsStore.getState().updateSetting

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title">
          <span>主题模式</span>
          <span className="settings-section-desc">选择界面的明暗风格</span>
        </div>
        <div className="segmented-control">
          {(['light', 'dark', 'system'] as const).map(m => (
            <button
              key={m}
              className={`segmented-btn ${theme === m ? 'active' : ''}`}
              onClick={() => updateSetting('theme', m)}
            >
              <span className="remix" style={{ fontSize: 15 }}>{m === 'light' ? '\uF1BC' : m === 'dark' ? '\uEF72' : 'ri-information-fill'}</span>
              <span>{m === 'light' ? '浅色' : m === 'dark' ? '深色' : '跟随系统'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          <span>强调色</span>
          <span className="settings-section-desc">用于选中态、主按钮与新增内容高亮</span>
        </div>
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
            <span className="remix ri-translate-2"></span>
          </button>
        </div>
        <div className="color-current-value">
          <span className="color-current-label">当前</span>
          <span className="color-current-hex" style={{ color: getAccentColor(accentColor) || accentColor }}>
            {ACCENT_PRESETS.find(p => p.id === accentColor)?.name || accentColor}
          </span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title"><span>显示选项</span></div>
        <ToggleRow
          icon="ri-checkbox-fill"
          title="Markdown 标记常显"
          desc="始终显示 ### 与列表符号"
          checked={showMarkdownMarkers !== false}
          onChange={(v) => updateSetting('showMarkdownMarkers', v)}
        />
        <div className="setting-divider" />
        <ToggleRow
          icon="ri-checkbox-fill"
          title="快照差异高亮"
          desc="红底为删除、绿底为新增"
          checked={showDiffHighlight !== false}
          onChange={(v) => updateSetting('showDiffHighlight', v)}
        />
        <div className="setting-divider" />
        <ToggleRow
          icon="ri-checkbox-fill"
          title="打字机模式"
          desc="光标始终居中垂直位置"
          checked={typewriterMode || false}
          onChange={(v) => updateSetting('typewriterMode', v)}
        />
        <div className="setting-divider" />
        <ToggleRow
          icon="ri-checkbox-fill"
          title="专注模式"
          desc="仅高亮当前段落，其余淡化"
          checked={focusMode || false}
          onChange={(v) => updateSetting('focusMode', v)}
        />
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

function renderAppearanceSection() {
  const editorFont = useSettingsStore.getState().editorFont
  const updateSetting = useSettingsStore.getState().updateSetting

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        <span>外观</span>
        <span className="settings-section-desc">界面视觉风格配置</span>
      </div>
      <div className="setting-row">
        <div className="setting-label">
          <span>界面语言</span>
          <span className="setting-hint">当前仅支持中文</span>
        </div>
        <select value="zh-CN" disabled style={{ minWidth: 160, opacity: 0.5 }}>
          <option>简体中文</option>
        </select>
      </div>
      <div className="setting-row">
        <div className="setting-label">
          <span>编辑器字体</span>
          <span className="setting-hint">代码与正文使用的字体</span>
        </div>
        <select
          value={editorFont || 'source-han'}
          onChange={(e) => updateSetting('editorFont', e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="source-han">Source Han Sans</option>
          <option value="jetbrains">JetBrains Mono</option>
          <option value="fira">Fira Code</option>
        </select>
      </div>
    </div>
  )
}

function renderAISection(models: AIModel[], apiKeyVisible: boolean, setApiKeyVisible: (v: boolean) => void) {
  const state = useSettingsStore.getState()
  const currentProvider = getProvider(state.provider)
  const updateSetting = useSettingsStore.getState().updateSetting

  return (
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
        <select
          value={state.provider}
          onChange={(e) => updateSetting('provider', e.target.value)}
          style={{ minWidth: 160 }}
        >
          {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="setting-row">
        <div className="setting-label">
          <span>模型</span>
          <span className="setting-hint">{currentProvider?.defaultModel}</span>
        </div>
        <select
          value={state.model}
          onChange={(e) => updateSetting('model', e.target.value)}
          style={{ minWidth: 160 }}
        >
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
            value={state.apiKey}
            onChange={(e) => updateSetting('apiKey', e.target.value)}
            placeholder="sk-..."
            style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
          />
          <button onClick={() => setApiKeyVisible(!apiKeyVisible)} style={{ padding: '0 8px', fontSize: 12 }}>
            {apiKeyVisible ? '隐藏' : '显示'}
          </button>
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-label">
          <span>自定义 API 地址</span>
          <span className="setting-hint">OpenAI 兼容格式</span>
        </div>
        <input
          type="text"
          value={state.customBaseUrl}
          onChange={(e) => updateSetting('customBaseUrl', e.target.value)}
          placeholder="留空使用官方地址"
          style={{ flex: 1 }}
        />
      </div>

      <div className="setting-row">
        <div className="setting-label">
          <span>温度</span>
          <span className="setting-hint">创造性 0~1</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={state.temperature}
            onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
          />
          <span style={{ color: 'var(--accent-primary)', fontSize: 12, minWidth: 28 }}>{state.temperature}</span>
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>最大 Token</span></div>
        <input
          type="number"
          value={state.maxTokens}
          onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value) || 1024)}
          style={{ width: 100 }}
        />
      </div>

      <div className="setting-row">
        <div className="setting-label"><span>全局快捷键</span></div>
        <input
          type="text"
          value={state.shortcut}
          readOnly
          style={{ width: 120, opacity: 0.6, cursor: 'default' }}
        />
      </div>
    </div>
  )
}

function renderEditorSection() {
  const state = useSettingsStore.getState()
  const updateSetting = useSettingsStore.getState().updateSetting

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        <span>编辑器外观</span>
        <span className="settings-section-desc">编辑区排版与布局</span>
      </div>
      <SliderRow
        label="正文字号"
        desc="编辑区默认排版字号"
        min={14}
        max={22}
        step={1}
        value={state.fontSize || 17}
        displayValue={`${state.fontSize || 17}px`}
        onChange={(v) => updateSetting('fontSize', v)}
      />
      <SliderRow
        label="行高"
        desc="影响长文阅读舒适度"
        min={1.2}
        max={2.2}
        step={0.05}
        value={state.lineHeight || 1.85}
        displayValue={`${state.lineHeight || 1.85}`}
        onChange={(v) => updateSetting('lineHeight', v)}
      />
      <SliderRow
        label="内容宽度"
        desc="单行显示的最大字符宽度"
        min={720}
        max={1200}
        step={20}
        value={state.contentWidth || 1020}
        displayValue={`${state.contentWidth || 1020}px`}
        onChange={(v) => updateSetting('contentWidth', v)}
      />
    </div>
  )
}

function renderShortcutSection() {
  const state = useSettingsStore.getState()
  const updateSetting = useSettingsStore.getState().updateSetting

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        <span>快捷键</span>
        <span className="settings-section-desc">自定义键盘快捷操作</span>
      </div>
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
  const state = useSettingsStore.getState()
  const updateSetting = useSettingsStore.getState().updateSetting

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        <span>导出</span>
        <span className="settings-section-desc">默认导出格式与选项</span>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>默认格式</span></div>
        <select
          value={state.exportFormat || 'markdown'}
          onChange={(e) => updateSetting('exportFormat', e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="markdown">Markdown</option>
          <option value="pdf">PDF</option>
          <option value="html">HTML</option>
          <option value="docx">Word</option>
        </select>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>样式集</span></div>
        <select
          value={state.styleSet || 'ocean'}
          onChange={(e) => updateSetting('styleSet', e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="ocean">Ocean</option>
          <option value="dark">Dark</option>
          <option value="minimal">Minimal</option>
          <option value="candy">Candy</option>
        </select>
      </div>
      <ToggleRow
        icon="ri-history-fill"
        title="导出时包含目录"
        desc="在开头自动插入文档目录"
        checked={state.includeTOC !== false}
        onChange={(v) => updateSetting('includeTOC', v)}
      />
      <div className="setting-divider" />
      <ToggleRow
        icon="ri-settings-3-fill"
        title="导出时包含行号"
        desc="代码块显示行号"
        checked={state.includeLineNumbers || false}
        onChange={(v) => updateSetting('includeLineNumbers', v)}
      />
    </div>
  )
}

function renderSyncSection() {
  const state = useSettingsStore.getState()
  const updateSetting = useSettingsStore.getState().updateSetting

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        <span>同步与备份</span>
        <span className="settings-section-desc">文档云同步与本地备份</span>
      </div>

      <div className="sync-provider-grid">
        {SYNC_PROVIDERS.map(p => (
          <div
            key={p.id}
            className={`sync-provider-card ${state.syncProvider === p.id ? 'selected' : ''}`}
            onClick={() => updateSetting('syncProvider', p.id)}
          >
            <div className="sync-provider-icon">
              {p.id === 'git' ? '\uEDBC' : p.id === 'dropbox' ? '\uEC6B' : p.id === 'google' ? '\uEDD4' : 'ri-webcam-fill'}
            </div>
            <div className="sync-provider-info">
              <div className="sync-provider-name">{p.name}</div>
              <div className="sync-provider-desc">{p.desc}</div>
            </div>
            <div className={`sync-status-dot ${state.syncProvider === p.id ? 'connected' : ''}`} />
          </div>
        ))}
      </div>

      <div className="setting-divider" style={{ margin: '16px 0' }} />

      <div className="setting-row">
        <div className="setting-label">
          <span>自动备份间隔</span>
          <span className="setting-hint">每隔多久自动保存快照</span>
        </div>
        <select
          value={state.backupInterval || '30s'}
          onChange={(e) => updateSetting('backupInterval', e.target.value)}
          style={{ minWidth: 120 }}
        >
          <option value="30s">30 秒</option>
          <option value="1m">1 分钟</option>
          <option value="5m">5 分钟</option>
          <option value="10m">10 分钟</option>
        </select>
      </div>
      <div className="setting-row">
        <div className="setting-label">
          <span>备份保留数量</span>
          <span className="setting-hint">最多保留的历史快照数</span>
        </div>
        <input
          type="number"
          value={state.backupKeep || 50}
          onChange={(e) => updateSetting('backupKeep', parseInt(e.target.value) || 50)}
          style={{ width: 80 }}
        />
      </div>
    </div>
  )
}

function renderAdvancedSection() {
  const state = useSettingsStore.getState()
  const updateSetting = useSettingsStore.getState().updateSetting

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        <span>高级</span>
        <span className="settings-section-desc">开发者选项与调试</span>
      </div>
      <ToggleRow
        icon="ri-rocket-fill"
        title="启用开发工具"
        desc="打开开发者调试面板"
        checked={state.devTools || false}
        onChange={(v) => updateSetting('devTools', v)}
      />
      <div className="setting-divider" />
      <ToggleRow
        icon="ri-pen-nib-fill"
        title="禁用硬件加速"
        desc="解决渲染兼容性问题"
        checked={state.hardwareAccel === false}
        onChange={(v) => updateSetting('hardwareAccel', !v)}
      />
      <div className="setting-divider" />
      <div className="setting-row">
        <div className="setting-label"><span>日志级别</span></div>
        <select
          value={state.logLevel || 'info'}
          onChange={(e) => updateSetting('logLevel', e.target.value)}
          style={{ minWidth: 120 }}
        >
          <option value="info">INFO</option>
          <option value="debug">DEBUG</option>
          <option value="warn">WARN</option>
          <option value="error">ERROR</option>
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
          <span className="remix ri-pen-nib-fill"></span>
        </div>
      </div>
      <div className="about-title">lzeditor</div>
      <div className="about-version">Version 0.1.0</div>
      <div className="about-desc">AI 集成 Markdown 编辑器 · 暗夜霓虹主题</div>
      <div className="about-desc2">基于 React + TipTap + Electron 构建</div>
      <div className="about-links">
        <a href="#" className="about-link">GitHub</a>
        <span className="about-sep">·</span>
        <a href="#" className="about-link">文档</a>
        <span className="about-sep">·</span>
        <a href="#" className="about-link">反馈</a>
      </div>
      <div className="about-copy">© 2026 lzeditor. All rights reserved.</div>
    </div>
  )
}

/* Helper Components */
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    className={`toggle-btn ${checked ? 'active' : ''}`}
    onClick={() => onChange(!checked)}
  >
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
      {onChange && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ display: 'none' }}
        />
      )}
    </div>
  </div>
)
