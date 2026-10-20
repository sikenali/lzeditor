import React, { useEffect } from 'react'
import { useSettingsStore, saveSettingsToStorage, ACCENT_PRESETS, getAccentColor } from '../../store/settingsStore'
import type { SettingsGroup } from '../../shared/types'
import { UiModal } from '../../components/ui'
import { toast } from '../../utils/toast'
import { ContentStyleTab } from './settings/ContentStyleTab'
import { EditorSettingsTab } from './settings/EditorSettingsTab'
import { BehaviorSettingsTab } from './settings/BehaviorSettingsTab'
import { ShortcutSettingsTab } from './settings/ShortcutSettingsTab'
import { ModelSettingsTab } from './settings/ModelSettingsTab'
import { AboutSettingsTab } from './settings/AboutSettingsTab'

type SubTab = { id: string; label: string; icon: string }

/* ── 顶层导航（DESIGN.md §3.3 / bid-maker SettingsModal.vue） ── */
const NAV_GROUPS: { id: SettingsGroup; label: string; icon: string; subs: SubTab[] }[] = [
  { id: 'theme', label: '主题设置', icon: 'ri-palette-line', subs: [] },
  {
    id: 'ai', label: '模型设置', icon: 'ri-cpu-line',
    subs: [],
  },
  {
    id: 'profile', label: '个性设置', icon: 'ri-edit-2-fill',
    subs: [
      { id: 'content', label: '内容样式', icon: 'ri-font-size' },
      { id: 'editor', label: '编辑设置', icon: 'ri-edit-2-line' },
      { id: 'app', label: '行为设置', icon: 'ri-apps-line' },
      { id: 'shortcut', label: '快捷键设置', icon: 'ri-keyboard-fill' },
    ],
  },
  { id: 'about', label: '关于', icon: 'ri-information-line', subs: [] },
]

/* 面板长宽：bid-typesetting SettingsModal.vue —— 92vw / 上限 1400px / 92vh */
const PANEL_WIDTH = '92vw'
const PANEL_HEIGHT = '92vh'
const PANEL_MAX_WIDTH = 1400
const PANEL_SHADOW = '0 8px 40px rgba(0,0,0,0.1)'

export const SettingsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const settings = useSettingsStore()
  const activeGroup = settings.activeGroup
  const setActiveGroup = settings.setActiveGroup
  const setSubTab = settings.setSubTab
  const subTab = settings.subTab ?? ''
  const updateSetting = settings.updateSetting

  const group = NAV_GROUPS.find(g => g.id === activeGroup) ?? NAV_GROUPS[0]
  const subs = group.subs

  // 分组切换时把子标签复位到第一个
  useEffect(() => {
    if (subs.length && !subs.some(t => t.id === subTab)) setSubTab(subs[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup])

  // 设置中心不设「保存」按钮（对齐 bid-maker）：改动即时生效并即时落盘
  useEffect(() => {
    saveSettingsToStorage(useSettingsStore.getState())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  /* 4 组一级导航；有子项的组把子项内联在导航里（内容区不再放子标签条），
     导航由 4 行变 8 行，栏底留白从 ~70% 降到 ~50%，一级导航只有一个面 */
  const leftNav = (
    <nav className="settings-nav-list">
      {NAV_GROUPS.map(item => (
        <div key={item.id} className="settings-nav-branch">
          <button
            type="button"
            className={`settings-nav-row${activeGroup === item.id ? ' active' : ''}`}
            onClick={() => { setActiveGroup(item.id); if (item.subs.length) setSubTab(item.subs[0].id) }}
          >
            <span className={`remix settings-nav-ico ${item.icon}`}></span>
            <span className="settings-nav-txt">{item.label}</span>
          </button>
          {item.subs.length > 0 && (
            <div className="settings-nav-sublist">
              {item.subs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`settings-nav-sub${subTab === tab.id ? ' active' : ''}`}
                  onClick={() => setSubTab(tab.id)}
                >
                  <span className={`remix ${tab.icon}`}></span>
                  <span className="settings-nav-txt">{tab.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )

  const settingsContent = (
    <div className="settings-content">
      {group.id === 'theme' && <ThemeSettingsView s={settings} u={updateSetting} />}
      {group.id === 'ai' && <ModelSettingsTab />}
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
      subtitle="选择要进入的设置界面"
      width={PANEL_WIDTH}
      maxWidth={PANEL_MAX_WIDTH}
      height={PANEL_HEIGHT}
      bodyPadding={false}
      radius={16}
      shadow={PANEL_SHADOW}
      closeOnOverlay={false}
    >
      <div className="settings-panel-shell">
        {leftNav}
          <div className="settings-panel-content">
            {settingsContent}
          </div>
      </div>
    </UiModal>
  )
}

/* ═══════════════════════════════════════════
   主题设置 — bid-maker ThemeSettingsView
══════════════════════════════════════════════ */
const THEME_OPTIONS = [
  {
    id: 'parchment', name: '浅色主题 · 羊皮纸',
    desc: '当前默认，长时间阅读不易疲劳',
    skin: '#FAF7F2', topbar: '#FFFFFF', content: '#E1DCD1', previewBg: '#F7EED4',
  },
  {
    id: 'dark', name: '深色主题 · 墨夜',
    desc: '夜间或暗光环境编辑作业更护眼',
    skin: '#333A45', topbar: '#404955', content: '#8E939A', previewBg: '#17171A',
  },
] as const

const LAYOUT_OPTIONS = [
  { id: 'top', name: '顶栏模式 · 居中导航', desc: '工具栏在顶栏居中排布，状态栏固定在底部' },
  { id: 'left', name: '侧边栏模式 · 左侧导航', desc: '工具栏固定在左侧竖列居中，编辑器居中排布' },
] as const

function ThemeSettingsView({ s, u }: { s: any; u: any }) {
  const theme = s.theme
  const accent = s.accentColor
  const navMode = s.navMode || 'top'
  // accentColor 存的是预设 id 或原始 16 进制色值，后者视为「自定义」
  const isCustomAccent = /^#[0-9a-fA-F]{6}$/.test(String(accent))

  const resetAll = () => {
    u('theme', 'parchment')
    u('accentColor', 'vermilion')
    u('navMode', 'top')
    toast('已恢复默认')
  }

  // 布局切换需要整页重排，按 DESIGN.md §4.4：toast + 800ms 后刷新
  const changeLayout = (id: 'top' | 'left') => {
    if (id === navMode) return
    u('navMode', id)
    const name = LAYOUT_OPTIONS.find(l => l.id === id)?.name || ''
    toast(`已切换布局：${name}，页面将刷新以生效`)
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <>
      {/* 页面头部卡片 */}
      <div className="page-header-card">
        <div className="page-header-content">
          <div className="page-header-info">
            <div className="page-breadcrumb">
              <span>首页</span>
              <span className="sep">/</span>
              <span>设置中心</span>
              <span className="sep">/</span>
              <span className="current">主题设置</span>
            </div>
            <div className="page-header-title">
              <h1>主题设置</h1>
              <p>统一切换外观底色、强调色与导航布局模式，修改即时生效</p>
            </div>
          </div>
          <button type="button" className="page-reset-button" onClick={resetAll}>
            <span className="remix ri-restart-line"></span>
            恢复默认
          </button>
        </div>
      </div>

      {/* 外观主题 */}
      <div className="settings-section">
        <div className="settings-section-title"><span>外观主题</span></div>
        <div className="theme-group">
          {THEME_OPTIONS.map(t => (
            <div
              key={t.id}
              className={`theme-preview-card${theme === t.id ? ' active' : ''}`}
              onClick={() => u('theme', t.id)}
            >
              {theme === t.id && <span className="remix theme-card-check ri-check-line"></span>}
              <div className="theme-preview-thumb" style={{ backgroundColor: t.previewBg }}>
                <div className="theme-thumb-topbar" style={{ backgroundColor: t.topbar }}></div>
                <div className="theme-thumb-content" style={{ backgroundColor: t.content }}></div>
              </div>
              <div className="theme-preview-info">
                <div className="theme-preview-name">{t.name}</div>
                <div className="theme-preview-desc">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 强调色 */}
      <div className="settings-section">
        <div className="settings-section-title">
          <span>强调色</span>
        </div>
        <div className="accent-group">
          {ACCENT_PRESETS.map(p => (
            <div
              key={p.id}
              className="accent-item"
              onClick={() => u('accentColor', p.id)}
            >
              <div className="accent-circle" style={{ backgroundColor: p.color }}>
                {accent === p.id && <span className="remix accent-check-icon ri-check-line"></span>}
              </div>
              <div className={`accent-name${accent === p.id ? ' current' : ''}`}>{p.name}</div>
            </div>
          ))}
          {/* 自定义色：保留 lzeditor 原有的取色能力，样式与预设色盘统一 */}
          <label className="accent-item" title="自定义颜色">
            <div
              className={`accent-circle accent-circle-custom${isCustomAccent ? ' active' : ''}`}
              style={isCustomAccent ? { backgroundColor: accent } : undefined}
            >
              <input
                type="color"
                value={getAccentColor(accent)}
                onChange={e => u('accentColor', e.target.value)}
              />
              <span className={`remix ${isCustomAccent ? 'accent-check-icon ri-check-line' : 'accent-plus-icon ri-add-line'}`}></span>
            </div>
            <div className={`accent-name${isCustomAccent ? ' current' : ''}`}>自定义</div>
          </label>
        </div>
      </div>

      {/* 导航布局 */}
      <div className="settings-section">
        <div className="settings-section-title">
          <span>导航布局</span>
        </div>
        <div className="layout-group">
          {LAYOUT_OPTIONS.map(l => (
            <div
              key={l.id}
              className={`layout-card${navMode === l.id ? ' active' : ''}`}
              onClick={() => changeLayout(l.id)}
            >
              {navMode === l.id && <span className="remix layout-card-check ri-check-line"></span>}
              <div className="layout-preview">
                {l.id === 'top' ? <TopBarMockup /> : <SidebarMockup />}
              </div>
              <div className="layout-info">
                <div className="layout-name">{l.name}</div>
                <div className="layout-desc">{l.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/** 顶栏布局示意：顶栏（品牌 + 模块 + 右侧动作）+ 内容区 */
function TopBarMockup() {
  return (
    <div className="mockup-topbar">
      <div className="mockup-mock-header">
        <div className="mockup-brand">
          <span className="mockup-brand-dot"></span>
          <span className="mockup-brand-text"></span>
          <span className="mockup-brand-text muted"></span>
        </div>
        <div className="mockup-modules">
          <span className="mockup-module" style={{ background: 'var(--color-primary)' }}></span>
          <span className="mockup-module" style={{ background: '#D3A93F' }}></span>
          <span className="mockup-module" style={{ background: '#3E8C6E' }}></span>
          <span className="mockup-module" style={{ background: '#4A72A8' }}></span>
          <span className="mockup-module" style={{ background: 'var(--color-primary)' }}></span>
        </div>
        <div className="mockup-actions">
          <span className="mockup-action-dot"></span>
          <span className="mockup-action-dot"></span>
        </div>
      </div>
      <div className="mockup-body">
        <div className="mockup-main"></div>
      </div>
    </div>
  )
}

/** 侧边栏布局示意：左侧竖列 + 右侧（顶栏 + 内容区） */
function SidebarMockup() {
  return (
    <div className="mockup-sidebar">
      <div className="mockup-side-nav">
        <span className="mockup-side-mod" style={{ background: '#D3A93F' }}></span>
        <span className="mockup-side-mod" style={{ background: 'var(--color-primary)' }}></span>
        <span className="mockup-side-mod" style={{ background: '#3E8C6E' }}></span>
        <span className="mockup-side-mod" style={{ background: '#4A72A8' }}></span>
        <span className="mockup-side-mod" style={{ background: '#2F3640' }}></span>
      </div>
      <div className="mockup-side-area">
        <div className="mockup-mock-header">
          <div className="mockup-brand">
            <span className="mockup-brand-dot"></span>
            <span className="mockup-brand-text"></span>
            <span className="mockup-brand-text muted"></span>
          </div>
          <div className="mockup-actions">
            <span className="mockup-action-dot"></span>
            <span className="mockup-action-dot"></span>
          </div>
        </div>
        <div className="mockup-body">
          <div className="mockup-main"></div>
        </div>
      </div>
    </div>
  )
}
