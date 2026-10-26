import React, { useCallback, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useAIStore } from '../../store/aiStore'
import { UiTip } from '../ui/UiTip'
import {
  NEW_ITEMS, FORMAT_ITEMS, INSERT_ITEMS, MODE_ITEMS, applyTableItems,
  useEditorActions, useFlyout, useTableActive, ActionMenu,
} from './editorActions'

import { APP_VERSION } from '../../shared/version'

const VERSION = APP_VERSION

/* 左侧 rail（bid-typesetting SideNav.vue 版式）：76px 全高，顶 logo、中 3 组、底版本号。
   3 个分组与顶栏一致：文档 / 编辑 / 应用。 */
export const LeftNav: React.FC = () => {
  const appMode = useEditorStore((s: any) => s.appMode)
  const openPanel = useEditorStore((s: any) => s.openPanel)
  const showLibrary = useEditorStore((s: any) => s.showLibrary)
  const showOutline = useEditorStore((s: any) => s.showOutline)
  const showSearch = useEditorStore((s: any) => s.showSearch)
  const aiPanelVisible = useAIStore((s) => s.panelVisible)

  const flyout = useFlyout()
  const { formatAction, insertAction, tableAction, modeAction, newDocument, openFileDialog, openFolderDialog } = useEditorActions()
  const tableActive = useTableActive()

  const newBtnRef = useRef<HTMLButtonElement>(null)
  const formatBtnRef = useRef<HTMLButtonElement>(null)
  const tableBtnRef = useRef<HTMLButtonElement>(null)
  const insertBtnRef = useRef<HTMLButtonElement>(null)
  const modeBtnRef = useRef<HTMLButtonElement>(null)

  const openAI = useCallback(() => {
    const s = useAIStore.getState()
    if (s.panelVisible) s.hidePanel()
    else s.showPanel('question', '', { x: Math.max(8, window.innerWidth - 380), y: 120 })
  }, [])

  const togglePanel = useCallback((key: 'library' | 'outline' | 'search') => {
    const st = useEditorStore.getState()
    const cur = key === 'library' ? st.showLibrary : key === 'outline' ? st.showOutline : st.showSearch
    if (key === 'library') st.setShowLibrary(!cur)
    else if (key === 'outline') st.setShowOutline(!cur)
    else st.setShowSearch(!cur)
  }, [])

  const toggleDialog = useCallback((dialog: 'export' | 'settings') => {
    const st = useEditorStore.getState()
    st.setOpenPanel(st.openPanel === dialog ? 'none' : dialog)
  }, [])

  const openAbout = useCallback(() => {
    useSettingsStore.getState().setActiveGroup('about')
    useEditorStore.getState().setOpenPanel('settings')
  }, [])

  const toggleMode = useCallback((mode: 'history' | 'style' | 'read') => {
    const st = useEditorStore.getState()
    const next = st.appMode === mode ? 'edit' : mode
    st.setAppMode(next)
    st.setShowRightPanel(next === 'history' || next === 'style')
  }, [])

  const onMenuAction = (action: string) => {
    const key = flyout.key
    flyout.close()
    if (key === 'new') {
      if (action === 'new') newDocument()
      else if (action === 'openFolder') void openFolderDialog()
      else openFileDialog()
    }
    else if (key === 'format') formatAction(action)
    else if (key === 'table') tableAction(action)
    else if (key === 'insert') insertAction(action)
    else if (key === 'mode') modeAction(action)
  }

  const menu = (key: string, ref: React.RefObject<HTMLButtonElement>, icon: string, label: string) => (
    <UiTip text={label} placement="right">
      <div className="rail-menu-btn" onClick={() => flyout.open(key, ref.current)}>
        <button ref={ref} className={`rail-btn rail-btn--menu${flyout.isOpen(key) ? ' active' : ''}`} aria-label={label}>
          <span className="rail-icon-wrap">
            <span className={`remix rail-icon ${icon}`} aria-hidden="true"></span>
            <span className="rail-menu-dot" aria-hidden="true"></span>
          </span>
          <span className="rail-label">{label}</span>
        </button>
      </div>
    </UiTip>
  )

  const btn = (icon: string, label: string, onClick: () => void, active?: boolean) => (
    <UiTip text={label} placement="right">
      <button className={`rail-btn${active ? ' active' : ''}`} onClick={onClick} aria-label={label}>
        <span className={`remix rail-icon ${icon}`} aria-hidden="true"></span>
        <span className="rail-label">{label}</span>
      </button>
    </UiTip>
  )

  return (
    <aside className="rail-nav">
      <div className="rail-top">
        <UiTip text="LZEditor" placement="right">
          <button className="rail-logo" aria-label="LZEditor">
            <img className="rail-logo-img" src="/logo.svg" alt="" />
          </button>
        </UiTip>
      </div>

      <nav className="rail-body" aria-label="编辑导航">
        {/* 组 1：文档 */}
        <div className="rail-group">
          {btn('ri-archive-2-line', '文档库', () => togglePanel('library'), showLibrary)}
          {menu('new', newBtnRef, 'ri-file-add-line', '新建')}
          {btn('ri-list-unordered', '大纲', () => togglePanel('outline'), showOutline)}
          {btn('ri-search-line', '查找', () => togglePanel('search'), showSearch)}
        </div>

        {/* 组 2：编辑 */}
        <div className="rail-group">
          {menu('format', formatBtnRef, 'ri-text-wrap', '格式')}
          {btn('ri-image-line', '图片', () => useEditorStore.getState().setInsertPanel('image'))}
          {btn('ri-link', '链接', () => useEditorStore.getState().setInsertPanel('link'))}
          {menu('table', tableBtnRef, 'ri-table-2', '表格')}
          {menu('insert', insertBtnRef, 'ri-add-circle-line', '插入')}
        </div>

        {/* 组 3：应用 */}
        <div className="rail-group">
          {btn('ri-openai-fill', 'AI', openAI, aiPanelVisible)}
          {menu('mode', modeBtnRef, 'ri-eye-2-fill', '模式')}
          {btn('ri-history-fill', '历史', () => toggleMode('history'), appMode === 'history')}
          {btn('ri-palette-fill', '样式', () => toggleMode('style'), appMode === 'style')}
          {btn('ri-book-open-fill', '阅读', () => toggleMode('read'), appMode === 'read')}
          {btn('ri-download-2-line', '导出', () => toggleDialog('export'), openPanel === 'export')}
          {btn('ri-settings-3-fill', '设置', () => toggleDialog('settings'), openPanel === 'settings')}
        </div>
      </nav>

      <div className="rail-bottom">
        <UiTip text="关于" placement="right">
          <button className="rail-version" onClick={openAbout} aria-label="关于">
            v{VERSION}
          </button>
        </UiTip>
      </div>

      {flyout.key && (
        <ActionMenu
          refEl={flyout.menuRef}
          anchor={flyout.rect}
          align="right"
          items={
            flyout.key === 'new' ? NEW_ITEMS
            : flyout.key === 'format' ? FORMAT_ITEMS
            : flyout.key === 'table' ? applyTableItems(tableActive)
            : flyout.key === 'insert' ? INSERT_ITEMS
            : MODE_ITEMS
          }
          onAction={onMenuAction}
        />
      )}
    </aside>
  )
}
