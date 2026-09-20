import React, { useState, useRef, useEffect } from 'react'
import { useSettingsStore, saveSettingsToStorage, ACCENT_PRESETS, getAccentColor, DEFAULT_SETTINGS } from '../../store/settingsStore'
import { PROVIDERS, getProvider } from '../../services/aiProvider'
import type { AIModel, SettingsGroup } from '../../shared/types'
import { TYPOGRAPHY_THEMES, applyTypographyTheme } from '../../styles/typography-themes'
import { CODE_THEMES, getCodeTheme } from '../../styles/code-themes'
import { LFSInput } from '../../components/ui/LFInput'
import { LFSCombo } from '../../components/ui/LFSCombo'

/* ── Nav categories ── */
const NAV_ITEMS: { id: SettingsGroup; label: string; icon: string }[] = [
  { id: 'theme',     label: '主题设置', icon: 'ri-palette-fill' },
  { id: 'editor',    label: '编辑设置', icon: 'ri-edit-2-fill' },
  { id: 'ai',        label: 'AI 设置',  icon: 'ri-openai-fill' },
  { id: 'shortcut',  label: '快捷键设置', icon: 'ri-keyboard-fill' },
  { id: 'sync',      label: '同步备份', icon: 'ri-refresh-line' },
  { id: 'about',     label: '关于',     icon: 'ri-information-fill' },
]
type SubTab = { id: string; label: string; icon: string }

/* ── Sub-tab definitions per category ── */
const THEME_SUBS: SubTab[] = [
  { id: 'mode',          label: '主题模式', icon: 'ri-sun-fill' },
  { id: 'typography',    label: '排版样式', icon: 'ri-font-size' },
  { id: 'code-theme',    label: '代码样式', icon: 'ri-code-box-line' },
  { id: 'accent',        label: '图标颜色', icon: 'ri-circle-fill' },
]
const EDITOR_SUBS: SubTab[] = [
  { id: 'general',   label: '通用设置', icon: 'ri-settings-3-line' },
  { id: 'local',     label: '本地化',   icon: 'ri-translate-2' },
  { id: 'mode',      label: '编辑模式', icon: 'ri-edit-2-line' },
]

const AI_SUBS: SubTab[] = [
  { id: 'default',   label: '默认供应商', icon: 'ri-star-fill' },
  { id: 'custom',    label: '自定义供应商', icon: 'ri-code-s-line' },
]

const SHORTCUT_SUBS: SubTab[] = [
  { id: 'doc',       label: '文档操作', icon: 'ri-file-lines-line' },
  { id: 'edit',      label: '编辑操作', icon: 'ri-text-spacing' },
  { id: 'common',    label: '常规操作', icon: 'ri-list-check' },
  { id: 'heading',   label: '标题与段落', icon: 'ri-h-1' },
  { id: 'code',      label: '代码块', icon: 'ri-code-box-line' },
  { id: 'app',       label: '应用级',   icon: 'ri-apps-line' },
]

const SYNC_SUBS: SubTab[] = [
  { id: 'net',       label: '网络备份', icon: 'ri-cloud-line' },
  { id: 'nas',       label: 'NAS备份',  icon: 'ri-hard-drive-2-line' },
]

/* ── Top 10 AI providers ── */
const PROVIDER_CONFIG: Record<string, { icon: string; color: string }> = {
  'claude-3-5-sonnet-20241022': { icon: 'ri-robot-line',     color: '#7B61FF' },
  'gpt-4o':                     { icon: 'ri-brain-line',     color: '#10A37F' },
  'gpt-4o-mini':                { icon: 'ri-brain-line',     color: '#10A37F' },
  'qwen-max':                   { icon: 'ri-alibaba-cloud-fill', color: '#FF6A00' },
  'deepseek-chat':              { icon: 'ri-rocket-2-line',  color: '#7B61FF' },
  'gemini-pro':                 { icon: 'ri-sparkling-line', color: '#4285F4' },
  'claude-3-opus-20240229':     { icon: 'ri-robot-line',     color: '#7B61FF' },
  'gpt-4-turbo':                { icon: 'ri-brain-line',     color: '#10A37F' },
  'qwen-plus':                  { icon: 'ri-alibaba-cloud-fill', color: '#FF6A00' },
  'claude-3-haiku-20240307':    { icon: 'ri-robot-line',     color: '#7B61FF' },
}
const TOP_PROVIDERS: (AIModel & { icon: string; color: string })[] = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet',  maxTokens: 8192, supportsStreaming: true, icon: 'ri-robot-line',     color: '#7B61FF' },
  { id: 'gpt-4o',                     name: 'GPT-4o',             maxTokens: 4096, supportsStreaming: true, icon: 'ri-brain-line',     color: '#10A37F' },
  { id: 'gpt-4o-mini',                name: 'GPT-4o Mini',        maxTokens: 4096, supportsStreaming: true, icon: 'ri-brain-line',     color: '#10A37F' },
  { id: 'qwen-max',                   name: '通义千问 Qwen Max',  maxTokens: 8192, supportsStreaming: true, icon: 'ri-alibaba-cloud-fill', color: '#FF6A00' },
  { id: 'deepseek-chat',              name: 'DeepSeek V3',        maxTokens: 8192, supportsStreaming: true, icon: 'ri-rocket-2-line',  color: '#7B61FF' },
  { id: 'gemini-pro',                 name: 'Gemini 1.5 Pro',     maxTokens: 8192, supportsStreaming: true, icon: 'ri-sparkling-line', color: '#4285F4' },
  { id: 'claude-3-opus-20240229',     name: 'Claude 3 Opus',      maxTokens: 4096, supportsStreaming: true, icon: 'ri-robot-line',     color: '#7B61FF' },
  { id: 'gpt-4-turbo',                name: 'GPT-4 Turbo',        maxTokens: 4096, supportsStreaming: true, icon: 'ri-brain-line',     color: '#10A37F' },
  { id: 'qwen-plus',                  name: '通义千问 Qwen Plus', maxTokens: 8192, supportsStreaming: true, icon: 'ri-alibaba-cloud-fill', color: '#FF6A00' },
  { id: 'claude-3-haiku-20240307',    name: 'Claude 3 Haiku',     maxTokens: 4096, supportsStreaming: true, icon: 'ri-robot-line',     color: '#7B61FF' },
]

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

export const SettingsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const activeGroup   = useSettingsStore(s => s.activeGroup)
  const setActiveGroup = useSettingsStore(s => s.setActiveGroup)
  const setSubTab      = useSettingsStore(s => s.setSubTab)
  const updateSetting  = useSettingsStore(s => s.updateSetting)
  const subTab = useSettingsStore(s => s.subTab ?? '')

  const subs: SubTab[] = activeGroup === 'theme'     ? THEME_SUBS
             : activeGroup === 'editor'    ? EDITOR_SUBS
             : activeGroup === 'ai'        ? AI_SUBS
             : activeGroup === 'shortcut'  ? SHORTCUT_SUBS
             : activeGroup === 'sync'      ? SYNC_SUBS
             : []

  const sidebarRef = useRef<HTMLDivElement>(null)
  const subnavRef = useRef<HTMLDivElement>(null)

  // Measure and set column widths based on longest label
  useEffect(() => {
    const measureWidth = (items: { label: string }[], padding = 56) => {
      if (!items.length) return 0
      const span = document.createElement('span')
      span.style.cssText = 'position:absolute;top:-9999px;left:-9999px;font-size:14px;font-family:var(--font-sans);white-space:nowrap;'
      document.body.appendChild(span)
      const maxW = Math.max(...items.map(it => {
        span.textContent = it.label
        return span.offsetWidth
      }))
      document.body.removeChild(span)
      return maxW + padding
    }
    const sw = sidebarRef.current
    const nw = subnavRef.current
    if (sw) sw.style.width = measureWidth(NAV_ITEMS, 56) + 'px'
    if (nw) nw.style.width = measureWidth(subs, 56) + 'px'
  }, [activeGroup, subTab])

  // Set subTab to first tab on mount, or when switching categories
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      // First mount: set to first tab of current group
      mountedRef.current = true
      if (subs.length) setSubTab(subs[0].id)
      return
    }
    // Switching category: reset to first tab
    setSubTab(subs[0]?.id ?? '')
  }, [activeGroup])
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [customBaseUrl, setCustomBaseUrl] = useState('')
  const [customModelId, setCustomModelId]   = useState('')
  const [customName, setCustomName]         = useState('')

  const handleSave = () => {
    saveSettingsToStorage(useSettingsStore.getState())
    onClose()
  }
  const handleReset = () => {
    useSettingsStore.setState({ ...DEFAULT_SETTINGS })
    setActiveGroup('theme'); setSubTab('mode')
  }

  const currentProvider = getProvider(useSettingsStore.getState().provider)
  const models: AIModel[] = currentProvider?.models || []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <div className="settings-title">
            <div className="settings-icon"><span className="remix ri-settings-3-fill"></span></div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>设置</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                {NAV_ITEMS.find(g => g.id === activeGroup)?.label}
                {activeGroup !== 'about' && ` · ${subs.find(t => t.id === subTab)?.label}`}
              </div>
            </div>
          </div>
          <div className="settings-header-actions">
            <button className="settings-action-btn" onClick={handleReset} title="恢复默认">
              <span className="remix ri-refresh-line"></span><span>重置</span>
            </button>
            <button className="settings-action-btn settings-close-btn" onClick={onClose} title="关闭">
              <span className="remix ri-close-line"></span>
            </button>
          </div>
        </div>

        <div className="settings-body">
          {/* ── Left: main nav ── */}
          <div className="settings-sidebar" ref={sidebarRef}>
            {NAV_ITEMS.map(item => (
              <div
                key={item.id}
                className={`settings-nav-item ${activeGroup === item.id ? 'active' : ''}`}
                onClick={() => { setActiveGroup(item.id); setSubTab(subs[0]?.id ?? 'mode'); }}
              >
                <span className={`remix nav-item-icon ${item.icon}`}></span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* ── Middle: sub-tabs ── */}
          {activeGroup !== 'about' && (
            <div className="settings-subnav" ref={subnavRef}>
              {subs.map(tab => (
                <button
                  key={tab.id}
                  className={`settings-subtab-btn ${subTab === tab.id ? 'active' : ''}`}
                  onClick={() => setSubTab(tab.id)}
                >
                  <span className={`subtab-icon remix nav-item-icon ${tab.icon}`}></span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Right: content ── */}
          <div className="settings-content">
            {activeGroup === 'theme' && renderThemeContent(subTab)}
            {activeGroup === 'editor' && renderEditorContent(subTab)}
            {activeGroup === 'ai'      && renderAIContent(subTab, models, apiKeyVisible, setApiKeyVisible, customBaseUrl, setCustomBaseUrl, customModelId, setCustomModelId, customName, setCustomName)}
            {activeGroup === 'shortcut' && renderShortcutContent(subTab)}
            {activeGroup === 'sync'    && renderSyncContent(subTab)}
            {activeGroup === 'about'   && renderAboutSection()}
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
              <span className="remix ri-check-line"></span><span>完成</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   THEME
═══════════════════════════════════════════ */
function renderThemeContent(tab: string) {
  const theme   = useSettingsStore.getState().theme
  const accent  = useSettingsStore.getState().accentColor
  const update  = useSettingsStore.getState().updateSetting

  if (tab === 'mode') return (
    <div className="settings-section">
      <div className="settings-section-title"><span>主题模式</span></div>
      <div className="theme-mode-grid">
        {([
          { id: 'light', label: '浅色', icon: 'ri-sun-fill' },
          { id: 'dark',  label: '深色', icon: 'ri-moon-fill' },
          { id: 'system',label: '跟随系统', icon: 'ri-laptop-fill' },
        ] as const).map(m => (
          <button key={m.id} className={`theme-mode-card ${theme === m.id ? 'active' : ''}`} onClick={() => update('theme', m.id)}>
            <span className={`remix theme-mode-icon ${m.icon}`}></span>
            <span className="theme-mode-label">{m.label}</span>
            {theme === m.id && <span className="remix theme-mode-check ri-check-line"></span>}
          </button>
        ))}
      </div>
    </div>
  )

  if (tab === 'typography') {
    const activeId = useSettingsStore.getState().typographyTheme || 'classic'
    return (
      <div className="settings-section">
        <div className="settings-section-title"><span>排版样式</span><span className="settings-section-desc">文章内容的视觉风格，影响预览与导出</span></div>
        <div className="theme-grid">
          {TYPOGRAPHY_THEMES.map(t => (
            <button
              key={t.id}
              className={`theme-card ${activeId === t.id ? 'active' : ''}`}
              onClick={() => { applyTypographyTheme(t.id); useSettingsStore.getState().updateSetting('typographyTheme', t.id) }}
            >
              <div
                className="theme-preview typography-preview"
                style={{ background: t.id === 'night' ? '#1a1b26' : t.id === 'magazine' || t.id === 'ink' ? '#fff' : '#fafafa', minHeight: 80 }}
              >
                <div style={{ padding: '6px 8px', fontSize: 9, lineHeight: 1.5, color: t.id === 'night' ? '#c6cade' : '#333' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: t.color, marginBottom: 2 }}>标题示例</div>
                  <div style={{ fontSize: 8, color: 'rgba(128,128,128,0.7)', borderBottom: `1px solid ${t.color}33`, paddingBottom: 2, marginBottom: 2 }}>二级标题装饰线</div>
                  <div style={{ fontSize: 8, color: 'rgba(128,128,128,0.6)' }}>正文文字 · <code style={{ background: `${t.color}18`, color: t.color, padding: '0 3px', borderRadius: 2, fontSize: 7 }}>行内代码</code></div>
                  <div style={{ fontSize: 8, color: 'rgba(128,128,128,0.5)', marginTop: 2 }}>引用文字样例</div>
                </div>
              </div>
              <span className="theme-name">{t.name}</span>
              <span className="theme-tag" style={{ color: t.color, fontSize: 10 }}>{t.tag}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (tab === 'code-theme') {
    const activeId = useSettingsStore.getState().codeTheme || 'atom-one-dark'
    const activeMac = useSettingsStore.getState().macCodeBlock || false
    const update = useSettingsStore.getState().updateSetting
    return (
      <div className="settings-section">
        <div className="settings-section-title"><span>代码样式</span><span className="settings-section-desc">代码块的高亮主题</span></div>
        <div className="theme-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {CODE_THEMES.map(t => (
            <button
              key={t.id}
              className={`theme-card ${activeId === t.id ? 'active' : ''}`}
              onClick={() => update('codeTheme', t.id)}
            >
              <div className="theme-preview code-theme-preview" style={{ background: t.macBg, padding: '8px 10px' }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
                </div>
                <code style={{ fontSize: 8, fontFamily: 'monospace', color: t.swatch[1], display: 'block' }}>
                  <span style={{ color: t.swatch[2] }}>def</span> <span style={{ color: t.swatch[3] }}>hello</span>():
                  {'\n'}  <span style={{ color: t.swatch[4] }}>return</span> <span style={{ color: t.swatch[5] }}>"hi"</span>
                </code>
              </div>
              <span className="theme-name">{t.name}</span>
              <span className="theme-tag" style={{ fontSize: 10 }}>{t.dark ? '暗色' : '亮色'}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <div className="setting-row" style={{ alignItems: 'center' }}>
            <div className="setting-label"><span>Mac 风格窗口</span><span className="setting-hint">代码块添加红黄绿三点装饰栏</span></div>
            <span className={`beautify-toggle ${activeMac ? 'on' : ''}`} onClick={() => update('macCodeBlock', !activeMac)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>图标颜色</span><span className="settings-section-desc">选中态、主按钮与高亮</span></div>
      <div className="color-picker-row">
        {ACCENT_PRESETS.map(p => (
          <button key={p.id} className={`color-swatch ${accent === p.id ? 'active' : ''}`} onClick={() => update('accentColor', p.id)} title={p.name}>
            <span className="color-swatch-bg" style={{ background: p.color }} />
            {accent === p.id && <span className="remix color-swatch-check ri-check-line"></span>}
          </button>
        ))}
        <button className="color-swatch color-swatch-custom" title="自定义颜色" onClick={() => {
          const c = prompt('输入颜色值 (如 #FF0000):')
          if (c) update('accentColor', c.startsWith('#') ? c : '#' + c)
        }}>
          <span className="remix ri-add-line"></span>
        </button>
      </div>
      <div className="color-current-value" style={{ marginTop: 8 }}>
        <span className="color-current-label">当前</span>
        <span className="color-current-hex" style={{ color: getAccentColor(accent) || accent }}>
          {ACCENT_PRESETS.find(p => p.id === accent)?.name || accent}
        </span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   EDITOR
═══════════════════════════════════════════ */
function renderEditorContent(tab: string) {
  const s = useSettingsStore.getState()
  const u = useSettingsStore.getState().updateSetting

  if (tab === 'general') return renderGeneralSection(s, u)
  if (tab === 'local')   return renderLocalizationSection(s, u)
  return renderEditModeSection(s, u)
}

function renderGeneralSection(s: any, u: any) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>排版</span><span className="settings-section-desc">字体、字号与行距</span></div>
        <div className="setting-row" style={{ marginBottom: 16 }}>
          <div className="setting-label"><span>默认字体</span><span className="setting-hint">编辑区默认字体族</span></div>
          <select className="lfs-input" value={s.editorFont || 'sans-serif'} onChange={e => u('editorFont', e.target.value)} style={{ flex: 1, maxWidth: 280 }}>
            {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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
        <div className="settings-section-title"><span>标题样式</span><span className="settings-section-desc">为各级标题添加装饰</span></div>
        {(['h1','h2','h3','h4','h5','h6'] as const).map(level => (
          <div key={level} className="setting-row" style={{ marginBottom: 10 }}>
            <div className="setting-label"><span>{level.toUpperCase()}</span></div>
            <div className="segmented-control" style={{ flex: 1 }}>
              {([
                { v: 'default',  l: '默认' },
                { v: 'color-only',       l: '主题色' },
                { v: 'border-bottom',    l: '下划线' },
                { v: 'border-left',      l: '左侧线' },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  className={`segmented-btn ${(s.headingStyles?.[level] ?? 'default') === opt.v ? 'active' : ''}`}
                  onClick={() => {
                    const hs = { ...(s.headingStyles ?? {}) }
                    if (opt.v === 'default') delete hs[level]
                    else hs[level] = opt.v
                    u('headingStyles', hs)
                  }}
                >{opt.l}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>段落排版</span><span className="settings-section-desc">首行缩进与对齐方式</span></div>
        <ToggleRow icon="ri-text-spacing" title="首行缩进" desc="每个段落首行缩进两个字符" checked={s.textIndent || false} onChange={v => u('textIndent', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-align-justify" title="两端对齐" desc="段落文字左右两端对齐" checked={s.textJustify || false} onChange={v => u('textJustify', v)} />
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>效果预览</span><span className="settings-section-desc">当前设置预览</span></div>
        <div className="preview-card" style={{ fontFamily: s.editorFont === 'serif' ? 'var(--font-sans)' : (s.editorFont || 'sans-serif'), fontSize: `${s.defaultFontSize || 17}px`, lineHeight: s.lineHeight || '1.5', ...(s.textIndent ? { textAlign: 'justify' } : {}), ...(s.textJustify ? { textAlign: 'justify' } : {}) }}>
          {s.textIndent && <div className="preview-text-line" style={{ textIndent: '2em' }}><span className="preview-text">首行缩进示例：这是一个段落，首行会缩进两个字符。</span></div>}
          <div className="preview-title-line"><span className="preview-hash">###</span><span className="preview-text">Praesent varius diam</span></div>
          <div className="preview-text-line"><span className="preview-text">Nam id imperdiet turpis.</span><span className="preview-deleted">mollis</span><span className="preview-text">vestibulum eros.</span><span className="preview-added">sed hendrerit</span></div>
          <div className="preview-text-line"><span className="preview-selected">当前选中段落</span><span className="preview-text">aliquam pellentesque vehicula sapien.</span></div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
          <span>字体：{s.editorFont === 'serif' ? '衬线' : s.editorFont === 'monospace' ? '等宽' : '无衬线'}</span>
          <span>字号：{s.defaultFontSize || 17}px</span>
          <span>行高：{s.lineHeight || '1.5'}</span>
          <span>宽度：{s.contentWidth || '1024'}px</span>
          {s.textIndent && <span style={{ color: 'var(--accent-primary)' }}>首行缩进</span>}
          {s.textJustify && <span style={{ color: 'var(--accent-primary)' }}>两端对齐</span>}
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>工具栏</span><span className="settings-section-desc">按钮显示与布局</span></div>
        <ToggleRow icon="ri-apps-2-fill" title="显示所有工具栏按钮" desc="关闭后仅显示：格式、图片、链接、插入" checked={s.showAllToolbarButtons !== false} onChange={v => u('showAllToolbarButtons', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-text" title="显示工具栏按钮标题" desc="关闭后仅显示图标，不显示文字" checked={s.showToolbarLabels !== false} onChange={v => u('showToolbarLabels', v)} />
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>启动</span><span className="settings-section-desc">应用程序行为</span></div>
        <ToggleRow icon="ri-window-fill"  title="启动标签页" desc="应用启动时显示多文档标签栏" checked={s.enableTabs !== false} onChange={v => u('enableTabs', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-clipboard-fill" title="启动保存剪切板内容" desc="每次启动时自动保存当前剪切板内容" checked={s.saveClipboardOnLaunch || false} onChange={v => u('saveClipboardOnLaunch', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-notification-3-line" title="显示托盘图标" desc="在系统托盘显示应用图标" checked={s.showTrayIcon !== false} onChange={v => u('showTrayIcon', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-file-list-3-fill" title="下次启动时自动打开最后编辑的文档" desc="记住上次编辑的文档，下次启动自动打开" checked={s.reopenLastDoc !== false} onChange={v => u('reopenLastDoc', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-new-releases-fill" title="从文件资源管理器打开文档时总在新窗口中打开" desc="双击文件总是在新窗口中打开" checked={s.openInNewWindow || false} onChange={v => u('openInNewWindow', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-close-circle-fill" title="当所有窗口关闭时退出应用程序" desc="关闭最后一个窗口后完全退出应用" checked={s.quitWhenAllWindowsClosed !== false} onChange={v => u('quitWhenAllWindowsClosed', v)} />
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>效果预览</span><span className="settings-section-desc">当前设置预览</span></div>
        <div className="preview-card" style={{ fontFamily: s.editorFont === 'serif' ? 'var(--font-sans)' : (s.editorFont || 'sans-serif'), fontSize: `${s.defaultFontSize || 17}px`, lineHeight: s.lineHeight || '1.5' }}>
          <div className="preview-code-line"><span className="preview-dollarsign">$</span><span className="preview-text">cat /proc/cpuinfo</span></div>
          <div className="preview-title-line"><span className="preview-hash">###</span><span className="preview-text">Praesent varius diam</span></div>
          <div className="preview-text-line"><span className="preview-text">Nam id imperdiet turpis.</span><span className="preview-deleted">mollis</span><span className="preview-text">vestibulum eros.</span><span className="preview-added">sed hendrerit</span></div>
          <div className="preview-text-line"><span className="preview-selected">当前选中段落</span><span className="preview-text">aliquam pellentesque vehicula sapien.</span></div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
          <span>字体：{s.editorFont === 'serif' ? '衬线' : s.editorFont === 'monospace' ? '等宽' : '无衬线'}</span>
          <span>字号：{s.defaultFontSize || 17}px</span>
          <span>行高：{s.lineHeight || '1.5'}</span>
          <span>宽度：{s.contentWidth || '1024'}px</span>
        </div>
      </div>
    </>
  )
}

function renderLocalizationSection(s: any, u: any) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>拼写检查</span><span className="settings-section-desc">文字输入辅助</span></div>
        <ToggleRow icon="ri-spell-check-line" title="启动拼写检查" desc="拼写错误时显示波浪线提示" checked={s.enableSpellCheck !== false} onChange={v => u('enableSpellCheck', v)} />
        <div style={{ padding: '8px 0 0 44px', marginBottom: 8 }}>
          <div className="setting-row" style={{ marginBottom: 0 }}>
            <div className="setting-label" style={{ minWidth: 80 }}><span>检查语言</span></div>
            <select className="lfs-input" value={s.spellCheckLang || 'zh-CN'} onChange={e => u('spellCheckLang', e.target.value)} style={{ maxWidth: 200 }}>
              {SPELL_CHECK_LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>Markdown 快捷符号</span><span className="settings-section-desc">自动格式化与补全</span></div>
        <ToggleRow icon="ri-asterisk" title="允许使用符号键 (* _ + ~ = 和 `) 设置选中的文本的格式" desc="选中文字后按 * 加粗、_ 斜体等" checked={s.allowMarkdownSymbols !== false} onChange={v => u('allowMarkdownSymbols', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-braces-fill" title="自动补完 Markdown 符号对" desc="输入 ( 时自动补全 )，输入 「 时自动补全 」 等" checked={s.autoCompleteMarkdownPairs !== false} onChange={v => u('autoCompleteMarkdownPairs', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-double-quotes-l" title={'自动替换引号为智能引号（即双引号和单引号）'} desc="英文弯引号，提升可读性" checked={s.smartQuotes !== false} onChange={v => u('smartQuotes', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-space-bar" title="自动在中日韩文字及英文数字间插入空格" desc="在汉字与英文/数字之间自动插入一个空格" checked={s.autoSpaceCJK !== false} onChange={v => u('autoSpaceCJK', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-double-quotes-r" title={'自动替换引号为直角引号（即「」和『』）'} desc={'将 "" 替换为 「」，将 \'\' 替换为 『』'} checked={s.cornerQuotes || false} onChange={v => u('cornerQuotes', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-translate-2" title="自动替换半角符号为全角符号（仅限，、;符号）" desc="将半角 , 和 ; 替换为全角 ，和 ；" checked={s.fullwidthSymbols || false} onChange={v => u('fullwidthSymbols', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-list-ordered" title="显示行号" desc="在编辑器左侧显示行号" checked={s.showLineNumbers || false} onChange={v => u('showLineNumbers', v)} />
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>预览</span><span className="settings-section-desc">符号规则效果预览</span></div>
        <div className="preview-card" style={{ lineHeight: 1.8 }}>
          <div className="preview-text-line" style={{ fontSize: 15 }}><span className="preview-text">「Hello World」是编程入门经典示例。</span></div>
          <div className="preview-text-line" style={{ fontSize: 15 }}><span className="preview-text">他在 2024 年发布了「智能编辑器」。</span></div>
          <div className="preview-text-line" style={{ fontSize: 15 }}><span className="preview-text">用 (括号) 标注重点内容。</span></div>
          <div className="preview-text-line" style={{ fontSize: 15 }}><span className="preview-text">"""智能引号""" 效果预览。</span></div>
        </div>
      </div>
    </>
  )
}

function renderEditModeSection(s: any, u: any) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>编辑模式</span><span className="settings-section-desc">编辑器功能开关</span></div>
        <ToggleRow icon="ri-markdown-fill" title="Markdown 标记常显" desc="始终显示 ### 与列表符号" checked={s.showMarkdownMarkers !== false} onChange={v => u('showMarkdownMarkers', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-diff-fill" title="快照差异高亮" desc="红底为删除、绿底为新增" checked={s.showDiffHighlight !== false} onChange={v => u('showDiffHighlight', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-cursor-fill" title="打字机模式" desc="光标始终居中垂直位置" checked={s.typewriterMode || false} onChange={v => u('typewriterMode', v)} />
        <div className="setting-divider" />
        <ToggleRow icon="ri-focus-3" title="专注模式" desc="仅高亮当前段落，其余淡化" checked={s.focusMode || false} onChange={v => u('focusMode', v)} />
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>效果预览</span><span className="settings-section-desc">当前编辑器配置预览</span></div>
        <div className="preview-card edit-mode-preview" style={{ fontFamily: s.editorFont || 'var(--font-sans)', fontSize: `${s.defaultFontSize || 17}px`, lineHeight: s.lineHeight || '1.5' }}>
          <div className="preview-code-line"><span className="preview-dollarsign">$</span><span className="preview-text">git status</span></div>
          <div className="preview-title-line"><span className="preview-hash">##</span><span className="preview-text">配置文件</span></div>
          <div className="preview-text-line"><span className="preview-text">当前字体：</span><span className="preview-added">{s.editorFont || 'sans-serif'}</span></div>
          <div className="preview-text-line"><span className="preview-text">字号 / 行高 / 宽度：</span><span className="preview-added">{s.defaultFontSize || 17}px / {s.lineHeight || '1.5'} / {s.contentWidth || '1024'}px</span></div>
          <div className="preview-text-line"><span className="preview-selected">专注段落：这是当前正在编辑的内容</span><span className="preview-text">。其余内容会被淡化处理。</span></div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="edit-mode-tag">字体: {s.editorFont === 'serif' ? '衬线' : s.editorFont === 'monospace' ? '等宽' : '无衬线'}</span>
          <span className="edit-mode-tag">字号: {s.defaultFontSize || 17}px</span>
          <span className="edit-mode-tag">行高: {s.lineHeight || '1.5'}</span>
          <span className="edit-mode-tag">宽度: {s.contentWidth || '1024'}</span>
          <span className={`edit-mode-tag ${s.showMarkdownMarkers !== false ? 'tag-on' : 'tag-off'}`}>Markdown 标记: {s.showMarkdownMarkers !== false ? '开启' : '关闭'}</span>
          <span className={`edit-mode-tag ${s.typewriterMode ? 'tag-on' : 'tag-off'}`}>打字机: {s.typewriterMode ? '开启' : '关闭'}</span>
          <span className={`edit-mode-tag ${s.focusMode ? 'tag-on' : 'tag-off'}`}>专注模式: {s.focusMode ? '开启' : '关闭'}</span>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════
   AI
═══════════════════════════════════════════ */
function renderAIContent(tab: string, models: AIModel[], apiKeyVisible: boolean, setApiKeyVisible: (v: boolean) => void,
  customBaseUrl: string, setCustomBaseUrl: (v: string) => void,
  customModelId: string, setCustomModelId: (v: string) => void,
  customName: string, setCustomName: (v: string) => void) {
  const s = useSettingsStore.getState()
  const u = useSettingsStore.getState().updateSetting

  if (tab === 'default') return (
    <div className="settings-section">
      <div className="settings-section-title"><span>默认供应商</span><span className="settings-section-desc">从以下 10 个最流行的大模型中选择</span></div>
      <div className="ai-provider-list">
        {TOP_PROVIDERS.map((m) => {
          const isCurrent = s.model === m.id
          return (
            <button key={m.id} className={`ai-provider-chip ${isCurrent ? 'active' : ''}`}
              onClick={() => { u('provider', 'custom'); u('model', m.id); u('customBaseUrl', ''); }}>
              <span className="ai-provider-chip-icon" style={{ color: m.color }}>
                <span className={`remix ${m.icon}`}></span>
              </span>
              <div className="ai-provider-chip-info">
                <div className="ai-provider-chip-name">{m.name}</div>
                <div className="ai-provider-chip-meta">{m.maxTokens} tokens · {m.supportsStreaming ? '流式' : ''}</div>
              </div>
              {isCurrent && <span className="remix ri-check-line ai-provider-chip-check"></span>}
            </button>
          )
        })}
      </div>
      <div className="setting-divider" style={{ margin: '16px 0' }} />
      <div className="setting-row">
        <div className="setting-label"><span>API Key</span><span className="setting-hint">本地加密存储，不上传服务器</span></div>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          <LFSInput type={apiKeyVisible ? 'text' : 'password'} value={s.apiKey} onChange={v => u('apiKey', v)} placeholder="sk-..." style={{ flex: 1, fontFamily: 'var(--font-mono)' }} />
          <button onClick={() => setApiKeyVisible(!apiKeyVisible)} style={{ padding: '0 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-code)', color: 'var(--text-secondary)', cursor: 'pointer' }}>{apiKeyVisible ? '隐藏' : '显示'}</button>
        </div>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>温度</span><span className="setting-hint">创造性 0~1</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <input type="range" min="0" max="1" step="0.1" value={s.temperature} onChange={e => u('temperature', parseFloat(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-primary)' }} />
          <span style={{ color: 'var(--accent-primary)', fontSize: 12, minWidth: 28 }}>{s.temperature}</span>
        </div>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>最大 Token</span></div>
        <LFSInput type="number" value={s.maxTokens} onChange={v => u('maxTokens', parseInt(v) || 1024)} style={{ width: 100 }} />
      </div>
    </div>
  )

  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>自定义供应商</span><span className="settings-section-desc">接入 OpenAI 兼容格式的自定义 API</span></div>

      <div className="setting-row">
        <div className="setting-label"><span>供应商名称</span><span className="setting-hint">显示在列表中的名称</span></div>
        <LFSInput type="text" value={customName} onChange={setCustomName} placeholder="如：自建 API / DeepSeek / Azure" style={{ flex: 1, maxWidth: 280 }} />
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>API 地址</span><span className="setting-hint">OpenAI 兼容格式，如 https://api.example.com</span></div>
        <LFSInput type="text" value={customBaseUrl} onChange={setCustomBaseUrl} placeholder="留空使用官方地址" style={{ flex: 1 }} />
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>模型 ID</span><span className="setting-hint">对应 API 的模型名称</span></div>
        <LFSInput type="text" value={customModelId} onChange={setCustomModelId} placeholder="如：gpt-4o、deepseek-chat" style={{ flex: 1, maxWidth: 280, fontFamily: 'var(--font-mono)' }} />
      </div>
      <div className="setting-divider" />
      <div className="setting-row">
        <div className="setting-label"><span>API Key</span><span className="setting-hint">本地加密存储，不上传服务器</span></div>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          <LFSInput type={apiKeyVisible ? 'text' : 'password'} value={s.apiKey} onChange={v => u('apiKey', v)} placeholder="sk-..." style={{ flex: 1, fontFamily: 'var(--font-mono)' }} />
          <button onClick={() => setApiKeyVisible(!apiKeyVisible)} style={{ padding: '0 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-code)', color: 'var(--text-secondary)', cursor: 'pointer' }}>{apiKeyVisible ? '隐藏' : '显示'}</button>
        </div>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>温度</span><span className="setting-hint">创造性 0~1</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <input type="range" min="0" max="1" step="0.1" value={s.temperature} onChange={e => u('temperature', parseFloat(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-primary)' }} />
          <span style={{ color: 'var(--accent-primary)', fontSize: 12, minWidth: 28 }}>{s.temperature}</span>
        </div>
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>最大 Token</span></div>
        <LFSInput type="number" value={s.maxTokens} onChange={v => u('maxTokens', parseInt(v) || 1024)} style={{ width: 100 }} />
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>全局快捷键</span></div>
        <LFSInput type="text" value={s.shortcut} onChange={() => {}} readOnly style={{ width: 120, opacity: 0.6, cursor: 'default' }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   SHORTCUT
═══════════════════════════════════════════ */
function renderShortcutContent(tab: string) {
  const isMac = navigator.userAgent.toLowerCase().includes('mac')
  const mod = isMac ? '⌘' : 'Ctrl'
  const alt = isMac ? '⌥' : 'Alt'
  const shift = '⇧'
  const row = (desc: string, key: string, note?: string) => (
    <div className="shortcut-row">
      <span className="shortcut-action">{desc}{note ? <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{note}</span> : ''}</span>
      <kbd className="shortcut-key">{key}</kbd>
    </div>
  )

  if (tab === 'doc') return (
    <div className="settings-section">
      <div className="settings-section-title"><span>文档操作</span></div>
      <div className="shortcut-list">
        {row('新建文档', `${mod}+N`)}
        {row('打开文档', `${mod}+O`)}
        {row('自动保存（无需手动）', `${mod}+S`, '仅提示')}
        {row('导出文件', `${mod}+E`)}
        {row('退出应用', `${mod}+Q`)}
        {row('重新加载窗口', `${mod}+R`)}
      </div>
    </div>
  )
  if (tab === 'edit') return (
    <div className="settings-section">
      <div className="settings-section-title"><span>编辑操作</span></div>
      <div className="shortcut-list">
        {row('撤销', `${mod}+Z`)}
        {row('重做', `${mod}+${shift}+Z`)}
        {row('剪切', `${mod}+X`)}
        {row('复制', `${mod}+C`)}
        {row('粘贴', `${mod}+V`)}
        {row('全选', `${mod}+A`)}
      </div>
    </div>
  )
  if (tab === 'common') return (
    <div className="settings-section">
      <div className="settings-section-title"><span>常规操作</span><span className="settings-section-desc">常用命令</span></div>
      <div className="shortcut-list">
        {row('设置面板', `${mod}+,`)}
        {row('全屏模式', `${mod}+Shift+F`)}
        {row('搜索文档', `${mod}+F`)}
        {row('替换文本', `${mod}+${shift}+H`)}
        {row('打印文档', `${mod}+P`)}
      </div>
    </div>
  )
  if (tab === 'heading') return (
    <div className="settings-section">
      <div className="settings-section-title"><span>标题与段落</span></div>
      <div className="shortcut-list">
        {row('一级标题 (H1)', `${mod}+${alt}+1`)}
        {row('二级标题 (H2)', `${mod}+${alt}+2`)}
        {row('三级标题 (H3)', `${mod}+${alt}+3`)}
        {row('四级标题 (H4)', `${mod}+${alt}+4`)}
        {row('五级标题 (H5)', `${mod}+${alt}+5`)}
        {row('六级标题 (H6)', `${mod}+${alt}+6`)}
        {row('无序列表', `${mod}+${shift}+8`)}
        {row('有序列表', `${mod}+${shift}+7`)}
        {row('待办事项列表', `${mod}+${shift}+9`)}
        {row('引用块', `${mod}+${shift}+B`)}
        {row('软换行', `${mod}+Enter`)}
      </div>
    </div>
  )
  if (tab === 'code') return (
    <div className="settings-section">
      <div className="settings-section-title"><span>代码块</span></div>
      <div className="shortcut-list">
        {row('代码块', `${mod}+${alt}+C`)}
        {row('行内代码', `${mod}+E`)}
        {row('缩进（列表项）', `${alt}+Tab`)}
        {row('取消缩进（列表项）', `${alt}+${shift}+Tab`)}
      </div>
    </div>
  )
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>应用级快捷键</span></div>
      <div className="shortcut-list">
        {row('AI 辅助面板', `${mod}+/`)}
        {row('预览模式', '仅工具栏按钮')}
        {row('代码预览', '仅工具栏按钮')}
        {row('大纲导航', '仅工具栏按钮')}
        {row('阅读模式', '仅工具栏按钮')}
      </div>
      <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, background: 'var(--bg-code)', border: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
        <span className="remix ri-information-fill" style={{ color: 'var(--accent-primary)', marginRight: 6 }}></span>
        水平分割线、段落对齐等功能暂无快捷键，可通过工具栏按钮插入。
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   SYNC
═══════════════════════════════════════════ */
function renderSyncContent(tab: string) {
  const s = useSettingsStore.getState()
  const u = useSettingsStore.getState().updateSetting

  if (tab === 'net') return (
    <div className="settings-section">
      <div className="settings-section-title"><span>网络备份</span><span className="settings-section-desc">GitHub / Gitee 远程同步</span></div>
      <div className="sync-provider-grid">
        {[
          { id: 'github',  name: 'GitHub',  desc: '全球最大的代码托管平台', icon: 'ri-github-fill' },
          { id: 'gitee',   name: 'Gitee',   desc: '国内最大的代码托管平台', icon: 'ri-git-merge-line' },
        ].map(p => (
          <div key={p.id} className={`sync-provider-card ${s.syncProvider === p.id ? 'selected' : ''}`} onClick={() => u('syncProvider', p.id)}>
            <div className="sync-provider-icon"><span className={`remix ${p.icon}`}></span></div>
            <div className="sync-provider-info">
              <div className="sync-provider-name">{p.name}</div>
              <div className="sync-provider-desc">{p.desc}</div>
            </div>
            <div className={`sync-status-dot ${s.syncProvider === p.id ? 'connected' : ''}`} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>NAS 备份</span><span className="settings-section-desc">WebDAV / 挂载网盘</span></div>
      <div className="sync-provider-grid">
        {[
          { id: 'webdav',  name: 'WebDAV',    desc: '自定义 WebDAV 服务器', icon: 'ri-webcam-fill' },
          { id: 'dav',     name: '挂载网盘',   desc: '通过 WebDAV 挂载云盘', icon: 'ri-cloud-fill' },
        ].map(p => (
          <div key={p.id} className={`sync-provider-card ${s.syncProvider === p.id ? 'selected' : ''}`} onClick={() => u('syncProvider', p.id)}>
            <div className="sync-provider-icon"><span className={`remix ${p.icon}`}></span></div>
            <div className="sync-provider-info">
              <div className="sync-provider-name">{p.name}</div>
              <div className="sync-provider-desc">{p.desc}</div>
            </div>
            <div className={`sync-status-dot ${s.syncProvider === p.id ? 'connected' : ''}`} />
          </div>
        ))}
      </div>
      <div className="setting-divider" style={{ margin: '16px 0' }} />
      <div className="setting-row">
        <div className="setting-label"><span>自动备份间隔</span><span className="setting-hint">每隔多久自动保存快照</span></div>
        <LFSCombo value={s.backupInterval || '30s'} onChange={v => u('backupInterval', v)} options={[{ value: '30s', label: '30 秒' }, { value: '1m', label: '1 分钟' }, { value: '5m', label: '5 分钟' }, { value: '10m', label: '10 分钟' }]} />
      </div>
      <div className="setting-row">
        <div className="setting-label"><span>备份保留数量</span><span className="setting-hint">最多保留的历史快照数</span></div>
        <LFSInput type="number" value={s.backupKeep || 50} onChange={v => u('backupKeep', parseInt(v) || 50)} style={{ width: 100 }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   ABOUT
═══════════════════════════════════════════ */
function renderAboutSection() {
  const year = new Date().getFullYear()
  return (
    <div className="settings-section" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div className="about-logo">
        <div className="about-logo-icon"><img src="/logo.svg" alt="logo" style={{ width: 48, height: 48 }}/></div>
      </div>
      <div className="about-title">lzeditor</div>
      <div className="about-desc">AI Markdown 编辑器</div>
      <div className="about-links">
        <a href="https://github.com/sikenali/lzeditor" className="about-link" target="_blank" rel="noopener noreferrer">GitHub</a>
        <span className="about-sep">·</span>
        <a href="#" className="about-link">文档</a>
        <span className="about-sep">·</span>
        <a href="#" className="about-link">反馈</a>
      </div>
      <div className="about-copy">© {year} Powered by LightOS</div>
    </div>
  )
}

/* ── Shared helpers ── */
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    className={`toggle-checkbox ${checked ? 'active' : ''}`}
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
  >
    <span className="toggle-checkbox-box">
      <span className="remix ri-check-line"></span>
    </span>
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
