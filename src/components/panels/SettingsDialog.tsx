import React, { useRef, useEffect } from 'react'
import { useSettingsStore, saveSettingsToStorage, ACCENT_PRESETS, getAccentColor } from '../../store/settingsStore'
import type { SettingsGroup } from '../../shared/types'
import { UiModal, UiButton } from '../../components/ui'
import { ContentStyleTab } from './settings/ContentStyleTab'
import { EditorSettingsTab } from './settings/EditorSettingsTab'
import { BehaviorSettingsTab } from './settings/BehaviorSettingsTab'
import { ShortcutSettingsTab } from './settings/ShortcutSettingsTab'
import { ModelSettingsTab } from './settings/ModelSettingsTab'
import { AboutSettingsTab } from './settings/AboutSettingsTab'

type SubTab = { id: string; label: string; icon: string }

/* ── Top-level nav groups + their sub-tabs ── */
const NAV_GROUPS: { id: SettingsGroup; label: string; desc: string; icon: string; subs: SubTab[] }[] = [
  {
    id: 'theme', label: '主题设置', desc: '界面主题、强调色与导航布局', icon: 'ri-palette-fill', subs: [],
  },
  {
    id: 'ai', label: '模型管理', desc: '模型供应商与密钥', icon: 'ri-openai-fill',
    subs: [
      { id: 'add',  label: '模型制造商', icon: 'ri-openai-fill' },
      { id: 'keys', label: '自定义配置', icon: 'ri-key-line' },
    ],
  },
  {
    id: 'profile', label: '个性设置', desc: '内容、编辑与应用偏好', icon: 'ri-edit-2-fill',
    subs: [
      { id: 'content',  label: '内容样式',   icon: 'ri-font-size' },
      { id: 'editor',   label: '编辑设置',   icon: 'ri-edit-2-line' },
      { id: 'app',      label: '行为设置',   icon: 'ri-apps-line' },
      { id: 'shortcut', label: '快捷键设置', icon: 'ri-keyboard-fill' },
    ],
  },
  {
    id: 'about', label: '关于', desc: '版本与项目信息', icon: 'ri-information-fill', subs: [],
  },
]

export const SettingsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const activeGroup   = useSettingsStore(s => s.activeGroup)
  const setActiveGroup = useSettingsStore(s => s.setActiveGroup)
  const setSubTab      = useSettingsStore(s => s.setSubTab)
  const subTab = useSettingsStore(s => s.subTab ?? '')
  const settings = useSettingsStore(s => s)
  const updateSetting = useSettingsStore(s => s.updateSetting)

  const group = NAV_GROUPS.find(g => g.id === activeGroup) ?? NAV_GROUPS[0]
  const subs = group.subs

  // Set subTab to the first tab on mount, or when switching categories
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      if (subs.length) setSubTab(subs[0].id)
      return
    }
    setSubTab(subs[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup])

  const handleSave = () => {
    saveSettingsToStorage(settings)
    onClose()
  }

  const leftNav = (
    <div className="settings-nav">
      {NAV_GROUPS.map(item => (
        <button
          key={item.id}
          className={`settings-nav-item${activeGroup === item.id ? ' active' : ''}`}
          onClick={() => { setActiveGroup(item.id); setSubTab(item.subs[0]?.id ?? '') }}
        >
          <span className={`remix settings-nav-icon ${item.icon}`}></span>
          <div className="settings-nav-text">
            <div className="settings-nav-title">{item.label}</div>
            <div className="settings-nav-sub">{item.desc}</div>
          </div>
        </button>
      ))}
    </div>
  )

  const rightTop = subs.length > 1 ? (
    <div className="settings-subtabs">
      {subs.map(tab => (
        <button
          key={tab.id}
          className={`settings-subtab${subTab === tab.id ? ' active' : ''}`}
          onClick={() => setSubTab(tab.id)}
        >
          <span className={`remix ${tab.icon}`}></span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  ) : null

  const settingsContent = (
    <div className="settings-content">
      {group.id === 'theme' && renderThemeContent(settings, updateSetting)}
      {group.id === 'ai' && <ModelSettingsTab subTab={subTab} />}
      {group.id === 'profile' && (
        subTab === 'content'
          ? <ContentStyleTab s={settings} u={updateSetting} />
          : subTab === 'editor'
            ? <EditorSettingsTab s={settings} u={updateSetting} />
            : subTab === 'app'
              ? <BehaviorSettingsTab s={settings} u={updateSetting} />
              : <ShortcutSettingsTab />
      )}
      {group.id === 'about' && <AboutSettingsTab />}
    </div>
  )

  return (
    <UiModal
      open
      onClose={onClose}
      icon="ri-settings-3-line"
      title="设置中心"
      radius={16}
      width="1320px"
      closeOnOverlay={false}
      subtitle={`${group.label}${group.subs.length ? ` · ${group.subs.find(t => t.id === subTab)?.label ?? ''}` : ''}`}
      footer={
        <>
          <UiButton variant="ghost" onClick={onClose}>取消</UiButton>
          <UiButton onClick={handleSave}>保存</UiButton>
        </>
      }
    >
      <div className="settings-shell">
        {leftNav}
        <div className="settings-panel">
          {rightTop}
          {settingsContent}
        </div>
      </div>
    </UiModal>
  )
}

/* ═══════════════════════════════════════════
   THEME
═══════════════════════════════════════════ */
function renderThemeContent(s: any, u: any) {
  return (
    <>
      {renderThemeModeSection(s, u)}
      {renderAccentSection(s, u)}
      {renderNavModeContent(s, u)}
    </>
  )
}

function renderThemeModeSection(s: any, u: any) {
  const theme  = s.theme
  const update = u
  return (
    <div className="settings-section">
      <div className="settings-section-title">
        <span>界面主题</span>
        <span className="settings-section-desc">浅色 / 深色只影响应用界面，不影响文档排版样式</span>
      </div>
      <div className="theme-mode-grid">
        {([
          { id: 'parchment', label: '浅色', icon: 'ri-sun-fill' },
          { id: 'dark',      label: '深色', icon: 'ri-moon-fill' },
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
}

function renderAccentSection(s: any, u: any) {
  const accent = s.accentColor
  const update = u
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
function renderNavModeContent(s: any, u: any) {
  const navMode = s.navMode || 'top'
  const update = u
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
