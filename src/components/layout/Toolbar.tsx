import React, { useCallback, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useAIStore } from '../../store/aiStore'
import { getCM6Editor } from '../editor/codemirror/registry'
import {
  NEW_ITEMS, FORMAT_ITEMS, INSERT_ITEMS, MODE_ITEMS, applyTableItems,
  useEditorActions, useFlyout, useTableActive, ActionMenu,
} from './editorActions'

export const Toolbar: React.FC = () => {
  const appMode = useEditorStore((s: any) => s.appMode)
  const openPanel = useEditorStore((s: any) => s.openPanel)
  const showOutline = useEditorStore((s: any) => s.showOutline)
  const showLibrary = useEditorStore((s: any) => s.showLibrary)
  const showSearch = useEditorStore((s: any) => s.showSearch)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const setShowOutline = useEditorStore((s: any) => s.setShowOutline)
  const setShowLibrary = useEditorStore((s: any) => s.setShowLibrary)
  const setShowSearch = useEditorStore((s: any) => s.setShowSearch)
  const quickFormatButtons = useSettingsStore((s) => s.quickFormatButtons !== false)
  const showToolbarLabels = useSettingsStore((s) => s.showToolbarLabels)
  const aiPanelVisible = useAIStore((s) => s.panelVisible)

  const flyout = useFlyout()
  const { applyCmd, formatAction, insertAction, tableAction, modeAction, newDocument, openFileDialog, openFolderDialog } = useEditorActions()
  const tableActive = useTableActive()

  const newBtnRef = useRef<HTMLButtonElement>(null)
  const formatBtnRef = useRef<HTMLButtonElement>(null)
  const tableBtnRef = useRef<HTMLButtonElement>(null)
  const insertBtnRef = useRef<HTMLButtonElement>(null)
  const modeBtnRef = useRef<HTMLButtonElement>(null)

  const openAI = useCallback(() => {
    const s = useAIStore.getState()
    if (s.panelVisible) { s.hidePanel(); return }
    // 带上当前选区作为上下文，AI 面板据此判断润色/改写范围
    const sel = getCM6Editor()?.getSelectionText() ?? ''
    s.showPanel('question', sel, { x: Math.max(8, window.innerWidth - 380), y: 120 })
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

  return (
    <>
      <div className={`navtop toolbar${!showToolbarLabels ? ' toolbar-icon-only' : ''}`}>
        {/* ── Left ── */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => setShowLibrary(!showLibrary)}>
            <span className="remix toolbar-icon ri-archive-2-line"></span>
            <span className="toolbar-label">文档库</span>
          </button>
          <div className="toolbar-menu-btn" onClick={() => flyout.open('new', newBtnRef.current)}>
            <button ref={newBtnRef} className={`toolbar-btn ${flyout.isOpen('new') ? 'menu-open' : ''}`}>
              <span className="remix toolbar-icon ri-file-add-line"></span>
              <span className="toolbar-label">新建</span>
              <span className="toolbar-menu-dot"></span>
            </button>
          </div>
          <button className="toolbar-btn" onClick={() => setShowOutline(!showOutline)}>
            <span className="remix toolbar-icon ri-list-unordered"></span>
            <span className="toolbar-label">大纲</span>
          </button>
          <button className="toolbar-btn" onClick={() => setShowSearch(!showSearch)} title="查找与替换">
            <span className="remix toolbar-icon ri-search-line"></span>
            <span className="toolbar-label">查找</span>
          </button>
        </div>

        {/* ── Middle ── */}
        <div className="toolbar-group toolbar-group--middle">
          {quickFormatButtons && <>
            <button className="toolbar-btn" onClick={() => applyCmd('bold')}><span className="remix toolbar-icon ri-bold"></span><span className="toolbar-label">粗体</span></button>
            <button className="toolbar-btn" onClick={() => applyCmd('italic')}><span className="remix toolbar-icon ri-italic"></span><span className="toolbar-label">斜体</span></button>
            <button className="toolbar-btn" onClick={() => applyCmd('underline')}><span className="remix toolbar-icon ri-underline"></span><span className="toolbar-label">下划线</span></button>
            <button className="toolbar-btn" onClick={() => applyCmd('strikeThrough')}><span className="remix toolbar-icon ri-strikethrough"></span><span className="toolbar-label">删除线</span></button>
            <button className="toolbar-btn" onClick={() => applyCmd('toggleHighlight')}><span className="remix toolbar-icon ri-mark-pen-fill"></span><span className="toolbar-label">高亮</span></button>
          </>}

          <div className="toolbar-menu-btn" onClick={() => flyout.open('format', formatBtnRef.current)}>
            <button ref={formatBtnRef} className={`toolbar-btn format-btn ${flyout.isOpen('format') ? 'menu-open' : ''}`}>
              <span className="remix toolbar-icon ri-text-wrap"></span>
              <span className="toolbar-label">格式</span>
              <span className="toolbar-menu-dot"></span>
            </button>
          </div>

          <button className="toolbar-btn" onClick={() => useEditorStore.getState().setInsertPanel('image')}>
            <span className="remix toolbar-icon ri-image-line"></span><span className="toolbar-label">图片</span>
          </button>
          <button className="toolbar-btn" onClick={() => useEditorStore.getState().setInsertPanel('link')}>
            <span className="remix toolbar-icon ri-link"></span><span className="toolbar-label">链接</span>
          </button>

          <div className="toolbar-menu-btn" onClick={() => flyout.open('table', tableBtnRef.current)}>
            <button ref={tableBtnRef} className={`toolbar-btn ${flyout.isOpen('table') ? 'menu-open' : ''}`}>
              <span className="remix toolbar-icon ri-table-2"></span>
              <span className="toolbar-label">表格</span>
              <span className="toolbar-menu-dot"></span>
            </button>
          </div>

          <div className="toolbar-menu-btn" onClick={() => flyout.open('insert', insertBtnRef.current)}>
            <button ref={insertBtnRef} className={`toolbar-btn ${flyout.isOpen('insert') ? 'menu-open' : ''}`}>
              <span className="remix toolbar-icon ri-add-circle-line"></span>
              <span className="toolbar-label">插入</span>
              <span className="toolbar-menu-dot"></span>
            </button>
          </div>
        </div>

        {/* ── Right ── */}
        <div className={`toolbar-group${quickFormatButtons ? ' toolbar-group--compact' : ''}`}>
          <button
            className={`toolbar-btn${aiPanelVisible ? ' toolbar-btn--active' : ''}`}
            onClick={openAI}
            title="AI 助手"
          >
            <span className="remix toolbar-icon ri-openai-fill"></span>
            <span className="toolbar-label">AI</span>
          </button>
          <div className="toolbar-menu-btn" onClick={() => flyout.open('mode', modeBtnRef.current)}>
            <button ref={modeBtnRef} className={`toolbar-btn ${flyout.isOpen('mode') ? 'menu-open' : ''}`}>
              <span className="remix toolbar-icon ri-eye-2-fill"></span>
              <span className="toolbar-label">模式</span>
              <span className="toolbar-menu-dot"></span>
            </button>
          </div>
          <button className="toolbar-btn" onClick={() => useEditorStore.getState().setAppMode(appMode === 'history' ? 'edit' : 'history')}>
            <span className="remix toolbar-icon ri-history-fill"></span>
            <span className="toolbar-label">历史</span>
          </button>
          <button className="toolbar-btn" onClick={() => useEditorStore.getState().setAppMode(appMode === 'style' ? 'edit' : 'style')}>
            <span className="remix toolbar-icon ri-palette-fill"></span>
            <span className="toolbar-label">样式</span>
          </button>
          <button className="toolbar-btn" onClick={() => setOpenPanel(openPanel === 'export' ? 'none' : 'export')}>
            <span className="remix toolbar-icon ri-download-2-line"></span>
            <span className="toolbar-label">导出</span>
          </button>
          <button className="toolbar-btn" onClick={() => setOpenPanel(openPanel === 'settings' ? 'none' : 'settings')}>
            <span className="remix toolbar-icon ri-settings-3-fill"></span>
            <span className="toolbar-label">设置</span>
          </button>
        </div>
      </div>

      {flyout.key && (
        <ActionMenu
          refEl={flyout.menuRef}
          anchor={flyout.rect}
          align="below"
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
    </>
  )
}
