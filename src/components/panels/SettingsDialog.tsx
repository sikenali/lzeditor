import React, { useState, useRef, useEffect } from 'react'
import { useSettingsStore, saveSettingsToStorage, ACCENT_PRESETS, getAccentColor, DEFAULT_SETTINGS } from '../../store/settingsStore'
import { useEditorStore } from '../../store/editorStore'
import { PROVIDERS, getProvider } from '../../services/aiProvider'
import type { AIModel, SettingsGroup, ApiKeyEntry } from '../../shared/types'
import { TYPOGRAPHY_THEMES, applyTypographyTheme } from '../../styles/typography-themes'
import { CODE_THEMES, getCodeTheme } from '../../styles/code-themes'
import { LFSInput } from '../../components/ui/LFInput'
import { LFSCombo } from '../../components/ui/LFSCombo'
import { UDToggle, UDSettingRow, UDSection } from '../../components/ui/UnifiedDialog'
import { UnifiedDialog } from '../../components/ui/UnifiedDialog'

/* ── Nav categories ── */
const NAV_ITEMS: { id: SettingsGroup; label: string; desc: string; icon: string }[] = [
  { id: 'theme',     label: '主题设置', desc: '界面、内容与强调色', icon: 'ri-palette-fill' },
  { id: 'editor',    label: '编辑设置', desc: '编辑器行为与本地化', icon: 'ri-edit-2-fill' },
  { id: 'app',       label: '应用设置', desc: '启动、窗口与系统行为', icon: 'ri-window-line' },
  { id: 'ai',        label: 'AI 设置',  desc: '模型供应商与连接', icon: 'ri-openai-fill' },
  { id: 'shortcut',  label: '快捷键设置', desc: '文档、编辑与应用操作', icon: 'ri-keyboard-fill' },
  { id: 'sync',      label: '同步备份', desc: '网络与 NAS 备份', icon: 'ri-refresh-line' },
  { id: 'about',     label: '关于',     desc: '版本与项目信息', icon: 'ri-information-fill' },
]
type SubTab = { id: string; label: string; icon: string }

/* ── Sub-tab definitions per category ── */
const THEME_SUBS: SubTab[] = [
  { id: 'mode',          label: '界面主题', icon: 'ri-sun-fill' },
  { id: 'typography',    label: '内容样式', icon: 'ri-font-size' },
  { id: 'accent',        label: '强调色', icon: 'ri-circle-fill' },
]
const EDITOR_SUBS: SubTab[] = [
  { id: 'general',   label: '通用设置', icon: 'ri-settings-3-line' },
  { id: 'local',     label: '本地化',   icon: 'ri-translate-2' },
  { id: 'mode',      label: '编辑模式', icon: 'ri-edit-2-line' },
  { id: 'layout',    label: '导航布局', icon: 'ri-layout-top-fill' },
]
const AI_SUBS: SubTab[] = [
  { id: 'keys',    label: '模型制造商', icon: 'ri-key-line' },
  { id: 'add',     label: '自定义配置', icon: 'ri-add-circle-line' },
]

const SHORTCUT_SUBS: SubTab[] = [
  { id: 'doc',       label: '文档操作', icon: 'ri-file-lines-line' },
  { id: 'edit',      label: '编辑操作', icon: 'ri-text-spacing' },
  { id: 'common',    label: '常规操作', icon: 'ri-list-check' },
  { id: 'heading',   label: '标题与段落', icon: 'ri-h-1' },
  { id: 'code',      label: '代码块', icon: 'ri-code-box-line' },
  { id: 'system',    label: '系统级',   icon: 'ri-apps-line' },
]

const APP_SUBS: SubTab[] = [
  { id: 'behavior',  label: '应用行为', icon: 'ri-apps-line' },
]

const SYNC_SUBS: SubTab[] = [
  { id: 'net',       label: '网络备份', icon: 'ri-cloud-line' },
  { id: 'nas',       label: 'NAS备份',  icon: 'ri-hard-drive-2-line' },
]

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
  const subTab = useSettingsStore(s => s.subTab ?? '')

  const subs: SubTab[] = activeGroup === 'theme'     ? THEME_SUBS
              : activeGroup === 'editor'    ? EDITOR_SUBS
              : activeGroup === 'app'       ? APP_SUBS
              : activeGroup === 'ai'        ? AI_SUBS
              : activeGroup === 'shortcut'  ? SHORTCUT_SUBS
              : activeGroup === 'sync'      ? SYNC_SUBS
              : []

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
  const activeSubIndex = Math.max(0, subs.findIndex(t => t.id === subTab))

  const leftNav = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {NAV_ITEMS.map((item, i) => (
        <React.Fragment key={item.id}>
          {i > 0 && i === 6 && <div className="ud-chip-sep" />}
          <button className={`ud-chip${activeGroup === item.id ? ' active' : ''}`}
            onClick={() => { setActiveGroup(item.id); setSubTab(subs[0]?.id ?? '') }}>
            <span className={`remix ud-chip-icon ${item.icon}`}></span>
            <div><div className="ud-chip-label">{item.label}</div><div className="ud-chip-desc">{item.desc}</div></div>
          </button>
        </React.Fragment>
      ))}
    </div>
  )

  const rightTop = activeGroup !== 'about' ? (
    <UDSection label="">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${subs.length}, 1fr)`, gap: 8 }}>
        {subs.map((tab, i) => (
          <button
            key={tab.id}
            className={`ud-btn${subTab === tab.id ? ' ud-btn--primary' : ''}`}
            onClick={() => setSubTab(tab.id)}
            style={{ flexDirection: 'column', gap: 6, padding: '14px 10px', justifyContent: 'center' }}
          >
            <span className={`remix ${tab.icon}`} style={{ fontSize: 18 }}></span>
            <span style={{ fontSize: 12 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </UDSection>
  ) : null

  const settingsContent = (
    <>
      <div className="settings-content">
        {activeGroup === 'theme' && renderThemeContent(subTab)}
        {activeGroup === 'editor' && renderEditorContent(subTab)}
        {activeGroup === 'app'     && renderAppSettings()}
        {activeGroup === 'shortcut' && renderShortcutContent(subTab)}
        {activeGroup === 'sync'    && renderSyncContent(subTab)}
        {activeGroup === 'about'   && renderAboutSection()}
        <AISettings activeGroup={activeGroup} subTab={subTab} />
      </div>
    </>
  )

  return (
    <UnifiedDialog
      onClose={onClose}
      icon="ri-settings-3-fill"
      title="设置"
      subtitle={`${NAV_ITEMS.find(g => g.id === activeGroup)?.label}${activeGroup !== 'about' && subs.length ? ` · ${subs.find(t => t.id === subTab)?.label}` : ''}`}
      leftNav={leftNav}
      rightTop={rightTop}
      rightContent={settingsContent}
      hint="修改后自动保存到本地"
      cancelText="取消"
      submitText="保存"
      onSubmit={handleSave}
      size="lg"
      className="settings-dialog-fixed"
    />
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
      <div className="settings-section-title">
        <span>界面主题</span>
        <span className="settings-section-desc">浅色 / 深色只影响应用界面，不影响文档排版样式</span>
      </div>
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
        <div className="settings-section-title"><span>内容样式</span><span className="settings-section-desc">文章内容、插入块、预览与导出的视觉风格</span></div>
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

  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>强调色</span><span className="settings-section-desc">用于选中态、主按钮和焦点反馈，不控制工具栏文字</span></div>
      <div className="color-card-row">
        {ACCENT_PRESETS.map(p => (
          <button
            key={p.id}
            className={`color-card ${accent === p.id ? 'active' : ''}`}
            onClick={() => update('accentColor', p.id)}
          >
            <span className="color-card-dot" style={{ background: p.color }} />
            <span className="color-card-name">{p.name}</span>
            {accent === p.id && <span className="remix color-card-check ri-check-line"></span>}
          </button>
        ))}
        <button
          className="color-card color-card-custom"
          title="自定义颜色"
          onClick={() => {
            const c = prompt('输入颜色值 (如 #FF0000):')
            if (c) update('accentColor', c.startsWith('#') ? c : '#' + c)
          }}
        >
          <span className="remix color-card-icon ri-add-line"></span>
          <span className="color-card-name">自定义</span>
        </button>
      </div>
      <div className="color-current-value" style={{ marginTop: 10 }}>
        <span className="color-current-label">当前</span>
        <span className="color-current-hex" style={{ color: getAccentColor(accent) || accent }}>
          {ACCENT_PRESETS.find(p => p.id === accent)?.name || accent}
        </span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   NAV MODE
═══════════════════════════════════════════ */
function renderNavModeContent() {
  const navMode = useSettingsStore.getState().navMode || 'top'
  const update = useSettingsStore.getState().updateSetting
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>导航样式</span><span className="settings-section-desc">选择编辑器整体布局模式</span></div>
      <div className="nav-mode-grid">
        {([
          { id: 'top', label: '顶栏模式', icon: 'ri-layout-top-fill', desc: '工具栏在顶部，状态栏在底部，经典布局' },
          { id: 'left', label: '左侧模式', icon: 'ri-layout-left-fill', desc: '工具栏固定在左侧，编辑器居中，右侧预览' },
        ] as const).map(m => (
          <button
            key={m.id}
            className={`nav-mode-card ${navMode === m.id ? 'active' : ''}`}
            onClick={() => update('navMode', m.id)}
          >
            {/* Preview window */}
            <div className="nav-mode-preview">
              {m.id === 'top' ? (
                <div className="nav-preview-top">
                  <div className="np-toolbar">
                    <span className="np-dot np-dot-r" />
                    <span className="np-dot np-dot-y" />
                    <span className="np-dot np-dot-g" />
                    <span className="np-toolbar-label">工具栏</span>
                  </div>
                  <div className="np-editor">
                    <div className="np-editor-line np-editor-line-short" />
                    <div className="np-editor-line" />
                    <div className="np-editor-line" />
                    <div className="np-editor-line np-editor-line-short" />
                  </div>
                  <div className="np-statusbar">
                    <span className="np-status-item">1,234 字</span>
                    <span className="np-status-item">行 12 · 列 34</span>
                  </div>
                </div>
              ) : (
                <div className="nav-preview-left">
                  <div className="np-leftbar">
                    <div className="np-leftbar-spacer" />
                    <div className="np-leftbar-sep" />
                    <div className="np-leftbar-spacer" />
                    <div className="np-leftbar-sep" />
                    <div className="np-leftbar-status">
                      <span className="np-status-item">已保存</span>
                    </div>
                  </div>
                  <div className="np-editor-wide">
                    <div className="np-editor-line np-editor-line-short" />
                    <div className="np-editor-line" />
                    <div className="np-editor-line" />
                    <div className="np-editor-line np-editor-line-short" />
                    <div className="np-editor-line" />
                  </div>
                </div>
              )}
            </div>
            <div className="nav-mode-info">
              <span className="nav-mode-label">{m.label}</span>
              <span className="nav-mode-desc">{m.desc}</span>
            </div>
            {navMode === m.id && <span className="remix nav-mode-check ri-check-line"></span>}
          </button>
        ))}
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
  if (tab === 'mode')    return renderEditModeSection(s, u)
  if (tab === 'layout')  return renderNavModeContent()
  return renderEditModeSection(s, u)
}

function renderGeneralSection(s: any, u: any) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>排版</span><span className="settings-section-desc">字体、字号与行距</span></div>
        <div className="setting-row" style={{ marginBottom: 16 }}>
          <div className="setting-label"><span>默认字体</span><span className="setting-hint">编辑区默认字体族</span></div>
          <LFSCombo value={s.editorFont || 'sans-serif'} onChange={v => u('editorFont', v)} options={FONT_OPTIONS.map(o => ({ value: o.value, label: o.label }))} style={{ flex: 1, maxWidth: 280 }} />
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
        <UDSettingRow icon="ri-text-spacing" label="首行缩进" desc="每个段落首行缩进两个字符">
        <UDToggle checked={ s.textIndent || false } onChange={ v => u('textIndent', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-align-justify" label="两端对齐" desc="段落文字左右两端对齐">
        <UDToggle checked={ s.textJustify || false } onChange={ v => u('textJustify', v) } />
      </UDSettingRow>
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>效果预览</span><span className="settings-section-desc">当前排版与代码样式预览</span></div>
        <div className="preview-card" style={{ fontFamily: s.editorFont === 'serif' ? 'var(--font-sans)' : (s.editorFont || 'sans-serif'), fontSize: `${s.defaultFontSize || 17}px`, lineHeight: s.lineHeight || '1.5', ...(s.textIndent ? { textAlign: 'justify' } : {}), ...(s.textJustify ? { textAlign: 'justify' } : {}) }}>
          {s.textIndent && <div className="preview-text-line" style={{ textIndent: '2em' }}><span className="preview-text">首行缩进示例：这是一个段落，首行会缩进两个字符。</span></div>}
          <div className="preview-title-line"><span className="preview-hash">###</span><span className="preview-text">Praesent varius diam</span></div>
          <div className="preview-text-line"><span className="preview-text">Nam id imperdiet turpis.</span><span className="preview-deleted">mollis</span><span className="preview-text">vestibulum eros.</span><span className="preview-added">sed hendrerit</span></div>
          <div className="preview-text-line"><span className="preview-selected">当前选中段落</span><span className="preview-text">aliquam pellentesque vehicula sapien.</span></div>
          <div className="setting-divider" style={{ margin: '10px 0' }} />
          <div className="preview-code-line"><span className="preview-dollarsign">$</span><span className="preview-text">cat /proc/cpuinfo</span></div>
          <div className="preview-title-line"><span className="preview-hash">###</span><span className="preview-text">代码高亮预览</span></div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
        <UDSettingRow icon="ri-apps-2-fill" label="精简工具栏" desc="开启后中间仅显示：格式、图片、链接、表格、插入；右侧隐藏 AI">
        <UDToggle checked={ s.showAllToolbarButtons || false } onChange={ v => u('showAllToolbarButtons', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-text" label="显示工具栏按钮标题" desc="关闭后仅显示图标，不显示文字">
        <UDToggle checked={ s.showToolbarLabels !== false } onChange={ v => u('showToolbarLabels', v) } />
      </UDSettingRow>
      </div>
    </>
  )
}

function renderAppSettings() {
  const s = useSettingsStore.getState()
  const u = useSettingsStore.getState().updateSetting
  return (
    <div className="settings-section">
      <div className="settings-section-title"><span>启动行为</span><span className="settings-section-desc">应用启动与窗口管理</span></div>
      <UDSettingRow icon="ri-window-fill" label="启动标签页" desc="应用启动时显示多文档标签栏">
        <UDToggle checked={ s.enableTabs !== false } onChange={ v => u('enableTabs', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-clipboard-fill" label="启动保存剪切板内容" desc="每次启动时自动保存当前剪切板内容">
        <UDToggle checked={ s.saveClipboardOnLaunch || false } onChange={ v => u('saveClipboardOnLaunch', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-notification-3-line" label="显示托盘图标" desc="在系统托盘显示应用图标">
        <UDToggle checked={ s.showTrayIcon !== false } onChange={ v => u('showTrayIcon', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-file-list-3-fill" label="下次启动时自动打开最后编辑的文档" desc="记住上次编辑的文档，下次启动自动打开">
        <UDToggle checked={ s.reopenLastDoc !== false } onChange={ v => u('reopenLastDoc', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-new-releases-fill" label="从文件资源管理器打开文档时总在新窗口中打开" desc="双击文件总是在新窗口中打开">
        <UDToggle checked={ s.openInNewWindow || false } onChange={ v => u('openInNewWindow', v) } />
      </UDSettingRow>
      <div className="setting-divider" />
      <UDSettingRow icon="ri-close-circle-fill" label="当所有窗口关闭时退出应用程序" desc="关闭最后一个窗口后完全退出应用">
        <UDToggle checked={ s.quitWhenAllWindowsClosed !== false } onChange={ v => u('quitWhenAllWindowsClosed', v) } />
      </UDSettingRow>
    </div>
  )
}

function renderLocalizationSection(s: any, u: any) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title"><span>拼写检查</span><span className="settings-section-desc">文字输入辅助</span></div>
        <UDSettingRow icon="ri-spell-check-line" label="启动拼写检查" desc="拼写错误时显示波浪线提示">
        <UDToggle checked={ s.enableSpellCheck !== false } onChange={ v => u('enableSpellCheck', v) } />
      </UDSettingRow>
        <div style={{ padding: '8px 0 0 44px', marginBottom: 8 }}>
          <div className="setting-row" style={{ marginBottom: 0 }}>
            <div className="setting-label" style={{ minWidth: 80 }}><span>检查语言</span></div>
            <LFSCombo value={s.spellCheckLang || 'zh-CN'} onChange={v => u('spellCheckLang', v)} options={SPELL_CHECK_LANGS.map(l => ({ value: l.value, label: l.label }))} style={{ maxWidth: 200 }} />
          </div>
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section-title"><span>Markdown 快捷符号</span><span className="settings-section-desc">自动格式化与补全</span></div>
        <UDSettingRow icon="ri-asterisk" label="允许使用符号键 (* _ + ~ = 和 `) 设置选中的文本的格式" desc="选中文字后按 * 加粗、_ 斜体等">
        <UDToggle checked={ s.allowMarkdownSymbols !== false } onChange={ v => u('allowMarkdownSymbols', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-braces-fill" label="自动补完 Markdown 符号对" desc="输入 ( 时自动补全 )，输入 「 时自动补全 」 等">
        <UDToggle checked={ s.autoCompleteMarkdownPairs !== false } onChange={ v => u('autoCompleteMarkdownPairs', v) } />
      </UDSettingRow>
         <div className="setting-divider" />
         <UDSettingRow icon="ri-double-quotes-l" label="自动替换引号为智能引号（即双引号和单引号）" desc="英文弯引号，提升可读性">
           <UDToggle checked={s.smartQuotes !== false} onChange={v => u('smartQuotes', v)} />
         </UDSettingRow>
         <div className="setting-divider" />
        <UDSettingRow icon="ri-space-bar" label="自动在中日韩文字及英文数字间插入空格" desc="在汉字与英文/数字之间自动插入一个空格">
        <UDToggle checked={ s.autoSpaceCJK !== false } onChange={ v => u('autoSpaceCJK', v) } />
      </UDSettingRow>
         <div className="setting-divider" />
         <UDSettingRow icon="ri-double-quotes-r" label={'自动替换引号为直角引号（即「」和『』）'} desc={'将 "" 替换为 「」，将 \'\' 替换为 『』'}>
           <UDToggle checked={s.cornerQuotes || false} onChange={v => u('cornerQuotes', v)} />
         </UDSettingRow>
         <div className="setting-divider" />
        <UDSettingRow icon="ri-translate-2" label="自动替换半角符号为全角符号（仅限，、;符号）" desc="将半角 , 和 ; 替换为全角 ，和 ；">
        <UDToggle checked={ s.fullwidthSymbols || false } onChange={ v => u('fullwidthSymbols', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-list-ordered" label="显示行号" desc="在编辑器左侧显示行号">
        <UDToggle checked={ s.showLineNumbers || false } onChange={ v => u('showLineNumbers', v) } />
      </UDSettingRow>
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
        <UDSettingRow icon="ri-markdown-fill" label="Markdown 标记常显" desc="始终显示 ### 与列表符号">
        <UDToggle checked={ s.showMarkdownMarkers !== false } onChange={ v => u('showMarkdownMarkers', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-diff-fill" label="快照差异高亮" desc="红底为删除、绿底为新增">
        <UDToggle checked={ s.showDiffHighlight !== false } onChange={ v => u('showDiffHighlight', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-cursor-fill" label="打字机模式" desc="光标始终居中垂直位置">
        <UDToggle checked={ s.typewriterMode || false } onChange={ v => u('typewriterMode', v) } />
      </UDSettingRow>
        <div className="setting-divider" />
        <UDSettingRow icon="ri-focus-3" label="专注模式" desc="仅高亮当前段落，其余淡化">
        <UDToggle checked={ s.focusMode || false } onChange={ v => u('focusMode', v) } />
      </UDSettingRow>
         <div className="setting-divider" />
         <UDSettingRow icon="ri-eye-line" label="预览模式" desc="编辑模式与代码模式下默认显示右侧预览">
           <UDToggle checked={s.previewModeEnabled !== false} onChange={v => {
             u('previewModeEnabled', v)
             useEditorStore.getState().setShowPreview(v)
           }} />
         </UDSettingRow>
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
          <span className={`edit-mode-tag ${s.previewModeEnabled !== false ? 'tag-on' : 'tag-off'}`}>预览模式: {s.previewModeEnabled !== false ? '开启' : '关闭'}</span>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════
   AI SETTINGS (bid-maker style)
═══════════════════════════════════════════ */

// 内置服务商配置
const PROVIDER_CONFIGS: Record<string, { endpoint: string; format: 'openai' | 'anthropic'; models: string[] }> = {
  '阿里云':    { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode', format: 'openai', models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'] },
  '百度':     { endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom', format: 'openai', models: ['ernie-4.0', 'ernie-3.5', 'ernie-speed'] },
  '智谱':     { endpoint: 'https://open.bigmodel.cn/api/paas/v4', format: 'openai', models: ['glm-4', 'glm-4-plus', 'glm-4-air', 'glm-4-flash'] },
  'DeepSeek': { endpoint: 'https://api.deepseek.com', format: 'openai', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
  'Moonshot': { endpoint: 'https://api.moonshot.cn/v1', format: 'openai', models: ['kimi-k2.6', 'moonshot-v1-128k', 'moonshot-v1-32k'] },
  'OpenAI':   { endpoint: 'https://api.openai.com/v1', format: 'openai', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4'] },
  'Anthropic':{ endpoint: 'https://api.anthropic.com/v1', format: 'anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
  'Google':   { endpoint: 'https://generativelanguage.googleapis.com/v1beta', format: 'openai', models: ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
}

const PROVIDER_NAMES = Object.keys(PROVIDER_CONFIGS)

const AISettings: React.FC<{ activeGroup: SettingsGroup; subTab: string }> = ({ activeGroup, subTab }) => {
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [customFormat, setCustomFormat] = useState<'openai' | 'anthropic'>('openai')
  const [customEndpoint, setCustomEndpoint] = useState('')
  const [customModelId, setCustomModelId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [testId, setTestId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, 'success' | 'failed'>>({})

  const s = useSettingsStore.getState()
  const u = useSettingsStore.getState().updateSetting
  const apiKeys: ApiKeyEntry[] = s.apiKeys || []
  const setSelectedModelId = useSettingsStore.getState().setSelectedModelId
  const toggleApiKey = useSettingsStore.getState().toggleApiKey
  const removeApiKey = useSettingsStore.getState().removeApiKey
  const addApiKey = useSettingsStore.getState().addApiKey

  useEffect(() => {
    const state = useSettingsStore.getState()
    if (state.customApiFormat) setCustomFormat(state.customApiFormat)
    if (state.customEndpoint) setCustomEndpoint(state.customEndpoint)
    if (state.customModelId) setCustomModelId(state.customModelId)
    if (state.selectedProvider) setSelectedProvider(state.selectedProvider)
    if (state.selectedModelName) setSelectedModel(state.selectedModelName)
  }, [activeGroup])

  const currentModels = selectedProvider ? (PROVIDER_CONFIGS[selectedProvider]?.models || []) : []

  const handleAdd = () => {
    const key = apiKey.trim()
    if (!key) { alert('请输入 API Key'); return }
    if (subTab === 'add') {
      if (!selectedProvider || !selectedModel) { alert('请选择服务商和模型'); return }
      const cfg = PROVIDER_CONFIGS[selectedProvider]
      addApiKey({ id: `preset-${Date.now()}`, provider: selectedProvider, model: selectedModel,
        modelName: `${selectedProvider} · ${selectedModel}`, key, enabled: true,
        endpoint: cfg?.endpoint, format: cfg?.format || 'openai' })
    } else {
      if (!customModelId.trim()) { alert('请填写模型 ID'); return }
      addApiKey({ id: `custom-${Date.now()}`, provider: '自定义', model: customModelId.trim(),
        modelName: customModelId.trim(), key, enabled: true,
        endpoint: customEndpoint.trim() || undefined, format: customFormat })
    }
    setApiKey(''); setKeyVisible(false)
  }

  const handleTest = async (key: ApiKeyEntry) => {
    setTestId(key.id)
    try {
      const endpoint = key.endpoint || 'https://api.openai.com/v1'
      const url = `${endpoint.replace(/\/v1$/, '')}/models`
      const headers: Record<string, string> = key.format === 'anthropic'
        ? { 'Content-Type': 'application/json', 'x-api-key': key.key, 'anthropic-version': '2023-06-01' }
        : { 'Authorization': `Bearer ${key.key}` }
      const resp = await fetch(url, { method: 'GET', headers })
      setTestResult(prev => ({ ...prev, [key.id]: resp.ok ? 'success' : 'failed' }))
    } catch { setTestResult(prev => ({ ...prev, [key.id]: 'failed' })) }
    setTimeout(() => setTestId(null), 2000)
    setTimeout(() => setTestResult(prev => { const n = { ...prev }; delete n[key.id]; return n }), 4000)
  }

  const startEdit = (key: ApiKeyEntry) => {
    setEditId(key.id); setApiKey(key.key); setCustomModelId(key.model)
    setCustomEndpoint(key.endpoint || ''); setCustomFormat(key.format || 'openai')
    if (key.endpoint) { setSelectedProvider(''); setSelectedModel('') }
    else { setSelectedProvider(key.provider); setSelectedModel(key.model) }
  }
  const cancelEdit = () => { setEditId(null); setApiKey('') }
  const saveEdit = () => {
    if (!editId || !customModelId.trim() || !apiKey.trim()) return
    const updated = apiKeys.map(k => k.id === editId ? {
      ...k, key: apiKey, model: customModelId, modelName: customModelId,
      endpoint: customEndpoint || undefined, format: customFormat,
    } : k)
    u('apiKeys', updated); cancelEdit()
  }

  if (activeGroup !== 'ai') return null

  return (
    <>
      {/* 服务商/模型选择 */}
      {subTab === 'add' && (
        <div className="settings-section">
          <div className="settings-section-title"><span>预设服务商</span><span className="settings-section-desc">从预设列表中快速添加 API Key</span></div>
          <div className="setting-row">
            <div className="setting-label"><span>服务商</span></div>
            <LFSCombo value={selectedProvider} onChange={v => { setSelectedProvider(v); setSelectedModel('') }} options={PROVIDER_NAMES.map(p => ({ value: p, label: p }))} style={{ flex: 1, maxWidth: 300 }} />
          </div>
          {selectedProvider && (
            <div className="setting-row">
              <div className="setting-label"><span>模型</span></div>
              <LFSCombo value={selectedModel} onChange={setSelectedModel} options={currentModels.map(m => ({ value: m, label: m }))} style={{ flex: 1, maxWidth: 300 }} />
            </div>
          )}
        </div>
      )}

      {/* 自定义配置 */}
      {subTab === 'keys' && (
        <div className="settings-section">
          <div className="settings-section-title"><span>自定义配置</span><span className="settings-section-desc">手动输入 API 地址和模型 ID</span></div>
          <div className="setting-row">
            <div className="setting-label"><span>API 格式</span></div>
            <div className="segmented-control" style={{ flex: 1, maxWidth: 200 }}>
              <button className={`segmented-btn${customFormat === 'openai' ? ' active' : ''}`} onClick={() => setCustomFormat('openai')}>OpenAI</button>
              <button className={`segmented-btn${customFormat === 'anthropic' ? ' active' : ''}`} onClick={() => setCustomFormat('anthropic')}>Anthropic</button>
            </div>
          </div>
          <div className="setting-row">
            <div className="setting-label"><span>自定义地址</span><span className="setting-hint">OpenAI 兼容格式</span></div>
            <input className="lfs-input" type="text" value={customEndpoint} onChange={e => setCustomEndpoint(e.target.value)} placeholder="https://api.example.com/v1" style={{ flex: 1, maxWidth: 400 }} />
          </div>
          <div className="setting-row">
            <div className="setting-label"><span>模型 ID</span></div>
            <input className="lfs-input" type="text" value={customModelId} onChange={e => setCustomModelId(e.target.value)} placeholder="如：gpt-4o、claude-3-5-sonnet" style={{ flex: 1, maxWidth: 300, fontFamily: 'var(--font-mono)' }} />
          </div>
        </div>
      )}

      {/* API Key 输入 */}
      <div className="settings-section">
        <div className="settings-section-title"><span>API Key</span><span className="settings-section-desc">本地存储，不上传服务器</span></div>
        <div className="setting-row">
          <div className="setting-label"><span><span className="remix ri-key-line"></span> API Key</span></div>
          <div style={{ display: 'flex', gap: 8, flex: 1, maxWidth: 400 }}>
            <input className="lfs-input" type={keyVisible ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." style={{ flex: 1, fontFamily: 'var(--font-mono)' }} />
            <button onClick={() => setKeyVisible(!keyVisible)} className="ud-btn" title={keyVisible ? '隐藏' : '显示'}>
              <span className={`remix ${keyVisible ? 'ri-eye-line' : 'ri-eye-off-line'}`}></span>
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {editId ? (
            <><button className="settings-save-btn" onClick={saveEdit}><span className="remix ri-check-line"></span> 保存</button><button className="settings-cancel-btn" onClick={cancelEdit}>取消</button></>
          ) : (
            <button className="settings-save-btn" onClick={handleAdd}><span className="remix ri-key-fill"></span> 添加密钥</button>
          )}
        </div>
      </div>

      {/* 已保存密钥列表 */}
      {apiKeys.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title"><span>已保存的密钥</span><span className="settings-section-desc">共 {apiKeys.length} 个</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {apiKeys.map((key) => {
              const isActive = s.selectedModelId === key.id
              const ts = testResult[key.id]
              return (
                <div key={key.id} className={`api-key-item${isActive ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isActive ? 'var(--accent-a10)' : 'var(--bg-code)', borderRadius: 10, border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>{key.modelName || key.model}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      <span>{key.provider}</span><span style={{ opacity: 0.5 }}> · </span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{key.model}</span>
                      {key.endpoint && <><span style={{ opacity: 0.5 }}> · </span><span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>{key.endpoint}</span></>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button className="ai-key-test-btn" onClick={() => handleTest(key)} disabled={testId === key.id} title={ts === 'success' ? '连通成功' : ts === 'failed' ? '测试失败' : '测试连通性'}>
                      {testId === key.id ? <span className="remix ri-loader-4-line" style={{ fontSize: 13, animation: 'spin 1s linear infinite' }} />
                        : ts === 'success' ? <span className="remix ri-check-line" style={{ fontSize: 13, color: '#22c55e' }} />
                        : ts === 'failed' ? <span className="remix ri-close-line" style={{ fontSize: 13, color: '#ef4444' }} />
                        : <span className="remix ri-play-line" style={{ fontSize: 13 }} />}
                    </button>
                    <button className="ai-key-edit-btn" onClick={() => startEdit(key)} title="编辑"><span className="remix ri-edit-line"></span></button>
                    <button className="ai-key-delete-btn" onClick={() => { if (confirm(`删除 ${key.modelName || key.model}？`)) removeApiKey(key.id) }} title="删除"><span className="remix ri-delete-bin-line"></span></button>
                    <UDToggle checked={key.enabled} onChange={() => toggleApiKey(key.id)} />
                    {isActive && <span className="remix ri-checkbox-circle-fill" style={{ fontSize: 16, color: 'var(--accent-primary)' }} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 温度/Token 设置 */}
      <div className="settings-section">
        <div className="settings-section-title"><span>AI 参数</span><span className="settings-section-desc">控制 AI 回复的创造性和长度</span></div>
        <div className="setting-row">
          <div className="setting-label"><span><span className="remix ri-temperature-line"></span> 温度</span><span className="setting-hint">创造性 0~1</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 300 }}>
            <input type="range" min="0" max="1" step="0.1" value={s.temperature} onChange={(e) => u('temperature', parseFloat(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-primary)' }} />
            <span style={{ color: 'var(--accent-primary)', fontSize: 12, minWidth: 28, fontFamily: 'var(--font-mono)' }}>{s.temperature}</span>
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-label"><span><span className="remix ri-text-spacing"></span> 最大 Token</span></div>
          <input className="lfs-input" type="number" value={s.maxTokens} onChange={e => u('maxTokens', parseInt(e.target.value) || 1024)} style={{ width: 100 }} />
        </div>
      </div>
    </>
  )
}




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

/* ── Shared helpers (moved to ui/ToggleRow.tsx) ── */
